"""
EnvGuard AI: Feature Extraction & Preprocessing Pipeline
========================================================
Transforms raw secrets-manager audit logs into the finalized 15 EnvGuard-native
behavioral features. Designed for identical behavior across both batch training
and real-time inference.

Author: Antigravity AI Engineering
Date: November 2026
"""

import os
import json
import datetime
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd

# The finalized 15 EnvGuard-native features in canonical order
FEATURE_NAMES: List[str] = [
    "access_count_1h",
    "access_count_24h",
    "is_prod_access",
    "prod_ratio_24h",
    "user_prod_history_ratio",
    "env_divergence_score",
    "after_hours_flag",
    "hour_sin",
    "hour_cos",
    "is_weekend",
    "sensitive_op_flag",
    "read_burst_count_5m",
    "step_up_failure_count_24h",
    "distinct_ip_count_24h",
    "user_activity_zscore_24h"
]

SENSITIVE_OPERATIONS = {"secret_delete", "secret_rotate", "secret_share_onetime"}
DEFAULT_ORG_PROD_RATIO = 0.15

def extract_single_event_features(
    current_event: Dict[str, Any],
    recent_events: Optional[List[Dict[str, Any]]] = None,
    user_profile: Optional[Dict[str, Any]] = None
) -> Dict[str, float]:
    """
    Computes the 15 features for a single event in real time given recent user activity.
    Used during live inference by EnvGuard's API gateway.
    
    Args:
        current_event: Dict containing timestamp, event_type, environment, ip_address, status.
        recent_events: List of previous events for this user within the trailing 24 hours.
        user_profile: Dict containing historical 30-day stats: prod_ratio, mean_daily, std_daily.
    
    Returns:
        Dict mapping each of the 15 feature names to a float value.
    """
    # Parse event timestamp
    ts_val = current_event.get("timestamp")
    if isinstance(ts_val, str):
        evt_dt = pd.to_datetime(ts_val)
    elif isinstance(ts_val, (pd.Timestamp, datetime.datetime)):
        evt_dt = pd.to_datetime(ts_val)
    else:
        evt_dt = pd.to_datetime(datetime.datetime.utcnow())
        
    hour = evt_dt.hour
    weekday = evt_dt.weekday()
    env = str(current_event.get("environment", "development")).lower()
    evt_type = str(current_event.get("event_type", "secret_read")).lower()
    status = str(current_event.get("status", "SUCCESS")).upper()
    ip = str(current_event.get("ip_address", "127.0.0.1"))
    
    # 1. Instantaneous features
    is_prod = 1.0 if env == "production" else 0.0
    after_hours = 1.0 if (hour < 8 or hour >= 18) else 0.0
    hour_sin = float(np.sin(2.0 * np.pi * hour / 24.0))
    hour_cos = float(np.cos(2.0 * np.pi * hour / 24.0))
    is_weekend = 1.0 if weekday >= 5 else 0.0
    sensitive_op = 1.0 if evt_type in SENSITIVE_OPERATIONS else 0.0
    
    # 2. Sliding window metrics from recent_events (trailing 24h)
    if recent_events is None:
        recent_events = []
        
    t_now = evt_dt
    t_1h = t_now - pd.Timedelta(hours=1)
    t_24h = t_now - pd.Timedelta(hours=24)
    t_5m = t_now - pd.Timedelta(minutes=5)
    
    # Count current event as part of current state
    events_1h = 1
    events_24h = 1
    prod_count_24h = 1 if is_prod == 1.0 else 0
    read_burst_5m = 1 if evt_type == "secret_read" else 0
    stepup_fail_24h = 1 if status == "STEP_UP_FAILED" else 0
    distinct_ips = {ip}
    
    for prev in recent_events:
        prev_ts = prev.get("timestamp")
        if isinstance(prev_ts, str):
            p_dt = pd.to_datetime(prev_ts)
        else:
            p_dt = pd.to_datetime(prev_ts)
            
        if p_dt > t_now:
            continue
            
        if p_dt >= t_24h:
            events_24h += 1
            if str(prev.get("environment", "")).lower() == "production":
                prod_count_24h += 1
            if str(prev.get("status", "")).upper() == "STEP_UP_FAILED":
                stepup_fail_24h += 1
            prev_ip = prev.get("ip_address")
            if prev_ip:
                distinct_ips.add(str(prev_ip))
                
        if p_dt >= t_1h:
            events_1h += 1
            
        if p_dt >= t_5m:
            if str(prev.get("event_type", "")).lower() == "secret_read":
                read_burst_5m += 1
                
    prod_ratio_24h = float(prod_count_24h / max(events_24h, 1))
    
    # 3. Longitudinal baseline features
    if user_profile is not None and user_profile.get("prod_ratio") is not None:
        hist_prod_ratio = float(user_profile["prod_ratio"])
        mean_daily = float(user_profile.get("mean_daily", 10.0))
        std_daily = float(user_profile.get("std_daily", 4.0))
    else:
        hist_prod_ratio = DEFAULT_ORG_PROD_RATIO
        mean_daily = 10.0
        std_daily = 4.0
        
    env_divergence = float(abs(is_prod - hist_prod_ratio))
    z_score = float((events_24h - mean_daily) / (std_daily + 1.0))
    
    return {
        "access_count_1h": float(events_1h),
        "access_count_24h": float(events_24h),
        "is_prod_access": is_prod,
        "prod_ratio_24h": prod_ratio_24h,
        "user_prod_history_ratio": hist_prod_ratio,
        "env_divergence_score": env_divergence,
        "after_hours_flag": after_hours,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "is_weekend": is_weekend,
        "sensitive_op_flag": sensitive_op,
        "read_burst_count_5m": float(read_burst_5m),
        "step_up_failure_count_24h": float(stepup_fail_24h),
        "distinct_ip_count_24h": float(len(distinct_ips)),
        "user_activity_zscore_24h": z_score
    }

def build_feature_matrix_batch(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Processes an entire raw activity DataFrame into the 15-feature matrix with point-in-time accuracy.
    Maintains historical baselines to prevent future data leakage.
    
    Returns:
        (features_df, metadata_df)
    """
    print("[*] Processing raw activity dataset into 15-feature matrix...")
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    # Pre-calculate instantaneous signals
    df["is_prod"] = (df["environment"].str.lower() == "production").astype(float)
    df["is_read"] = (df["event_type"].str.lower() == "secret_read").astype(float)
    df["is_stepup_fail"] = (df["status"].str.upper() == "STEP_UP_FAILED").astype(float)
    df["is_sensitive"] = df["event_type"].str.lower().isin(SENSITIVE_OPERATIONS).astype(float)
    
    hour = df["timestamp"].dt.hour
    df["after_hours_flag"] = ((hour < 8) | (hour >= 18)).astype(float)
    df["hour_sin"] = np.sin(2.0 * np.pi * hour / 24.0)
    df["hour_cos"] = np.cos(2.0 * np.pi * hour / 24.0)
    df["is_weekend"] = (df["timestamp"].dt.weekday >= 5).astype(float)
    
    # Process rolling user metrics per user
    user_feature_rows = []
    metadata_rows = []
    
    grouped = df.groupby("user_id", sort=False)
    
    for u_id, group in grouped:
        u_events = group.to_dict("records")
        recent_window: List[Dict[str, Any]] = []
        
        # User profile accumulators for expanding historical baseline
        total_hist_events = 0
        total_hist_prod = 0
        daily_counts_hist: Dict[str, int] = {}
        
        for evt in u_events:
            t_now = evt["timestamp"]
            day_str = t_now.strftime("%Y-%m-%d")
            
            # Update user profile prior to current day
            daily_counts_hist[day_str] = daily_counts_hist.get(day_str, 0) + 1
            total_hist_events += 1
            if evt["is_prod"] == 1.0:
                total_hist_prod += 1
                
            # Maintain sliding 24-hour buffer
            recent_window = [p for p in recent_window if (t_now - p["timestamp"]).total_seconds() <= 86400]
            
            # Counts in 1h, 24h, 5m
            c_1h = 1
            c_24h = 1
            prod_24h = 1 if evt["is_prod"] == 1.0 else 0
            burst_5m = 1 if evt["is_read"] == 1.0 else 0
            stepup_fail_24h = 1 if evt["is_stepup_fail"] == 1.0 else 0
            distinct_ips = {evt["ip_address"]}
            
            for prev in recent_window:
                delta_sec = (t_now - prev["timestamp"]).total_seconds()
                if delta_sec <= 86400:
                    c_24h += 1
                    distinct_ips.add(prev["ip_address"])
                    if prev["is_prod"] == 1.0:
                        prod_24h += 1
                    if prev["is_stepup_fail"] == 1.0:
                        stepup_fail_24h += 1
                if delta_sec <= 3600:
                    c_1h += 1
                if delta_sec <= 300:
                    if prev["is_read"] == 1.0:
                        burst_5m += 1
                        
            # Historical baselines
            hist_prod_ratio = (total_hist_prod / max(total_hist_events, 1)) if total_hist_events >= 5 else DEFAULT_ORG_PROD_RATIO
            env_divergence = abs(evt["is_prod"] - hist_prod_ratio)
            
            # Activity volume baseline (mean/std of past days)
            counts_list = list(daily_counts_hist.values())
            mean_daily = np.mean(counts_list) if len(counts_list) > 1 else 10.0
            std_daily = np.std(counts_list) if len(counts_list) > 1 else 4.0
            z_score = (c_24h - mean_daily) / (std_daily + 1.0)
            
            feat_row = {
                "access_count_1h": float(c_1h),
                "access_count_24h": float(c_24h),
                "is_prod_access": float(evt["is_prod"]),
                "prod_ratio_24h": float(prod_24h / c_24h),
                "user_prod_history_ratio": float(hist_prod_ratio),
                "env_divergence_score": float(env_divergence),
                "after_hours_flag": float(evt["after_hours_flag"]),
                "hour_sin": float(evt["hour_sin"]),
                "hour_cos": float(evt["hour_cos"]),
                "is_weekend": float(evt["is_weekend"]),
                "sensitive_op_flag": float(evt["is_sensitive"]),
                "read_burst_count_5m": float(burst_5m),
                "step_up_failure_count_24h": float(stepup_fail_24h),
                "distinct_ip_count_24h": float(len(distinct_ips)),
                "user_activity_zscore_24h": float(z_score)
            }
            user_feature_rows.append(feat_row)
            
            meta_row = {
                "event_id": evt["event_id"],
                "timestamp": evt["timestamp"],
                "user_id": evt["user_id"],
                "is_anomaly": evt["is_anomaly"],
                "scenario_type": evt["scenario_type"]
            }
            metadata_rows.append(meta_row)
            
            recent_window.append(evt)
            
    features_df = pd.DataFrame(user_feature_rows)[FEATURE_NAMES]
    metadata_df = pd.DataFrame(metadata_rows)
    
    # Sort back chronologically
    metadata_df["timestamp"] = pd.to_datetime(metadata_df["timestamp"])
    sort_idx = metadata_df.sort_values("timestamp").index
    
    features_df = features_df.iloc[sort_idx].reset_index(drop=True)
    metadata_df = metadata_df.iloc[sort_idx].reset_index(drop=True)
    
    print(f"[+] Feature matrix built: {features_df.shape[0]:,} rows x {features_df.shape[1]} features.")
    return features_df, metadata_df

def prepare_and_save_datasets(
    raw_path: str = "envguard_ai/data/raw/envguard_activity_dataset.csv",
    split_days_train: int = 60
):
    """
    Preprocesses the raw dataset and splits chronologically into training and evaluation sets.
    Training set contains strictly normal records (is_anomaly == 0).
    Evaluation set contains both normal records and injected anomaly scenarios.
    """
    raw_df = pd.read_csv(raw_path)
    features_df, metadata_df = build_feature_matrix_batch(raw_df)
    
    # Save combined features parquet
    features_with_meta = pd.concat([metadata_df, features_df], axis=1)
    os.makedirs("envguard_ai/data/processed", exist_ok=True)
    features_with_meta.to_parquet("envguard_ai/data/processed/envguard_features.parquet", engine="fastparquet", index=False)
    
    # Chronological Split: First 60 days vs remaining 30 days
    start_dt = metadata_df["timestamp"].min()
    split_dt = start_dt + pd.Timedelta(days=split_days_train)
    
    train_mask = (metadata_df["timestamp"] < split_dt) & (metadata_df["is_anomaly"] == 0)
    eval_mask = (metadata_df["timestamp"] >= split_dt)
    
    train_features = features_df[train_mask].reset_index(drop=True)
    eval_features = features_df[eval_mask].reset_index(drop=True)
    eval_metadata = metadata_df[eval_mask].reset_index(drop=True)
    
    # Save parquet datasets
    train_features.to_parquet("envguard_ai/data/processed/training_features.parquet", engine="fastparquet", index=False)
    eval_features.to_parquet("envguard_ai/data/processed/evaluation_features.parquet", engine="fastparquet", index=False)
    eval_metadata.to_parquet("envguard_ai/data/processed/evaluation_metadata.parquet", engine="fastparquet", index=False)
    
    # Also save with explicit envguard_ prefix for unambiguous clarity
    train_features.to_parquet("envguard_ai/data/processed/envguard_training_features.parquet", engine="fastparquet", index=False)
    eval_features.to_parquet("envguard_ai/data/processed/envguard_evaluation_features.parquet", engine="fastparquet", index=False)
    
    # Save feature schema
    schema = {
        "feature_count": len(FEATURE_NAMES),
        "features": FEATURE_NAMES,
        "types": {f: "float64" for f in FEATURE_NAMES},
        "description": "15 EnvGuard-native behavioral access and velocity features"
    }
    os.makedirs("envguard_ai/models", exist_ok=True)
    with open("envguard_ai/models/feature_schema.json", "w") as f:
        json.dump(schema, f, indent=2)
        
    print(f"[+] Datasets successfully prepared and saved:")
    print(f"    - Training Features: {train_features.shape[0]:,} rows x {train_features.shape[1]} features (100% normal)")
    print(f"    - Evaluation Features: {eval_features.shape[0]:,} rows x {eval_features.shape[1]} features")
    print(f"    - Evaluation Anomalies: {eval_metadata['is_anomaly'].sum():,} ({eval_metadata['is_anomaly'].mean()*100:.2f}%)")
    print(f"    - Feature Schema: envguard_ai/models/feature_schema.json")

if __name__ == "__main__":
    prepare_and_save_datasets()
