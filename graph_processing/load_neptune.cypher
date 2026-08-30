// ---------------------------------------------------------
// OmniGuard MoMo AML
// openCypher Scripts for Amazon Neptune Graph Population
// ---------------------------------------------------------

// Note: In a production environment with millions of records, 
// the Neptune Bulk Loader API should be used. 
// These scripts illustrate the graph schema and logic for loading data 
// (e.g., via a Lambda processing streams from Entity Resolution).

// 1. Create Wallet Nodes
UNWIND $transactions AS txn
MERGE (sender:Wallet {id: txn.sender_id})
MERGE (receiver:Wallet {id: txn.receiver_id})
// Create Transferred_To Edge
MERGE (sender)-[t:TRANSFERRED_TO]->(receiver)
ON CREATE SET 
    t.transaction_id = txn.transaction_id,
    t.amount = txn.amount,
    t.timestamp = txn.timestamp,
    t.status = txn.status

// 2. Create Device Nodes and Link to Wallets
UNWIND $transactions AS txn
MERGE (wallet:Wallet {id: txn.sender_id})
MERGE (device:Device {id: txn.device_id})
// Create Logged_In_From Edge
MERGE (wallet)-[l:LOGGED_IN_FROM]->(device)
ON CREATE SET 
    l.timestamp = txn.timestamp

// 3. Create IP Nodes and Link to Devices/Wallets
UNWIND $transactions AS txn
MERGE (wallet:Wallet {id: txn.sender_id})
MERGE (ip:IP {address: txn.ip_address})
// Create Used_IP Edge
MERGE (wallet)-[u:USED_IP]->(ip)
ON CREATE SET 
    u.timestamp = txn.timestamp

// 4. Query Example: Find 3-hop circular transactions (Fraud Ring Indicator)
MATCH (w1:Wallet)-[t1:TRANSFERRED_TO]->(w2:Wallet)-[t2:TRANSFERRED_TO]->(w3:Wallet)-[t3:TRANSFERRED_TO]->(w1)
WHERE t1.timestamp < t2.timestamp AND t2.timestamp < t3.timestamp
RETURN w1.id, w2.id, w3.id, t1.amount, t2.amount, t3.amount
LIMIT 100

// 5. Query Example: Find multiple wallets sharing the same Device or IP (Sybil Attack Indicator)
MATCH (w1:Wallet)-[:LOGGED_IN_FROM]->(d:Device)<-[:LOGGED_IN_FROM]-(w2:Wallet)
WHERE w1 <> w2
RETURN d.id as SharedDevice, collect(w1.id) as Wallets
HAVING size(Wallets) > 2
