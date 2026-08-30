import pandas as pd
import numpy as np
import uuid
import random
from datetime import datetime, timedelta
import os

def generate_synthetic_data(num_transactions=10000, fraud_ring_size=5):
    print("Generating synthetic MoMo transactions...")
    
    # Generate unique entities
    users = [f"USER_{uuid.uuid4().hex[:8]}" for _ in range(num_transactions // 10)]
    devices = [f"DEV_{uuid.uuid4().hex[:8]}" for _ in range(num_transactions // 5)]
    ips = [f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}" for _ in range(num_transactions // 4)]
    
    transactions = []
    
    start_time = datetime.now() - timedelta(days=30)
    
    for i in range(num_transactions):
        sender = random.choice(users)
        receiver = random.choice(users)
        while sender == receiver:
            receiver = random.choice(users)
            
        amount = round(random.uniform(10, 5000), 2)
        timestamp = start_time + timedelta(minutes=random.randint(1, 30*24*60))
        device = random.choice(devices)
        ip = random.choice(ips)
        
        transactions.append({
            "transaction_id": f"TXN_{uuid.uuid4().hex[:12]}",
            "sender_id": sender,
            "receiver_id": receiver,
            "amount": amount,
            "timestamp": timestamp.isoformat(),
            "device_id": device,
            "ip_address": ip,
            "status": "COMPLETED",
            "is_fraud_simulated": 0
        })

    df = pd.DataFrame(transactions)
    
    print("Injecting fraud rings...")
    # Inject Fraud Rings (e.g., circular transactions, rapid fan-out)
    num_rings = 20
    for _ in range(num_rings):
        ring_users = random.sample(users, fraud_ring_size)
        shared_device = random.choice(devices)
        shared_ip = random.choice(ips)
        ring_start_time = start_time + timedelta(minutes=random.randint(1, 25*24*60))
        
        for i in range(fraud_ring_size):
            sender = ring_users[i]
            receiver = ring_users[(i + 1) % fraud_ring_size] # Circular movement
            
            ring_txn = {
                "transaction_id": f"TXN_FRAUD_{uuid.uuid4().hex[:8]}",
                "sender_id": sender,
                "receiver_id": receiver,
                "amount": round(random.uniform(4000, 4999), 2), # Just below reporting threshold
                "timestamp": (ring_start_time + timedelta(minutes=i*2)).isoformat(),
                "device_id": shared_device,
                "ip_address": shared_ip,
                "status": "COMPLETED",
                "is_fraud_simulated": 1
            }
            df = pd.concat([df, pd.DataFrame([ring_txn])], ignore_index=True)

    df = df.sort_values(by="timestamp").reset_index(drop=True)
    
    print("Generating HITL (Human-in-the-Loop) feedback data...")
    # Simulate HITL feedback for some transactions
    fraud_txns = df[df["is_fraud_simulated"] == 1].sample(frac=0.8) # 80% of fraud caught
    normal_txns = df[df["is_fraud_simulated"] == 0].sample(frac=0.01) # 1% false positives reported
    
    hitl_feedback = []
    reviewers = [f"FIU_AGENT_{i}" for i in range(1, 10)]
    
    for _, row in fraud_txns.iterrows():
        hitl_feedback.append({
            "transaction_id": row["transaction_id"],
            "reviewer_id": random.choice(reviewers),
            "feedback_label": "TRUE_POSITIVE",
            "reviewed_at": (datetime.fromisoformat(row["timestamp"]) + timedelta(hours=random.randint(1, 48))).isoformat(),
            "notes": "Confirmed part of a circular fraud ring."
        })
        
    for _, row in normal_txns.iterrows():
        hitl_feedback.append({
            "transaction_id": row["transaction_id"],
            "reviewer_id": random.choice(reviewers),
            "feedback_label": "FALSE_POSITIVE",
            "reviewed_at": (datetime.fromisoformat(row["timestamp"]) + timedelta(hours=random.randint(1, 48))).isoformat(),
            "notes": "Customer confirmed legitimate transaction."
        })
        
    df_hitl = pd.DataFrame(hitl_feedback)
    
    # Save to CSV
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/transactions.csv", index=False)
    df_hitl.to_csv("data/hitl_feedback.csv", index=False)
    
    print(f"Generated {len(df)} transactions and {len(df_hitl)} HITL feedback records.")
    print("Data saved to data/transactions.csv and data/hitl_feedback.csv")

if __name__ == "__main__":
    generate_synthetic_data()
