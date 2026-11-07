# EnvGuard Anomaly Detection: Feature Selection Report

**Project:** EnvGuard (Zero-Knowledge Secrets Manager)  
**Task:** Feature Selection, Behavioral Proxy Mapping, and Exclusion Rationale  
**Dataset:** CERT Insider Threat Dataset r4.2 (`feature_matrix_v1.parquet`)  
**Target Algorithm:** Isolation Forest  

---

## 1. Project Context & Objectives

EnvGuard is a zero-knowledge secrets management system designed to safeguard API keys, database credentials, encryption certificates, and configuration variables. In EnvGuard's threat model:
- The system processes **audit-log metadata only**: User ID, Event Type, Timestamp, and Target Environment.
- EnvGuard cannot decrypt secret payloads or inspect external communications (e.g., email text or web browsing contents).
- Anomaly detection serves as an automated early-warning trigger for **step-up authentication** (e.g., prompting MFA, WebAuthn hardware token verification, or session locking) when suspicious deviations from normative behavior occur.

---

## 2. Selected Features & Proxy Mappings

Because the CERT r4.2 dataset represents general corporate workstation telemetry rather than application-layer secrets management, we have identified rigorous behavioral **proxy mappings** that capture the exact operational concepts of EnvGuard:

| CERT r4.2 Feature | EnvGuard Behavioral Concept | Behavioral Mapping & Threat Detection Mechanism | Limitations & Differences |
|:---|:---|:---|:---|
| `total_logon_activity` | **Session Authentication Frequency** | Captures total daily authentications. Detects brute-force authentication spikes, multiple concurrent sessions, or unusual session cycling. | Measures OS desktop logins rather than API tokens or OAuth sessions. |
| `after_hours_activity` | **Off-Hours Secret Access** | Counts activities performed outside standard working hours. Identifies adversaries or compromised credentials accessing secrets at night. | Defined by standard workplace hours (8am–6pm) rather than custom engineer shifts. |
| `after_hours_ratio` | **Off-Hours Activity Proportion** | Proportion of daily operations executed after-hours. Detects full schedule shifts towards clandestine nocturnal operations. | Ratios can approach 1.0 on low-activity weekends; must be paired with volume. |
| `file_activity_count` | **Secret Read / Export Frequency** | Serves as a direct behavioral proxy for read operations on sensitive resources (reading credentials, downloading secret bundles). | Measures filesystem interactions rather than cryptographic vault REST API reads. |
| `usb_activity_count` | **Credential Exfiltration Proxy** | Measures removable device data transfers. Proxies exfiltrating sensitive credentials or exporting private keys outside the authorized perimeter. | Physical USB connections versus network/API-based secret exfiltration. |
| `http_activity_count` | **API Request Volume** | Proxies web portal and automated API traffic volume. High spikes indicate automated credential harvesting or API scraping. | Represents HTTP browsing requests rather than specialized vault REST endpoints. |
| `total_emails` | **Secondary Communication Volume** | Secondary channel activity. Useful as a baseline context indicator for active working days. | Workstation emails rather than alert notification dispatches. |
| `weekday` & `is_weekend` | **Temporal Access Cadence** | Establishes whether operations take place on normal working days or weekends. Non-working day access to production secrets is a high-risk trigger. | Static calendar mapping; does not account for statutory company holidays. |
| `logon_7d_mean` | **Short-Term Moving Baseline** | Rolling 7-day average logon count. Provides an adaptive baseline for expected daily activity intensity. | Requires lookback initialization (imputed during the first 2 days). |
| `total_logon_activity_z_user` | **Logon Volume Anomaly Score** | Daily logon count normalized against the user's personal historical baseline: $(x - \mu_{\text{user}}) / \sigma_{\text{user}}$. | Pre-aggregated in feature matrix v1 using full-history statistics. |
| `http_activity_count_z_user` | **API Volume Anomaly Score** | Daily HTTP traffic normalized against user's historical baseline. Directly detects sudden surges in request velocity. | Pre-aggregated in feature matrix v1. |
| `file_activity_count_z_user` | **Sensitive Read Surge Score** | User-normalized file activity z-score. Detects users who normally read 0–1 files suddenly accessing dozens of resources. | Zero-inflated baseline means single large events generate high z-scores. |
| `usb_activity_count_z_user` | **Exfiltration Surge Score** | User-normalized removable media activity z-score. Flags unprecedented data export behavior. | Zero-inflated baseline. |
| `total_emails_z_user` | **Communication Surge Score** | User-normalized email volume deviation. | Captures general communication deviations. |
| `login_hour_mean` | **Mean Login Hour** | Average hour of initial access. Identifies users logging in at atypical times (e.g., 03:00 instead of 09:00). | Tree models require cyclical encoding to capture midnight continuity. |
| `login_hour_std` | **Login Timing Inconsistency** | Standard deviation of login hours across the day. High values indicate irregular, fragmented access patterns. | Low on days with only a single login event. |
| `login_hour_range_p90_p10` | **Login Window Dispersion** | Spread between 10th and 90th percentile login hour. Captures span of daily active presence. | Dependent on daily event frequency. |

---

## 3. Excluded Features and Justifications

To preserve the zero-knowledge security guarantees of EnvGuard and prevent model degradation, the following features have been **strictly excluded**:

### A. Psychometric / Personality Features (`O`, `C`, `E`, `A`, `N`)
- **Excluded Columns:** `O` (Openness), `C` (Conscientiousness), `E` (Extraversion), `A` (Agreeableness), `N` (Neuroticism).
- **Justification:** Psychometric tests do not exist in zero-knowledge audit logs. In a secrets management application, storing or processing employee psychological profiles is invasive, legally problematic under privacy frameworks (GDPR/CCPA), and non-behavioral. Including them would introduce artificial biases that cannot exist in production EnvGuard deployments.

### B. Email Sentiment Features
- **Excluded Columns:** `avg_sentiment`, `sentiment_negative_flag`, `sentiment_strong_negative_flag`, `sentiment_30d_std`, `sentiment_z_user`.
- **Justification:** EnvGuard monitors metadata only. A zero-knowledge secrets manager does not read email contents, perform NLP sentiment analysis, or evaluate employee workplace mood. Excluding these features enforces adherence to zero-knowledge telemetry.

### C. Static Demographic Metadata (`role`, `department`, `functional_unit`)
- **Excluded Columns:** `role` (42 classes), `department` (23 classes), `functional_unit` (7 classes).
- **Justification:**
  1. **High Missingness:** 9.5% to 10.9% missing values in raw logs.
  2. **Non-Behavioral:** These represent static HR assignments rather than dynamic access behavior.
  3. **Dimensionality Sparsity:** One-hot encoding these columns would inject 72 sparse categorical columns into tree partitioning, diluting the numerical split density of genuine behavioral signals.

### D. Direct Identifiers (`user`, `day`)
- **Handling:** Isolated as metadata index columns; completely excluded from the model feature matrix $X$.
- **Justification:** If user IDs are fed into Isolation Forest (or one-hot encoded), tree splits can memorize specific user labels rather than learning generalizable anomaly distributions.

---

## 4. Explicit Dataset Limitations

To maintain academic and engineering integrity, the following limitations of using CERT r4.2 for EnvGuard must be acknowledged:

1. **Absence of Environment Telemetry:**
   - EnvGuard's primary design detects users shifting from `development` or `staging` environments to sensitive `production` secrets.
   - CERT r4.2 **does not contain an environment column** or network environment tags. We cannot evaluate cross-environment lateral movement directly from the raw data.
2. **Absence of Secret-Management Specific Actions:**
   - CERT r4.2 captures desktop OS events (logons, HTTP web browsing, USB drives, files, emails). It does not capture secrets manager API verbs such as `read_secret`, `create_secret`, `delete_secret`, `rotate_key`, or `export_vault`.
   - `file_activity_count` and `usb_activity_count` serve as behavioral proxies for resource read and exfiltration operations, but represent workstation interactions rather than cryptographic vault transactions.
3. **Absence of Fine-Grained API Request Timestamps in Aggregated Matrix:**
   - The dataset is pre-aggregated at daily granularity (`(user, day)`), meaning second-by-second burst rates (e.g., 500 secret reads in 2 minutes) are collapsed into daily sums.

---

## 5. Summary of Final Selected Features

The feature selection process yields **18 core behavioral features** directly from CERT r4.2, which are subsequently combined with **9 engineered behavioral features** (totaling **27 numerical input features**) for the Isolation Forest pipeline.

