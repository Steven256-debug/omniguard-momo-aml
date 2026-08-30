import json
import os
import boto3
import time
from botocore.exceptions import ClientError, ReadTimeoutError
from botocore.config import Config

# Initialize AWS clients
# We set a tight read_timeout for the SageMaker client to implement the circuit breaker pattern
# If the endpoint takes longer than 200ms (0.2s), it will raise a ReadTimeoutError
sagemaker_config = Config(read_timeout=0.2, retries={'max_attempts': 0})
sm_runtime = boto3.client('sagemaker-runtime', config=sagemaker_config)

dynamodb = boto3.resource('dynamodb')
eventbridge = boto3.client('events')

# Environment Variables
SAGEMAKER_ENDPOINT = os.environ.get('SAGEMAKER_ENDPOINT', 'omniguard-sagemaker-endpoint')
DYNAMODB_RULES_TABLE = os.environ.get('DYNAMODB_RULES_TABLE', 'OmniGuard-StaticRules')
DYNAMODB_HISTORY_TABLE = os.environ.get('DYNAMODB_HISTORY_TABLE', 'OmniGuard-TransactionHistory')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'OmniGuard-EnterpriseBus')

def evaluate_fallback_rules(transaction):
    """
    Fallback mechanism: Evaluates the transaction against static rules stored in DynamoDB.
    Ensures payment grid uptime if the ML engine is slow or unavailable.
    """
    print("Executing fallback static rule evaluation.")
    
    sender_id = transaction.get('sender_id')
    amount = float(transaction.get('amount', 0))
    
    # Rule: If transaction amount > GH¢5,000 AND the number of transactions in the last 10 minutes > 3, then flag for review.
    # In a real environment, threshold values could be fetched dynamically from DYNAMODB_RULES_TABLE.
    # Here we demonstrate the velocity-based fallback logic using DYNAMODB_HISTORY_TABLE.
    
    threshold_amount = 5000.0
    velocity_limit = 3
    
    try:
        if amount > threshold_amount:
            # Check transaction velocity in the last 10 minutes
            history_table = dynamodb.Table(DYNAMODB_HISTORY_TABLE)
            
            # Calculate timestamp for 10 minutes ago
            ten_mins_ago = time.time() - (10 * 60)
            # Assuming timestamps are stored as ISO8601 strings or Unix epochs
            # In a mocked setup without a real DB population, we simulate the query structure:
            
            # response = history_table.query(
            #     KeyConditionExpression="SenderId = :sid AND Timestamp > :t",
            #     ExpressionAttributeValues={":sid": sender_id, ":t": ten_mins_ago}
            # )
            # recent_txns_count = response.get('Count', 0)
            
            # Mocking the count for demonstration purposes
            recent_txns_count = 4 
            
            if recent_txns_count > velocity_limit:
                return {
                    "status": "FLAGGED", 
                    "reason": f"Fallback Rule: High Value (> {threshold_amount}) AND High Velocity (> {velocity_limit} in 10m)", 
                    "source": "DynamoDB"
                }
        
        return {"status": "CLEARED", "reason": "Passed static fallback rules", "source": "DynamoDB"}
    
    except Exception as e:
        print(f"Fallback evaluation failed: {e}")
        # Fail-open to not block payments during an outage
        return {"status": "CLEARED", "reason": "Fallback error fail-open", "source": "DynamoDB"}

def lambda_handler(event, context):
    """
    Main Scoring Function: Invokes SageMaker Autoencoder for anomaly detection.
    Falls back to DynamoDB static rules if invocation exceeds 200ms.
    Publishes the result to EventBridge for downstream Core Banking Systems.
    """
    try:
        # 1. Parse incoming transaction data
        body = event.get('body', '{}')
        if isinstance(body, str):
            transaction = json.loads(body)
        else:
            transaction = body

        transaction_id = transaction.get('transaction_id', 'UNKNOWN')
        
        # Format payload for SageMaker (assuming CSV format for the Autoencoder: Amount, etc.)
        # In reality, this requires feature engineering (fetching graph metrics from Neptune, etc.)
        payload = f"{transaction.get('amount', 0)},1,0,0,0" # Mock feature vector
        
        # 2. Invoke SageMaker with Circuit Breaker (Timeout = 200ms)
        scoring_result = None
        start_time = time.time()
        
        try:
            response = sm_runtime.invoke_endpoint(
                EndpointName=SAGEMAKER_ENDPOINT,
                ContentType='text/csv',
                Body=payload
            )
            result_str = response['Body'].read().decode('utf-8')
            # Assuming the model returns an anomaly score or reconstruction error
            anomaly_score = float(result_str.strip())
            
            if anomaly_score > 0.8: # Threshold for anomaly
                scoring_result = {"status": "FLAGGED", "reason": f"ML Anomaly Score: {anomaly_score}", "source": "SageMaker"}
            else:
                scoring_result = {"status": "CLEARED", "reason": "Low anomaly score", "source": "SageMaker"}
                
        except (ReadTimeoutError, ClientError) as e:
            # Circuit Breaker Triggered
            print(f"SageMaker invocation failed or timed out: {e}")
            scoring_result = evaluate_fallback_rules(transaction)
        
        latency = (time.time() - start_time) * 1000
        print(f"Scoring completed in {latency:.2f} ms. Result: {scoring_result}")
        
        # 3. Publish Decision Event to Amazon EventBridge (Enterprise Router)
        event_entry = {
            'Source': 'omniguard.scoring',
            'DetailType': 'FraudScoringDecision',
            'Detail': json.dumps({
                'transaction_id': transaction_id,
                'scoring_result': scoring_result,
                'original_transaction': transaction
            }),
            'EventBusName': EVENT_BUS_NAME
        }
        
        try:
            eventbridge.put_events(Entries=[event_entry])
            print("Successfully published event to EventBridge.")
        except Exception as e:
            print(f"Failed to publish to EventBridge: {e}")

        # 4. Return response to API Gateway
        return {
            'statusCode': 200,
            'body': json.dumps({
                'transaction_id': transaction_id,
                'decision': scoring_result
            })
        }
        
    except Exception as e:
        print(f"Internal Server Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
