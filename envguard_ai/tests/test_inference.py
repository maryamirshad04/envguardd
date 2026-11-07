"""
EnvGuard AI: Standalone Inference Unit & Integration Tests
==========================================================
Verifies that the standalone inference module correctly extracts features,
scores normal vs suspicious events, handles edge cases and missing metadata,
and behaves deterministically.

Author: Antigravity AI Engineering
Date: November 2026
"""

import unittest
import datetime
import os
import sys

# Add parent directory to sys.path so we can import src directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.inference import EnvGuardAnomalyDetector, predict_anomaly

class TestEnvGuardInference(unittest.TestCase):
    """Test suite for standalone EnvGuard anomaly detector."""
    
    @classmethod
    def setUpClass(cls):
        cls.detector = EnvGuardAnomalyDetector()
        
    def test_01_normal_working_hours_access(self):
        """A standard secret read in development during normal hours should be classified as normal."""
        event = {
            "user_id": "user_dev_001",
            "timestamp": "2026-11-07 14:30:00",
            "event_type": "secret_read",
            "environment": "development",
            "ip_address": "192.168.1.50",
            "status": "SUCCESS"
        }
        res = self.detector.predict_anomaly(event)
        
        self.assertFalse(res["is_anomalous"], "Normal dev read was falsely flagged as anomalous.")
        self.assertLess(res["anomaly_score"], 0.0, "Normal dev read anomaly score should be below 0.")
        self.assertLess(res["risk_score"], 50.0, "Normal dev read risk score should be below 50.")
        self.assertEqual(res["features"]["after_hours_flag"], 0.0)
        self.assertEqual(res["features"]["is_prod_access"], 0.0)
        print(f"[PASS] Normal Access: score={res['anomaly_score']:.4f}, risk={res['risk_score']}")

    def test_02_midnight_after_hours_burst(self):
        """Repeated production secret access at 02:30 AM on a weekend must be flagged as anomalous."""
        t_base = datetime.datetime(2026, 11, 8, 2, 30, 0) # Sunday 02:30 AM
        recent = []
        for i in range(10):
            recent.append({
                "timestamp": t_base - datetime.timedelta(seconds=20 * (i + 1)),
                "event_type": "secret_read",
                "environment": "production",
                "ip_address": "192.168.1.50",
                "status": "SUCCESS"
            })
            
        current_event = {
            "user_id": "user_dev_001",
            "timestamp": t_base.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": "secret_read",
            "environment": "production",
            "ip_address": "192.168.1.50",
            "status": "SUCCESS"
        }
        # Developer has dev-only history
        user_profile = {"prod_ratio": 0.02, "mean_daily": 6.0, "std_daily": 2.0}
        
        res = self.detector.predict_anomaly(current_event, recent_events=recent, user_profile=user_profile)
        
        self.assertTrue(res["is_anomalous"], "Midnight prod burst was NOT flagged as anomalous.")
        self.assertGreater(res["anomaly_score"], 0.0, "Anomaly score should be positive.")
        self.assertGreater(res["risk_score"], 50.0, "Risk score should be elevated above 50.")
        self.assertGreaterEqual(len(res["contributing_factors"]), 2, "Should identify multiple contributing risk factors.")
        print(f"[PASS] Midnight Prod Burst: score={res['anomaly_score']:.4f}, risk={res['risk_score']}, factors={res['contributing_factors']}")

    def test_03_high_velocity_scraping(self):
        """25 secret reads within 2 minutes should trigger rapid burst isolation."""
        t_base = datetime.datetime(2026, 11, 7, 15, 0, 0)
        recent = []
        for i in range(25):
            recent.append({
                "timestamp": t_base - datetime.timedelta(seconds=4 * (i + 1)),
                "event_type": "secret_read",
                "environment": "development",
                "ip_address": "192.168.1.50",
                "status": "SUCCESS"
            })
            
        current = {
            "user_id": "user_dev_002",
            "timestamp": t_base.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": "secret_read",
            "environment": "development",
            "ip_address": "192.168.1.50",
            "status": "SUCCESS"
        }
        res = self.detector.predict_anomaly(current, recent_events=recent)
        
        self.assertTrue(res["is_anomalous"], "High velocity scraping was not flagged.")
        self.assertGreaterEqual(res["features"]["read_burst_count_5m"], 20.0)
        print(f"[PASS] Mass Scraping: score={res['anomaly_score']:.4f}, burst={res['features']['read_burst_count_5m']}")

    def test_04_historical_context_effect(self):
        """Demonstrates that recent activity history dynamically modulates behavioral features and anomaly scores."""
        t_base = datetime.datetime(2026, 11, 7, 14, 0, 0)
        current_event = {
            "user_id": "user_dev_005",
            "timestamp": t_base.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": "secret_read",
            "environment": "development",
            "ip_address": "192.168.1.50",
            "status": "SUCCESS"
        }
        
        # Scenario A: 10 reads concentrated within 3 minutes (rapid burst)
        burst_events = [
            {
                "timestamp": t_base - datetime.timedelta(seconds=15 * i),
                "event_type": "secret_read",
                "environment": "development",
                "ip_address": "192.168.1.50",
                "status": "SUCCESS"
            }
            for i in range(1, 11)
        ]
        res_burst = self.detector.predict_anomaly(current_event, recent_events=burst_events)
        
        # Scenario B: 10 reads spread evenly over the preceding 10 hours (normal routine cadence)
        spread_events = [
            {
                "timestamp": t_base - datetime.timedelta(hours=i),
                "event_type": "secret_read",
                "environment": "development",
                "ip_address": "192.168.1.50",
                "status": "SUCCESS"
            }
            for i in range(1, 11)
        ]
        res_spread = self.detector.predict_anomaly(current_event, recent_events=spread_events)
        
        # Verify feature modulation
        self.assertGreater(res_burst["features"]["read_burst_count_5m"], res_spread["features"]["read_burst_count_5m"])
        self.assertEqual(res_spread["features"]["read_burst_count_5m"], 1.0)
        self.assertGreaterEqual(res_burst["features"]["read_burst_count_5m"], 10.0)
        
        # Verify score impact: burst activity must have significantly higher anomaly score than routine spread activity
        self.assertGreater(res_burst["anomaly_score"], res_spread["anomaly_score"],
                           f"Burst score ({res_burst['anomaly_score']}) should be higher than spread score ({res_spread['anomaly_score']}).")
        print(f"[PASS] Historical Context Effect: Burst Score={res_burst['anomaly_score']:.4f} vs Spread Score={res_spread['anomaly_score']:.4f}")

    def test_05_missing_and_invalid_metadata_handling(self):
        """Inference engine must gracefully handle missing fields, unexpected strings, or nulls without crashing."""
        malformed_event = {
            "timestamp": None,  # Should fallback to current time
            "environment": "UNKNOWN_ENV", # Should default safely
            "event_type": None,
            "status": None
        }
        res = self.detector.predict_anomaly(malformed_event, recent_events=None, user_profile=None)
        
        self.assertIn("is_anomalous", res)
        self.assertIn("anomaly_score", res)
        self.assertIn("features", res)
        self.assertEqual(len(res["features"]), 15, "All 15 features must be present despite malformed inputs.")
        print(f"[PASS] Malformed Input Handled: score={res['anomaly_score']:.4f}, risk={res['risk_score']}")

    def test_06_deterministic_idempotence(self):
        """Repeated inferences on identical inputs must yield identical numerical scores."""
        event = {
            "user_id": "user_dev_010",
            "timestamp": "2026-11-07 11:15:00",
            "event_type": "secret_update",
            "environment": "staging",
            "ip_address": "10.0.1.20",
            "status": "SUCCESS"
        }
        res1 = self.detector.predict_anomaly(event)
        res2 = self.detector.predict_anomaly(event)
        
        self.assertEqual(res1["anomaly_score"], res2["anomaly_score"])
        self.assertEqual(res1["risk_score"], res2["risk_score"])
        self.assertEqual(res1["features"], res2["features"])
        print(f"[PASS] Idempotence Verified: identical scores {res1['anomaly_score']}")

if __name__ == "__main__":
    unittest.main()
