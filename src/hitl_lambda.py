import json
import os
import boto3
import uuid
from datetime import datetime

s3 = boto3.client('s3')
eventbridge = boto3.client('events')

HITL_BUCKET = os.environ.get('HITL_BUCKET', 'omniguard-hitl-feedback')
EVENT_BUS_NAME = os.environ.get('EVENT_BUS_NAME', 'OmniGuard-EnterpriseBus')

def lambda_handler(event, context):
    """
    Receives feedback from the Fraud Analyst Dashboard and stores it in S3.
    """
    print(f"Received event: {event}")
    try:
        body_str = event.get('body', '{}')
        if not body_str:
            body_str = '{}'
        
        body = json.loads(body_str)
        transaction_id = body.get('transaction_id')
        feedback_label = body.get('feedback_label') # 'TRUE_POSITIVE' or 'FALSE_POSITIVE'
        notes = body.get('notes', '')
        reviewer_id = body.get('reviewer_id', 'FIU_AGENT_WEB')

        if not transaction_id or not feedback_label:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                'body': json.dumps({'error': 'Missing transaction_id or feedback_label'})
            }

        feedback_record = {
            'feedback_id': f"FB_{uuid.uuid4().hex[:8]}",
            'transaction_id': transaction_id,
            'feedback_label': feedback_label,
            'reviewer_id': reviewer_id,
            'notes': notes,
            'reviewed_at': datetime.utcnow().isoformat() + 'Z'
        }

        # Store in S3
        file_name = f"{transaction_id}_{feedback_record['feedback_id']}.json"
        
        s3.put_object(
            Bucket=HITL_BUCKET,
            Key=f"feedback/{file_name}",
            Body=json.dumps(feedback_record),
            ContentType='application/json'
        )
        print(f"Successfully stored feedback: {file_name}")

        # Publish Event to EventBridge
        event_entry = {
            'Source': 'omniguard.hitl',
            'DetailType': 'AnalystFeedbackSubmitted',
            'Detail': json.dumps(feedback_record),
            'EventBusName': EVENT_BUS_NAME
        }
        
        eventbridge.put_events(Entries=[event_entry])
        print(f"Successfully published feedback event to EventBridge.")

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': json.dumps({'message': 'Feedback successfully recorded', 'feedback_id': feedback_record['feedback_id']})
        }
        
    except Exception as e:
        print(f"Internal Server Error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': json.dumps({'error': 'Internal server error'})
        }
