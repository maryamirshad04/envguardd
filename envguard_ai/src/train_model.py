"""
EnvGuard AI: Model Training & Hyperparameter Tuning Pipeline
============================================================
Trains the EnvGuard-specific Isolation Forest anomaly detection model
using the 15 EnvGuard-native features. Performs comprehensive grid search
and selects the optimal hyperparameter configuration based on held-out
validation performance.

Author: Antigravity AI Engineering
Date: November 2026
"""

import os
import json
import datetime
from typing import Dict, Any, List
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)

RANDOM_STATE = 42

def run_grid_search_and_train(
    train_path: str = "envguard_ai/data/processed/training_features.parquet",
    eval_path: str = "envguard_ai/data/processed/evaluation_features.parquet",
    eval_meta_path: str = "envguard_ai/data/processed/evaluation_metadata.parquet",
    model_save_path: str = "envguard_ai/models/envguard_isolation_forest.joblib",
    config_save_path: str = "envguard_ai/models/envguard_model_config.json",
    grid_save_path: str = "envguard_ai/models/grid_search_results.csv"
):
    print("[*] Loading training and evaluation datasets...")
    X_train = pd.read_parquet(train_path, engine="fastparquet")
    X_eval = pd.read_parquet(eval_path, engine="fastparquet")
    meta_eval = pd.read_parquet(eval_meta_path, engine="fastparquet")
    y_eval = meta_eval["is_anomaly"].values
    
    print(f"    - Training shape: {X_train.shape[0]:,} rows x {X_train.shape[1]} features")
    print(f"    - Evaluation shape: {X_eval.shape[0]:,} rows x {X_eval.shape[1]} features")
    print(f"    - Ground-truth anomalies in eval: {y_eval.sum():,} ({y_eval.mean()*100:.2f}%)")
    
    # Hyperparameter Grid
    n_estimators_list = [100, 150, 200]
    max_samples_list = ["auto", 256, 512]
    contamination_list = [0.01, 0.02, 0.03, 0.05]
    
    total_configs = len(n_estimators_list) * len(max_samples_list) * len(contamination_list)
    print(f"[*] Running Grid Search across {total_configs} hyperparameter configurations...")
    
    results: List[Dict[str, Any]] = []
    
    for n_est in n_estimators_list:
        for max_samp in max_samples_list:
            for cont in contamination_list:
                model = IsolationForest(
                    n_estimators=n_est,
                    max_samples=max_samp,
                    contamination=cont,
                    random_state=RANDOM_STATE,
                    n_jobs=-1
                )
                model.fit(X_train)
                
                # Raw anomaly score: sklearn decision_function is positive for normal, negative for anomaly
                # Invert so higher score = more anomalous
                raw_decision = model.decision_function(X_eval)
                anomaly_scores = -raw_decision
                
                # Predictions: sklearn returns 1 for inlier, -1 for outlier
                preds = (model.predict(X_eval) == -1).astype(int)
                
                roc_auc = roc_auc_score(y_eval, anomaly_scores)
                pr_auc = average_precision_score(y_eval, anomaly_scores)
                prec = precision_score(y_eval, preds, zero_division=0)
                rec = recall_score(y_eval, preds, zero_division=0)
                f1 = f1_score(y_eval, preds, zero_division=0)
                
                # Separation: gap between mean score of anomalies vs mean score of normal records
                sep_score = float(anomaly_scores[y_eval == 1].mean() - anomaly_scores[y_eval == 0].mean())
                
                results.append({
                    "n_estimators": n_est,
                    "max_samples": str(max_samp),
                    "contamination": cont,
                    "roc_auc": round(roc_auc, 4),
                    "pr_auc": round(pr_auc, 4),
                    "precision": round(prec, 4),
                    "recall": round(rec, 4),
                    "f1_score": round(f1, 4),
                    "separation_score": round(sep_score, 4),
                    "flagged_count": int(preds.sum()),
                    "flagged_pct": round(float(preds.mean() * 100), 2)
                })
                
    results_df = pd.DataFrame(results).sort_values(by=["f1_score", "pr_auc", "roc_auc"], ascending=False).reset_index(drop=True)
    os.makedirs(os.path.dirname(grid_save_path), exist_ok=True)
    results_df.to_csv(grid_save_path, index=False)
    results_df.to_csv("envguard_ai/models/envguard_grid_search_results.csv", index=False)
    
    print(f"[+] Grid Search complete! Saved results to {grid_save_path}")
    print("\n--- Top 5 Model Configurations ---")
    print(results_df.head(5).to_string())
    
    # Select best configuration based on highest F1-score with balanced recall
    best_row = results_df.iloc[0]
    best_n_est = int(best_row["n_estimators"])
    best_max_samp = "auto" if best_row["max_samples"] == "auto" else int(best_row["max_samples"])
    best_cont = float(best_row["contamination"])
    
    print(f"\n[*] Training final model with selected parameters:")
    print(f"    - n_estimators: {best_n_est}")
    print(f"    - max_samples: {best_max_samp}")
    print(f"    - contamination: {best_cont}")
    
    final_model = IsolationForest(
        n_estimators=best_n_est,
        max_samples=best_max_samp,
        contamination=best_cont,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    final_model.fit(X_train)
    
    # Store feature names inside the model object
    final_model.feature_names_in_ = np.array(list(X_train.columns))
    
    # Save the trained model
    joblib.dump(final_model, model_save_path)
    
    # Calculate decision threshold in inverted score space
    # sklearn threshold is at offset_
    # With anomaly_score = -decision_function, threshold is -offset_
    threshold_value = float(-final_model.offset_)
    
    # Save model metadata and config
    config = {
        "model_name": "EnvGuard_Isolation_Forest_Native",
        "algorithm": "IsolationForest",
        "library": "sklearn",
        "n_estimators": best_n_est,
        "max_samples": str(best_max_samp),
        "contamination": best_cont,
        "random_state": RANDOM_STATE,
        "feature_count": len(X_train.columns),
        "features": list(X_train.columns),
        "train_rows": int(X_train.shape[0]),
        "eval_rows": int(X_eval.shape[0]),
        "decision_threshold": threshold_value,
        "metrics_on_eval": {
            "roc_auc": float(best_row["roc_auc"]),
            "pr_auc": float(best_row["pr_auc"]),
            "precision": float(best_row["precision"]),
            "recall": float(best_row["recall"]),
            "f1_score": float(best_row["f1_score"]),
            "separation_score": float(best_row["separation_score"])
        },
        "fit_timestamp": datetime.datetime.utcnow().isoformat()
    }
    
    with open(config_save_path, "w") as f:
        json.dump(config, f, indent=2)
    with open("envguard_ai/models/model_config.json", "w") as f:
        json.dump(config, f, indent=2)
        
    print(f"[+] Final model successfully saved to: {model_save_path}")
    print(f"[+] Model configuration saved to: {config_save_path}")
    print(f"[+] Optimal Anomaly Score Threshold: {threshold_value:.4f}")

if __name__ == "__main__":
    run_grid_search_and_train()

