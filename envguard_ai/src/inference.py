"""
EnvGuard AI: Standalone Anomaly Detection Inference Engine
==========================================================
Provides a self-contained, real-time inference service for evaluating
secrets-manager operational audit events against the trained Isolation Forest
model.

Zero-Knowledge Guarantee:
- Evaluates operational metadata ONLY: timestamp, user_id, event_type,
  environment, ip_address, status.
- Never inspects, processes, or logs decrypted secrets or key material.

Author: Antigravity AI Engineering
Date: November 2026
"""

import os
import json
import datetime
from typing import Dict, Any, List, Optional, Union
import joblib
import numpy as np
import pandas as pd

from .preprocessing import (
    FEATURE_NAMES,
    extract_single_event_features,
    DEFAULT_ORG_PROD_RATIO,
    SENSITIVE_OPERATIONS
)

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "envguard_isolation_forest.joblib")
DEFAULT_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "feature_schema.json")
DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "envguard_model_config.json")

class EnvGuardAnomalyDetector:
    """
    Production-grade inference engine for EnvGuard audit event anomaly detection.
    """
    def __init__(
        self,
        model_path: Optional[str] = None,
        config_path: Optional[str] = None,
        threshold: Optional[float] = None
    ):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.config_path = config_path or DEFAULT_CONFIG_PATH
        
        self.model = None
        self.config = {}
        self.threshold = threshold if threshold is not None else 0.0
        self.feature_names = FEATURE_NAMES
        
        self._load_model_and_config()

    def _load_model_and_config(self):
        """Loads the serialized model and training configuration."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found at: {self.model_path}")
            
        self.model = joblib.load(self.model_path)
        
        if os.path.exists(self.config_path):
            with open(self.config_path, "r") as f:
                self.config = json.load(f)
            # Safely read operational threshold if not explicitly overridden by constructor
            if self.threshold is None or self.threshold == 0.0:
                if "operational_threshold" in self.config:
                    self.threshold = float(self.config["operational_threshold"])
                elif "threshold_documentation" in self.config and "operational_anomaly_threshold" in self.config["threshold_documentation"]:
                    self.threshold = float(self.config["threshold_documentation"]["operational_anomaly_threshold"])
                else:
                    # Inverted decision_function threshold is 0.0
                    self.threshold = 0.0
        else:
            self.config = {}

    def extract_features(
        self,
        current_event: Dict[str, Any],
        recent_events: Optional[List[Dict[str, Any]]] = None,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Extracts the 15 EnvGuard-native features for a given event and historical context.
        """
        return extract_single_event_features(
            current_event=current_event,
            recent_events=recent_events,
            user_profile=user_profile
        )

    def calculate_risk_score(self, anomaly_score: float) -> float:
        """
        Transforms raw unbounded inverted anomaly score into a calibrated [0, 100] risk index.
        Sigmoid mapping centered at threshold 0.0 with steepness k=15.
        """
        # A score of -0.20 (typical normal) maps to ~5
        # A score of 0.0 (decision boundary) maps to 50
        # A score of +0.15 (strong anomaly) maps to ~90
        val = 1.0 / (1.0 + np.exp(-15.0 * (anomaly_score - self.threshold)))
        return round(float(val * 100.0), 2)

    def _identify_contributing_factors(self, feat_dict: Dict[str, float]) -> List[str]:
        """Identifies primary behavioral drivers causing the anomalous score."""
        factors = []
        if feat_dict.get("read_burst_count_5m", 0) >= 5:
            factors.append(f"High-velocity secret reading burst ({int(feat_dict['read_burst_count_5m'])} reads in 5 min)")
        if feat_dict.get("env_divergence_score", 0) >= 0.5 and feat_dict.get("is_prod_access", 0) == 1.0:
            factors.append("Production access by developer with low historical production access")
        if feat_dict.get("after_hours_flag", 0) == 1.0:
            factors.append("Access occurred outside standard business hours (08:00–18:00)")
        if feat_dict.get("is_weekend", 0) == 1.0:
            factors.append("Access occurred during the weekend")
        if feat_dict.get("sensitive_op_flag", 0) == 1.0:
            factors.append("Sensitive lifecycle operation (secret rotation, deletion, or one-time share)")
        if feat_dict.get("step_up_failure_count_24h", 0) >= 2:
            factors.append(f"Multiple failed step-up challenges ({int(feat_dict['step_up_failure_count_24h'])} in past 24h)")
        if feat_dict.get("distinct_ip_count_24h", 0) >= 3:
            factors.append(f"Distributed access from {int(feat_dict['distinct_ip_count_24h'])} distinct IP addresses in 24h")
        if feat_dict.get("user_activity_zscore_24h", 0) >= 3.0:
            factors.append(f"Significant volume increase (+{feat_dict['user_activity_zscore_24h']:.1f} std dev above user baseline)")
        return factors

    def predict_anomaly(
        self,
        current_event: Dict[str, Any],
        recent_events: Optional[List[Dict[str, Any]]] = None,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a single audit event and returns structured anomaly prediction.
        
        Args:
            current_event: Dict containing event metadata (user_id, timestamp, event_type, environment, etc.)
            recent_events: Optional list of previous events within trailing 24h.
            user_profile: Optional historical 30-day baseline dictionary.
            
        Returns:
            Structured dictionary containing classification, score, risk_score, and contributing factors.
        """
        # 1. Extract feature dictionary
        feat_dict = self.extract_features(
            current_event=current_event,
            recent_events=recent_events,
            user_profile=user_profile
        )
        
        # 2. Format as 1x15 DataFrame with canonical column ordering
        feature_vector = pd.DataFrame([feat_dict])[self.feature_names]
        
        # 3. Model inference: inverted decision function
        raw_decision = self.model.decision_function(feature_vector)[0]
        anomaly_score = float(-raw_decision)
        
        # 4. Binary anomaly classification
        is_anomalous = bool(anomaly_score >= self.threshold)
        
        # 5. Risk score mapping
        risk_score = self.calculate_risk_score(anomaly_score)
        
        # 6. Interpretability: contributing factors
        contributing_factors = self._identify_contributing_factors(feat_dict)
        
        return {
            "is_anomalous": is_anomalous,
            "anomaly_score": round(anomaly_score, 4),
            "risk_score": risk_score,
            "threshold": round(self.threshold, 4),
            "contributing_factors": contributing_factors,
            "features": {k: round(v, 4) for k, v in feat_dict.items()},
            "evaluated_event": {
                "user_id": current_event.get("user_id"),
                "timestamp": str(current_event.get("timestamp")),
                "event_type": current_event.get("event_type"),
                "environment": current_event.get("environment"),
                "status": current_event.get("status")
            }
        }

# Module-level convenience function
_DEFAULT_DETECTOR: Optional[EnvGuardAnomalyDetector] = None

def predict_anomaly(
    current_event: Dict[str, Any],
    recent_events: Optional[List[Dict[str, Any]]] = None,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Public entry point for real-time anomaly detection.
    """
    global _DEFAULT_DETECTOR
    if _DEFAULT_DETECTOR is None:
        _DEFAULT_DETECTOR = EnvGuardAnomalyDetector()
    return _DEFAULT_DETECTOR.predict_anomaly(current_event, recent_events, user_profile)

