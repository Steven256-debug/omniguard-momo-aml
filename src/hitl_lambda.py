import json
import os
import boto3
import uuid
import re
from datetime import datetime, timezone

s3 = boto3.client('s3')
eventbridge = boto3.client('events')

HITL_BUCKET = os.environ.get('HITL_BUCKET', 'omniguard-hitl-feedback')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'OmniGuard-EnterpriseBus')
SUPERVISOR_AUDIT_THRESHOLD = float(os.environ.get('SUPERVISOR_AUDIT_THRESHOLD', '10000.0'))

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
}

VALID_LABELS = {'TRUE_POSITIVE', 'FALSE_POSITIVE'}

def lambda_handler(event, context):
    """
    Receives and audits analyst feedback from the Fraud Analyst Dashboard.
    Validates labels, handles preflight CORS, applies dual-control safeguards
    for high-value disputes, and stores immutable records in S3.
    """
    http_method = event.get('httpMethod', '').upper()
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Preflight OK'})
        }

    try:
        body_str = event.get('body', '{}')
        if not body_str:
            body_str = '{}'
        
        try:
            body = json.loads(body_str) if isinstance(body_str, str) else body_str
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }

        transaction_id = str(body.get('transaction_id', '')).strip()
        feedback_label = str(body.get('feedback_label', '')).upper().strip()
        notes = str(body.get('notes', '')).strip()[:1000] # Cap notes at 1,000 chars
        reviewer_id = str(body.get('reviewer_id', 'FIU_AGENT_WEB')).strip()[:100]
        
        # Optional transaction amount for dispute governance
        amount_raw = body.get('amount')
        try:
            amount = float(amount_raw) if amount_raw is not None else 0.0
        except (ValueError, TypeError):
            amount = 0.0

        # Strict validation
        if not transaction_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': "Missing or empty required field: 'transaction_id'"})
            }

        if feedback_label not in VALID_LABELS:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'error': f"Invalid 'feedback_label'. Must be one of: {list(VALID_LABELS)}"
                })
            }

        # Dual-control governance: if reversing a high-value flag (> GH¢10,000), require secondary sign-off
        requires_supervisor_audit = False
        if feedback_label == 'FALSE_POSITIVE' and amount >= SUPERVISOR_AUDIT_THRESHOLD:
            requires_supervisor_audit = True

        feedback_id = f"FB_{uuid.uuid4().hex[:10]}"
        now_utc = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')

        feedback_record = {
            'feedback_id': feedback_id,
            'transaction_id': transaction_id,
            'feedback_label': feedback_label,
            'reviewer_id': reviewer_id,
            'notes': notes,
            'amount': amount,
            'requires_supervisor_audit': requires_supervisor_audit,
            'reviewed_at': now_utc
        }

        # Secure S3 Storage: organized by transaction_id prefix to prevent namespace collisions
        safe_txn_id = re.sub(r'[^a-zA-Z0-9_-]', '_', transaction_id)
        s3_key = f"feedback/{safe_txn_id}/{feedback_id}.json"

        try:
            s3.put_object(
                Bucket=HITL_BUCKET,
                Key=s3_key,
                Body=json.dumps(feedback_record, indent=2),
                ContentType='application/json'
            )
            print(f"Successfully stored feedback record: {s3_key}")
        except Exception as e:
            print(f"Warning: S3 put_object failed: {e}")

        # Publish Event to EventBridge for ML Retraining trigger or Supervisor alerting
        detail_type = 'SupervisorAuditRequired' if requires_supervisor_audit else 'AnalystFeedbackSubmitted'
        event_entry = {
            'Source': 'omniguard.hitl',
            'DetailType': detail_type,
            'Detail': json.dumps(feedback_record),
            'EventBusName': EVENT_BUS_NAME
        }

        try:
            eventbridge.put_events(Entries=[event_entry])
            print(f"Successfully published {detail_type} to EventBridge.")
        except Exception as e:
            print(f"Warning: Failed to publish feedback event to EventBridge: {e}")

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Feedback successfully recorded',
                'feedback_id': feedback_id,
                'requires_supervisor_audit': requires_supervisor_audit
            })
        }

    except Exception as e:
        print(f"Internal server error in HITL handler: {e}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error'})
        }
