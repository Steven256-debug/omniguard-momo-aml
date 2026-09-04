import unittest
from unittest.mock import MagicMock, patch
import json
import os
import sys

# Set default AWS test credentials for CI/CD environments
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')
os.environ.setdefault('AWS_REGION', 'us-east-1')
os.environ.setdefault('AWS_ACCESS_KEY_ID', 'testing')
os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'testing')

# Ensure src is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

import hitl_lambda

class TestHITLLambdaEdgeCases(unittest.TestCase):

    def test_options_cors_preflight(self):
        event = {'httpMethod': 'OPTIONS'}
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.assertIn('Access-Control-Allow-Origin', response['headers'])
        self.assertEqual(response['headers']['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['headers']['X-Frame-Options'], 'DENY')
        self.assertIn('max-age=', response['headers']['Strict-Transport-Security'])

    def test_security_headers_on_validation_failure(self):
        event = {'httpMethod': 'POST', 'body': json.dumps({"bad": "data"})}
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(response['headers']['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['headers']['X-Frame-Options'], 'DENY')
        self.assertIn('max-age=', response['headers']['Strict-Transport-Security'])

    @patch('hitl_lambda.s3')
    @patch('hitl_lambda.eventbridge')
    def test_valid_feedback_submission(self, mock_eb, mock_s3):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'transaction_id': 'TXN_12345',
                'feedback_label': 'TRUE_POSITIVE',
                'notes': 'Verified syndicate member',
                'reviewer_id': 'AGENT_KWAME'
            })
        }
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertIn('feedback_id', body)
        self.assertFalse(body['requires_supervisor_audit'])
        mock_s3.put_object.assert_called_once()
        mock_eb.put_events.assert_called_once()

    @patch('hitl_lambda.s3')
    @patch('hitl_lambda.eventbridge')
    def test_auto_triage_labels_accepted(self, mock_eb, mock_s3):
        # Auto-triage labels must be accepted
        for label in ['AUTO_CONFIRMED_FRAUD', 'AUTO_CLEARED_SAFE']:
            event = {
                'httpMethod': 'POST',
                'body': json.dumps({
                    'transaction_id': f'TXN_{label}',
                    'feedback_label': label,
                    'notes': 'Auto-triaged by AI rule engine',
                    'reviewer_id': 'SYSTEM_AUTO_TRIAGE'
                })
            }
            response = hitl_lambda.lambda_handler(event, None)
            self.assertEqual(response['statusCode'], 200)

    @patch('hitl_lambda.s3')
    @patch('hitl_lambda.eventbridge')
    def test_batch_auto_triage_processing(self, mock_eb, mock_s3):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'items': [
                    {'transaction_id': 'TXN_B1', 'feedback_label': 'AUTO_CONFIRMED_FRAUD', 'notes': 'Structuring'},
                    {'transaction_id': 'TXN_B2', 'feedback_label': 'AUTO_CLEARED_SAFE', 'notes': 'Routine'}
                ]
            })
        }
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertEqual(body['processed'], 2)

    def test_invalid_feedback_label(self):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'transaction_id': 'TXN_12345',
                'feedback_label': 'NOT_SURE_MAYBE_FRAUD'
            })
        }
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn("Invalid 'feedback_label'", body['error'])

    def test_missing_transaction_id(self):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'feedback_label': 'TRUE_POSITIVE'
            })
        }
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        body = json.loads(response['body'])
        self.assertIn("transaction_id", body['error'])

    @patch('hitl_lambda.s3')
    @patch('hitl_lambda.eventbridge')
    def test_high_value_dispute_supervisor_flag(self, mock_eb, mock_s3):
        event = {
            'httpMethod': 'POST',
            'body': json.dumps({
                'transaction_id': 'TXN_HIGH_VALUE_DISPUTE',
                'feedback_label': 'FALSE_POSITIVE',
                'amount': 25000.0,
                'notes': 'Customer appealed in person with Ghana Card'
            })
        }
        response = hitl_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        body = json.loads(response['body'])
        self.assertTrue(body['requires_supervisor_audit'])

if __name__ == '__main__':
    unittest.main()
