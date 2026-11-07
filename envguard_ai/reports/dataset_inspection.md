# EnvGuard Anomaly Detection: Dataset Inspection Report

**Project:** EnvGuard (Zero-Knowledge Secrets Manager)  
**Task:** Exploratory Dataset Inspection & Telemetry Evaluation  
**Dataset:** Preprocessed CERT Insider Threat Dataset r4.2 (`feature_matrix_v1.parquet`)  
**Zenodo Record:** [DOI: 10.5281/zenodo.19435851](https://zenodo.org/records/19435851)  
**Inspection Date:** 2026-11-06  

---

## 1. Executive Summary

This inspection report evaluates the preprocessed CERT r4.2 tabular feature matrix (`feature_matrix_v1.parquet`) for training an unsupervised **Isolation Forest** anomaly detection model in **EnvGuard**. 

EnvGuard detects anomalous behavior using zero-knowledge audit-log metadata (User, Event type, Timestamp, Environment). The CERT dataset provides user-day aggregated behavioral telemetry over a 500-day window (2010-01-02 to 2011-05-17) across 1,000 distinct organizational users.

### Key Inspection Highlights:
- **Total Records (Rows):** 330,452 user-day observations.
- **Total Columns:** 33 features.
- **Duplicate Records:** 0 exact full-row duplicates; 0 `(user, day)` key duplicates. Granularity is strictly one record per user per day.
- **Missing Values:** Only 5 out of 33 columns contain missing values: 2 rolling-window lookback features (0.61% missing) and 3 static organizational metadata features (9.47% to 10.93% missing). All 28 other columns have zero missing values.
- **Target Labels:** **None present.** The Zenodo release contains no ground-truth target label column (e.g., `is_threat` or `label`). Model training must proceed unsupervised, matching real-world zero-knowledge deployment.

---

## 2. Dataset Structure and Data Types

The raw dataset comprises 33 columns spanning temporal, categorical, and numerical types:

| Index | Column Name | Data Type | Missing Count | Missing Pct (%) | Category / Role in Raw Data |
|:-----:|:---|:---:|:---:|:---:|:---|
| 1 | `user` | `object` | 0 | 0.00% | User identifier (1,000 unique users) |
| 2 | `day` | `datetime64[ns]` | 0 | 0.00% | Observation date (2010-01-02 to 2011-05-17) |
| 3 | `total_logon_activity` | `int64` | 0 | 0.00% | Daily authentication / logon count |
| 4 | `after_hours_activity` | `int64` | 0 | 0.00% | Actions executed outside business hours |
| 5 | `after_hours_ratio` | `float64` | 0 | 0.00% | Ratio of after-hours actions to daily total |
| 6 | `http_activity_count` | `float64` | 0 | 0.00% | Daily HTTP web browsing events |
| 7 | `total_emails` | `float64` | 0 | 0.00% | Daily sent/received email messages |
| 8 | `avg_sentiment` | `float64` | 0 | 0.00% | Average sentiment score of email text |
| 9 | `file_activity_count` | `float64` | 0 | 0.00% | Daily file system access / copy operations |
| 10 | `usb_activity_count` | `float64` | 0 | 0.00% | Daily removable media / USB transfer events |
| 11 | `sentiment_negative_flag` | `int64` | 0 | 0.00% | Binary flag for negative email sentiment |
| 12 | `sentiment_strong_negative_flag` | `int64` | 0 | 0.00% | Binary flag for severe negative sentiment |
| 13 | `sentiment_30d_std` | `float64` | 2,000 | 0.61% | 30-day rolling std of sentiment |
| 14 | `sentiment_z_user` | `float64` | 0 | 0.00% | User-normalized sentiment deviation |
| 15 | `weekday` | `int32` | 0 | 0.00% | Day of week integer (0=Mon, ..., 6=Sun) |
| 16 | `is_weekend` | `int64` | 0 | 0.00% | Binary indicator (1 if Sat/Sun, else 0) |
| 17 | `logon_7d_mean` | `float64` | 2,000 | 0.61% | 7-day rolling average of logon activity |
| 18 | `total_logon_activity_z_user` | `float64` | 0 | 0.00% | User-normalized logon activity z-score |
| 19 | `http_activity_count_z_user` | `float64` | 0 | 0.00% | User-normalized HTTP activity z-score |
| 20 | `total_emails_z_user` | `float64` | 0 | 0.00% | User-normalized email volume z-score |
| 21 | `file_activity_count_z_user` | `float64` | 0 | 0.00% | User-normalized file activity z-score |
| 22 | `usb_activity_count_z_user` | `float64` | 0 | 0.00% | User-normalized USB activity z-score |
| 23 | `login_hour_mean` | `float64` | 0 | 0.00% | Mean hour of daily logins (24-hour clock) |
| 24 | `login_hour_std` | `float64` | 0 | 0.00% | Standard deviation of login hours |
| 25 | `login_hour_range_p90_p10` | `float64` | 0 | 0.00% | Difference between 90th and 10th percentile login hour |
| 26 | `O` | `int64` | 0 | 0.00% | Openness personality score (OCEAN) |
| 27 | `C` | `int64` | 0 | 0.00% | Conscientiousness personality score (OCEAN) |
| 28 | `E` | `int64` | 0 | 0.00% | Extraversion personality score (OCEAN) |
| 29 | `A` | `int64` | 0 | 0.00% | Agreeableness personality score (OCEAN) |
| 30 | `N` | `int64` | 0 | 0.00% | Neuroticism personality score (OCEAN) |
| 31 | `role` | `object` | 31,281 | 9.47% | Organizational role / job title (42 unique) |
| 32 | `department` | `object` | 36,125 | 10.93% | Department assignment (23 unique) |
| 33 | `functional_unit` | `object` | 31,973 | 9.68% | Business functional unit (7 unique) |

---

## 3. Missing Values and Duplicates

### Missing Values Analysis
A total of 5 columns exhibit missing values:
- `logon_7d_mean`: 2,000 missing rows (0.61%). This occurs exactly across the first 2 days of observation for all 1,000 users before the 7-day rolling window accumulated sufficient history.
- `sentiment_30d_std`: 2,000 missing rows (0.61%). Occurs for the initial 2 days of sentiment tracking.
- `role`: 31,281 missing rows (9.47%).
- `department`: 36,125 missing rows (10.93%).
- `functional_unit`: 31,973 missing rows (9.68%).

A bar visualization of these missing values is recorded in `figures/01_missing_values_distribution.png`.

### Duplicates Analysis
- **Exact Full-Row Duplicates:** `0`
- **User + Day Key Duplicates:** `0`
- **Granularity Validation:** The dataset contains strictly one row per `(user, day)` tuple across all 330,452 observations. No repeated user-day aggregations are present.

---

## 4. Categorical and Identifier Columns

The dataset contains 4 object-type columns:

1. **`user` (1,000 unique values):**
   - High-cardinality alphanumeric identifier (e.g., `IKP0472`, `HAD0246`).
   - Represents the user identity across 500 calendar days (average ~330 active days per user).
   - **Role:** Must be isolated as metadata; excluded from model input features to prevent tree memorization.

2. **`role` (42 unique values, 31,281 missing):**
   - Top roles: `ProductionLineWorker` (55,086), `Technician` (46,247), `Salesman` (44,568), `Scientist` (13,110), `SoftwareEngineer` (12,812).
   - **Role:** Static organizational attribute; excluded from zero-knowledge model features.

3. **`department` (23 unique values, 36,125 missing):**
   - Top departments: `3 - Assembly` (57,854), `2 - Sales` (47,336), `3 - FieldService` (47,013), `3 - Engineering` (38,901).
   - **Role:** Static organizational attribute; excluded from zero-knowledge model features.

4. **`functional_unit` (7 unique values, 31,973 missing):**
   - Units: `2 - ResearchAndEngineering` (99,547), `5 - SalesAndMarketing` (95,733), `3 - Manufacturing` (65,870), `1 - Adminstration` (26,994), `6 - PurchasingAndContracts` (5,674), `4 - Finance` (4,661).
   - **Role:** Static organizational attribute; excluded from zero-knowledge model features.

---

## 5. Statistical Summary of Numerical Features

Summary statistics for key numerical behavioral columns:

| Column | Mean | Std Dev | Min | Median | Max | Skewness / Tail Characteristics |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| `total_logon_activity` | 2.59 | 1.39 | 1.00 | 2.00 | 17.00 | Clustered at 2-3 logons; tail up to 17 |
| `after_hours_activity` | 0.28 | 1.02 | 0.00 | 0.00 | 14.00 | Highly zero-inflated; >90% days have 0 |
| `after_hours_ratio` | 0.067 | 0.199 | 0.00 | 0.00 | 1.00 | Rare off-hours shifts show ratio = 1.0 |
| `http_activity_count` | 86.05 | 57.28 | 0.00 | 95.00 | 400.00 | Broad distribution; median ~95 |
| `total_emails` | 7.96 | 5.29 | 0.00 | 9.00 | 36.00 | Normal daily communication volume |
| `file_activity_count` | 1.35 | 4.70 | 0.00 | 0.00 | 54.00 | Severe right-skew; 75th percentile is 0 |
| `usb_activity_count` | 1.23 | 3.71 | 0.00 | 0.00 | 28.00 | Severe right-skew; 75th percentile is 0 |
| `total_logon_activity_z_user` | -0.00 | 0.69 | -18.55 | 0.00 | 15.07 | Standardized user baseline deviation |
| `file_activity_count_z_user` | 0.00 | 0.50 | -7.97 | 0.00 | 18.25 | Highlights massive single-day file surges |
| `usb_activity_count_z_user` | 0.00 | 0.50 | -9.94 | 0.00 | 18.25 | Highlights massive single-day USB surges |
| `login_hour_mean` | 12.39 | 0.89 | 10.75 | 12.40 | 15.35 | Core workday logon timing |

---

## 6. Identification of Target Labels and Missing Label Policy

An exhaustive check for candidate ground-truth columns (`label`, `target`, `class`, `insider`, `anomaly`, `malicious`) yielded **zero matching columns**. 

### Ground Truth Evaluation Context:
In official raw CERT r4.2 releases from Carnegie Mellon University, ground-truth answers are maintained in a separate answer archive (`answers/insiders.csv`), cataloging 30 malicious insiders across 3 threat scenarios. However, the Zenodo parquet dataset (`feature_matrix_v1.parquet`) published by Antonio Barrera Mora is strictly a feature matrix without embedded target labels.

### Handling Strategy:
Per project requirements:
1. We do **not** invent artificial labels or fabricate synthetic attack flags.
2. We do **not** generate misleading empty `labels.parquet` files.
3. Unsupervised training proceeds on baseline data, establishing normative behavioral distributions.
4. If ground truth files (`insiders.csv`) become available in future phases, the preserved `(user, day)` metadata keys in `processed_features.parquet` allow instant join-based evaluation.

---

## 7. Categorization of Features Against EnvGuard Requirements

| Category | Columns | EnvGuard Alignment | Decision |
|:---|:---|:---|:---:|
| **Access & Authentication** | `total_logon_activity`, `after_hours_activity`, `after_hours_ratio` | High (maps to authentication volume and off-hours access) | **Selected** |
| **Monitored Channels** | `http_activity_count`, `total_emails`, `file_activity_count`, `usb_activity_count` | High (file/USB proxy sensitive secret read & export) | **Selected** |
| **User Baseline Deviations** | `*_z_user` (logon, http, email, file, usb) | High (detects sudden spikes relative to normal user habits) | **Selected** |
| **Temporal / Calendar** | `weekday`, `is_weekend`, `login_hour_mean`, `login_hour_std`, `login_hour_range_p90_p10` | High (captures access time patterns and weekend activity) | **Selected** |
| **Rolling Baselines** | `logon_7d_mean` | High (short-term moving average of access intensity) | **Selected** |
| **Psychometrics (OCEAN)** | `O`, `C`, `E`, `A`, `N` | None (Personality scores do not exist in zero-knowledge audit logs) | **Excluded** |
| **Email Sentiment** | `avg_sentiment`, `sentiment_negative_flag`, `sentiment_strong_negative_flag`, `sentiment_30d_std`, `sentiment_z_user` | None (Zero-knowledge secret managers do not parse email bodies) | **Excluded** |
| **Static Demographics** | `role`, `department`, `functional_unit` | Poor (~10% missing, static non-behavioral organizational data) | **Excluded** |
| **Identifiers** | `user`, `day` | Metadata (causes memorization if fed to model) | **Preserved as Metadata** |

