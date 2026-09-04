import unittest
from unittest.mock import MagicMock, patch
import json
import os
import sys

# Ensure src is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

import scoring_lambda

class TestScoringLambdaEdgeCases(unittest.TestCase):

    def test_validation_valid_transaction(self):
        txn = {
            "transaction_id": "TXN_001",
            "sender_id": "USER_A",
            "receiver_id": "USER_B",
            "amount": 250.0,
            "timestamp": "2026-09-04T12:00:00Z",
            "account_type": "RETAIL"
        }
        is_valid, err, val = scoring_lambda.validate_transaction(txn)
        self.assertTrue(is_valid)
        self.assertIsNone(err)
        self.assertEqual(val["amount"], 250.0)
        self.assertEqual(val["account_type"], "RETAIL")

    def test_validation_missing_required_fields(self):
        txn = {
            "transaction_id": "TXN_002",
            "sender_id": "USER_A",
            "receiver_id": "USER_B",
            "timestamp": "2026-09-04T12:00:00Z"
        }
        is_valid, err, val = scoring_lambda.validate_transaction(txn)
        self.assertFalse(is_valid)
        self.assertIn("amount", err)

    def test_validation_negative_and_zero_amounts(self):
        for bad_amount in [-100.0, 0.0, "not-a-number", float('nan')]:
            txn = {
                "transaction_id": "TXN_BAD_AMT",
                "sender_id": "USER_A",
                "receiver_id": "USER_B",
                "amount": bad_amount,
                "timestamp": "2026-09-04T12:00:00Z"
            }
            is_valid, err, val = scoring_lambda.validate_transaction(txn)
            self.assertFalse(is_valid)

    def test_validation_self_transfer(self):
        txn = {
            "transaction_id": "TXN_SELF",
            "sender_id": "USER_SAME",
            "receiver_id": "USER_SAME",
            "amount": 100.0,
            "timestamp": "2026-09-04T12:00:00Z"
        }
        is_valid, err, val = scoring_lambda.validate_transaction(txn)
        self.assertFalse(is_valid)
        self.assertIn("Self-transfers are invalid", err)

    def test_validation_invalid_timestamp(self):
        txn = {
            "transaction_id": "TXN_BAD_TS",
            "sender_id": "USER_A",
            "receiver_id": "USER_B",
            "amount": 100.0,
            "timestamp": "yesterday-at-noon"
        }
        is_valid, err, val = scoring_lambda.validate_transaction(txn)
        self.assertFalse(is_valid)
        self.assertIn("ISO-8601", err)

    def test_fallback_structuring_detection(self):
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [
                {'Amount': 4800.0, 'Timestamp': '2026-09-04T11:55:00.000000Z'},
            ]
        }
        txn = {
            "transaction_id": "TXN_SMURF_2",
            "sender_id": "USER_SMURFER",
            "receiver_id": "USER_MULE",
            "amount": 4800.0,
            "timestamp": "2026-09-04T11:58:00.000000Z",
            "account_type": "RETAIL"
        }
        decision = scoring_lambda.evaluate_fallback_rules(txn, history_table=mock_table)
        self.assertEqual(decision["status"], "FLAGGED")
        self.assertIn("Potential Structuring/Smurfing", decision["reason"])

    def test_fallback_velocity_limit_retail(self):
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [
                {'Amount': 50.0, 'Timestamp': '2026-09-04T11:50:00.000000Z'},
                {'Amount': 50.0, 'Timestamp': '2026-09-04T11:52:00.000000Z'},
                {'Amount': 50.0, 'Timestamp': '2026-09-04T11:54:00.000000Z'},
            ]
        }
        txn = {
            "transaction_id": "TXN_VELOCITY",
            "sender_id": "USER_RETAIL_1",
            "receiver_id": "USER_X",
            "amount": 100.0,
            "timestamp": "2026-09-04T11:56:00.000000Z",
            "account_type": "RETAIL"
        }
        decision = scoring_lambda.evaluate_fallback_rules(txn, history_table=mock_table)
        self.assertEqual(decision["status"], "FLAGGED")
        self.assertIn("High Velocity", decision["reason"])

    def test_fallback_agent_tier_tolerance(self):
        mock_table = MagicMock()
        mock_table.query.return_value = {
            'Items': [{'Amount': 2000.0, 'Timestamp': '2026-09-04T11:50:00.000000Z'}] * 5
        }
        txn = {
            "transaction_id": "TXN_AGENT_LEGIT",
            "sender_id": "USER_AGENT_01",
            "receiver_id": "USER_CUSTOMER",
            "amount": 15000.0,
            "timestamp": "2026-09-04T11:58:00.000000Z",
            "account_type": "AGENT"
        }
        decision = scoring_lambda.evaluate_fallback_rules(txn, history_table=mock_table)
        self.assertEqual(decision["status"], "CLEARED")

    def test_fallback_tiered_fail_open_low_value(self):
        mock_table = MagicMock()
        mock_table.query.side_effect = Exception("DynamoDB service unavailable")
        
        txn = {
            "transaction_id": "TXN_LOW_VAL",
            "sender_id": "USER_A",
            "receiver_id": "USER_B",
            "amount": 150.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL"
        }
        decision = scoring_lambda.evaluate_fallback_rules(txn, history_table=mock_table)
        self.assertEqual(decision["status"], "CLEARED")
        self.assertEqual(decision["source"], "DynamoDB_FailOpen")

    def test_fallback_tiered_fail_closed_high_value(self):
        mock_table = MagicMock()
        mock_table.query.side_effect = Exception("DynamoDB service unavailable")
        
        txn = {
            "transaction_id": "TXN_HIGH_VAL",
            "sender_id": "USER_A",
            "receiver_id": "USER_B",
            "amount": 6500.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL"
        }
        decision = scoring_lambda.evaluate_fallback_rules(txn, history_table=mock_table)
        self.assertEqual(decision["status"], "FLAGGED")
        self.assertEqual(decision["source"], "DynamoDB_FailClosed")

    # ==================== Auto-Triage & Pattern Explanation Tests ====================
    def test_auto_triage_high_confidence_fraud(self):
        txn = {
            "transaction_id": "TXN_AUTO_FRAUD",
            "sender_id": "USER_MULE_X",
            "receiver_id": "USER_AGGREGATOR",
            "amount": 4900.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL",
            "device_id": "DEV_BURNER_01"
        }
        scoring_res = {"status": "FLAGGED", "reason": "High anomaly", "source": "SageMaker"}
        triage = scoring_lambda.synthesize_pattern_explanation(txn, scoring_res, anomaly_score=0.94)
        
        self.assertEqual(triage["triage_tier"], "AUTO_CONFIRMED_FRAUD")
        self.assertIn("Auto-Confirmed Fraud", triage["narrative"])
        self.assertEqual(triage["action_code"], "CBS_FREEZE_HOLD")

    def test_auto_triage_low_confidence_safe(self):
        txn = {
            "transaction_id": "TXN_AUTO_SAFE",
            "sender_id": "USER_REGULAR",
            "receiver_id": "USER_KWAME",
            "amount": 250.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL",
            "device_id": "DEV_REGULAR_PHONE"
        }
        scoring_res = {"status": "CLEARED", "reason": "Low score", "source": "SageMaker"}
        triage = scoring_lambda.synthesize_pattern_explanation(txn, scoring_res, anomaly_score=0.15)
        
        self.assertEqual(triage["triage_tier"], "AUTO_CLEARED_SAFE")
        self.assertIn("Auto-Cleared Safe", triage["narrative"])
        self.assertEqual(triage["action_code"], "SETTLEMENT_APPROVED")

    def test_auto_triage_gray_zone_human_review(self):
        txn = {
            "transaction_id": "TXN_GRAY_ZONE",
            "sender_id": "USER_BORDERLINE",
            "receiver_id": "USER_MERCHANT",
            "amount": 2200.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL",
            "device_id": "DEV_NEW_PHONE"
        }
        scoring_res = {"status": "CLEARED", "reason": "Moderate score", "source": "SageMaker"}
        triage = scoring_lambda.synthesize_pattern_explanation(txn, scoring_res, anomaly_score=0.65)
        
        self.assertEqual(triage["triage_tier"], "REQUIRES_HUMAN_REVIEW")
        self.assertIn("Human Review Required", triage["narrative"])
        self.assertEqual(triage["action_code"], "MANUAL_REVIEW_QUEUE")

    def test_auto_triage_fallback_smurfing_narrative(self):
        txn = {
            "transaction_id": "TXN_SMURF_AUTO",
            "sender_id": "USER_SMURFER",
            "receiver_id": "USER_MULE",
            "amount": 4850.0,
            "timestamp": "2026-09-04T12:00:00.000000Z",
            "account_type": "RETAIL",
            "device_id": "DEV_FARM_99"
        }
        scoring_res = {
            "status": "FLAGGED", 
            "reason": "Fallback Rule: Potential Structuring/Smurfing. Cumulative GH¢9,700 exceeds GH¢8,000",
            "source": "DynamoDB_Fallback"
        }
        triage = scoring_lambda.synthesize_pattern_explanation(txn, scoring_res)
        
        self.assertEqual(triage["triage_tier"], "AUTO_CONFIRMED_FRAUD")
        self.assertIn("smurfing", triage["narrative"])

    def test_options_cors_preflight(self):
        event = {'httpMethod': 'OPTIONS'}
        response = scoring_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 200)
        self.assertIn('Access-Control-Allow-Origin', response['headers'])
        self.assertEqual(response['headers']['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['headers']['X-Frame-Options'], 'DENY')
        self.assertIn('max-age=', response['headers']['Strict-Transport-Security'])

    def test_security_headers_on_validation_failure(self):
        event = {'httpMethod': 'POST', 'body': json.dumps({"bad": "data"})}
        response = scoring_lambda.lambda_handler(event, None)
        self.assertEqual(response['statusCode'], 400)
        self.assertEqual(response['headers']['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['headers']['X-Frame-Options'], 'DENY')
        self.assertIn('max-age=', response['headers']['Strict-Transport-Security'])

if __name__ == '__main__':
    unittest.main()
