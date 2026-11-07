"""
EnvGuard AI: Synthetic Activity Dataset Generator
=================================================
Generates realistic, metadata-only activity event logs representing
secrets-manager operational telemetry for training and evaluating
the EnvGuard Isolation Forest anomaly detection system.

Zero-Knowledge Compliance:
- Generates only permissible audit metadata: user_id, timestamp, event_type,
  environment, ip_address, status.
- NEVER contains or references secret keys, plaintext payloads, or variable names.

Author: Antigravity AI Engineering
Date: November 2026
"""

import os
import random
import datetime
import numpy as np
import pandas as pd

# Set fixed random seed for complete reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

def generate_synthetic_envguard_data(
    n_users: int = 50,
    n_days: int = 90,
    start_date: str = "2026-08-01",
    output_path: str = "envguard_ai/data/raw/envguard_activity_dataset.csv"
) -> pd.DataFrame:
    """
    Simulates operational audit log records across multiple realistic developer personas.
    Injects documented insider threat and anomalous access scenarios.
    """
    print(f"[*] Starting synthetic data generation: {n_users} users over {n_days} days...")
    
    start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    
    # Define user personas with distinct behavioral distributions
    personas = {
        "frontend_dev": {
            "weight": 0.40,
            "mean_events_weekday": 8,
            "mean_events_weekend": 1,
            "env_dist": {"development": 0.94, "staging": 0.05, "production": 0.01},
            "hours": (9, 18),
            "event_dist": {
                "secret_read": 0.75, "secret_update": 0.15, "secret_create": 0.05,
                "user_login": 0.04, "secret_rotate": 0.005, "secret_share_onetime": 0.005
            }
        },
        "backend_dev": {
            "weight": 0.30,
            "mean_events_weekday": 14,
            "mean_events_weekend": 2,
            "env_dist": {"development": 0.65, "staging": 0.30, "production": 0.05},
            "hours": (9, 19),
            "event_dist": {
                "secret_read": 0.70, "secret_update": 0.18, "secret_create": 0.06,
                "user_login": 0.03, "secret_rotate": 0.02, "secret_share_onetime": 0.01
            }
        },
        "devops_sre": {
            "weight": 0.15,
            "mean_events_weekday": 20,
            "mean_events_weekend": 4,
            "env_dist": {"development": 0.20, "staging": 0.40, "production": 0.40},
            "hours": (8, 20),
            "event_dist": {
                "secret_read": 0.55, "secret_update": 0.15, "secret_create": 0.10,
                "user_login": 0.03, "secret_rotate": 0.12, "secret_delete": 0.03, "secret_share_onetime": 0.02
            }
        },
        "qa_engineer": {
            "weight": 0.10,
            "mean_events_weekday": 10,
            "mean_events_weekend": 0.5,
            "env_dist": {"development": 0.40, "staging": 0.60, "production": 0.00},
            "hours": (9, 17),
            "event_dist": {
                "secret_read": 0.85, "secret_update": 0.08, "secret_create": 0.02,
                "user_login": 0.04, "secret_share_onetime": 0.01
            }
        },
        "lead_manager": {
            "weight": 0.05,
            "mean_events_weekday": 4,
            "mean_events_weekend": 0.2,
            "env_dist": {"development": 0.50, "staging": 0.30, "production": 0.20},
            "hours": (10, 18),
            "event_dist": {
                "secret_read": 0.80, "secret_share_onetime": 0.10, "user_login": 0.08, "secret_update": 0.02
            }
        }
    }
    
    # Generate users and assign personas and primary IPs
    users = []
    user_personas = {}
    user_ips = {}
    
    persona_names = list(personas.keys())
    persona_weights = [personas[p]["weight"] for p in persona_names]
    
    for i in range(n_users):
        u_id = f"user_{i+1:03d}"
        p_name = np.random.choice(persona_names, p=persona_weights)
        users.append(u_id)
        user_personas[u_id] = p_name
        # Assign 1 primary IP and 1 secondary IP (home/office)
        user_ips[u_id] = [
            f"192.168.{10 + (i // 10)}.{10 + (i % 20)}",
            f"10.0.{5 + (i // 10)}.{20 + (i % 20)}"
        ]
        
    records = []
    event_counter = 1
    
    # Generate day-by-day activity
    for day in range(n_days):
        current_date = start_dt + datetime.timedelta(days=day)
        is_weekend = current_date.weekday() >= 5
        
        for u_id in users:
            persona = personas[user_personas[u_id]]
            
            # Expected events for this user today
            mean_events = persona["mean_events_weekend"] if is_weekend else persona["mean_events_weekday"]
            n_events = np.random.poisson(mean_events)
            
            if n_events == 0:
                continue
                
            env_keys = list(persona["env_dist"].keys())
            env_probs = list(persona["env_dist"].values())
            
            evt_keys = list(persona["event_dist"].keys())
            evt_probs = list(persona["event_dist"].values())
            
            # Generate timestamps within persona's typical working hours (with occasional slight noise)
            h_start, h_end = persona["hours"]
            
            for _ in range(n_events):
                # Normal hour selection (Gaussian centered in work day)
                if np.random.rand() < 0.94:
                    hour = int(np.clip(np.random.normal((h_start + h_end) / 2, 2.0), 7, 21))
                else:
                    # Rare normal after-hours (late evening work)
                    hour = np.random.choice([6, 7, 22, 23])
                    
                minute = np.random.randint(0, 60)
                second = np.random.randint(0, 60)
                evt_dt = current_date.replace(hour=hour, minute=minute, second=second)
                
                env = np.random.choice(env_keys, p=env_probs)
                evt_type = np.random.choice(evt_keys, p=evt_probs)
                
                # IP selection: 90% primary IP, 10% secondary IP
                ip = user_ips[u_id][0] if np.random.rand() < 0.90 else user_ips[u_id][1]
                
                # Status: 99% SUCCESS, 1% STEP_UP_REQUIRED or rare failure
                status = "SUCCESS"
                if np.random.rand() < 0.01:
                    status = "STEP_UP_FAILED" if np.random.rand() < 0.3 else "DENIED"
                    
                records.append({
                    "event_id": f"evt_{event_counter:07d}",
                    "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "user_id": u_id,
                    "event_type": evt_type,
                    "environment": env,
                    "ip_address": ip,
                    "status": status,
                    "is_anomaly": 0,
                    "scenario_type": "normal"
                })
                event_counter += 1

    # Injected Suspicious Scenarios (Days 45 to 89, ensuring historical baselines are established)
    print("[*] Injecting realistic attack scenarios into the activity stream...")
    
    # Scenario 1: Mass Secret Scraping (Scripted exfiltration)
    # Target: 5 users (frontend/backend) suddenly executing 35 secret reads in 2 minutes
    scrape_targets = [users[3], users[8], users[15], users[24], users[38]]
    for idx, u_id in enumerate(scrape_targets):
        attack_day = 50 + idx * 7
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=14, minutes=10)
        for burst_i in range(35):
            evt_dt = attack_dt + datetime.timedelta(seconds=burst_i * 3)
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": "secret_read",
                "environment": "development" if idx % 2 == 0 else "production",
                "ip_address": user_ips[u_id][0],
                "status": "SUCCESS",
                "is_anomaly": 1,
                "scenario_type": "mass_secret_scraping"
            })
            event_counter += 1

    # Scenario 2: Dev-to-Prod Privilege Escalation
    # Frontend developers with 0% historical prod access suddenly accessing production secrets
    esc_targets = [users[2], users[7], users[12], users[21], users[33], users[45]]
    for idx, u_id in enumerate(esc_targets):
        attack_day = 52 + idx * 6
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=15, minutes=30)
        for read_i in range(8):
            evt_dt = attack_dt + datetime.timedelta(minutes=read_i * 4)
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": "secret_read",
                "environment": "production",
                "ip_address": user_ips[u_id][0],
                "status": "SUCCESS",
                "is_anomaly": 1,
                "scenario_type": "dev_to_prod_escalation"
            })
            event_counter += 1

    # Scenario 3: Midnight / After-Hours Exfiltration Burst
    # Access at 02:30 AM on Sunday, accessing production secrets
    night_targets = [users[5], users[14], users[19], users[27], users[40]]
    for idx, u_id in enumerate(night_targets):
        attack_day = 55 + idx * 7  # ensure weekend or odd night
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=2, minutes=30)
        for n_i in range(12):
            evt_dt = attack_dt + datetime.timedelta(seconds=n_i * 20)
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": "secret_read",
                "environment": "production",
                "ip_address": user_ips[u_id][0],
                "status": "SUCCESS",
                "is_anomaly": 1,
                "scenario_type": "after_hours_burst"
            })
            event_counter += 1

    # Scenario 4: Sensitive Operation Abuse / Unauthorized Rotation Storm
    # Non-DevOps users suddenly performing multiple secret_rotate and secret_delete operations
    rot_targets = [users[4], users[11], users[22], users[35]]
    for idx, u_id in enumerate(rot_targets):
        attack_day = 60 + idx * 6
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=21, minutes=45)
        for rot_i in range(6):
            evt_dt = attack_dt + datetime.timedelta(minutes=rot_i * 2)
            op = "secret_delete" if rot_i % 2 == 0 else "secret_rotate"
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": op,
                "environment": "production",
                "ip_address": user_ips[u_id][0],
                "status": "SUCCESS",
                "is_anomaly": 1,
                "scenario_type": "sensitive_rotation_abuse"
            })
            event_counter += 1

    # Scenario 5: Step-Up Stuffing / Credential Bypass
    # Multiple failed step-up challenges followed by sensitive access
    stepup_targets = [users[6], users[17], users[29], users[42]]
    for idx, u_id in enumerate(stepup_targets):
        attack_day = 63 + idx * 5
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=16, minutes=15)
        # 4 consecutive step-up failures
        for fail_i in range(4):
            evt_dt = attack_dt + datetime.timedelta(seconds=fail_i * 15)
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": "step_up_challenge",
                "environment": "production",
                "ip_address": f"198.51.100.{50 + idx}",
                "status": "STEP_UP_FAILED",
                "is_anomaly": 1,
                "scenario_type": "step_up_stuffing"
            })
            event_counter += 1
        # Followed by unauthorized read
        records.append({
            "event_id": f"evt_{event_counter:07d}",
            "timestamp": (attack_dt + datetime.timedelta(seconds=90)).strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": u_id,
            "event_type": "secret_read",
            "environment": "production",
            "ip_address": f"198.51.100.{50 + idx}",
            "status": "SUCCESS",
            "is_anomaly": 1,
            "scenario_type": "step_up_stuffing"
        })
        event_counter += 1

    # Scenario 6: Distributed Session Hijacking (Multi-IP access)
    # Rapid access across 4 completely distinct external IPs within 30 minutes
    dist_targets = [users[1], users[16], users[30], users[47]]
    for idx, u_id in enumerate(dist_targets):
        attack_day = 68 + idx * 5
        attack_dt = start_dt + datetime.timedelta(days=attack_day, hours=11, minutes=0)
        ips = [f"203.0.113.{10*i + idx}" for i in range(1, 5)]
        for ip_i, remote_ip in enumerate(ips):
            evt_dt = attack_dt + datetime.timedelta(minutes=ip_i * 6)
            records.append({
                "event_id": f"evt_{event_counter:07d}",
                "timestamp": evt_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "user_id": u_id,
                "event_type": "secret_read",
                "environment": "production" if ip_i > 1 else "staging",
                "ip_address": remote_ip,
                "status": "SUCCESS",
                "is_anomaly": 1,
                "scenario_type": "distributed_ips"
            })
            event_counter += 1

    df = pd.DataFrame(records)
    
    # Sort chronologically by timestamp
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
    
    # Save to disk
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    total_records = len(df)
    n_anomalies = df["is_anomaly"].sum()
    anomaly_rate = (n_anomalies / total_records) * 100
    
    print(f"[+] Dataset successfully generated and saved to: {output_path}")
    print(f"    - Total Events: {total_records:,}")
    print(f"    - Normal Events: {total_records - n_anomalies:,} ({100 - anomaly_rate:.2f}%)")
    print(f"    - Anomalous Events: {n_anomalies:,} ({anomaly_rate:.2f}%)")
    print("    - Anomalous Scenarios Breakdown:")
    for scen, count in df[df["is_anomaly"] == 1]["scenario_type"].value_counts().items():
        print(f"      * {scen}: {count} records")
        
    return df

if __name__ == "__main__":
    generate_synthetic_envguard_data()

