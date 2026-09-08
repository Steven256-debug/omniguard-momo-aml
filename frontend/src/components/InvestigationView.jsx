import React, { useState } from 'react';
import { submitHITLFeedback } from '../services/api';
import { 
  Check, X, Copy, CheckCheck, ArrowRight, ShieldAlert, 
  Clock, Shield, AlertCircle
} from 'lucide-react';

const InvestigationView = ({ alert, onActionComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!alert) {
    return (
      <main className="main-view-pane">
        <div className="empty-placeholder">
          <span>Select a transaction from the queue to view details.</span>
        </div>
      </main>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(alert.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAction = async (feedbackLabel) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const notes = feedbackLabel === 'TRUE_POSITIVE' 
        ? "Analyst confirmed fraud." 
        : "Analyst approved transaction.";
        
      await submitHITLFeedback(alert.id, feedbackLabel, notes, alert.amount);
      onActionComplete(alert.id, feedbackLabel);
    } catch (err) {
      setError("Failed to record decision. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAutoFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
  const isAutoSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';
  const statusType = isAutoFraud ? 'fraud' : isAutoSafe ? 'safe' : 'review';
  const statusLabel = isAutoFraud ? 'Auto-Blocked' : isAutoSafe ? 'Cleared Safe' : 'Review Required';
  const requiresSupervisor = alert.amount >= 10000;

  return (
    <main className="main-view-pane">
      <div className="investigation-container">
        {/* Header Bar */}
        <header className="investigation-header-bar">
          <div className="inv-title-group">
            <div className="inv-breadcrumb">
              <span>Queue</span>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{alert.id}</span>
            </div>
            <div className="inv-amount-hero">
              <h2>GH¢ {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              <span className={`status-pill-lg ${statusType}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="inv-action-buttons">
            <button 
              className="btn-secondary-action"
              onClick={() => handleAction('FALSE_POSITIVE')}
              disabled={isSubmitting}
            >
              <Check size={14} style={{ color: 'var(--success)' }} />
              <span>Clear Transaction</span>
            </button>
            <button 
              className="btn-danger-action"
              onClick={() => handleAction('TRUE_POSITIVE')}
              disabled={isSubmitting}
            >
              <X size={14} />
              <span>Confirm Fraud</span>
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {requiresSupervisor && (
          <div style={{
            background: 'var(--warning-subtle)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning-text)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={15} />
            <span>Dual-Control Governance: Amounts exceeding GH¢10,000 require supervisor sign-off for reversals.</span>
          </div>
        )}

        {/* 2-Column Inspector Layout */}
        <div className="investigation-grid">
          {/* Main Column */}
          <div className="investigation-main-col">
            {/* Triage Narrative */}
            <div className="panel-card">
              <div className="panel-card-title">
                <span>Triage Rationale</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk Score: {(alert.score * 100).toFixed(0)}%</span>
              </div>
              <div className="narrative-quote-block">
                {alert.narrative || alert.reason}
              </div>
              <div className="narrative-footer">
                <span>Recommendation:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{alert.recommendation}</span>
              </div>
            </div>

            {/* Network Pathway (Neptune Topology) */}
            <div className="panel-card">
              <div className="panel-card-title">
                <span>Transaction Pathway</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Neptune Graph Analysis</span>
              </div>

              <div className="topology-flow-strip">
                <div className="flow-step">
                  <span className="flow-step-label">Sender</span>
                  <span className="flow-step-val">{alert.sender}</span>
                </div>
                <ArrowRight size={14} className="flow-arrow" />
                <div className="flow-step">
                  <span className="flow-step-label">Device Hardware</span>
                  <span className="flow-step-val">{alert.device}</span>
                </div>
                <ArrowRight size={14} className="flow-arrow" />
                <div className="flow-step">
                  <span className="flow-step-label">Recipient</span>
                  <span className="flow-step-val">{alert.receiver}</span>
                </div>
              </div>
            </div>

            {/* Feature Attribution (Explainability) */}
            {alert.explainability && alert.explainability.length > 0 && (
              <div className="panel-card">
                <div className="panel-card-title">
                  <span>Model Risk Signals</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SageMaker Autoencoder</span>
                </div>

                <div className="feature-attribution-list">
                  {alert.explainability.map((item, index) => {
                    const typeClass = item.type === 'danger' ? 'danger' : item.type === 'warning' ? 'warning' : 'safe';
                    return (
                      <div key={index} className="feature-bar-item">
                        <div className="feature-header-line">
                          <span className="feature-name">{item.feature}</span>
                          <span className="feature-weight">{item.weight}%</span>
                        </div>
                        <div className="feature-meter">
                          <div 
                            className={`feature-meter-fill ${typeClass}`} 
                            style={{ width: `${item.weight}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Property Inspector */}
          <div className="investigation-sidebar-col">
            <div className="panel-card">
              <div className="panel-card-title">
                <span>Transaction Details</span>
              </div>

              <div className="metadata-table">
                <div className="metadata-row">
                  <span className="metadata-key">ID</span>
                  <span 
                    className="metadata-val" 
                    onClick={handleCopyId}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Copy ID"
                  >
                    {alert.id}
                    {copied ? <CheckCheck size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">Timestamp</span>
                  <span className="metadata-val">{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">Account Type</span>
                  <span className="metadata-val">{alert.account_type || 'RETAIL'}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">KYC Status</span>
                  <span className="metadata-val" style={{ color: isAutoSafe ? 'var(--success-text)' : 'var(--warning-text)' }}>
                    {isAutoSafe ? 'Level-3 (Biometric)' : 'Level-1 (Standard)'}
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">Device ID</span>
                  <span className="metadata-val">{alert.device}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">IP Address</span>
                  <span className="metadata-val">{alert.ip}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">Inference Time</span>
                  <span className="metadata-val">42.18 ms</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">Circuit Breaker</span>
                  <span className="metadata-val" style={{ color: 'var(--success-text)' }}>Healthy</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-key">PII Redaction</span>
                  <span className="metadata-val">Macie Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default InvestigationView;
