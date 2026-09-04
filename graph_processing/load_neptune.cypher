// ---------------------------------------------------------
// OmniGuard MoMo AML
// openCypher Scripts for Amazon Neptune Graph Engine
// ---------------------------------------------------------

// =========================================================
// 0. Constraints and Indexes (Performance Optimization)
// =========================================================
CREATE CONSTRAINT ON (w:Wallet) ASSERT w.id IS UNIQUE;
CREATE CONSTRAINT ON (d:Device) ASSERT d.id IS UNIQUE;
CREATE INDEX ON :TRANSFERRED_TO(timestamp);
CREATE INDEX ON :TRANSFERRED_TO(amount);

// =========================================================
// 1. Ingest Wallet Nodes & Transactions
// =========================================================
UNWIND $transactions AS txn
MERGE (sender:Wallet {id: txn.sender_id})
ON CREATE SET 
    sender.account_type = coalesce(txn.account_type, 'RETAIL'),
    sender.is_supernode = CASE WHEN coalesce(txn.account_type, '') IN ['UTILITY', 'AGGREGATOR'] THEN true ELSE false END
MERGE (receiver:Wallet {id: txn.receiver_id})
ON CREATE SET 
    receiver.account_type = coalesce(txn.receiver_account_type, 'RETAIL'),
    receiver.is_supernode = CASE WHEN coalesce(txn.receiver_account_type, '') IN ['UTILITY', 'AGGREGATOR'] THEN true ELSE false END

// Create Directed Transaction Edge
MERGE (sender)-[t:TRANSFERRED_TO {transaction_id: txn.transaction_id}]->(receiver)
ON CREATE SET 
    t.amount = txn.amount,
    t.timestamp = txn.timestamp,
    t.status = txn.status;

// =========================================================
// 2. Link Devices & Network Fingerprints
// =========================================================
UNWIND $transactions AS txn
MERGE (wallet:Wallet {id: txn.sender_id})
MERGE (device:Device {id: txn.device_id})
MERGE (wallet)-[l:LOGGED_IN_FROM]->(device)
ON CREATE SET 
    l.timestamp = txn.timestamp,
    l.ip_address = txn.ip_address;

// =========================================================
// 3. Query: Circular Fraud Ring (With Supernode Protection)
// =========================================================
// Edge Case Tackled: Supernodes (e.g. ECG, MTN Airtime, Betway) receive
// millions of transactions and cause openCypher 3-hop queries to time out.
// We explicitly filter out supernodes from cyclic path expansions.
MATCH (w1:Wallet)-[t1:TRANSFERRED_TO]->(w2:Wallet)-[t2:TRANSFERRED_TO]->(w3:Wallet)-[t3:TRANSFERRED_TO]->(w1)
WHERE NOT coalesce(w1.is_supernode, false)
  AND NOT coalesce(w2.is_supernode, false)
  AND NOT coalesce(w3.is_supernode, false)
  AND w1 <> w2 AND w2 <> w3 AND w1 <> w3
  AND t1.timestamp < t2.timestamp 
  AND t2.timestamp < t3.timestamp
RETURN w1.id AS MuleRoot, w2.id AS Hop1, w3.id AS Hop2, 
       t1.amount AS Amount1, t2.amount AS Amount2, t3.amount AS Amount3,
       t1.timestamp AS StartTime, t3.timestamp AS CycleCompletedTime
LIMIT 50;

// =========================================================
// 4. Query: Rapid Fan-Out Anomaly (Lump-Sum Dispersion)
// =========================================================
// Fraud typology: A compromised account or stolen fund is quickly
// distributed to 5+ mule wallets in a short window.
MATCH (dispenser:Wallet)-[t:TRANSFERRED_TO]->(mule:Wallet)
WHERE NOT coalesce(dispenser.is_supernode, false)
  AND dispenser.account_type = 'RETAIL'
WITH dispenser, count(DISTINCT mule) AS MuleCount, sum(t.amount) AS TotalDispersed, min(t.timestamp) AS EarliestTxn, max(t.timestamp) AS LatestTxn
WHERE MuleCount >= 5
RETURN dispenser.id AS SuspectDispenser, MuleCount, TotalDispersed, EarliestTxn, LatestTxn
ORDER BY TotalDispersed DESC
LIMIT 50;

// =========================================================
// 5. Query: Device Collusion / Sybil Wallets (Excluding Registered Agents)
// =========================================================
// Edge Case Tackled: A single smartphone operating multiple retail wallets
// indicates synthetic identities or mule farm, but should not flag authorized agent kiosks.
MATCH (w:Wallet)-[:LOGGED_IN_FROM]->(d:Device)
WHERE w.account_type = 'RETAIL'
WITH d, collect(DISTINCT w.id) AS RetailWallets
WHERE size(RetailWallets) >= 3
RETURN d.id AS SharedDevice, size(RetailWallets) AS WalletCount, RetailWallets
ORDER BY WalletCount DESC
LIMIT 50;
