import json
import os
import boto3
import time
import math
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from botocore.exceptions import ClientError, ReadTimeoutError
from botocore.config import Config
from boto3.dynamodb.conditions import Key

# Initialize AWS clients
# Set a tight read_timeout for the SageMaker client to implement the circuit breaker pattern
# If the endpoint takes longer than 200ms (0.2s), it will raise a ReadTimeoutError
sagemaker_config = Config(read_timeout=0.2, retries={'max_attempts': 0})
sm_runtime = boto3.client('sagemaker-runtime', config=sagemaker_config)

dynamodb = boto3.resource('dynamodb')
eventbridge = boto3.client('events')

# Environment Variables & Threshold Defaults
SAGEMAKER_ENDPOINT = os.environ.get('SAGEMAKER_ENDPOINT', 'omniguard-sagemaker-endpoint')
DYNAMODB_RULES_TABLE = os.environ.get('DYNAMODB_RULES_TABLE', 'OmniGuard-StaticRules')
DYNAMODB_HISTORY_TABLE = os.environ.get('DYNAMODB_HISTORY_TABLE', 'OmniGuard-TransactionHistory')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'OmniGuard-EnterpriseBus')

# AML Business Rule Thresholds
WINDOW_MINUTES = int(os.environ.get('VELOCITY_WINDOW_MINUTES', '15'))
RETAIL_SINGLE_THRESHOLD = float(os.environ.get('RETAIL_SINGLE_THRESHOLD', '5000.0'))
RETAIL_CUMULATIVE_THRESHOLD = float(os.environ.get('RETAIL_CUMULATIVE_THRESHOLD', '8000.0'))
RETAIL_VELOCITY_LIMIT = int(os.environ.get('RETAIL_VELOCITY_LIMIT', '3'))

# Agent / Merchant higher thresholds to prevent kiosk false positives
AGENT_SINGLE_THRESHOLD = float(os.environ.get('AGENT_SINGLE_THRESHOLD', '50000.0'))
AGENT_CUMULATIVE_THRESHOLD = float(os.environ.get('AGENT_CUMULATIVE_THRESHOLD', '150000.0'))
AGENT_VELOCITY_LIMIT = int(os.environ.get('AGENT_VELOCITY_LIMIT', '30'))

# Resilience: Fail-open up to GH¢500 to keep grid moving; fail-closed above to protect from drain
FAIL_OPEN_MAX_AMOUNT = float(os.environ.get('FAIL_OPEN_MAX_AMOUNT', '500.0'))

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
}

def validate_transaction(transaction):
    """
    Sanitizes and validates incoming transaction payload.
    Catches negative amounts, non-numeric values, self-transfers, missing fields,
    and invalid timestamps.
    """
    if not isinstance(transaction, dict):
        return False, "Payload must be a valid JSON object", None

    required_fields = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp']
    for field in required_fields:
        if field not in transaction or transaction[field] is None:
            return False, f"Missing required field: '{field}'", None
        if isinstance(transaction[field], str) and not transaction[field].strip():
            return False, f"Field '{field}' cannot be empty", None

    # Amount validation
    try:
        amount = float(transaction['amount'])
        if math.isnan(amount) or math.isinf(amount):
            return False, "Amount must be a finite number", None
        if amount <= 0:
            return False, "Amount must be strictly greater than zero", None
    except (ValueError, TypeError):
        return False, "Amount must be a valid numeric value", None

    # Prevent self-transfers
    sender_id = str(transaction['sender_id']).strip()
    receiver_id = str(transaction['receiver_id']).strip()
    if sender_id == receiver_id:
        return False, "Self-transfers are invalid (sender_id equals receiver_id)", None

    # Timestamp validation & normalization (ISO 8601 UTC)
    raw_ts = str(transaction['timestamp']).strip()
    try:
        # Handle 'Z' or offset formats
        ts_clean = raw_ts.replace('Z', '+00:00')
        dt = datetime.fromisoformat(ts_clean)
        # Standardize to UTC ISO-8601 string
        normalized_ts = dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    except Exception:
        return False, f"Timestamp '{raw_ts}' is not a valid ISO-8601 datetime format", None

    validated = {
        'transaction_id': str(transaction['transaction_id']).strip(),
        'sender_id': sender_id,
        'receiver_id': receiver_id,
        'amount': amount,
        'timestamp': normalized_ts,
        'account_type': str(transaction.get('account_type', 'RETAIL')).upper().strip(),
        'device_id': str(transaction.get('device_id', 'UNKNOWN_DEVICE')).strip(),
        'ip_address': str(transaction.get('ip_address', '0.0.0.0')).strip()
    }
    return True, None, validated

def evaluate_fallback_rules(transaction, history_table=None):
    """
    Evaluates transactions using DynamoDB history when SageMaker times out.
    Handles:
    - Structuring / Smurfing (cumulative volume tracking in sliding window)
    - Account-type thresholds (Agent vs Retail)
    - High velocity detection
    - Tiered fail-open (< GH¢500) vs fail-closed (>= GH¢500) resilience
    """
    sender_id = transaction['sender_id']
    amount = transaction['amount']
    account_type = transaction.get('account_type', 'RETAIL')
    current_ts = transaction['timestamp']

    # Select tier thresholds
    if account_type in ['AGENT', 'MERCHANT']:
        single_threshold = AGENT_SINGLE_THRESHOLD
        cumulative_threshold = AGENT_CUMULATIVE_THRESHOLD
        velocity_limit = AGENT_VELOCITY_LIMIT
    else:
        single_threshold = RETAIL_SINGLE_THRESHOLD
        cumulative_threshold = RETAIL_CUMULATIVE_THRESHOLD
        velocity_limit = RETAIL_VELOCITY_LIMIT

    try:
        if history_table is None:
            history_table = dynamodb.Table(DYNAMODB_HISTORY_TABLE)

        # Sliding window timestamp calculation (window start in ISO-8601 UTC)
        try:
            curr_dt = datetime.fromisoformat(current_ts.replace('Z', '+00:00'))
        except Exception:
            curr_dt = datetime.now(timezone.utc)
        
        window_start_dt = curr_dt - timedelta(minutes=WINDOW_MINUTES)
        window_start_ts = window_start_dt.strftime('%Y-%m-%dT%H:%M:%S.%fZ')

        # Query past transactions for this sender within the sliding window
        response = history_table.query(
            KeyConditionExpression=Key('SenderId').eq(sender_id) & Key('Timestamp').gte(window_start_ts)
        )
        recent_items = response.get('Items', [])
        recent_count = len(recent_items)
        
        past_volume = sum(float(item.get('Amount', 0)) for item in recent_items)
        cumulative_volume = past_volume + amount

        # 1. Check Structuring / Smurfing: Multiple sub-threshold txns accumulating to large amounts
        if cumulative_volume > cumulative_threshold and (recent_count + 1) >= 2:
            return {
                "status": "FLAGGED",
                "reason": (f"Fallback Rule: Potential Structuring/Smurfing. "
                           f"Cumulative GH¢{cumulative_volume:.2f} exceeds GH¢{cumulative_threshold:.2f} "
                           f"in {WINDOW_MINUTES}m across {recent_count + 1} transactions."),
                "source": "DynamoDB_Fallback"
            }

        # 2. Check Velocity limit
        if recent_count >= velocity_limit:
            return {
                "status": "FLAGGED",
                "reason": (f"Fallback Rule: High Velocity. "
                           f"{recent_count + 1} transactions in {WINDOW_MINUTES}m "
                           f"exceeds {account_type} limit of {velocity_limit}."),
                "source": "DynamoDB_Fallback"
            }

        # 3. Check Single High-Value threshold
        if amount > single_threshold:
            return {
                "status": "FLAGGED",
                "reason": (f"Fallback Rule: High Single Value. "
                           f"Amount GH¢{amount:.2f} exceeds {account_type} limit of GH¢{single_threshold:.2f}."),
                "source": "DynamoDB_Fallback"
            }

        return {
            "status": "CLEARED",
            "reason": f"Passed static fallback rules for {account_type} tier",
            "source": "DynamoDB_Fallback"
        }

    except Exception as e:
        print(f"Fallback evaluation failed: {e}")
        # Tiered resilience: low amounts fail-open, large amounts fail-closed
        if amount < FAIL_OPEN_MAX_AMOUNT:
            return {
                "status": "CLEARED",
                "reason": f"Fallback error fail-open (Low risk GH¢{amount:.2f} < GH¢{FAIL_OPEN_MAX_AMOUNT:.2f})",
                "source": "DynamoDB_FailOpen"
            }
        else:
            return {
                "status": "FLAGGED",
                "reason": f"Fallback error fail-closed (High risk GH¢{amount:.2f} flagged for audit during system outage)",
                "source": "DynamoDB_FailClosed"
            }

def record_transaction_history(history_table, transaction, scoring_result):
    """
    Persists transaction to DynamoDB with a 24-hour TTL for velocity analysis and idempotency.
    """
    try:
        ttl_seconds = int(time.time()) + (24 * 3600)
        history_table.put_item(
            Item={
                'SenderId': transaction['sender_id'],
                'Timestamp': transaction['timestamp'],
                'TransactionId': transaction['transaction_id'],
                'ReceiverId': transaction['receiver_id'],
                'Amount': Decimal(str(transaction['amount'])),
                'AccountType': transaction.get('account_type', 'RETAIL'),
                'DeviceId': transaction.get('device_id', 'UNKNOWN'),
                'Status': scoring_result.get('status', 'CLEARED'),
                'Reason': scoring_result.get('reason', ''),
                'TTL': ttl_seconds
            }
        )
    except Exception as e:
        print(f"Warning: Failed to record transaction history to DynamoDB: {e}")

def lambda_handler(event, context):
    """
    Main Scoring Function:
    - Validates & sanitizes incoming transaction payload.
    - Handles OPTIONS CORS preflight.
    - Invokes SageMaker Autoencoder with 200ms circuit-breaker timeout.
    - Falls back to DynamoDB velocity & structuring rules if timeout occurs.
    - Records transaction in DynamoDB with TTL.
    - Publishes scoring decision to EventBridge.
    """
    # 1. Handle CORS Preflight
    http_method = event.get('httpMethod', '').upper()
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Preflight OK'})
        }

    try:
        # 2. Parse and validate body
        body = event.get('body', '{}')
        if isinstance(body, str):
            try:
                raw_payload = json.loads(body)
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Invalid JSON in request body'})
                }
        elif isinstance(body, dict):
            raw_payload = body
        else:
            raw_payload = {}

        is_valid, validation_err, transaction = validate_transaction(raw_payload)
        if not is_valid:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': validation_err})
            }

        transaction_id = transaction['transaction_id']
        history_table = dynamodb.Table(DYNAMODB_HISTORY_TABLE)

        # 3. Model Inference or Fallback Circuit Breaker
        # ML feature vector: [Amount, AccountTypeFlag, IsAgent, NormalDegrees, ...]
        account_type_flag = 1 if transaction['account_type'] in ['AGENT', 'MERCHANT'] else 0
        payload = f"{transaction['amount']},{account_type_flag},0,0,0"

        scoring_result = None
        start_time = time.time()

        try:
            response = sm_runtime.invoke_endpoint(
                EndpointName=SAGEMAKER_ENDPOINT,
                ContentType='text/csv',
                Body=payload
            )
            result_str = response['Body'].read().decode('utf-8')
            anomaly_score = float(result_str.strip())

            if anomaly_score > 0.8:
                scoring_result = {
                    "status": "FLAGGED",
                    "reason": f"ML Anomaly Score: {anomaly_score:.2f}",
                    "source": "SageMaker"
                }
            else:
                scoring_result = {
                    "status": "CLEARED",
                    "reason": f"Low anomaly score ({anomaly_score:.2f})",
                    "source": "SageMaker"
                }

        except (ReadTimeoutError, ClientError) as e:
            # Circuit Breaker Triggered (< 200ms budget or endpoint unavailable)
            print(f"SageMaker circuit breaker triggered: {e}")
            scoring_result = evaluate_fallback_rules(transaction, history_table=history_table)

        latency_ms = (time.time() - start_time) * 1000
        print(f"Transaction {transaction_id} evaluated in {latency_ms:.2f} ms: {scoring_result}")

        # 4. Record transaction in history table for velocity & auditing
        record_transaction_history(history_table, transaction, scoring_result)

        # 5. Publish Decision Event to Amazon EventBridge
        event_entry = {
            'Source': 'omniguard.scoring',
            'DetailType': 'FraudScoringDecision',
            'Detail': json.dumps({
                'transaction_id': transaction_id,
                'scoring_result': scoring_result,
                'original_transaction': transaction,
                'latency_ms': round(latency_ms, 2)
            }),
            'EventBusName': EVENT_BUS_NAME
        }

        try:
            eventbridge.put_events(Entries=[event_entry])
        except Exception as e:
            print(f"Warning: Failed to publish decision to EventBridge: {e}")

        # 6. Return response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'transaction_id': transaction_id,
                'decision': scoring_result,
                'latency_ms': round(latency_ms, 2)
            })
        }

    except Exception as e:
        print(f"Internal server error: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error'})
        }
