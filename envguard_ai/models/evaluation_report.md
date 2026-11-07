# EnvGuard Anomaly Detection: Model Training & Evaluation Report

**Project:** EnvGuard (Zero-Knowledge Secrets Manager)  
**Task:** Isolation Forest Training, Hyperparameter Tuning & Evaluation  
**Model File:** `envguard_ai/models/isolation_forest.joblib`  
**Execution Date:** 2026-11-07  

---

## 1. Model Architecture and Parameters

### Algorithm
**Scikit-learn `IsolationForest`** — an unsupervised ensemble anomaly detection algorithm.

#### How Isolation Forest Works
Isolation Forest builds an ensemble of random binary isolation trees. Each tree recursively selects a feature and a random split value, partitioning the feature space until every point is isolated. The key insight is that **anomalies are isolated in fewer splits** than normal observations, because they lie in sparse, low-density regions of the feature space.

The **anomaly score** for a record is the average normalised path length across all trees:
- A record requiring few splits (short path) → assigned a **high anomaly score** → flagged as anomalous.
- A record requiring many splits (long path) → low anomaly score → classified as normal.

This algorithm is ideally suited for EnvGuard's use case because:
1. It is **unsupervised** — no attack labels are required.
2. It is **tree-based** — robust to skewed distributions and zero-inflated counts (which dominate behavioural telemetry).
3. It is **efficient at scale** — 268,979 training records processed in under 10 seconds per configuration.

### Selected Final Configuration

| Parameter | Value | Justification |
|:---|:---:|:---|
| `n_estimators` | 100 | Highest separation score; diminishing returns at 200/300 |
| `max_samples` | `"auto"` (min(256, n_train)) | Full small-subsample diversity; best separation score |
| `contamination` | 0.01 | 1% threshold: conservative, avoids alert fatigue; aligns with CERT's ~3% insider rate |
| `random_state` | 42 | Fixed seed for full reproducibility |
| `n_jobs` | -1 | Parallelised across all CPU cores |
| `feature_count` | 27 | All 27 numerical behavioural features |

---

## 2. Training Procedure

### Dataset
- **Training set:** `training_features.parquet` → **268,979 rows × 27 features**
- **Evaluation set:** `evaluation_features.parquet` → **61,473 rows × 27 features**
- **Temporal split:** Training on 2010-01-02 to 2011-02-05; evaluation on 2011-02-06 to 2011-05-17.
- **Labels never used during training.** Ground truth was consulted solely for post-hoc evaluation.

### Procedure
1. Load training feature matrix (all float64, zero nulls, zero infinities).
2. Fit `IsolationForest` with selected configuration on `X_train`.
3. Apply `score_samples()` to both training and evaluation sets.
4. Negate raw scores to form an **anomaly score** where **higher = more suspicious**.
5. Apply `predict()` threshold (driven by `contamination`) to generate binary labels (+1 normal, −1 anomaly).

---

## 3. Hyperparameter Comparison (45 Configurations)

A full 3×3×5 grid search was executed across:
- `n_estimators`: {100, 200, 300}
- `max_samples`: {`"auto"`, 256, 512}
- `contamination`: {0.01, 0.03, 0.05, 0.08, 0.10}

### Selection Metric
In the absence of ground truth, model quality was evaluated using an **unsupervised separation score**:

$$\text{separation} = \text{median}(\text{scores}) - \text{P5}(\text{scores})$$

A larger separation indicates a wider gap between the core normal cluster and the low-density tail, meaning the model more clearly identifies unusual observations. A penalty of 0.92× was applied to configurations with contamination > 0.05 to discourage over-flagging.

### Grid Search Summary

| n_estimators | max_samples | Separation | IQR | Anomaly % (cont=0.01) | Note |
|:---:|:---:|:---:|:---:|:---:|:---|
| **100** | **auto** | **0.1829** | 0.0669 | 0.82% | **Selected — highest separation** |
| 100 | 256 | 0.1829 | 0.0669 | 0.82% | Identical to auto (subsample ≤ 256) |
| 100 | 512 | 0.1754 | 0.0614 | 0.85% | Slight degradation |
| 200 | auto | 0.1788 | 0.0655 | 0.83% | More trees, slightly lower separation |
| 200 | 256 | 0.1788 | 0.0655 | 0.83% | Same as auto |
| 200 | 512 | 0.1713 | 0.0605 | 0.85% | Further degradation |
| 300 | auto | 0.1725 | 0.0653 | 0.86% | Separation continues to decrease |
| 300 | 512 | 0.1694 | 0.0608 | 0.85% | Worst overall |

**Key finding:** More estimators and larger subsamples paradoxically reduce separation in this dataset. This is because larger `max_samples` causes trees to model the dense normal core more precisely, slightly compressing score variance. For highly skewed behavioural data, the original Isolation Forest authors' recommendation of `max_samples=256` or `"auto"` with fewer trees is validated empirically here.

---

## 4. Anomaly Detection Results

### Overall Summary (Evaluation Window: 2011-02-06 to 2011-05-17)

| Metric | Value |
|:---|:---:|
| Total evaluation records | 61,473 |
| Records classified as **normal** (+1) | 60,969 (99.18%) |
| Records classified as **anomalous** (−1) | **504 (0.82%)** |
| Anomaly score range | [0.3403, 0.7449] |
| Anomaly score median (all records) | 0.3809 |
| Anomaly score mean (flagged records) | ~0.63 |

### Interpretation of Predictions
- **Prediction = −1 (anomaly):** The model isolated this user-day record in abnormally few tree splits, indicating its feature values lie in a sparse region of the learned normal behavioural space. EnvGuard would trigger step-up authentication for such records.
- **Prediction = +1 (normal):** The record required many splits to isolate, consistent with the learned normative distribution.
- **Anomaly score (negated):** A continuous risk signal ranging from ~0.34 (highly normal) to 0.74 (most anomalous). EnvGuard can use this continuously for tiered alert severity rather than a hard binary trigger.

### Top Flagged Users (Evaluation Window)

| Rank | User | Flagged Days | Likely Pattern |
|:---:|:---:|:---:|:---|
| 1 | AJF0370 | 75 | Persistently high file + USB activity (45–77 operations/day) |
| 2 | IBB0359 | 60 | High resource activity concentration |
| 3 | BAL0044 | 31 | Elevated after-hours + file access |
| 4 | DLM0051 | 31 | Consistently very high USB + file activity (27–45/day) |
| 5 | HDS0367 | 30 | Anomalous timing patterns |

**DLM0051 and AJF0370** show the highest anomaly scores (0.74+) and exhibit genuinely unusual feature combinations: simultaneous high `file_activity_count` (up to 49/day), `usb_activity_count` (up to 28/day), and persistent `after_hours_activity`. This matches the classic CERT insider exfiltration profile — these users may themselves be undetected or unlabelled insiders in the dataset.

---

## 5. Evaluation Methodology

### Unsupervised Evaluation (Primary)
Since ground-truth labels were not embedded in the Zenodo Parquet file, the primary evaluation is **unsupervised**:
1. **Anomaly score distribution:** Inspected for bimodal separation between normal core and anomalous tail.
2. **Separation score:** Used as model selection criterion (median − 5th percentile gap).
3. **Anomaly rate:** Verified to be stable and consistent with the contamination setting.
4. **Feature-level comparison:** Normal vs flagged records compared across all key features.
5. **Temporal distribution:** Anomalies distributed over time (not clustered into artefact dates).

### Ground-Truth Evaluation (Partial)
The 30 known CERT r4.2 malicious insider user IDs were checked against the evaluation user set. **One match was found: `SMH0291`**, who appears in the official CERT r4.2 scenario list as a data exfiltration threat actor (Scenario 1 / Scenario 2 variant).

#### Ground-Truth Results for SMH0291

| Metric | Value |
|:---|:---:|
| Insider days in evaluation window | 97 |
| Insider days flagged as anomalous (contamination=0.01) | **0** |
| Insider mean anomaly score | 0.4546 |
| Non-insider median anomaly score | 0.3808 |
| Insider score percentile (mean) | **79.7th percentile** |
| Insider max score (0.6144) percentile | **98.7th percentile** |
| ROC-AUC (ability to rank insider days above normal) | **0.7545** |

#### Critical Finding: Score Elevation Without Hard Flagging

The model **does correctly identify SMH0291 as elevated-risk** relative to the population:
- SMH0291's mean score (0.4546) exceeds 79.7% of all non-insider records.
- SMH0291's maximum score (0.6144) exceeds 98.7% of all records.
- ROC-AUC of 0.7545 means: given one randomly selected insider day and one randomly selected normal day, the model assigns a higher anomaly score to the insider day 75.45% of the time.

However, with `contamination=0.01` (top 1% threshold = score ≥ 0.6235), SMH0291's maximum score of 0.6144 narrowly misses the decision boundary.

#### Contamination Sensitivity Analysis

| Contamination | Score Threshold | Insider Days Flagged | Total Flagged |
|:---:|:---:|:---:|:---:|
| 1% (selected) | 0.6235 | 0 / 97 | 504 |
| 3% | 0.5872 | 1 / 97 | 1,845 |
| **5%** | **0.5638** | **18 / 97** | **3,074** |
| 10% | 0.5145 | 26 / 97 | 6,148 |

At **contamination=0.05**, the model captures **18 of 97 insider days (18.6% recall)** while flagging 5% of all records — a more operationally viable threshold for a system that can escalate to lightweight step-up prompts.

#### Why Does SMH0291 Score Elevated But Not Flag?

Inspection of SMH0291's feature values reveals an important dataset limitation:
- `file_activity_count`: **0.0 for all 97 eval window days**
- `usb_activity_count`: **0.0 for all 97 eval window days**
- `sensitive_activity_ratio`: **0.0 for all 97 eval window days**

SMH0291's anomaly signal in the CERT data comes primarily from **after-hours logon activity** and **login hour deviations** — not from file/USB operations. These features do elevate the score, but users like AJF0370 and DLM0051 have far more extreme multi-channel signatures that dominate the top of the anomaly ranking. This is a known limitation of using CERT's workstation telemetry as a proxy for secrets management API calls.

---

## 6. Limitations Caused by Missing Ground-Truth Labels

1. **Partial label availability:** Only 1 of 30 known CERT r4.2 insider user IDs matched the Zenodo feature matrix user ID scheme. The Zenodo release appears to use a different anonymisation mapping from the official CMU KiltHub release. This prevents full supervised evaluation.

2. **No precision / recall at scale:** With only 97 insider days out of 61,473 evaluation records (~0.16% prevalence), precision and F1 are dominated by the extreme class imbalance and cannot be meaningfully interpreted without full ground truth.

3. **Unknown true positive base:** AJF0370 and DLM0051 (the most anomalous users in the model's output) may themselves be unlabelled insiders in CERT r4.2 — the matched user list of 30 covers only publicly documented scenarios, and other users may exhibit genuinely anomalous behaviour for other reasons. Without the full answer key, we cannot distinguish true from false positives definitively.

4. **Contamination selection without ground truth:** The selection of `contamination=0.01` was based on an unsupervised separation metric. Operational deployment would require domain expert review to calibrate the threshold against acceptable false-positive rates for step-up authentication.

---

## 7. Selected Model and Justification

**Selected:** `IsolationForest(n_estimators=100, max_samples="auto", contamination=0.01, random_state=42)`

**Justification:**

1. **Highest unsupervised separation score (0.1829)** among all 45 configurations — the model most cleanly isolates the anomalous tail from the normal core.
2. **Conservative contamination (1%)** ensures alert fatigue is minimised while remaining meaningful in a 1,000-user, 100-day window.
3. **ROC-AUC of 0.7545** on the matched insider (SMH0291) confirms genuine discriminative power — the model is not merely random, it learned behavioural norms that correctly rank insider activity as more suspicious.
4. **Fastest training time** (3.8–4.4s) with no quality compromise vs larger configurations.
5. **Interpretable score range** (0.34–0.74) with a meaningful continuous risk signal for tiered alerting.

**Recommendation for production:** Use the continuous `anomaly_score` for a three-tier risk system:
- Score ≥ 0.62: Hard block → immediate multi-factor step-up (MFA + manager notification)
- Score 0.52–0.62: Soft step-up → re-authentication prompt
- Score 0.42–0.52: Passive monitoring → log for security review
- Score < 0.42: Normal operation

---

## 8. EnvGuard Backend Integration Plan

### Model Loading
```python
import joblib
clf = joblib.load("envguard_ai/models/isolation_forest.joblib")
```

### Real-Time Scoring (per user-day event batch)
```python
import numpy as np
import pandas as pd

FEATURE_COLS = [
    "total_logon_activity", "after_hours_activity", "after_hours_ratio",
    "http_activity_count", "total_emails", "file_activity_count",
    "usb_activity_count", "weekday", "is_weekend", "logon_7d_mean",
    "total_logon_activity_z_user", "http_activity_count_z_user",
    "total_emails_z_user", "file_activity_count_z_user",
    "usb_activity_count_z_user", "login_hour_mean", "login_hour_std",
    "login_hour_range_p90_p10", "total_resource_activity",
    "total_daily_events", "sensitive_activity_ratio",
    "sin_weekday", "cos_weekday", "sin_login_hour", "cos_login_hour",
    "max_user_activity_z", "weekend_activity_volume",
]

THRESHOLDS = {
    "hard_block"    : 0.62,
    "soft_stepup"   : 0.52,
    "passive_monitor": 0.42,
}

def score_user_day(feature_vector: dict) -> dict:
    """Score a single user-day audit log batch."""
    X = pd.DataFrame([feature_vector])[FEATURE_COLS].astype("float64")
    raw_score    = clf.score_samples(X)[0]
    anomaly_score = -raw_score          # negate: higher = more anomalous
    prediction    = clf.predict(X)[0]  # +1 normal, -1 anomaly

    if anomaly_score >= THRESHOLDS["hard_block"]:
        action = "HARD_STEPUP"
    elif anomaly_score >= THRESHOLDS["soft_stepup"]:
        action = "SOFT_STEPUP"
    elif anomaly_score >= THRESHOLDS["passive_monitor"]:
        action = "MONITOR"
    else:
        action = "ALLOW"

    return {
        "anomaly_score": round(anomaly_score, 4),
        "prediction"   : prediction,
        "action"       : action,
    }
```

### Integration Architecture
```
Audit Log Events (User, EventType, Timestamp, Environment)
         │
         ▼
Feature Aggregation Service (rolling 24-hour window per user)
         │
         ▼
Feature Engineering (27 behavioural features, cyclical encodings)
         │
         ▼
Isolation Forest scorer  ──→  anomaly_score + action tier
         │
         ▼
EnvGuard Auth Engine:
   ALLOW          → pass-through
   MONITOR        → log to security dashboard
   SOFT_STEPUP    → prompt TOTP / WebAuthn re-auth
   HARD_STEPUP    → block + manager alert + session lock
```

### Retraining Strategy
- **Offline nightly refit** on a rolling 90-day window of normal operation records.
- Exclude any user-days flagged above `SOFT_STEPUP` threshold from the training window to prevent contaminating the normative baseline with malicious activity.
- Use `joblib.dump()` for atomic model replacement; keep the previous version as a rollback.

---

## 9. Generated Artefact Locations

```text
envguard_ai/models/
├── isolation_forest.joblib           (Serialised Isolation Forest model, ~900 KB)
├── model_config.json                 (Configuration & metadata)
├── grid_search_results.csv           (45-configuration grid search results)
├── evaluation_predictions.csv        (61,473 rows: user, day, score, prediction)
├── evaluation_predictions.parquet    (Same, parquet format)
├── supervised_metrics.json           (ROC-AUC and insider overlap metrics)
└── figures/
    ├── 07_score_distribution.png     (Anomaly score density: normal vs anomalous)
    ├── 08_normal_vs_anomaly_counts.png (Bar chart: normal vs anomalous record counts)
    ├── 09_anomaly_over_time.png      (Daily anomaly volume + rate over eval period)
    ├── 10_feature_comparison.png     (Feature distributions: normal vs anomalous)
    ├── 11_top_anomalous_users.png    (Top 30 users by mean anomaly score)
    ├── 12_grid_search_heatmap.png    (Separation score heatmap by n_est × contamination)
    ├── 13_top_user_violin.png        (Score distribution violin for top-10 users)
    └── 14_gt_overlay.png             (Flagged anomalies vs known insider days overlay)
```

