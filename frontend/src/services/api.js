const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://6er509nbdk.execute-api.us-east-1.amazonaws.com/prod';

export const submitHITLFeedback = async (transactionId, feedbackLabel, notes, amount = 0, reviewerId = 'FIU_AGENT_WEB') => {
  try {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
      console.log(`[MOCK API] Submitting feedback for ${transactionId}: ${feedbackLabel}`);
      return new Promise(resolve => setTimeout(() => resolve({ success: true, mock: true, feedback_id: 'FB_MOCK_' + Math.random().toString(36).substring(7) }), 500));
    }

    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        feedback_label: feedbackLabel,
        notes: notes,
        amount: amount,
        reviewer_id: reviewerId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
};

// Batch auto-triage API call
export const submitBatchAutoTriage = async (items) => {
  try {
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
      return new Promise(resolve => setTimeout(() => resolve({ success: true, processed: items.length }), 700));
    }

    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items })
    });

    return await response.json();
  } catch (error) {
    console.error("Batch auto-triage failed:", error);
    throw error;
  }
};

// Mock alerts representative of a 2,000 alert/day queue with AI Pattern Narratives
export const fetchMockAlerts = () => {
  return [
    {
      id: "TXN_CRIT_8921",
      sender: "USER_MULE_01",
      receiver: "USER_AGGREGATOR",
      amount: 4950.00,
      timestamp: new Date().toISOString(),
      score: 0.96,
      triage_tier: "AUTO_CONFIRMED_FRAUD",
      status: "AUTO_BLOCKED",
      recommendation: "Auto-Confirmed Fraud (True Positive • Instant Account Freeze)",
      narrative: "Auto-Confirmed Fraud (Risk: 0.96): Coordinated structuring (smurfing) pattern identified. 5 sub-threshold transfers totaling GH¢24,750 detected from burner device 'DEV_MULE_X9' targeting recipient 'USER_AGGREGATOR' within 11 minutes. Neptune sub-graph confirms 3-hop circular hops before immediate cash-out attempt.",
      device: "DEV_MULE_X9",
      ip: "197.251.142.12",
      account_type: "RETAIL",
      explainability: [
        { feature: "Structuring & Smurfing Evasion", weight: 55, type: "danger" },
        { feature: "Burner Device Multi-Wallet Link", weight: 30, type: "danger" },
        { feature: "Rapid Circular Hop Pattern", weight: 15, type: "danger" }
      ]
    },
    {
      id: "TXN_REV_4412",
      sender: "USER_RETAIL_881",
      receiver: "USER_MERCHANT_KWAME",
      amount: 3200.00,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      score: 0.68,
      triage_tier: "REQUIRES_HUMAN_REVIEW",
      status: "PENDING_REVIEW",
      recommendation: "Ambiguous Gray-Zone (Queued for FIU Analyst Investigation)",
      narrative: "Human Review Required (Risk: 0.68): Moderate anomaly score on transfer of GH¢3,200.00. First transaction from new device fingerprint 'DEV_NEW_48A' following a SIM password reset 2 hours ago. Amount is 3.5x higher than user's 30-day average. Human inspection needed to rule out account takeover.",
      device: "DEV_NEW_48A",
      ip: "102.176.65.20",
      account_type: "RETAIL",
      explainability: [
        { feature: "Deviation from Personal Baseline", weight: 42, type: "danger" },
        { feature: "Unrecognized Device Fingerprint", weight: 38, type: "warning" },
        { feature: "Velocity Baseline", weight: 20, type: "safe" }
      ]
    },
    {
      id: "TXN_SAFE_1092",
      sender: "USER_AGENT_KUMASI_04",
      receiver: "USER_RETAIL_291",
      amount: 7500.00,
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      score: 0.22,
      triage_tier: "AUTO_CLEARED_SAFE",
      status: "AUTO_CLEARED",
      recommendation: "Auto-Cleared Safe (False Positive • Approved for Settlement)",
      narrative: "Auto-Cleared Safe (Risk: 0.22): Routine cash-out of GH¢7,500.00 handled by licensed MoMo Agent 'USER_AGENT_KUMASI_04'. Transaction strictly complies with Agent tier velocity bounds. Both wallets have Level-3 Ghana Card biometric KYC. Zero mule network or structuring ties detected.",
      device: "DEV_AGENT_POS_04",
      ip: "197.251.18.99",
      account_type: "AGENT",
      explainability: [
        { feature: "Agent Tier Allowance", weight: 60, type: "safe" },
        { feature: "Biometric KYC Verification", weight: 25, type: "safe" },
        { feature: "Habitual Geolocation Profile", weight: 15, type: "safe" }
      ]
    },
    {
      id: "TXN_CRIT_7741",
      sender: "USER_SYBIL_03",
      receiver: "USER_CASHOUT_MULE",
      amount: 4900.00,
      timestamp: new Date(Date.now() - 2700000).toISOString(),
      score: 0.94,
      triage_tier: "AUTO_CONFIRMED_FRAUD",
      status: "AUTO_BLOCKED",
      recommendation: "Auto-Confirmed Fraud (True Positive • Instant Account Freeze)",
      narrative: "Auto-Confirmed Fraud (Risk: 0.94): Sybil wallet farm attack detected. Neptune graph reveals device 'DEV_SYBIL_FARM' is actively operating 14 distinct retail wallets simultaneously. Sequential transfers of GH¢4,900 dispersed within 6 minutes.",
      device: "DEV_SYBIL_FARM",
      ip: "197.251.200.4",
      account_type: "RETAIL",
      explainability: [
        { feature: "Device Graph Centrality (14 Wallets)", weight: 65, type: "danger" },
        { feature: "Automated Bot Velocity", weight: 25, type: "danger" },
        { feature: "Structuring Amount", weight: 10, type: "danger" }
      ]
    },
    {
      id: "TXN_REV_9981",
      sender: "USER_RETAIL_512",
      receiver: "USER_RETAIL_774",
      amount: 1800.00,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      score: 0.58,
      triage_tier: "REQUIRES_HUMAN_REVIEW",
      status: "PENDING_REVIEW",
      recommendation: "Ambiguous Gray-Zone (Queued for FIU Analyst Investigation)",
      narrative: "Human Review Required (Risk: 0.58): Borderline anomaly score. Transfer of GH¢1,800 sent to newly registered wallet (< 24 hours old). Velocity is within normal bounds, but recipient has high fan-out degree in Neptune. Verify peer-to-peer relationship.",
      device: "DEV_HONOR_9X",
      ip: "41.215.160.8",
      account_type: "RETAIL",
      explainability: [
        { feature: "Recipient Account Age (< 24h)", weight: 45, type: "warning" },
        { feature: "Recipient Graph Degree", weight: 35, type: "warning" },
        { feature: "Sender Spending History", weight: 20, type: "safe" }
      ]
    },
    {
      id: "TXN_SAFE_3301",
      sender: "USER_RETAIL_301",
      receiver: "USER_UTILITY_ECG",
      amount: 450.00,
      timestamp: new Date(Date.now() - 4500000).toISOString(),
      score: 0.08,
      triage_tier: "AUTO_CLEARED_SAFE",
      status: "AUTO_CLEARED",
      recommendation: "Auto-Cleared Safe (False Positive • Approved for Settlement)",
      narrative: "Auto-Cleared Safe (Risk: 0.08): Verified utility bill payment of GH¢450.00 to Electricity Company of Ghana (ECG). Supernode whitelist recognized. Zero risk of mule flow or capital flight.",
      device: "DEV_SAMSUNG_A12",
      ip: "197.251.44.18",
      account_type: "RETAIL",
      explainability: [
        { feature: "Verified Utility Merchant Node", weight: 75, type: "safe" },
        { feature: "Habitual Monthly Bill Pattern", weight: 25, type: "safe" }
      ]
    }
  ];
};

export const fetchRegionalTrends = () => {
  return [
    { name: 'Greater Accra', total: 4500, flagged: 320, safe: 4180 },
    { name: 'Ashanti', total: 3200, flagged: 190, safe: 3010 },
    { name: 'Western', total: 2100, flagged: 85, safe: 2015 },
    { name: 'Northern', total: 1800, flagged: 140, safe: 1660 },
    { name: 'Central', total: 1500, flagged: 60, safe: 1440 },
    { name: 'Volta', total: 900, flagged: 30, safe: 870 },
  ];
};
