import pandas as pd
import numpy as np
import uuid
import random
from datetime import datetime, timedelta, timezone
import os

def generate_synthetic_data(num_transactions=10000, fraud_ring_size=5):
    """
    Generates synthetic Mobile Money transactions including realistic edge cases:
    - Account types: RETAIL, AGENT, MERCHANT, UTILITY
    - Structuring / Smurfing attack rings (sub-threshold rapid transfers)
    - Circular mule fraud rings
    - Legitimate high-velocity Agent kiosk cash-ins/cash-outs
    - Standardized ISO-8601 UTC timestamps
    """
    print("Generating synthetic MoMo transactions with multi-tier account typologies...")
    
    # Generate unique entities by account type
    total_users = num_transactions // 10
    num_agents = max(5, int(total_users * 0.05))
    num_merchants = max(5, int(total_users * 0.03))
    num_utilities = 2 # Supernodes: e.g. Electricity Company of Ghana (ECG), Ghana Water
    num_retail = total_users - num_agents - num_merchants - num_utilities

    retail_users = [f"USER_RETAIL_{uuid.uuid4().hex[:8]}" for _ in range(num_retail)]
    agent_users = [f"USER_AGENT_{uuid.uuid4().hex[:8]}" for _ in range(num_agents)]
    merchant_users = [f"USER_MERCHANT_{uuid.uuid4().hex[:8]}" for _ in range(num_merchants)]
    utility_users = ["USER_UTILITY_ECG", "USER_UTILITY_GWCL"]

    all_users = retail_users + agent_users + merchant_users + utility_users
    user_type_map = {}
    for u in retail_users: user_type_map[u] = "RETAIL"
    for u in agent_users: user_type_map[u] = "AGENT"
    for u in merchant_users: user_type_map[u] = "MERCHANT"
    for u in utility_users: user_type_map[u] = "UTILITY"

    devices = [f"DEV_{uuid.uuid4().hex[:8]}" for _ in range(num_transactions // 5)]
    ips = [f"197.251.{random.randint(1, 255)}.{random.randint(1, 255)}" for _ in range(num_transactions // 4)]
    
    transactions = []
    start_time = datetime.now(timezone.utc) - timedelta(days=30)
    
    # 1. Generate Baseline Normal Transactions
    for i in range(num_transactions):
        sender = random.choice(retail_users)
        # Random receiver: could be peer, agent, merchant, or utility
        receiver = random.choice(all_users)
        while sender == receiver:
            receiver = random.choice(all_users)
            
        amount = round(random.uniform(5, 3500), 2)
        timestamp = start_time + timedelta(minutes=random.randint(1, 30*24*60))
        device = random.choice(devices)
        ip = random.choice(ips)
        
        transactions.append({
            "transaction_id": f"TXN_{uuid.uuid4().hex[:12]}",
            "sender_id": sender,
            "receiver_id": receiver,
            "amount": amount,
            "timestamp": timestamp.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            "account_type": user_type_map[sender],
            "device_id": device,
            "ip_address": ip,
            "status": "COMPLETED",
            "is_fraud_simulated": 0
        })

    # 2. Inject Legitimate High-Velocity Agent Transactions (Tests against False Positives)
    print("Generating legitimate high-velocity Agent kiosk transactions...")
    for agent in agent_users:
        agent_device = f"DEV_AGENT_{agent[-6:]}"
        for day in range(5):
            day_start = start_time + timedelta(days=day, hours=8)
            # Agents do 10-15 cash-ins/outs per day
            for k in range(12):
                customer = random.choice(retail_users)
                is_cash_in = random.choice([True, False])
                sender = agent if is_cash_in else customer
                receiver = customer if is_cash_in else agent
                txn_time = day_start + timedelta(minutes=k*20 + random.randint(1, 10))
                
                transactions.append({
                    "transaction_id": f"TXN_AGENT_{uuid.uuid4().hex[:10]}",
                    "sender_id": sender,
                    "receiver_id": receiver,
                    "amount": round(random.uniform(500, 8000), 2),
                    "timestamp": txn_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    "account_type": user_type_map[sender],
                    "device_id": agent_device,
                    "ip_address": random.choice(ips),
                    "status": "COMPLETED",
                    "is_fraud_simulated": 0
                })

    # 3. Inject Circular Mule Fraud Rings
    print("Injecting circular mule fraud rings...")
    num_rings = 15
    for _ in range(num_rings):
        ring_users = random.sample(retail_users, fraud_ring_size)
        shared_device = random.choice(devices)
        shared_ip = random.choice(ips)
        ring_start_time = start_time + timedelta(minutes=random.randint(1, 25*24*60))
        
        for i in range(fraud_ring_size):
            sender = ring_users[i]
            receiver = ring_users[(i + 1) % fraud_ring_size] # Circular hop
            
            transactions.append({
                "transaction_id": f"TXN_FRAUD_RING_{uuid.uuid4().hex[:8]}",
                "sender_id": sender,
                "receiver_id": receiver,
                "amount": round(random.uniform(4000, 4999), 2),
                "timestamp": (ring_start_time + timedelta(minutes=i*2)).strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                "account_type": "RETAIL",
                "device_id": shared_device,
                "ip_address": shared_ip,
                "status": "COMPLETED",
                "is_fraud_simulated": 1
            })

    # 4. Inject Structuring / Smurfing Attacks (Rapid sub-threshold dispersion)
    print("Injecting structuring/smurfing attacks...")
    num_smurfs = 15
    for _ in range(num_smurfs):
        smurfer = random.choice(retail_users)
        receiver = random.choice(retail_users)
        smurf_time = start_time + timedelta(minutes=random.randint(1, 28*24*60))
        smurf_device = random.choice(devices)
        
        # 4-6 transactions of GH¢4,800–4,950 within 12 minutes (Cumulative > GH¢20,000)
        for step in range(5):
            transactions.append({
                "transaction_id": f"TXN_SMURF_{uuid.uuid4().hex[:8]}",
                "sender_id": smurfer,
                "receiver_id": receiver,
                "amount": round(random.uniform(4800, 4950), 2),
                "timestamp": (smurf_time + timedelta(minutes=step * 2)).strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                "account_type": "RETAIL",
                "device_id": smurf_device,
                "ip_address": random.choice(ips),
                "status": "COMPLETED",
                "is_fraud_simulated": 1
            })

    df = pd.DataFrame(transactions)
    df = df.sort_values(by="timestamp").reset_index(drop=True)
    
    # 5. Generate HITL Feedback records
    print("Generating audited HITL feedback data...")
    fraud_txns = df[df["is_fraud_simulated"] == 1].sample(frac=0.85)
    normal_txns = df[df["is_fraud_simulated"] == 0].sample(frac=0.008)
    
    hitl_feedback = []
    reviewers = [f"FIU_AGENT_{i}" for i in range(1, 10)]
    
    for _, row in fraud_txns.iterrows():
        hitl_feedback.append({
            "transaction_id": row["transaction_id"],
            "reviewer_id": random.choice(reviewers),
            "feedback_label": "TRUE_POSITIVE",
            "amount": row["amount"],
            "requires_supervisor_audit": False,
            "reviewed_at": (datetime.fromisoformat(row["timestamp"].replace('Z', '+00:00')) + timedelta(hours=random.randint(1, 24))).strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            "notes": "Confirmed syndicate pattern / structuring anomaly."
        })
        
    for _, row in normal_txns.iterrows():
        is_high = row["amount"] >= 10000.0
        hitl_feedback.append({
            "transaction_id": row["transaction_id"],
            "reviewer_id": random.choice(reviewers),
            "feedback_label": "FALSE_POSITIVE",
            "amount": row["amount"],
            "requires_supervisor_audit": is_high,
            "reviewed_at": (datetime.fromisoformat(row["timestamp"].replace('Z', '+00:00')) + timedelta(hours=random.randint(1, 24))).strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            "notes": "Legitimate customer verified via OTP/KYC check."
        })
        
    df_hitl = pd.DataFrame(hitl_feedback)
    
    # Save to CSV in data directory
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
    os.makedirs(output_dir, exist_ok=True)
    df.to_csv(os.path.join(output_dir, "transactions.csv"), index=False)
    df_hitl.to_csv(os.path.join(output_dir, "hitl_feedback.csv"), index=False)
    
    print(f"Generated {len(df)} transactions and {len(df_hitl)} HITL feedback records.")
    print(f"Data saved to {output_dir}")

if __name__ == "__main__":
    generate_synthetic_data()
