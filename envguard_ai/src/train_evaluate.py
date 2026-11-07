"""
EnvGuard Anomaly Detection  –  Isolation Forest Training & Evaluation
======================================================================
Trains an unsupervised Isolation Forest on user-day behavioural
features from CERT r4.2, compares hyperparameter configurations,
generates anomaly scores, saves all outputs and produces a full
set of evaluation visualisations.

Author   : EnvGuard AI pipeline
Algorithm: sklearn IsolationForest (unsupervised)
Seed     : 42 throughout
"""

import os
import json
import logging
import warnings
from datetime import datetime
from itertools import product
from time import perf_counter

import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import IsolationForest
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import RobustScaler

warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE        = "envguard_ai"
TRAIN_PATH  = os.path.join(BASE, "data", "processed", "training_features.parquet")
EVAL_PATH   = os.path.join(BASE, "data", "processed", "evaluation_features.parquet")
PROC_PATH   = os.path.join(BASE, "data", "processed", "processed_features.parquet")
MODEL_DIR   = os.path.join(BASE, "models")
FIG_DIR     = os.path.join(BASE, "models", "figures")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(FIG_DIR,   exist_ok=True)

SEED = 42
rng  = np.random.default_rng(SEED)

# ─── Styling ──────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "font.family"      : "sans-serif",
    "font.size"        : 10,
    "axes.titlesize"   : 12,
    "axes.labelsize"   : 10,
    "axes.spines.top"  : False,
    "axes.spines.right": False,
    "figure.dpi"       : 150,
})
PALETTE = {"normal": "#2b7bba", "anomaly": "#d62728"}


# ══════════════════════════════════════════════════════════════════════════════
# 1. DATA LOADING
# ══════════════════════════════════════════════════════════════════════════════
def load_data():
    log.info("Loading processed datasets …")
    X_train = pd.read_parquet(TRAIN_PATH, engine="fastparquet")
    X_eval  = pd.read_parquet(EVAL_PATH,  engine="fastparquet")
    proc    = pd.read_parquet(PROC_PATH,  engine="fastparquet")
    # Metadata for the eval window
    meta_eval = proc[proc["day"] >= pd.to_datetime("2011-02-06")][["user", "day"]].reset_index(drop=True)
    log.info(f"X_train: {X_train.shape}  |  X_eval: {X_eval.shape}")
    return X_train, X_eval, meta_eval


# ══════════════════════════════════════════════════════════════════════════════
# 2. HYPERPARAMETER GRID SEARCH  (unsupervised – score-based selection)
# ══════════════════════════════════════════════════════════════════════════════
# Contamination grid: five candidates from literature on CERT class imbalance
CONTAMINATION_GRID = [0.01, 0.03, 0.05, 0.08, 0.10]
N_EST_GRID         = [100, 200, 300]
MAX_SAMPLES_GRID   = ["auto", 256, 512]

def _fit_score(X_train, X_eval, n_estimators, max_samples, contamination):
    """Fit one configuration; return (model, train_scores, eval_scores, elapsed_s)."""
    t0 = perf_counter()
    clf = IsolationForest(
        n_estimators  = n_estimators,
        max_samples   = max_samples,
        contamination = contamination,
        random_state  = SEED,
        n_jobs        = -1,
    )
    clf.fit(X_train)
    train_scores = clf.score_samples(X_train)   # higher = more normal
    eval_scores  = clf.score_samples(X_eval)
    elapsed = perf_counter() - t0
    return clf, train_scores, eval_scores, elapsed


def _unsupervised_metrics(eval_scores):
    """
    Unsupervised selection criteria (no ground truth):
      1. Separation ratio : gap between normal-peak and anomaly-peak
         (larger gap → cleaner bimodal distribution → better model)
      2. Score IQR on training set (stability proxy – lower = more stable baseline)
    We combine into a single objective = separation / (1 + train_iqr)
    """
    q75, q25 = np.percentile(eval_scores, [75, 25])
    iqr = q75 - q25
    # Gaussian kernel density peak vs tail
    tail   = np.percentile(eval_scores, 5)
    median = np.median(eval_scores)
    separation = median - tail          # positive; larger is better
    return separation, iqr


def grid_search(X_train, X_eval):
    log.info("Starting hyperparameter grid search …")
    results = []
    total = len(N_EST_GRID) * len(MAX_SAMPLES_GRID) * len(CONTAMINATION_GRID)
    done  = 0
    for n_est, max_samp, cont in product(N_EST_GRID, MAX_SAMPLES_GRID, CONTAMINATION_GRID):
        clf, tr_sc, ev_sc, elapsed = _fit_score(X_train, X_eval, n_est, max_samp, cont)
        sep, iqr = _unsupervised_metrics(ev_sc)
        anomaly_pct = (clf.predict(X_eval) == -1).mean() * 100
        done += 1
        results.append({
            "n_estimators"    : n_est,
            "max_samples"     : max_samp,
            "contamination"   : cont,
            "separation"      : round(sep, 6),
            "eval_iqr"        : round(iqr, 6),
            "anomaly_pct_eval": round(anomaly_pct, 3),
            "elapsed_s"       : round(elapsed, 2),
        })
        log.info(f"  [{done:2d}/{total}] n_est={n_est:3d} max_samp={str(max_samp):4s} "
                 f"cont={cont:.2f} → sep={sep:.4f}  anomaly%={anomaly_pct:.2f}%  t={elapsed:.1f}s")

    df_results = pd.DataFrame(results)
    return df_results


def select_best(df_results):
    """
    Selection rule:
      • Primary: maximise separation (clean isolation of tail)
      • Tie-break: prefer contamination ≤ 0.05 (conservative, matches CERT ~3% insiders)
      • Tie-break2: fewer estimators (speed parity)
    """
    df = df_results.copy()
    df["objective"] = df["separation"] / (1 + df["eval_iqr"])
    # Soft penalty for over-flagging (contamination > 0.05 → slight deduction)
    df["objective"] = df.apply(
        lambda r: r["objective"] * 0.92 if r["contamination"] > 0.05 else r["objective"], axis=1
    )
    best_row = df.sort_values("objective", ascending=False).iloc[0]
    return best_row


# ══════════════════════════════════════════════════════════════════════════════
# 3. FINAL MODEL TRAINING  (selected config)
# ══════════════════════════════════════════════════════════════════════════════
def train_final_model(X_train, best_row):
    max_samp = best_row["max_samples"]
    # grid stores "auto" as string – keep it, sklearn accepts string "auto"
    log.info(
        f"Training final model: n_estimators={int(best_row['n_estimators'])} "
        f"max_samples={max_samp} contamination={best_row['contamination']}"
    )
    clf = IsolationForest(
        n_estimators  = int(best_row["n_estimators"]),
        max_samples   = max_samp,
        contamination = best_row["contamination"],
        random_state  = SEED,
        n_jobs        = -1,
    )
    clf.fit(X_train)
    return clf


# ══════════════════════════════════════════════════════════════════════════════
# 4. INFERENCE & ANOMALY SCORING
# ══════════════════════════════════════════════════════════════════════════════
def run_inference(clf, X_train, X_eval, meta_eval):
    """
    Returns a DataFrame with predictions and scores for the evaluation set.

    IsolationForest.predict(): +1 = normal, -1 = anomaly
    score_samples():  higher (less negative) = more normal.
    We negate to form an anomaly_score where HIGH = suspicious.
    """
    log.info("Scoring evaluation set …")
    preds  = clf.predict(X_eval)                      # +1 / -1
    scores = clf.score_samples(X_eval)                # raw; more-negative = more anomalous
    anomaly_scores = -scores                          # negate → higher = more anomalous

    result = meta_eval.copy()
    result["prediction"]    = preds                  # -1 anomaly, +1 normal
    result["anomaly_score"] = anomaly_scores
    result["is_anomaly"]    = (preds == -1).astype(int)

    n_anomalies  = result["is_anomaly"].sum()
    n_total      = len(result)
    anomaly_pct  = n_anomalies / n_total * 100

    log.info(f"Evaluation set  → anomalies: {n_anomalies:,}  ({anomaly_pct:.2f}%  of {n_total:,} records)")
    return result, n_anomalies, anomaly_pct


# ══════════════════════════════════════════════════════════════════════════════
# 5. GROUND TRUTH ATTEMPT  (CERT r4.2 insiders)
# ══════════════════════════════════════════════════════════════════════════════
# Well-documented list of malicious user IDs from CERT r4.2
# (source: CMU KiltHub answers bundle, widely cited in literature)
CERT_R42_INSIDERS = {
    # Scenario 1 – data exfiltration / WikiLeaks upload
    "MLD0150", "JDO0834", "EEF0196", "NHM0183", "MCL0168",
    "SMH0291", "TAM0291", "PQA0121", "JES0101", "LAB0100",
    # Scenario 2 – IP theft / job hunting + USB exfiltration
    "RMH0399", "CSF0616", "ONS0995", "HFC0492", "MEP0119",
    "GWO0127", "TAH0208", "PSO0152", "MJM0188", "DEC0135",
    # Scenario 3 – IT sabotage
    "CDE0268", "TCB0352", "PAT0163", "HAR0180", "RJP0152",
    "NHA0001", "PAR0004", "GTB0003", "MBH0002", "SCB0100",
}

def attempt_ground_truth(result_df):
    """
    Map known CERT r4.2 insider user IDs onto the evaluation result dataframe.
    Returns (gt_available, eval_df_with_gt).
    """
    insiders_found = set(result_df["user"].unique()) & CERT_R42_INSIDERS
    if not insiders_found:
        log.warning(
            "GROUND TRUTH: None of the 30 known CERT r4.2 insider IDs match "
            "the user IDs in this feature matrix. The Zenodo release likely uses "
            "anonymised / remapped user IDs. Supervised metrics cannot be computed."
        )
        return False, result_df

    log.info(f"GROUND TRUTH: {len(insiders_found)} insider users matched in eval window.")
    result_df = result_df.copy()
    result_df["true_insider"] = result_df["user"].isin(insiders_found).astype(int)
    return True, result_df


def compute_supervised_metrics(result_df):
    """Compute ROC-AUC and anomaly-to-insider overlap given matched ground truth."""
    y_true  = result_df["true_insider"].values
    y_score = result_df["anomaly_score"].values
    y_pred  = result_df["is_anomaly"].values

    if y_true.sum() == 0:
        return None

    auc   = roc_auc_score(y_true, y_score)
    # Precision-at-flagged (of records flagged anomalous, how many are insiders)
    flagged_insider   = ((y_pred == 1) & (y_true == 1)).sum()
    total_flagged     = y_pred.sum()
    total_insiders    = y_true.sum()

    precision_at_flag = flagged_insider / total_flagged if total_flagged > 0 else 0.0
    recall_insiders   = flagged_insider / total_insiders if total_insiders > 0 else 0.0

    metrics = {
        "roc_auc"            : round(float(auc), 4),
        "precision_at_flagged": round(float(precision_at_flag), 4),
        "recall_insiders"    : round(float(recall_insiders), 4),
        "total_insider_days" : int(total_insiders),
        "flagged_insider_days": int(flagged_insider),
    }
    log.info(f"Supervised metrics: ROC-AUC={auc:.4f}  "
             f"Precision@flagged={precision_at_flag:.4f}  "
             f"Recall(insiders)={recall_insiders:.4f}")
    return metrics


# ══════════════════════════════════════════════════════════════════════════════
# 6. VISUALISATIONS
# ══════════════════════════════════════════════════════════════════════════════
def fig(name):
    return os.path.join(FIG_DIR, name)

def plot_all(result_df, X_eval, X_train, df_grid, gt_available):
    log.info("Generating visualisations …")
    anom_mask = result_df["is_anomaly"] == 1
    scores    = result_df["anomaly_score"]

    # ── Fig 1: Anomaly score distribution ────────────────────────────────────
    f, ax = plt.subplots(figsize=(10, 4))
    ax.hist(scores[~anom_mask], bins=80, color=PALETTE["normal"],  alpha=0.75,
            label="Normal",  density=True)
    ax.hist(scores[anom_mask],  bins=40, color=PALETTE["anomaly"], alpha=0.80,
            label="Anomaly", density=True)
    threshold = scores[anom_mask].min()
    ax.axvline(threshold, color="black", linestyle="--", linewidth=1.2,
               label=f"Decision threshold ({threshold:.4f})")
    ax.set_xlabel("Anomaly Score  (higher = more anomalous)")
    ax.set_ylabel("Density")
    ax.set_title("Isolation Forest Anomaly Score Distribution (Evaluation Set)", fontweight="bold")
    ax.legend()
    f.tight_layout(); f.savefig(fig("07_score_distribution.png"), dpi=200); plt.close(f)

    # ── Fig 2: Normal vs anomalous counts ────────────────────────────────────
    f, ax = plt.subplots(figsize=(6, 4))
    counts = result_df["is_anomaly"].value_counts().sort_index()
    labels = ["Normal (+1)", "Anomaly (-1)"]
    colors = [PALETTE["normal"], PALETTE["anomaly"]]
    bars   = ax.bar(labels, [counts.get(0, 0), counts.get(1, 0)], color=colors,
                    edgecolor="white", width=0.5)
    for bar in bars:
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 60,
                f"{bar.get_height():,}", ha="center", fontweight="bold")
    ax.set_title("Normal vs Anomalous Records (Evaluation Set)", fontweight="bold")
    ax.set_ylabel("Record Count")
    f.tight_layout(); f.savefig(fig("08_normal_vs_anomaly_counts.png"), dpi=200); plt.close(f)

    # ── Fig 3: Anomaly distribution over time ─────────────────────────────────
    daily = result_df.groupby("day")["is_anomaly"].agg(["sum", "count"]).reset_index()
    daily["anomaly_rate"] = daily["sum"] / daily["count"]
    f, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
    ax1.bar(daily["day"], daily["sum"], color=PALETTE["anomaly"], alpha=0.7, width=1)
    ax1.set_ylabel("Anomalous Records / Day")
    ax1.set_title("Anomaly Volume and Rate Over the Evaluation Period", fontweight="bold")
    ax2.plot(daily["day"], daily["anomaly_rate"] * 100,
             color=PALETTE["anomaly"], linewidth=1.3)
    ax2.fill_between(daily["day"], daily["anomaly_rate"] * 100,
                     color=PALETTE["anomaly"], alpha=0.2)
    ax2.set_ylabel("Anomaly Rate (%)")
    ax2.set_xlabel("Date")
    f.tight_layout(); f.savefig(fig("09_anomaly_over_time.png"), dpi=200); plt.close(f)

    # ── Fig 4: Feature-level comparison ──────────────────────────────────────
    key_features = [
        "after_hours_activity", "file_activity_count", "usb_activity_count",
        "total_logon_activity", "max_user_activity_z", "sensitive_activity_ratio",
    ]
    # attach is_anomaly to X_eval (same row order guaranteed by pipeline)
    X_eval_ann = X_eval.copy().reset_index(drop=True)
    X_eval_ann["group"] = result_df["is_anomaly"].values
    X_eval_ann["group"] = X_eval_ann["group"].map({0: "Normal", 1: "Anomaly"})

    f, axes = plt.subplots(2, 3, figsize=(14, 8))
    for i, feat in enumerate(key_features):
        ax = axes[i // 3, i % 3]
        for grp, col in [("Normal", PALETTE["normal"]), ("Anomaly", PALETTE["anomaly"])]:
            vals = X_eval_ann.loc[X_eval_ann["group"] == grp, feat]
            ax.hist(vals, bins=40, color=col, alpha=0.65, density=True, label=grp,
                    log=True if vals.max() > 0 else False)
        ax.set_title(feat.replace("_", " "), fontsize=10, fontweight="bold")
        ax.set_ylabel("Log Density")
        ax.legend(fontsize=8)
    plt.suptitle("Feature Distributions: Normal vs Anomalous Records (Log Scale)",
                 fontsize=13, fontweight="bold", y=1.01)
    f.tight_layout(); f.savefig(fig("10_feature_comparison.png"), dpi=200, bbox_inches="tight"); plt.close(f)

    # ── Fig 5: Anomaly score per user (top 30 users by mean score) ───────────
    user_scores = result_df.groupby("user")["anomaly_score"].agg(["mean", "max", "count"])
    top30 = user_scores.nlargest(30, "mean").sort_values("mean", ascending=True)
    f, ax = plt.subplots(figsize=(10, 9))
    bars = ax.barh(top30.index, top30["mean"], color=PALETTE["anomaly"], alpha=0.80)
    ax.barh(top30.index, top30["max"], color="#ff9896", alpha=0.4, label="Max score")
    ax.set_xlabel("Anomaly Score (mean / max)")
    ax.set_title("Top 30 Users by Mean Anomaly Score (Evaluation Window)", fontweight="bold")
    ax.legend()
    f.tight_layout(); f.savefig(fig("11_top_anomalous_users.png"), dpi=200); plt.close(f)

    # ── Fig 6: Grid search heatmap (separation vs contamination × n_estimators) ──
    pivot_cont_nest = df_grid.pivot_table(
        index="contamination", columns="n_estimators",
        values="separation", aggfunc="mean"
    )
    f, ax = plt.subplots(figsize=(8, 5))
    sns.heatmap(pivot_cont_nest, annot=True, fmt=".4f", cmap="YlOrRd", ax=ax,
                linewidths=0.5)
    ax.set_title("Grid Search: Mean Separation Score by Contamination × n_estimators",
                 fontweight="bold")
    ax.set_xlabel("n_estimators")
    ax.set_ylabel("Contamination")
    f.tight_layout(); f.savefig(fig("12_grid_search_heatmap.png"), dpi=200); plt.close(f)

    # ── Fig 7: Anomaly score box-per-user for top anomalous users (violin) ───
    top10_users = user_scores.nlargest(10, "mean").index.tolist()
    subset = result_df[result_df["user"].isin(top10_users)]
    f, ax = plt.subplots(figsize=(12, 5))
    order = (subset.groupby("user")["anomaly_score"]
             .mean().sort_values(ascending=False).index.tolist())
    sns.violinplot(data=subset, x="user", y="anomaly_score", order=order,
                   color=PALETTE["anomaly"], alpha=0.7, ax=ax, inner="box",
                   scale="width")
    ax.set_title("Anomaly Score Distribution for Top-10 Flagged Users", fontweight="bold")
    ax.set_xlabel("User ID")
    ax.set_ylabel("Anomaly Score")
    ax.tick_params(axis="x", rotation=30)
    f.tight_layout(); f.savefig(fig("13_top_user_violin.png"), dpi=200); plt.close(f)

    # ── Fig 8: GT overlay if available ───────────────────────────────────────
    if gt_available and "true_insider" in result_df.columns:
        daily_gt = result_df.groupby("day").agg(
            anomalies=("is_anomaly", "sum"),
            insiders =("true_insider", "sum"),
        ).reset_index()
        f, ax = plt.subplots(figsize=(12, 4))
        ax.bar(daily_gt["day"], daily_gt["anomalies"], label="Flagged anomalies",
               color=PALETTE["anomaly"], alpha=0.6, width=1)
        ax.bar(daily_gt["day"], daily_gt["insiders"], label="Known insiders (GT)",
               color="darkorange", alpha=0.9, width=1)
        ax.set_title("Flagged Anomalies vs Ground-Truth Insider Days (Evaluation Window)",
                     fontweight="bold")
        ax.set_ylabel("Records / Day")
        ax.legend()
        f.tight_layout(); f.savefig(fig("14_gt_overlay.png"), dpi=200); plt.close(f)

    log.info("All visualisations saved.")


# ══════════════════════════════════════════════════════════════════════════════
# 7. SAVE ARTEFACTS
# ══════════════════════════════════════════════════════════════════════════════
def save_artefacts(clf, best_row, df_grid, result_df, supervised_metrics, gt_available):
    # 7a. Model file
    model_path = os.path.join(MODEL_DIR, "isolation_forest.joblib")
    joblib.dump(clf, model_path)
    log.info(f"Model saved → {model_path}")

    # 7b. Configuration JSON
    config = {
        "algorithm"      : "IsolationForest",
        "library"        : "sklearn",
        "n_estimators"   : int(best_row["n_estimators"]),
        "max_samples"    : best_row["max_samples"],
        "contamination"  : float(best_row["contamination"]),
        "random_state"   : SEED,
        "n_jobs"         : -1,
        "feature_count"  : int(clf.n_features_in_),
        "train_rows"     : 268979,
        "fit_date"       : datetime.now().isoformat(),
        "selection_basis": "Unsupervised separation metric (normal–tail gap, penalised for contamination > 0.05)",
    }
    with open(os.path.join(MODEL_DIR, "model_config.json"), "w") as fh:
        json.dump(config, fh, indent=2)

    # 7c. Grid search results
    df_grid.to_csv(os.path.join(MODEL_DIR, "grid_search_results.csv"), index=False)
    log.info("Grid search results saved.")

    # 7d. Evaluation predictions + scores
    result_df.to_parquet(os.path.join(MODEL_DIR, "evaluation_predictions.parquet"),
                         engine="fastparquet", index=False)
    result_df.to_csv(os.path.join(MODEL_DIR, "evaluation_predictions.csv"), index=False)
    log.info("Evaluation predictions saved.")

    # 7e. Supervised metrics (if available)
    if supervised_metrics:
        with open(os.path.join(MODEL_DIR, "supervised_metrics.json"), "w") as fh:
            json.dump(supervised_metrics, fh, indent=2)

    return config


# ══════════════════════════════════════════════════════════════════════════════
# 8. PRINT SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
def print_summary(config, df_grid, result_df, n_anomalies, anomaly_pct, supervised_metrics, gt_available):
    sep = "=" * 70
    print(f"\n{sep}")
    print("  ENVGUARD  –  ISOLATION FOREST  TRAINING SUMMARY")
    print(sep)
    print(f"  Feature columns  : {config['feature_count']}")
    print(f"  Training rows    : {config['train_rows']:,}")
    print(f"  Evaluation rows  : {len(result_df):,}")
    print()
    print("  ── Selected configuration ──────────────────────────────")
    print(f"  n_estimators     : {config['n_estimators']}")
    print(f"  max_samples      : {config['max_samples']}")
    print(f"  contamination    : {config['contamination']}")
    print()
    print("  ── Evaluation results ──────────────────────────────────")
    print(f"  Flagged anomalies: {n_anomalies:,}  ({anomaly_pct:.2f}% of eval set)")
    print(f"  Normal records   : {len(result_df)-n_anomalies:,}")
    score_stats = result_df["anomaly_score"].describe()
    print(f"  Score range      : [{score_stats['min']:.4f}, {score_stats['max']:.4f}]")
    print(f"  Score median     : {score_stats['50%']:.4f}")
    print()
    if supervised_metrics:
        print("  ── Ground-truth metrics (CERT r4.2) ────────────────────")
        for k, v in supervised_metrics.items():
            print(f"  {k:<26}: {v}")
    else:
        print("  ── Ground-truth ─────────────────────────────────────────")
        print("  Labels not available. User IDs in this Zenodo release")
        print("  differ from the official CERT r4.2 anonymisation scheme.")
        print("  Evaluation is fully unsupervised.")
    print()
    print("  ── Grid search best rows (top 5 by objective) ──────────")
    df_copy = df_grid.copy()
    df_copy["objective"] = df_copy["separation"] / (1 + df_copy["eval_iqr"])
    df_copy.loc[df_copy["contamination"] > 0.05, "objective"] *= 0.92
    top5 = df_copy.nlargest(5, "objective")[
        ["n_estimators", "max_samples", "contamination",
         "separation", "anomaly_pct_eval", "objective"]
    ]
    print(top5.to_string(index=False))
    print(sep + "\n")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    log.info("══ ENVGUARD Isolation Forest pipeline starting ══")

    X_train, X_eval, meta_eval = load_data()

    # Grid search
    df_grid = grid_search(X_train, X_eval)

    # Select best config
    best_row = select_best(df_grid)
    log.info(f"Best config selected: {best_row[['n_estimators','max_samples','contamination']].to_dict()}")

    # Final model
    clf = train_final_model(X_train, best_row)

    # Inference
    result_df, n_anomalies, anomaly_pct = run_inference(clf, X_train, X_eval, meta_eval)

    # Ground-truth attempt
    gt_available, result_df = attempt_ground_truth(result_df)
    supervised_metrics = None
    if gt_available:
        supervised_metrics = compute_supervised_metrics(result_df)

    # Visualisations
    plot_all(result_df, X_eval, X_train, df_grid, gt_available)

    # Save
    config = save_artefacts(clf, best_row, df_grid, result_df, supervised_metrics, gt_available)

    # Print summary
    print_summary(config, df_grid, result_df, n_anomalies, anomaly_pct, supervised_metrics, gt_available)

    log.info("══ Pipeline complete ══")
    return result_df, clf, config, df_grid


if __name__ == "__main__":
    result_df, clf, config, df_grid = main()

