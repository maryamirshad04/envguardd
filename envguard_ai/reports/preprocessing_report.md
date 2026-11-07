# EnvGuard Anomaly Detection: Data Preprocessing and Preparation Report

**Project:** EnvGuard (Zero-Knowledge Secrets Manager)  
**Component:** AI Anomaly Detection Pipeline  
**Model Architecture:** Unsupervised Isolation Forest  
**Source Dataset:** CERT Insider Threat Dataset r4.2 (`feature_matrix_v1.parquet`)  
**Zenodo Record:** [DOI: 10.5281/zenodo.19435851](https://zenodo.org/records/19435851)  
**Execution Date:** 2026-11-06  

---

## 1. Original Dataset Overview

- **Dataset File:** `feature_matrix_v1.parquet`
- **Initial Dimensions:** **330,452 rows × 33 columns**
- **Temporal Span:** 500 calendar days (January 2, 2010 to May 17, 2011)
- **User Population:** 1,000 unique corporate users
- **Granularity:** Strictly user-day aggregated telemetry (1 observation per active user per day)

The 33 original features encompass desktop logons, after-hours activity, HTTP browsing counts, email volumes, file access counts, USB drive insertions, email text sentiment analysis, 7-day moving averages, user-normalized z-scores, login hour statistics, OCEAN psychometric scores, and static organizational demographics.

---

## 2. Feature Selection & Exclusion Rationale

To align with EnvGuard's zero-knowledge audit-log architecture (User, Event Type, Timestamp, Environment), features were filtered strictly on behavioral relevance:

### Excluded Columns (13 features):
1. **Psychometrics (`O`, `C`, `E`, `A`, `N`):** Excluded because personality profiling does not exist in zero-knowledge secrets management audit logs and poses severe privacy/regulatory concerns.
2. **Email Sentiment (`avg_sentiment`, `sentiment_negative_flag`, `sentiment_strong_negative_flag`, `sentiment_30d_std`, `sentiment_z_user`):** Excluded because zero-knowledge secrets managers monitor access metadata only, not communications content.
3. **Static Demographics (`role`, `department`, `functional_unit`):** Excluded due to ~10% missing values and lack of dynamic behavioral activity signal.
4. **Direct Identifiers (`user`, `day`):** Isolated as metadata indices to prevent model memorization.

### Retained Core Behavioral Features (18 features):
`total_logon_activity`, `after_hours_activity`, `after_hours_ratio`, `http_activity_count`, `total_emails`, `file_activity_count`, `usb_activity_count`, `weekday`, `is_weekend`, `logon_7d_mean`, `total_logon_activity_z_user`, `http_activity_count_z_user`, `total_emails_z_user`, `file_activity_count_z_user`, `usb_activity_count_z_user`, `login_hour_mean`, `login_hour_std`, `login_hour_range_p90_p10`.

---

## 3. Data Cleaning Decisions

1. **Missing Value Imputation:**
   - In the selected features, only `logon_7d_mean` exhibited missing values (2,000 rows, exactly 0.61%).
   - Detailed inspection revealed that these 2,000 missing values corresponded to the first 2 observation days for each of the 1,000 users before the 7-day rolling window could accumulate historical entries.
   - **Resolution:** Imputed missing values using the user's observed `total_logon_activity` on that initial day. This preserves domain validity by setting the baseline average to the known initial day's volume.
2. **Duplicate Records:**
   - Evaluated exact full-row duplicates (`0` found) and `(user, day)` compound key duplicates (`0` found). The dataset is strictly non-redundant.
3. **Invalid & Infinite Values:**
   - Evaluated all numerical features for $\pm\infty$ and NaN values (`0` found post-cleaning).
4. **Outlier Retention Policy:**
   - **Outliers were deliberately preserved.** In unsupervised anomaly detection, extreme statistical observations (e.g., $Z > 10$ on file operations, 14 after-hours actions) constitute genuine candidate anomalies that Isolation Forest must learn to isolate. Removing them would destroy the core signal the model is built to detect.

---

## 4. Feature Engineering

To address EnvGuard's specific anomaly detection objectives, 9 new behavioral features were engineered:

| Engineered Feature | Mathematical Formulation | Security & Anomaly Detection Justification |
|:---|:---:|:---|
| `total_resource_activity` | `file_activity_count + usb_activity_count` | Aggregates all sensitive resource reads and export operations into a unified high-risk volume metric. |
| `total_daily_events` | $\sum (\text{logon} + \text{http} + \text{email} + \text{file} + \text{usb})$ | Captures total operational throughput across all access channels. Detects massive velocity surges. |
| `sensitive_activity_ratio` | $\frac{\text{total\_resource\_activity}}{\text{total\_daily\_events} + 10^{-5}}$ | Measures the concentration of user activity dedicated to sensitive resources vs routine operations. |
| `sin_weekday` | $\sin(2\pi \cdot \text{weekday} / 7)$ | Cyclical encoding ensuring Sunday (6) and Monday (0) maintain continuous geometric proximity. |
| `cos_weekday` | $\cos(2\pi \cdot \text{weekday} / 7)$ | Orthogonal component of weekly cyclical encoding. |
| `sin_login_hour` | $\sin(2\pi \cdot \text{login\_hour\_mean} / 24)$ | Cyclical encoding across midnight; ensures 23:30 and 00:30 are recognized as adjacent times. |
| `cos_login_hour` | $\cos(2\pi \cdot \text{login\_hour\_mean} / 24)$ | Orthogonal component of diurnal cyclical encoding. |
| `max_user_activity_z` | $\max(Z_{\text{logon}}, Z_{\text{http}}, Z_{\text{email}}, Z_{\text{file}}, Z_{\text{usb}})$ | Peak single-channel baseline surge. Provides an immediate axis-aligned indicator for extreme spikes. |
| `weekend_activity_volume` | $\text{is\_weekend} \times \text{total\_daily\_events}$ | Quantifies high-volume operations occurring specifically on non-working weekend days. |

---

## 5. Encoding and Numerical Preparation

- **Categorical Encoding:** No one-hot encoding was required because all non-behavioral categorical features (`role`, `department`, `functional_unit`) were excluded on security and sparsity grounds, and temporal categories (`weekday`) were converted to cyclical continuous coordinates ($\sin / \cos$).
- **Monotonic Scaling (StandardScaler / MinMaxScaler):**
  - **Decision:** **Omitted deliberately.**
  - **Justification:** Isolation Forest is a tree-based ensemble algorithm that isolates points through recursive axis-aligned orthogonal partitions. Because partition thresholds depend solely on feature order statistics (rank invariance), monotonic transformations (such as linear min-max scaling or z-standardization) produce mathematically equivalent isolation depths while destroying the intuitive interpretability of raw event counts and true standard deviation units ($Z$).
- **Precision:** All feature matrices are cast to standard IEEE 64-bit floating point (`float64`).

---

## 6. Chronological Partitioning for Isolation Forest

To simulate real-world secrets manager deployment and eliminate **temporal lookahead leakage**, data was partitioned chronologically rather than through random shuffling:

- **Partition Cutoff Date:** **`2011-02-06 00:00:00`** (80th percentile of unique calendar dates)
- **Training Feature Matrix (`training_features.parquet`):**
  - **Span:** 2010-01-02 to 2011-02-05 (400 calendar days)
  - **Dimensions:** **268,979 rows × 27 numerical features** (81.40% of total data)
  - **Purpose:** Unsupervised training of Isolation Forest to model normative enterprise baseline behavior.
- **Evaluation Feature Matrix (`evaluation_features.parquet`):**
  - **Span:** 2011-02-06 to 2011-05-17 (100 calendar days)
  - **Dimensions:** **61,473 rows × 27 numerical features** (18.60% of total data)
  - **Purpose:** Post-training evaluation and anomaly score inference on future unseen operations.
- **Full Processed Table (`processed_features.parquet`):**
  - **Dimensions:** **330,452 rows × 29 columns** (27 numerical features + 2 metadata columns: `user`, `day`).

---

## 7. Status of Target Labels

- **Label Availability:** No ground-truth label column exists in `feature_matrix_v1.parquet`.
- **Policy Compliance:** In strict accordance with instructions, no synthetic labels or misleading empty files were produced. `labels.parquet` was intentionally not generated.
- **Evaluation Mechanism:** If the official CERT answer key (`answers/insiders.csv`) is provided in future research stages, ground truth labels can be directly merged via the preserved `(user, day)` metadata keys in `processed_features.parquet`.

---

## 8. Limitations of Using CERT r4.2 for EnvGuard

1. **No Environment Dimension:** CERT does not distinguish between development, staging, or production infrastructure.
2. **OS Telemetry vs API Vault Telemetry:** File activity and USB activity are desktop-level proxies rather than cryptographic REST API actions (`vault:read`, `vault:rotate`).
3. **Daily Aggregation Granularity:** Sub-minute burst patterns (e.g., automated scraping of 50 secrets in 30 seconds) are captured as daily totals rather than micro-burst time intervals.

---

## 9. Suitability for Isolation Forest Training

The processed dataset is **exceptionally well-suited** for Isolation Forest training:
1. **Zero Missing & Finite Values:** All 27 feature columns contain strictly non-null, finite numerical values.
2. **High Skewness & Clear Tail Separation:** Core behavioral features exhibit typical log-normal/zero-inflated distributions where normal activity clusters tightly at the origin and anomalous behaviors extend into long tails, maximizing the partition efficiency of isolation trees.
3. **Multi-Vector Anomaly Signals:** The combination of volume counters, user-normalized z-scores, cyclical diurnal timings, and sensitive ratios provides multi-faceted coverage across all primary attack vectors.
4. **Zero Temporal Leakage:** The chronological 80/20 split ensures the model evaluates future activity purely based on learned historical norms.

---

## 10. Summary Inventory of Generated Artifacts

```text
envguard_ai/
│
├── data/
│   ├── raw/
│   │   └── feature_matrix_v1.parquet         (Original dataset, 330,452 x 33)
│   │
│   └── processed/
│       ├── processed_features.parquet        (Cleaned full table with metadata, 330,452 x 29)
│       ├── training_features.parquet         (Numerical training matrix, 268,979 x 27)
│       └── evaluation_features.parquet       (Numerical evaluation matrix, 61,473 x 27)
│
├── notebooks/
│   └── data_preprocessing.ipynb              (Interactive end-to-end preprocessing notebook)
│
├── src/
│   └── preprocessing.py                      (Modular, reproducible preprocessing pipeline)
│
├── reports/
│   ├── dataset_inspection.md                 (Comprehensive exploratory inspection report)
│   ├── feature_selection.md                  (Feature selection & proxy mapping report)
│   ├── preprocessing_report.md               (End-to-end preprocessing & pipeline report)
│   ├── generate_visualizations.py            (Script generating all report figures)
│   └── figures/
│       ├── 01_missing_values_distribution.png
│       ├── 02_behavioral_distributions.png
│       ├── 03_correlation_heatmap.png
│       ├── 04_user_deviation_zscores.png
│       ├── 05_temporal_timeline_split.png
│       └── 06_access_timing_patterns.png
│
└── requirements.txt                          (Core dependency specifications)
```

