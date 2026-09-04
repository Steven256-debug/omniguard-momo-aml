import React, { useState } from 'react';
import { submitHITLFeedback } from '../services/api';
import { ShieldCheck, AlertOctagon, HelpCircle, Check, X, Info } from 'lucide-react';

const InvestigationView = ({ alert, onActionComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!alert) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h2>No Alert Selected</h2>
          <p>Select a transaction from the triage inbox to inspect AI pattern explanations.</p>
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
        
      await submitHITLFeedback(alert.id, feedbackLabel, notes, alert.amount);
      onActionComplete(alert.id, feedbackLabel);
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAutoFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
  const isAutoSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';
  const isReviewRequired = alert.triage_tier === 'REQUIRES_HUMAN_REVIEW';

  return (
    <div className="main-content">
      <div className="investigation-view">
        <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Transaction Investigation &amp; Pattern Analysis</h2>
            <div className="inv-subtitle">ID: {alert.id} • Account Type: {alert.account_type || 'RETAIL'}</div>
          </div>
          
          {/* Triage Tier Badge */}
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isAutoFraud ? 'rgba(239, 68, 68, 0.2)' : isAutoSafe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: isAutoFraud ? '#ef4444' : isAutoSafe ? '#10b981' : '#f59e0b',
            border: `1px solid ${isAutoFraud ? '#ef4444' : isAutoSafe ? '#10b981' : '#f59e0b'}`
          }}>
            {isAutoFraud && <AlertOctagon size={16} />}
            {isAutoSafe && <ShieldCheck size={16} />}
            {isReviewRequired && <HelpCircle size={16} />}
            {isAutoFraud ? 'AUTO-CONFIRMED FRAUD' : isAutoSafe ? 'AUTO-CLEARED SAFE' : 'REQUIRES HUMAN REVIEW'}
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '20px', fontWeight: '500' }}>
            {error}
          </div>
        )}

        {/* AI Pattern Narrative Box */}
        <div style={{
          background: isAutoFraud ? 'rgba(239, 68, 68, 0.08)' : isAutoSafe ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
          border: `1px solid ${isAutoFraud ? 'rgba(239, 68, 68, 0.3)' : isAutoSafe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Info size={18} color={isAutoFraud ? '#ef4444' : isAutoSafe ? '#10b981' : '#38bdf8'} />
            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Automated AI Pattern Explanation &amp; Triaging Rationale
            </span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
            {alert.narrative || alert.reason}
          </p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            System Recommendation: <strong style={{ color: isAutoFraud ? '#ef4444' : isAutoSafe ? '#10b981' : '#f59e0b' }}>{alert.recommendation}</strong>
          </div>
        </div>

        {/* Explainability Feature Weights */}
        {alert.explainability && alert.explainability.length > 0 && (
          <div className="anomaly-section" style={{ marginBottom: '20px' }}>
            <div className="anomaly-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Behavioral Pattern Attribution (Model Explainability)
            </div>
            <div className="explainability-panel" style={{ marginTop: '10px' }}>
              <div className="explainability-list">
                {alert.explainability.map((item, index) => {
                  const fillColor = item.type === 'danger' ? '#ef4444' : item.type === 'warning' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={index} className="explain-item">
                      <div className="explain-header">
                        <span>{item.feature}</span>
                        <span style={{ color: fillColor, fontWeight: 600 }}>{item.weight}% weight</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${item.weight}%`, background: fillColor }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="details-grid">
          <div className="detail-group">
            <div className="detail-label">Amount</div>
            <div className="detail-value" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              GH¢ {alert.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </div>
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
            <div className="detail-label">Device Fingerprint</div>
            <div className="detail-value">{alert.device}</div>
          </div>
          <div className="detail-group">
            <div className="detail-label">IP Address</div>
            <div className="detail-value">{alert.ip}</div>
          </div>
        </div>

        {/* Analyst Actions */}
        <div className="actions" style={{ marginTop: '24px' }}>
          <button 
            className={`btn-danger ${isSubmitting ? 'btn-disabled' : ''}`}
            onClick={() => handleAction('TRUE_POSITIVE')}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <X size={16} /> Confirm Fraud (True Positive)
          </button>
          <button 
            className={`btn-success ${isSubmitting ? 'btn-disabled' : ''}`}
            onClick={() => handleAction('FALSE_POSITIVE')}
            disabled={isSubmitting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Check size={16} /> Mark Safe (False Positive)
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestigationView;
