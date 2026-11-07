"""
EnvGuard Anomaly Detection - Data Preprocessing & Feature Pipeline
==================================================================
This module performs data loading, exploratory inspection, cleaning,
feature selection, feature engineering, and preparation of feature
matrices for unsupervised Isolation Forest anomaly detection.

Project Context: EnvGuard Zero-Knowledge Secrets Manager
Dataset: CERT r4.2 Preprocessed Feature Matrix (Zenodo 19435851)
"""

import os
import logging
from typing import Tuple, Dict, Any, List
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Core selected behavioral features from CERT r4.2 that map to EnvGuard concepts
CORE_BEHAVIORAL_FEATURES = [
    "total_logon_activity",
    "after_hours_activity",
    "after_hours_ratio",
    "http_activity_count",
    "total_emails",
    "file_activity_count",
    "usb_activity_count",
    "weekday",
    "is_weekend",
    "logon_7d_mean",
    "total_logon_activity_z_user",
    "http_activity_count_z_user",
    "total_emails_z_user",
    "file_activity_count_z_user",
    "usb_activity_count_z_user",
    "login_hour_mean",
    "login_hour_std",
    "login_hour_range_p90_p10",
]

# Explicitly excluded columns with justification
EXCLUDED_COLUMNS = {
    # Psychometric / Personality traits (explicitly prohibited)
    "O": "Personality trait (Openness) - not present in zero-knowledge audit logs",
    "C": "Personality trait (Conscientiousness) - not present in zero-knowledge audit logs",
    "E": "Personality trait (Extraversion) - not present in zero-knowledge audit logs",
    "A": "Personality trait (Agreeableness) - not present in zero-knowledge audit logs",
    "N": "Personality trait (Neuroticism) - not present in zero-knowledge audit logs",
    # Email text sentiment features (explicitly prohibited)
    "avg_sentiment": "NLP email body sentiment - secrets manager does not inspect email content",
    "sentiment_negative_flag": "Binary negative sentiment flag - prohibited email sentiment",
    "sentiment_strong_negative_flag": "Binary strong negative flag - prohibited email sentiment",
    "sentiment_30d_std": "30-day sentiment volatility - prohibited email sentiment",
    "sentiment_z_user": "Sentiment deviation score - prohibited email sentiment",
    # Organizational demographic metadata
    "role": "Static organizational role with 9.5% missing values; not dynamic audit log activity",
    "department": "Static department with 10.9% missing values; not dynamic audit log activity",
    "functional_unit": "Static functional unit with 9.7% missing values; not dynamic audit log activity",
}

# Metadata columns to preserve separately from model feature inputs
METADATA_COLUMNS = ["user", "day"]


def load_dataset(file_path: str) -> pd.DataFrame:
    """Load the raw Parquet feature matrix."""
    logger.info(f"Loading dataset from: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found: {file_path}")
    df = pd.read_parquet(file_path, engine="fastparquet")
    logger.info(f"Dataset successfully loaded. Shape: {df.shape}")
    return df


def inspect_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Perform comprehensive data inspection."""
    logger.info("Executing comprehensive dataset inspection...")
    missing_series = df.isnull().sum()
    missing_dict = {col: int(cnt) for col, cnt in missing_series.items() if cnt > 0}
    missing_pct = {col: float((cnt / len(df)) * 100) for col, cnt in missing_series.items() if cnt > 0}

    exact_dups = int(df.duplicated().sum())
    key_dups = int(df.duplicated(subset=["user", "day"]).sum()) if {"user", "day"}.issubset(df.columns) else 0

    numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    inf_dict = {col: int(np.isinf(df[col]).sum()) for col in numerical_cols if np.isinf(df[col]).sum() > 0}

    stats = {
        "total_rows": int(df.shape[0]),
        "total_columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_counts": missing_dict,
        "missing_percentages": missing_pct,
        "exact_duplicates": exact_dups,
        "user_day_duplicates": key_dups,
        "infinite_values": inf_dict,
        "unique_users": int(df["user"].nunique()) if "user" in df.columns else 0,
        "date_min": str(df["day"].min()) if "day" in df.columns else None,
        "date_max": str(df["day"].max()) if "day" in df.columns else None,
    }
    return stats


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Perform targeted data cleaning.
    - Impute missing logon_7d_mean values (lookback boundary cases).
    - Validate absence of infinite/invalid numbers.
    - Preserve unusual observations (anomalies).
    """
    logger.info("Cleaning dataset...")
    df_clean = df.copy()

    # 1. Handle missing logon_7d_mean:
    # 2,000 observations (first 2 days for each user before 7d rolling window)
    # Natural imputation: user's total_logon_activity on that initial day
    if "logon_7d_mean" in df_clean.columns:
        null_mask = df_clean["logon_7d_mean"].isnull()
        if null_mask.sum() > 0:
            logger.info(f"Imputing {null_mask.sum()} missing logon_7d_mean values using total_logon_activity")
            df_clean["logon_7d_mean"] = df_clean["logon_7d_mean"].fillna(df_clean["total_logon_activity"])

    # 2. Check and log infinite values
    num_cols = df_clean.select_dtypes(include=[np.number]).columns
    for c in num_cols:
        if np.isinf(df_clean[c]).any():
            logger.warning(f"Replacing infinite values in column {c}")
            df_clean[c] = df_clean[c].replace([np.inf, -np.inf], np.nan)
            df_clean[c] = df_clean[c].fillna(df_clean[c].median())

    logger.info("Data cleaning completed.")
    return df_clean


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Engineer domain-relevant behavioral features for EnvGuard anomaly detection.
    1. total_resource_activity: file + usb activity
    2. total_daily_events: aggregate activity across all monitored channels
    3. sensitive_activity_ratio: proportion of sensitive resource activity
    4. cyclical encodings: sin/cos transformations for weekday and login hour
    5. max_user_activity_z: peak baseline deviation across all activity vectors
    6. weekend_activity_volume: non-working day activity volume
    """
    logger.info("Engineering behavioral features...")
    df_feat = df.copy()

    # 1. Total sensitive resource activity (file reads + USB transfers)
    df_feat["total_resource_activity"] = df_feat["file_activity_count"] + df_feat["usb_activity_count"]

    # 2. Total daily event volume across all access channels
    df_feat["total_daily_events"] = (
        df_feat["total_logon_activity"]
        + df_feat["http_activity_count"]
        + df_feat["total_emails"]
        + df_feat["file_activity_count"]
        + df_feat["usb_activity_count"]
    )

    # 3. Sensitive resource ratio (concentration of activity in sensitive resources)
    df_feat["sensitive_activity_ratio"] = df_feat["total_resource_activity"] / (df_feat["total_daily_events"] + 1e-5)

    # 4. Cyclical temporal encoding for weekday (period = 7)
    df_feat["sin_weekday"] = np.sin(2 * np.pi * df_feat["weekday"] / 7.0)
    df_feat["cos_weekday"] = np.cos(2 * np.pi * df_feat["weekday"] / 7.0)

    # 5. Cyclical temporal encoding for mean login hour (period = 24)
    df_feat["sin_login_hour"] = np.sin(2 * np.pi * df_feat["login_hour_mean"] / 24.0)
    df_feat["cos_login_hour"] = np.cos(2 * np.pi * df_feat["login_hour_mean"] / 24.0)

    # 6. Peak user deviation across all behavior vectors
    z_cols = [
        "total_logon_activity_z_user",
        "http_activity_count_z_user",
        "total_emails_z_user",
        "file_activity_count_z_user",
        "usb_activity_count_z_user",
    ]
    df_feat["max_user_activity_z"] = df_feat[z_cols].max(axis=1)

    # 7. Weekend / non-working day activity surge
    df_feat["weekend_activity_volume"] = df_feat["is_weekend"] * df_feat["total_daily_events"]

    logger.info(f"Engineered 8 new behavioral features. Total columns in working DataFrame: {df_feat.shape[1]}")
    return df_feat


def select_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Separate metadata (user, day) from the numerical model feature matrix.
    Explicitly drops prohibited psychometrics, sentiment features, and static demographics.
    """
    logger.info("Performing feature selection...")
    metadata_df = df[METADATA_COLUMNS].copy()

    # Define all model features (selected CERT features + engineered features)
    model_feature_cols = CORE_BEHAVIORAL_FEATURES + [
        "total_resource_activity",
        "total_daily_events",
        "sensitive_activity_ratio",
        "sin_weekday",
        "cos_weekday",
        "sin_login_hour",
        "cos_login_hour",
        "max_user_activity_z",
        "weekend_activity_volume",
    ]

    features_df = df[model_feature_cols].copy()

    # Ensure all feature columns are strictly numerical float64
    for c in features_df.columns:
        features_df[c] = features_df[c].astype(np.float64)

    logger.info(f"Selected {features_df.shape[1]} numerical features for Isolation Forest.")
    return metadata_df, features_df


def split_data_chronologically(
    metadata_df: pd.DataFrame, features_df: pd.DataFrame, train_ratio: float = 0.8
) -> Dict[str, Any]:
    """
    Split data into training and evaluation sets chronologically to prevent
    temporal lookahead leakage in anomaly detection.
    """
    logger.info(f"Splitting dataset chronologically with train_ratio={train_ratio}...")
    unique_dates = metadata_df["day"].sort_values().drop_duplicates().reset_index(drop=True)
    split_idx = int(len(unique_dates) * train_ratio)
    split_date = unique_dates.iloc[split_idx]

    train_mask = metadata_df["day"] < split_date
    eval_mask = metadata_df["day"] >= split_date

    logger.info(f"Chronological split date: {split_date}")
    logger.info(f"Training set: {train_mask.sum()} records ({train_mask.mean() * 100:.2f}%)")
    logger.info(f"Evaluation set: {eval_mask.sum()} records ({eval_mask.mean() * 100:.2f}%)")

    splits = {
        "split_date": str(split_date),
        "train_mask": train_mask,
        "eval_mask": eval_mask,
        "X_train": features_df[train_mask].copy(),
        "X_eval": features_df[eval_mask].copy(),
        "meta_train": metadata_df[train_mask].copy(),
        "meta_eval": metadata_df[eval_mask].copy(),
    }
    return splits


def run_pipeline(
    raw_path: str,
    output_dir: str,
) -> Dict[str, Any]:
    """
    Execute end-to-end data preparation pipeline and persist all artifacts.
    """
    os.makedirs(output_dir, exist_ok=True)
    logger.info("=== STARTING ENVGUARD PREPROCESSING PIPELINE ===")

    # 1. Load
    df_raw = load_dataset(raw_path)
    raw_stats = inspect_dataset(df_raw)

    # 2. Clean
    df_clean = clean_data(df_raw)

    # 3. Engineer
    df_eng = engineer_features(df_clean)

    # 4. Select features and separate metadata
    metadata_df, features_df = select_features(df_eng)

    # 5. Chronological Split
    splits = split_data_chronologically(metadata_df, features_df, train_ratio=0.8)

    # 6. Save Processed Datasets
    processed_features_path = os.path.join(output_dir, "processed_features.parquet")
    training_features_path = os.path.join(output_dir, "training_features.parquet")
    evaluation_features_path = os.path.join(output_dir, "evaluation_features.parquet")

    # Combine metadata with features for processed_features.parquet
    processed_full = pd.concat([metadata_df, features_df], axis=1)
    processed_full.to_parquet(processed_features_path, engine="fastparquet", index=False)
    logger.info(f"Saved full processed feature table to: {processed_features_path}")

    # Save training and evaluation feature matrices (pure numerical for Isolation Forest)
    splits["X_train"].to_parquet(training_features_path, engine="fastparquet", index=False)
    logger.info(f"Saved training features to: {training_features_path}")

    splits["X_eval"].to_parquet(evaluation_features_path, engine="fastparquet", index=False)
    logger.info(f"Saved evaluation features to: {evaluation_features_path}")

    # Note regarding labels:
    logger.info("Checking ground-truth labels...")
    label_cols = [c for c in df_raw.columns if any(w in c.lower() for w in ["label", "target", "insider", "threat"])]
    if not label_cols:
        logger.info(
            "NOTICE: No ground truth label column exists in the provided Zenodo dataset (feature_matrix_v1.parquet). "
            "To adhere to project requirements and avoid fabricating artificial labels or empty files, "
            "labels.parquet was not created."
        )

    pipeline_summary = {
        "raw_stats": raw_stats,
        "processed_rows": len(features_df),
        "processed_cols": features_df.shape[1],
        "feature_names": features_df.columns.tolist(),
        "train_rows": len(splits["X_train"]),
        "eval_rows": len(splits["X_eval"]),
        "split_date": splits["split_date"],
        "labels_available": False,
        "output_files": {
            "processed_features": processed_features_path,
            "training_features": training_features_path,
            "evaluation_features": evaluation_features_path,
        },
    }

    logger.info("=== ENVGUARD PREPROCESSING PIPELINE COMPLETED SUCCESSFULLY ===")
    return pipeline_summary


if __name__ == "__main__":
    raw_dataset_path = os.path.join("envguard_ai", "data", "raw", "feature_matrix_v1.parquet")
    processed_dir = os.path.join("envguard_ai", "data", "processed")
    summary = run_pipeline(raw_dataset_path, processed_dir)
    print("\nPipeline Summary:")
    print(f"Features: {summary['processed_cols']}")
    print(f"Train samples: {summary['train_rows']}")
    print(f"Eval samples: {summary['eval_rows']}")

