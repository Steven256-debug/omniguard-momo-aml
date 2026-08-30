import React, { useState } from 'react';
import { submitHITLFeedback } from '../services/api';

const InvestigationView = ({ alert, onActionComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!alert) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h2>No Alert Selected</h2>
          <p>Select a transaction from the inbox to begin investigation.</p>
        </div>
      </div>
    );
  }

  const handleAction = async (feedbackLabel) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const notes = feedbackLabel === 'TRUE_POSITIVE' 
        ? "Analyst confirmed fraudulent activity." 
        : "Analyst verified transaction as legitimate.";
        
      await submitHITLFeedback(alert.id, feedbackLabel, notes);
      onActionComplete(alert.id);
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <div className="investigation-view">
        <div className="inv-header">
          <h2>Transaction Investigation</h2>
          <div className="inv-subtitle">ID: {alert.id}</div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '20px', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <div className="anomaly-section">
          <div className="anomaly-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Automated Flag Reason (Score: {alert.score.toFixed(2)})
          </div>
          <div>{alert.reason}</div>
        </div>

        <div className="details-grid">
          <div className="detail-group">
            <div className="detail-label">Amount</div>
            <div className="detail-value">GH¢ {alert.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Timestamp</div>
            <div className="detail-value">{new Date(alert.timestamp).toLocaleString()}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Sender ID</div>
            <div className="detail-value">{alert.sender}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Receiver ID</div>
            <div className="detail-value">{alert.receiver}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">Device ID</div>
            <div className="detail-value">{alert.device}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">IP Address</div>
            <div className="detail-value">{alert.ip}</div>
          </div>
        </div>

        <div className="actions">
          <button 
            className={`btn-danger ${isSubmitting ? 'btn-disabled' : ''}`}
            onClick={() => handleAction('TRUE_POSITIVE')}
            disabled={isSubmitting}
          >
            Confirm Fraud (True Positive)
          </button>
          <button 
            className={`btn-success ${isSubmitting ? 'btn-disabled' : ''}`}
            onClick={() => handleAction('FALSE_POSITIVE')}
            disabled={isSubmitting}
          >
            Mark Safe (False Positive)
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestigationView;
