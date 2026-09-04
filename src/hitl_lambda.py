import json
import os
import boto3
import uuid
import re
from datetime import datetime, timezone

DEFAULT_REGION = os.environ.get('AWS_REGION', os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))
s3 = boto3.client('s3', region_name=DEFAULT_REGION)
eventbridge = boto3.client('events', region_name=DEFAULT_REGION)

HITL_BUCKET = os.environ.get('HITL_BUCKET', 'omniguard-hitl-feedback')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'OmniGuard-EnterpriseBus')
SUPERVISOR_AUDIT_THRESHOLD = float(os.environ.get('SUPERVISOR_AUDIT_THRESHOLD', '10000.0'))

# Security: Configurable Origin and Defense-in-Depth HTTP Security Headers
ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', 'https://d2fui87kr2y14y.cloudfront.net')

def get_security_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
    }

VALID_LABELS = {
    'TRUE_POSITIVE', 
    'FALSE_POSITIVE', 
    'AUTO_CONFIRMED_FRAUD', 
    'AUTO_CLEARED_SAFE'
}

def process_single_feedback(body):
    """Processes a single feedback or auto-triage record."""
    transaction_id = str(body.get('transaction_id', '')).strip()
    feedback_label = str(body.get('feedback_label', '')).upper().strip()
    notes = str(body.get('notes', '')).strip()[:1000]
    reviewer_id = str(body.get('reviewer_id', 'FIU_AGENT_WEB')).strip()[:100]
    
    amount_raw = body.get('amount')
    try:
        amount = float(amount_raw) if amount_raw is not None else 0.0
    except (ValueError, TypeError):
        amount = 0.0

    if not transaction_id:
        return False, "Missing or empty required field: 'transaction_id'", None

    if feedback_label not in VALID_LABELS:
        return False, f"Invalid 'feedback_label'. Must be one of: {list(VALID_LABELS)}", None

    requires_supervisor_audit = False
    if feedback_label in ['FALSE_POSITIVE', 'AUTO_CLEARED_SAFE'] and amount >= SUPERVISOR_AUDIT_THRESHOLD:
        requires_supervisor_audit = True

    feedback_id = f"FB_{uuid.uuid4().hex[:10]}"
    now_utc = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ')

    record = {
        'feedback_id': feedback_id,
        'transaction_id': transaction_id,
        'feedback_label': feedback_label,
        'reviewer_id': reviewer_id,
        'notes': notes,
        'amount': amount,
        'requires_supervisor_audit': requires_supervisor_audit,
        'reviewed_at': now_utc
    }

    safe_txn_id = re.sub(r'[^a-zA-Z0-9_-]', '_', transaction_id)
    s3_key = f"feedback/{safe_txn_id}/{feedback_id}.json"

    try:
        s3.put_object(
            Bucket=HITL_BUCKET,
            Key=s3_key,
            Body=json.dumps(record, indent=2),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"Warning: S3 put_object failed: {e}")

    detail_type = 'SupervisorAuditRequired' if requires_supervisor_audit else 'AnalystFeedbackSubmitted'
    event_entry = {
        'Source': 'omniguard.hitl',
        'DetailType': detail_type,
        'Detail': json.dumps(record),
        'EventBusName': EVENT_BUS_NAME
    }

    try:
        eventbridge.put_events(Entries=[event_entry])
    except Exception as e:
        print(f"Warning: Failed to publish feedback event to EventBridge: {e}")

    return True, None, record

def lambda_handler(event, context):
    """
    Receives analyst feedback or automated triage decisions.
    Supports single feedback submission as well as batch auto-triage resolutions.
    """
    http_method = event.get('httpMethod', '').upper()
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': get_security_headers(),
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
                'headers': get_security_headers(),
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }

        # Check if batch request
        if isinstance(body, dict) and 'items' in body and isinstance(body['items'], list):
            results = []
            for item in body['items']:
                success, err, record = process_single_feedback(item)
                if success:
                    results.append({'transaction_id': record['transaction_id'], 'status': 'RECORDED'})
                else:
                    results.append({'transaction_id': item.get('transaction_id'), 'error': err})
            return {
                'statusCode': 200,
                'headers': get_security_headers(),
                'body': json.dumps({'message': 'Batch feedback processed', 'processed': len(results), 'results': results})
            }

        # Single feedback processing
        success, err, record = process_single_feedback(body)
        if not success:
            return {
                'statusCode': 400,
                'headers': get_security_headers(),
                'body': json.dumps({'error': err})
            }

        return {
            'statusCode': 200,
            'headers': get_security_headers(),
            'body': json.dumps({
                'message': 'Feedback successfully recorded',
                'feedback_id': record['feedback_id'],
                'requires_supervisor_audit': record['requires_supervisor_audit']
            })
        }

    except Exception as e:
        print(f"Internal server error in HITL handler: {e}")
        return {
            'statusCode': 500,
            'headers': get_security_headers(),
            'body': json.dumps({'error': 'Internal server error'})
        }
