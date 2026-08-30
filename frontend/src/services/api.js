// In a real application, this would point to the deployed CloudFront or API Gateway domain.
// Example: const API_BASE_URL = 'https://api.yourdomain.com/prod';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mock-api-gateway.execute-api.us-east-1.amazonaws.com/prod';

export const submitHITLFeedback = async (transactionId, feedbackLabel, notes, reviewerId = 'FIU_AGENT_WEB') => {
  try {
    // For local development, we simulate the network request delay
    if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
      console.log(`[MOCK API] Submitting feedback for ${transactionId}: ${feedbackLabel}`);
      return new Promise(resolve => setTimeout(() => resolve({ success: true, mock: true }), 800));
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

// Mock data generator for the Alerts Inbox
export const fetchMockAlerts = () => {
  return [
    {
      id: "TXN_8F92A1B4",
      sender: "USER_4829",
      receiver: "USER_9102",
      amount: 4500.00,
      timestamp: new Date().toISOString(),
      score: 0.89,
      reason: "High velocity circular transfer detected.",
      device: "DEV_X9Y8Z7",
      ip: "192.168.1.45"
    },
    {
      id: "TXN_C3D4E5F6",
      sender: "USER_1122",
      receiver: "USER_3344",
      amount: 12050.00,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      score: 0.95,
      reason: "Fallback Rule: High Value (> 5000) AND High Velocity (> 3 in 10m)",
      device: "DEV_A1B2C3",
      ip: "10.0.0.5"
    },
    {
      id: "TXN_77889900",
      sender: "USER_5566",
      receiver: "USER_7788",
      amount: 800.00,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      score: 0.82,
      reason: "Multiple wallets sharing same device.",
      device: "DEV_Z9Y8X7",
      ip: "172.16.0.1"
    }
  ];
};
