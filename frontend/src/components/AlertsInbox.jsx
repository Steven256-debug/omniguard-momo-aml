import React, { useState, useMemo } from 'react';
import { Zap, ShieldCheck, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

const AlertsInbox = ({ alerts, selectedAlert, onSelectAlert, onRunAutoTriage }) => {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTriaging, setIsTriaging] = useState(false);

  const pendingCount = alerts.filter(a => a.triage_tier === 'REQUIRES_HUMAN_REVIEW').length;
  const autoFraudCount = alerts.filter(a => a.triage_tier === 'AUTO_CONFIRMED_FRAUD').length;
  const autoSafeCount = alerts.filter(a => a.triage_tier === 'AUTO_CLEARED_SAFE').length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Filter by tier
      if (filter === 'PENDING_REVIEW' && alert.triage_tier !== 'REQUIRES_HUMAN_REVIEW') return false;
      if (filter === 'AUTO_CONFIRMED_FRAUD' && alert.triage_tier !== 'AUTO_CONFIRMED_FRAUD') return false;
      if (filter === 'AUTO_CLEARED_SAFE' && alert.triage_tier !== 'AUTO_CLEARED_SAFE') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = alert.id.toLowerCase().includes(q);
        const matchesSender = alert.sender?.toLowerCase().includes(q);
        const matchesReceiver = alert.receiver?.toLowerCase().includes(q);
        const matchesDevice = alert.device?.toLowerCase().includes(q);
        return matchesId || matchesSender || matchesReceiver || matchesDevice;
      }
      return true;
    });
  }, [alerts, filter, searchQuery]);

  const handleTriggerAutoTriage = async () => {
    setIsTriaging(true);
    await onRunAutoTriage();
    setIsTriaging(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <h1>FIU Alerts Triage</h1>
          <span className="volume-indicator">2,000 Daily Scale</span>
        </div>

        {/* AI Auto-Triage Efficiency Gauge */}
        <div className="triage-metrics-box">
          <div className="metrics-header">
            <span className="metrics-label">AI Auto-Triage Reduction:</span>
            <span className="metrics-highlight">
              <Zap size={13} fill="currentColor" /> 93.5% Automated
            </span>
          </div>
          <div className="triage-progress-bar">
            <div className="progress-segment seg-safe" style={{ width: '74%' }} title="74% Auto-Cleared Safe (1,480/day)"></div>
            <div className="progress-segment seg-fraud" style={{ width: '19.5%' }} title="19.5% Auto-Blocked Fraud (390/day)"></div>
            <div className="progress-segment seg-review" style={{ width: '6.5%' }} title="6.5% Gray-Zone Human Review (130/day)"></div>
          </div>
          <div className="metrics-legend">
            <span className="legend-item safe">● Safe: 1,480</span>
            <span className="legend-item fraud">● Fraud: 390</span>
            <span className="legend-item review">● Gray-Zone: 130</span>
          </div>
        </div>

        {/* Auto-Triage Trigger Button */}
        <button 
          className="btn-autotriage"
          onClick={handleTriggerAutoTriage}
          disabled={isTriaging}
        >
          <Zap size={14} />
          {isTriaging ? 'Automating Batch Triage...' : 'Run Auto-Triage (Clear Backlog)'}
        </button>

        {/* Quick Search */}
        <div className="search-container">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Search TXN ID, sender, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Segmented Filter Pills without horizontal scrolling */}
        <div className="filter-grid">
          <button 
            className={`filter-tab-btn ${filter === 'PENDING_REVIEW' ? 'active pending' : ''}`}
            onClick={() => setFilter('PENDING_REVIEW')}
          >
            <span>Review</span>
            <span className="filter-badge-count">({pendingCount})</span>
          </button>
          <button 
            className={`filter-tab-btn ${filter === 'AUTO_CONFIRMED_FRAUD' ? 'active fraud' : ''}`}
            onClick={() => setFilter('AUTO_CONFIRMED_FRAUD')}
          >
            <span>Blocked</span>
            <span className="filter-badge-count">({autoFraudCount})</span>
          </button>
          <button 
            className={`filter-tab-btn ${filter === 'AUTO_CLEARED_SAFE' ? 'active safe' : ''}`}
            onClick={() => setFilter('AUTO_CLEARED_SAFE')}
          >
            <span>Safe</span>
            <span className="filter-badge-count">({autoSafeCount})</span>
          </button>
          <button 
            className={`filter-tab-btn ${filter === 'ALL' ? 'active all' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            <span>All</span>
            <span className="filter-badge-count">({alerts.length})</span>
          </button>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="alert-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 16px' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>Queue Up to Date</p>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              No transactions matching the selected filter.
            </span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
            const isSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';
            const isReview = alert.triage_tier === 'REQUIRES_HUMAN_REVIEW';

            const tierClass = isFraud ? 'tier-fraud' : isSafe ? 'tier-safe' : 'tier-review';
            const badgeBg = isFraud ? 'var(--danger-bg)' : isSafe ? 'var(--success-bg)' : 'var(--warning-bg)';
            const badgeBorder = isFraud ? 'var(--danger-border)' : isSafe ? 'var(--success-border)' : 'var(--warning-border)';
            const badgeColor = isFraud ? '#fb7185' : isSafe ? '#34d399' : '#fbbf24';
            const badgeText = isFraud ? 'Auto-Blocked' : isSafe ? 'Auto-Safe' : 'Needs Review';

            const isSelected = selectedAlert?.id === alert.id;

            return (
              <div
                key={alert.id}
                className={`alert-item ${tierClass} ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectAlert(alert)}
              >
                <div className="alert-top-line">
                  <span className="alert-txn-id">{alert.id}</span>
                  <span 
                    className="badge-status-pill"
                    style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}
                  >
                    {badgeText}
                  </span>
                </div>

                <div className="alert-amount-line">
                  <div>
                    <span className="currency-symbol">GH¢</span>
                    {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span 
                    className="score-badge"
                    style={{
                      background: alert.score >= 0.9 ? 'rgba(244, 63, 94, 0.15)' : alert.score <= 0.4 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: alert.score >= 0.9 ? '#fb7185' : alert.score <= 0.4 ? '#34d399' : '#fbbf24',
                      border: `1px solid ${alert.score >= 0.9 ? 'rgba(244, 63, 94, 0.3)' : alert.score <= 0.4 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}
                  >
                    Risk {alert.score.toFixed(2)}
                  </span>
                </div>

                <div className="alert-meta-line">
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    {alert.sender} → {alert.receiver}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default AlertsInbox;
