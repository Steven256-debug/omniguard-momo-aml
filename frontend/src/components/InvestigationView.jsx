import React, { useState } from 'react';
import { submitHITLFeedback } from '../services/api';
import { 
  ShieldCheck, AlertOctagon, HelpCircle, Check, X, Info, 
  Copy, CheckCheck, Smartphone, Network, User, DollarSign,
  ArrowRight, Activity, ShieldAlert, Cpu
} from 'lucide-react';

const InvestigationView = ({ alert, onActionComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!alert) {
    return (
      <main className="main-content">
        <div className="empty-state">
          <Activity size={48} style={{ color: 'var(--text-muted)' }} />
          <h2 style={{ color: '#ffffff', fontSize: '1.25rem', marginTop: '12px' }}>No Transaction Selected</h2>
          <p style={{ maxWidth: '380px', fontSize: '13px' }}>
            Select any transaction from the triage feed on the left to inspect real-time anomaly scores, Neptune graph topologies, and AI pattern narratives.
          </p>
        </div>
      </main>
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(alert.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async (feedbackLabel) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const notes = feedbackLabel === 'TRUE_POSITIVE' 
        ? "Analyst confirmed fraudulent activity via FIU console." 
        : "Analyst verified transaction as legitimate business activity.";
        
      await submitHITLFeedback(alert.id, feedbackLabel, notes, alert.amount);
      onActionComplete(alert.id, feedbackLabel);
    } catch (err) {
      setError("Failed to submit feedback to API Gateway. Please verify connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAutoFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
  const isAutoSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';
  const isReviewRequired = alert.triage_tier === 'REQUIRES_HUMAN_REVIEW';

  const tierKey = isAutoFraud ? 'fraud' : isAutoSafe ? 'safe' : 'review';
  const requiresSupervisor = alert.amount >= 10000;

  return (
    <main className="main-content">
      <div className="investigation-workspace">
        {/* Workspace Hero Header */}
        <div className="workspace-header">
          <div className="workspace-title-group">
            <h2>Transaction Investigation &amp; Pattern Analysis</h2>
            <div className="workspace-meta-badges">
              <button className="copyable-id-badge" onClick={handleCopyId} title="Click to copy Transaction ID">
                {copied ? <CheckCheck size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                <span>{alert.id}</span>
                {copied && <span style={{ color: 'var(--success)', fontSize: '10px' }}>(Copied)</span>}
              </button>
              <span className="account-type-pill">{alert.account_type || 'RETAIL'} WALLET</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Processed: {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Decision Status Hero Pill */}
          <div 
            className="tier-decision-hero-badge"
            style={{
              background: isAutoFraud ? 'var(--danger-bg)' : isAutoSafe ? 'var(--success-bg)' : 'var(--warning-bg)',
              color: isAutoFraud ? '#fb7185' : isAutoSafe ? '#34d399' : '#fbbf24',
              border: `1px solid ${isAutoFraud ? 'var(--danger-border)' : isAutoSafe ? 'var(--success-border)' : 'var(--warning-border)'}`
            }}
          >
            {isAutoFraud && <AlertOctagon size={18} />}
            {isAutoSafe && <ShieldCheck size={18} />}
            {isReviewRequired && <HelpCircle size={18} />}
            <span>
              {isAutoFraud ? 'AUTO-CONFIRMED FRAUD' : isAutoSafe ? 'AUTO-CLEARED SAFE' : 'REQUIRES HUMAN REVIEW'}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: '#fb7185',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* AI Pattern Narrative Card */}
        <div className={`ai-narrative-card tier-${tierKey}`}>
          <div className="narrative-header">
            <Info size={16} style={{ color: isAutoFraud ? '#fb7185' : isAutoSafe ? '#34d399' : 'var(--accent)' }} />
            <span className="narrative-title">
              Automated AI Pattern Explanation &amp; Triaging Rationale
            </span>
          </div>
          <p className="narrative-body">
            {alert.narrative || alert.reason}
          </p>
          <div className="narrative-recommendation">
            <span>System Recommendation:</span>
            <strong style={{ color: isAutoFraud ? '#fb7185' : isAutoSafe ? '#34d399' : '#fbbf24' }}>
              {alert.recommendation}
            </strong>
          </div>
        </div>

        {/* Amazon Neptune Sub-Graph Topology Canvas */}
        <div className="graph-topology-card">
          <div className="card-title-row">
            <div className="card-title">
              <Network size={16} style={{ color: 'var(--accent)' }} />
              <span>Amazon Neptune Sub-Graph Topology &amp; Flow Dynamics</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Inference Graph: 3-Hop Traversal
            </span>
          </div>

          <div className="topology-container">
            {/* Sender Node */}
            <div className="graph-node">
              <div className="node-icon-circle sender">
                <User size={20} />
              </div>
              <span className="node-label">Origin Sender</span>
              <span className="node-value">{alert.sender}</span>
            </div>

            {/* Edge 1 */}
            <div className="graph-edge">
              <div className="edge-line"></div>
              <span className="edge-pill">
                GH¢ {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>

            {/* Device Node */}
            <div className="graph-node">
              <div className="node-icon-circle device">
                <Smartphone size={20} />
              </div>
              <span className="node-label">Device Hardware</span>
              <span className="node-value">{alert.device}</span>
            </div>

            {/* Edge 2 */}
            <div className="graph-edge">
              <div className="edge-line"></div>
              <span className="edge-pill">
                {isAutoFraud ? 'Mule Cluster' : isAutoSafe ? 'Agent POS' : 'First-Time IMEI'}
              </span>
            </div>

            {/* Recipient Node */}
            <div className="graph-node">
              <div className="node-icon-circle receiver">
                <User size={20} />
              </div>
              <span className="node-label">Target Recipient</span>
              <span className="node-value">{alert.receiver}</span>
            </div>
          </div>
        </div>

        {/* Behavioral Pattern Attribution (Model Explainability) */}
        {alert.explainability && alert.explainability.length > 0 && (
          <div className="explainability-card">
            <div className="card-title-row">
              <div className="card-title">
                <Cpu size={16} style={{ color: 'var(--accent)' }} />
                <span>Behavioral Pattern Attribution (SageMaker Model Explainability)</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                XAI Feature Weights
              </span>
            </div>

            <div className="features-grid">
              {alert.explainability.map((item, index) => {
                const isItemDanger = item.type === 'danger';
                const isItemWarning = item.type === 'warning';
                const fillColor = isItemDanger ? 'var(--danger)' : isItemWarning ? 'var(--warning)' : 'var(--success)';
                const textColor = isItemDanger ? '#fb7185' : isItemWarning ? '#fbbf24' : '#34d399';

                return (
                  <div key={index} className="feature-bar-row">
                    <div className="feature-info-line">
                      <span className="feature-title">{item.feature}</span>
                      <span className="feature-weight-tag" style={{ color: textColor }}>
                        {item.weight}% weight
                      </span>
                    </div>
                    <div className="feature-track">
                      <div 
                        className="feature-fill"
                        style={{ width: `${item.weight}%`, backgroundColor: fillColor }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-Card Entity & Transaction Dossier Grid */}
        <div className="dossier-grid">
          {/* Financial Summary */}
          <div className="dossier-card">
            <div className="dossier-header">
              <DollarSign size={15} style={{ color: 'var(--accent)' }} />
              <span>Financial Parameters</span>
            </div>
            <div className="dossier-rows">
              <div className="dossier-row">
                <span className="dossier-key">Gross Amount:</span>
                <span className="dossier-val" style={{ color: 'var(--accent)', fontSize: '13px' }}>
                  GH¢ {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Currency Rail:</span>
                <span className="dossier-val">GHS (Ghana Cedi)</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Scoring Latency:</span>
                <span className="dossier-val">42.18 ms (p99 SLA)</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Circuit Breaker:</span>
                <span className="dossier-val" style={{ color: 'var(--success)' }}>Nominal</span>
              </div>
            </div>
          </div>

          {/* Parties & KYC Status */}
          <div className="dossier-card">
            <div className="dossier-header">
              <User size={15} style={{ color: 'var(--accent)' }} />
              <span>Counterparty KYC</span>
            </div>
            <div className="dossier-rows">
              <div className="dossier-row">
                <span className="dossier-key">Sender ID:</span>
                <span className="dossier-val">{alert.sender}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Recipient ID:</span>
                <span className="dossier-val">{alert.receiver}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">KYC Verification:</span>
                <span className="dossier-val" style={{ color: isAutoSafe ? 'var(--success)' : 'var(--warning)' }}>
                  {isAutoSafe ? 'Tier 3 (Biometric Card)' : 'Tier 1 (Unverified SIM)'}
                </span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Account Type:</span>
                <span className="dossier-val">{alert.account_type || 'RETAIL'}</span>
              </div>
            </div>
          </div>

          {/* Device & Network Telemetry */}
          <div className="dossier-card">
            <div className="dossier-header">
              <Smartphone size={15} style={{ color: 'var(--accent)' }} />
              <span>Network Telemetry</span>
            </div>
            <div className="dossier-rows">
              <div className="dossier-row">
                <span className="dossier-key">Device Fingerprint:</span>
                <span className="dossier-val">{alert.device}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">IP Address:</span>
                <span className="dossier-val">{alert.ip}</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Telco Carrier:</span>
                <span className="dossier-val">MTN Ghana / Telecel</span>
              </div>
              <div className="dossier-row">
                <span className="dossier-key">Macie PII Redaction:</span>
                <span className="dossier-val" style={{ color: 'var(--success)' }}>Enforced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analyst Governance & Decision Console */}
        <div className="action-console">
          {requiresSupervisor && (
            <div className="governance-alert">
              <ShieldAlert size={16} />
              <span>
                <strong>BoG CISD Dual-Control Policy:</strong> Transaction value exceeds GH¢10,000. Any manual reversal requires supervisor co-signature and automated audit event dispatch to EventBridge.
              </span>
            </div>
          )}

          <div className="actions-btn-group">
            <button 
              className="btn-confirm-fraud"
              onClick={() => handleAction('TRUE_POSITIVE')}
              disabled={isSubmitting}
            >
              <X size={17} />
              <span>{isSubmitting ? 'Submitting...' : 'Confirm Fraud (True Positive • Instant CBS Freeze)'}</span>
            </button>
            <button 
              className="btn-mark-safe"
              onClick={() => handleAction('FALSE_POSITIVE')}
              disabled={isSubmitting}
            >
              <Check size={17} />
              <span>{isSubmitting ? 'Submitting...' : 'Clear as Safe (False Positive • Approved Settlement)'}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default InvestigationView;
