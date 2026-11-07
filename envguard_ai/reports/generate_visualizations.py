"""
EnvGuard Anomaly Detection - Visualization Generator
====================================================
Generates clear, informative visual figures for the exploratory inspection
and feature engineering reports.
"""

import os
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd

# Styling configuration
plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.size"] = 10
plt.rcParams["axes.titlesize"] = 12
plt.rcParams["axes.labelsize"] = 10

OUTPUT_DIR = os.path.join("envguard_ai", "reports", "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Load datasets
raw_df = pd.read_parquet(os.path.join("envguard_ai", "data", "raw", "feature_matrix_v1.parquet"), engine="fastparquet")
proc_df = pd.read_parquet(os.path.join("envguard_ai", "data", "processed", "processed_features.parquet"), engine="fastparquet")

print("Generating Figure 1: Missing Values Distribution...")
# --- Figure 1: Missing Values Distribution ---
fig, ax = plt.subplots(figsize=(10, 5))
null_counts = raw_df.isnull().sum()
null_pct = (null_counts / len(raw_df)) * 100
missing_data = pd.DataFrame({"Count": null_counts, "Percentage": null_pct})
missing_data = missing_data[missing_data["Count"] > 0].sort_values(by="Count", ascending=True)

bars = ax.barh(missing_data.index, missing_data["Percentage"], color="#1f77b4", edgecolor="black", alpha=0.85)
ax.set_xlabel("Missing Percentage (%)")
ax.set_title("Missing Value Distribution in Raw Dataset (feature_matrix_v1.parquet)", fontweight="bold")
for bar, count in zip(bars, missing_data["Count"]):
    ax.text(bar.get_width() + 0.2, bar.get_y() + bar.get_height() / 2, f"{bar.get_width():.2f}% ({count:,} rows)",
            va="center", ha="left", fontsize=9, color="#333333")
ax.set_xlim(0, missing_data["Percentage"].max() + 4)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "01_missing_values_distribution.png"), dpi=300)
plt.close(fig)

print("Generating Figure 2: Behavioral Feature Distributions...")
# --- Figure 2: Behavioral Distributions (Log-scale) ---
fig, axes = plt.subplots(2, 3, figsize=(14, 8))
key_behaviors = [
    ("total_logon_activity", "Logon Activity Count (log scale)", "#2ca02c"),
    ("after_hours_activity", "After-Hours Activity Count (log scale)", "#d62728"),
    ("http_activity_count", "HTTP / Web Activity Count", "#1f77b4"),
    ("total_emails", "Total Daily Emails", "#9467bd"),
    ("file_activity_count", "File Activity Count (log scale)", "#ff7f0e"),
    ("usb_activity_count", "USB / Removable Media Count (log scale)", "#8c564b"),
]

for idx, (col, title, color) in enumerate(key_behaviors):
    ax = axes[idx // 3, idx % 3]
    val = raw_df[col]
    if "log scale" in title:
        sns.histplot(val, bins=30, ax=ax, color=color, kde=False, log_scale=(False, True))
        ax.set_ylabel("Log Frequency")
    else:
        sns.histplot(val, bins=30, ax=ax, color=color, kde=True)
        ax.set_ylabel("Frequency")
    ax.set_title(title, fontweight="bold", fontsize=10)
    ax.set_xlabel(col)

plt.suptitle("Distribution of Core Behavioral Activity Features in CERT r4.2", fontsize=14, fontweight="bold", y=0.98)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "02_behavioral_distributions.png"), dpi=300)
plt.close(fig)

print("Generating Figure 3: Correlation Heatmap...")
# --- Figure 3: Correlation Heatmap ---
feature_cols = [
    "total_logon_activity", "after_hours_activity", "after_hours_ratio",
    "http_activity_count", "total_emails", "file_activity_count", "usb_activity_count",
    "total_resource_activity", "total_daily_events", "sensitive_activity_ratio",
    "total_logon_activity_z_user", "http_activity_count_z_user", "file_activity_count_z_user", "usb_activity_count_z_user",
    "max_user_activity_z", "login_hour_mean", "login_hour_std", "is_weekend"
]
corr_matrix = proc_df[feature_cols].corr(method="spearman")

fig, ax = plt.subplots(figsize=(12, 10))
sns.heatmap(corr_matrix, cmap="coolwarm", vmin=-1, vmax=1, annot=True, fmt=".2f",
            annot_kws={"size": 7}, linewidths=0.5, ax=ax)
ax.set_title("Spearman Rank Correlation of Selected & Engineered Behavioral Features", fontweight="bold", fontsize=12)
plt.xticks(rotation=45, ha="right", fontsize=9)
plt.yticks(fontsize=9)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "03_correlation_heatmap.png"), dpi=300)
plt.close(fig)

print("Generating Figure 4: User Deviation Z-Score Distributions...")
# --- Figure 4: User Baseline Deviation Z-Scores (Box/Violin) ---
fig, ax = plt.subplots(figsize=(11, 5))
z_features = [
    "total_logon_activity_z_user",
    "http_activity_count_z_user",
    "total_emails_z_user",
    "file_activity_count_z_user",
    "usb_activity_count_z_user",
    "max_user_activity_z"
]
z_data = proc_df[z_features].copy()
z_data.columns = ["Logon Z", "HTTP Z", "Email Z", "File Z", "USB Z", "Peak Surge Z"]

sns.boxplot(data=z_data, ax=ax, palette="Set2", showfliers=True, flierprops={"marker": ".", "markersize": 2, "alpha": 0.3})
ax.axhline(0, color="gray", linestyle="--", linewidth=1, alpha=0.7)
ax.axhline(3, color="orange", linestyle=":", linewidth=1.5, label="Moderate Anomaly (Z > 3)")
ax.axhline(6, color="red", linestyle="--", linewidth=1.5, label="Extreme Anomaly (Z > 6)")
ax.set_title("User-Normalized Baseline Deviation Scores (Z-Scores) Across Monitored Channels", fontweight="bold", fontsize=11)
ax.set_ylabel("Standard Deviations from User Baseline (Z)")
ax.legend(loc="upper right")
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "04_user_deviation_zscores.png"), dpi=300)
plt.close(fig)

print("Generating Figure 5: Temporal Activity Timeline & Split...")
# --- Figure 5: Temporal Activity Timeline & Chronological Split ---
daily_summary = proc_df.groupby("day")["total_daily_events"].agg(["sum", "count"]).reset_index()
split_date = pd.to_datetime("2011-02-06")

fig, ax = plt.subplots(figsize=(12, 5))
ax.plot(daily_summary["day"], daily_summary["sum"] / 1000.0, color="#2b5c8f", linewidth=1.2, label="Total Daily Events (Thousands)")
ax.axvline(split_date, color="#e41a1c", linestyle="--", linewidth=2, label=f"Train/Eval Cutoff: {split_date.strftime('%Y-%m-%d')} (80/20)")
ax.fill_between(daily_summary["day"], 0, daily_summary["sum"] / 1000.0, where=(daily_summary["day"] < split_date),
                color="#b3cde3", alpha=0.4, label="Training Period (268,979 rows, 81.4%)")
ax.fill_between(daily_summary["day"], 0, daily_summary["sum"] / 1000.0, where=(daily_summary["day"] >= split_date),
                color="#fbb4ae", alpha=0.4, label="Evaluation Period (61,473 rows, 18.6%)")
ax.set_title("Timeline of Organizational Activity and Chronological Train/Evaluation Split", fontweight="bold")
ax.set_xlabel("Date")
ax.set_ylabel("Total Events (Thousands)")
ax.legend(loc="upper right")
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "05_temporal_timeline_split.png"), dpi=300)
plt.close(fig)

print("Generating Figure 6: Access Timing Patterns & Cyclical Encodings...")
# --- Figure 6: Access Timing & Cyclical Features ---
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# Subplot 1: After hours ratio distribution
sns.histplot(proc_df["after_hours_ratio"], bins=30, ax=axes[0], color="#d95f02", kde=False, log_scale=(False, True))
axes[0].set_title("After-Hours Activity Ratio Distribution", fontweight="bold")
axes[0].set_xlabel("Ratio of After-Hours Events to Daily Total")
axes[0].set_ylabel("Log Frequency")

# Subplot 2: Cyclical 24h Login Hour Transformation
sample_df = proc_df.sample(n=10000, random_state=42)
sc = axes[1].scatter(sample_df["cos_login_hour"], sample_df["sin_login_hour"],
                     c=sample_df["login_hour_mean"], cmap="twilight", alpha=0.4, s=8)
axes[1].set_title("Cyclical Encoding of Mean Login Hour (sin / cos)", fontweight="bold")
axes[1].set_xlabel("cos(2π * Hour / 24)")
axes[1].set_ylabel("sin(2π * Hour / 24)")
cbar = plt.colorbar(sc, ax=axes[1])
cbar.set_label("Hour of Day (0 - 24)")

plt.suptitle("Access Timing Behavior and Cyclical Coordinate Representation", fontsize=13, fontweight="bold", y=1.02)
plt.tight_layout()
fig.savefig(os.path.join(OUTPUT_DIR, "06_access_timing_patterns.png"), dpi=300)
plt.close(fig)

print("All 6 visualization figures generated successfully in:", OUTPUT_DIR)

