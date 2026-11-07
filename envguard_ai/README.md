# EnvGuard AI: Standalone Anomaly Detection System

**A metadata-only, zero-knowledge anomaly detection engine for the EnvGuard Secrets Manager.**

EnvGuard AI monitors operational access patterns across secrets management workflows to detect suspicious activities—such as high-velocity scraping, privilege shifts from development to production, after-hours burst exfiltration, and sensitive operation abuse—without ever inspecting decrypted secret values or cryptographic keys.

---

## 1. Zero-Knowledge Security Principle

EnvGuard is designed from the ground up as a zero-knowledge secrets vault:
- **Client-Side Envelope Encryption:** Secrets are encrypted client-side using AES-256-GCM with keys bound to WebAuthn PRF authenticators.
- **Metadata-Only Telemetry:** The AI engine operates strictly on **operational audit metadata** (`timestamp`, `user_id`, `event_type`, `environment`, `ip_address`, `status`).
- **Cryptographic Confidentiality:** Under no circumstances are plaintext secret values, encryption keys, variable names, or decrypted payloads ingested or evaluated.

---

## 2. Directory Structure

```
envguard_ai/
├── data/
│   ├── raw/
│   │   ├── envguard_activity_dataset.csv     # 37,275 simulated audit events across 50 users (90 days)
│   │   └── feature_matrix_v1.parquet         # Original CERT r4.2 benchmark dataset (archived)
│   └── processed/
│       ├── envguard_features.parquet         # Full 37,275-row 15-feature matrix
│       ├── training_features.parquet         # 24,282 rows x 15 features (100% normal behavior)
│       ├── evaluation_features.parquet       # 12,895 rows x 15 features (includes 245 ground-truth threats)
│       ├── evaluation_metadata.parquet       # Ground-truth labels and threat scenario types
│       └── cert/                             # Archived CERT r4.2 processed datasets
├── models/
│   ├── envguard_isolation_forest.joblib      # Trained native Isolation Forest model
│   ├── envguard_model_config.json            # Model hyperparameter configuration and threshold
│   ├── feature_schema.json                   # Canonical 15-feature schema definition
│   ├── grid_search_results.csv               # 36-configuration hyperparameter search results
│   ├── figures/                              # Diagnostic plots (confusion matrix, ROC, PR, score dist)
│   └── cert/                                 # Archived CERT baseline model & metrics
├── src/
│   ├── generate_dataset.py                   # Realistic multi-persona secrets-manager telemetry generator
│   ├── preprocessing.py                      # 15-feature extraction pipeline (batch & live streaming)
│   ├── train_model.py                        # Model training & grid search pipeline
│   ├── evaluate_model.py                     # Diagnostic evaluation & figure generator
│   ├── inference.py                          # Self-contained, production-ready inference module
│   └── train_evaluate.py                     # Original CERT training script (archived)
├── tests/
│   └── test_inference.py                     # Automated unit and integration test suite
├── reports/
│   ├── envguard_feature_specification.md     # Detailed 15-feature specification
│   ├── envguard_model_evaluation.md          # Full model evaluation report with scenario breakdown
│   ├── feature_compatibility_audit.md        # CERT vs EnvGuard compatibility audit
│   ├── feature_compatibility_summary.md      # Audit executive summary
│   └── final_ai_documentation.md             # Comprehensive architecture & engineering guide
├── requirements.txt                          # Python dependencies
└── README.md                                 # This user manual
```

---

## 3. Installation & Setup

EnvGuard AI runs on Python 3.10+.

```powershell
# 1. Navigate to the AI directory
cd envguard_ai

# 2. Install dependencies
pip install -r requirements.txt
```

---

## 4. End-to-End Pipeline Execution

Each step can be executed independently from the command line:

### Step 1: Generate Synthetic Activity Telemetry
Generates 37,275 realistic audit events across 50 developers over 90 days, modeling 5 developer personas and injecting 6 distinct attack archetypes:
```powershell
python src/generate_dataset.py
```
*Outputs: `data/raw/envguard_activity_dataset.csv`*

### Step 2: Extract EnvGuard-Native Features
Computes the 15 behavioral features using point-in-time sliding windows (1h, 24h, 5m burst, user historical baselines):
```powershell
python src/preprocessing.py
```
*Outputs: `data/processed/training_features.parquet`, `data/processed/evaluation_features.parquet`, `models/feature_schema.json`*

### Step 3: Train Isolation Forest Model
Performs a grid search across 36 hyperparameter configurations and fits the optimal Isolation Forest:
```powershell
python src/train_model.py
```
*Outputs: `models/envguard_isolation_forest.joblib`, `models/envguard_model_config.json`, `models/grid_search_results.csv`*

### Step 4: Evaluate Model on Held-Out Records
Evaluates the model on 12,895 unseen records, computing ROC-AUC, PR-AUC, confusion matrix, scenario-level detection rates, and generates diagnostic figures:
```powershell
python src/evaluate_model.py
```
*Outputs: `reports/envguard_model_evaluation.md` and 5 figures in `models/figures/`*

### Step 5: Run Automated Test Suite
Verifies that the inference module handles normal activity, flags suspicious bursts, handles missing data gracefully, and operates deterministically:
```powershell
python -m unittest tests/test_inference.py
```

---

## 5. Live Standalone Inference API

The `EnvGuardAnomalyDetector` can be imported and executed inside any Python service without database or network dependencies.

```python
from envguard_ai.src.inference import predict_anomaly

# 1. Define incoming audit event metadata
current_event = {
    "user_id": "user_dev_012",
    "timestamp": "2026-11-07 02:30:15",
    "event_type": "secret_read",
    "environment": "production",
    "ip_address": "192.168.1.105",
    "status": "SUCCESS"
}

# 2. Provide recent activity history (trailing 24 hours, optional)
recent_events = [
    {
        "timestamp": "2026-11-07 02:29:45",
        "event_type": "secret_read",
        "environment": "production",
        "ip_address": "192.168.1.105",
        "status": "SUCCESS"
    },
    {
        "timestamp": "2026-11-07 02:29:10",
        "event_type": "secret_read",
        "environment": "production",
        "ip_address": "192.168.1.105",
        "status": "SUCCESS"
    }
]

# 3. Provide user longitudinal baseline profile (optional)
user_profile = {
    "prod_ratio": 0.02,   # User normally accesses dev 98% of the time
    "mean_daily": 8.0,
    "std_daily": 3.0
}

# 4. Execute prediction
result = predict_anomaly(current_event, recent_events=recent_events, user_profile=user_profile)

print("Is Anomalous:", result["is_anomalous"])
print("Risk Score (0-100):", result["risk_score"])
print("Anomaly Score:", result["anomaly_score"])
print("Contributing Factors:", result["contributing_factors"])
```

### Sample Output:
```json
{
  "is_anomalous": true,
  "anomaly_score": 0.0894,
  "risk_score": 79.28,
  "threshold": 0.0,
  "contributing_factors": [
    "Production access by developer with low historical production access",
    "Access occurred outside standard business hours (08:00–18:00)",
    "Access occurred during the weekend"
  ],
  "features": {
    "access_count_1h": 3.0,
    "access_count_24h": 3.0,
    "is_prod_access": 1.0,
    "prod_ratio_24h": 1.0,
    "user_prod_history_ratio": 0.02,
    "env_divergence_score": 0.98,
    "after_hours_flag": 1.0,
    "hour_sin": 0.5,
    "hour_cos": 0.866,
    "is_weekend": 1.0,
    "sensitive_op_flag": 0.0,
    "read_burst_count_5m": 3.0,
    "step_up_failure_count_24h": 0.0,
    "distinct_ip_count_24h": 1.0,
    "user_activity_zscore_24h": -1.25
  }
}
```

---

## 6. Performance Summary on Held-Out Evaluation Dataset

- **ROC-AUC:** **0.9692**
- **PR-AUC:** **0.7415**
- **Precision:** **68.27%**
- **Recall:** **69.39%**
- **F1-Score:** **68.83%**
- **False Positive Rate:** **0.62%** (less than 1 in 150 legitimate actions)

### Threat Scenario Detection Rates:
1. **Sensitive Lifecycle Abuse (Delete/Rotate Storm):** **100.0%** (24/24)
2. **After-Hours Midnight Burst:** **93.8%** (45/48)
3. **Step-Up Stuffing & Bypassing:** **70.0%** (14/20)
4. **Development-to-Production Escalation:** **65.6%** (21/32)
5. **High-Velocity Mass Scraping:** **62.9%** (66/105)

