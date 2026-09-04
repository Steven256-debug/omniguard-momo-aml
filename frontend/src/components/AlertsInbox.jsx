import React, { useState } from 'react';
import { Zap, ShieldCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const AlertsInbox = ({ alerts, selectedAlert, onSelectAlert, onRunAutoTriage }) => {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [isTriaging, setIsTriaging] = useState(false);

  // Statistics calculation for the 2,000 alerts/day scale
  const totalCount = 2000;
  const pendingCount = alerts.filter(a => a.triage_tier === 'REQUIRES_HUMAN_REVIEW').length;
  const autoFraudCount = alerts.filter(a => a.triage_tier === 'AUTO_CONFIRMED_FRAUD').length;
  const autoSafeCount = alerts.filter(a => a.triage_tier === 'AUTO_CLEARED_SAFE').length;

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING_REVIEW') return alert.triage_tier === 'REQUIRES_HUMAN_REVIEW';
    if (filter === 'AUTO_CONFIRMED_FRAUD') return alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
    if (filter === 'AUTO_CLEARED_SAFE') return alert.triage_tier === 'AUTO_CLEARED_SAFE';
    return true;
  });

  const handleTriggerAutoTriage = async () => {
    setIsTriaging(true);
    await onRunAutoTriage();
    setIsTriaging(false);
  };

  return (
    <div className="sidebar" style={{ minWidth: '340px' }}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>FIU Alerts Triage</h1>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Daily Volume: 2,000</span>
        </div>
        
        {/* Automated Triage Banner */}
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>AI Auto-Triage Reduction:</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>93.5% Automated</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#334155' }}>
            <div style={{ width: '74%', background: '#10b981' }} title="74% Auto-Cleared Safe"></div>
            <div style={{ width: '19.5%', background: '#ef4444' }} title="19.5% Auto-Blocked Fraud"></div>
            <div style={{ width: '6.5%', background: '#f59e0b' }} title="6.5% Pending Human Review"></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
            <span style={{ color: '#10b981' }}>● Safe: 1,480</span>
            <span style={{ color: '#ef4444' }}>● Fraud: 390</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Gray-Zone: 130</span>
          </div>
        </div>

        {/* Action Button: Auto-Resolve Backlog */}
        <button 
          onClick={handleTriggerAutoTriage}
          disabled={isTriaging}
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: isTriaging ? 'wait' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}
        >
          <Zap size={14} />
          {isTriaging ? 'Triaging 2,000 Alerts...' : 'Run Auto-Triage (Clear Backlog)'}
        </button>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              background: filter === 'PENDING_REVIEW' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: filter === 'PENDING_REVIEW' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setFilter('PENDING_REVIEW')}
          >
            Review Required ({pendingCount})
          </button>
          <button 
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              background: filter === 'AUTO_CONFIRMED_FRAUD' ? '#ef4444' : 'var(--bg-secondary)',
              color: filter === 'AUTO_CONFIRMED_FRAUD' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setFilter('AUTO_CONFIRMED_FRAUD')}
          >
            Auto-Blocked ({autoFraudCount})
          </button>
          <button 
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              background: filter === 'AUTO_CLEARED_SAFE' ? '#10b981' : 'var(--bg-secondary)',
              color: filter === 'AUTO_CLEARED_SAFE' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setFilter('AUTO_CLEARED_SAFE')}
          >
            Auto-Safe ({autoSafeCount})
          </button>
          <button 
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: 'none',
              background: filter === 'ALL' ? 'var(--text-primary)' : 'var(--bg-secondary)',
              color: filter === 'ALL' ? '#0f172a' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setFilter('ALL')}
          >
            All
          </button>
        </div>
      </div>

      <div className="alert-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 12px' }}>
            <CheckCircle size={28} style={{ color: '#10b981', marginBottom: '8px' }} />
            <p style={{ fontWeight: 600 }}>Queue Clean</p>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No alerts matching current filter.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
            const isSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';
            const isPending = alert.triage_tier === 'REQUIRES_HUMAN_REVIEW';

            const badgeBg = isFraud ? 'rgba(239, 68, 68, 0.15)' : isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
            const badgeColor = isFraud ? '#ef4444' : isSafe ? '#10b981' : '#f59e0b';
            const badgeLabel = isFraud ? 'Auto-Blocked' : isSafe ? 'Auto-Safe' : 'Needs Review';

            return (
              <div
                key={alert.id}
                className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
                onClick={() => onSelectAlert(alert)}
                style={{ position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="alert-title">{alert.id}</div>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: badgeBg,
                    color: badgeColor
                  }}>
                    {badgeLabel}
                  </span>
                </div>
                
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 600 }}>
                  GH¢ {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                <div className="alert-meta" style={{ marginTop: '4px' }}>
                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  <span className="score-badge" style={{
                    background: alert.score >= 0.9 ? 'rgba(239, 68, 68, 0.2)' : alert.score <= 0.4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: alert.score >= 0.9 ? '#ef4444' : alert.score <= 0.4 ? '#10b981' : '#f59e0b'
                  }}>
                    Risk: {alert.score.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsInbox;
