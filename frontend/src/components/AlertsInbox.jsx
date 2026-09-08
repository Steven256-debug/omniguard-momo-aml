import React, { useState, useMemo } from 'react';
import { Search, Zap } from 'lucide-react';

const AlertsInbox = ({ alerts, selectedAlert, onSelectAlert, onRunAutoTriage }) => {
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTriaging, setIsTriaging] = useState(false);

  const pendingCount = alerts.filter(a => a.triage_tier === 'REQUIRES_HUMAN_REVIEW').length;
  const autoFraudCount = alerts.filter(a => a.triage_tier === 'AUTO_CONFIRMED_FRAUD').length;
  const autoSafeCount = alerts.filter(a => a.triage_tier === 'AUTO_CLEARED_SAFE').length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (filter === 'PENDING_REVIEW' && alert.triage_tier !== 'REQUIRES_HUMAN_REVIEW') return false;
      if (filter === 'AUTO_CONFIRMED_FRAUD' && alert.triage_tier !== 'AUTO_CONFIRMED_FRAUD') return false;
      if (filter === 'AUTO_CLEARED_SAFE' && alert.triage_tier !== 'AUTO_CLEARED_SAFE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return alert.id.toLowerCase().includes(q) ||
               alert.sender?.toLowerCase().includes(q) ||
               alert.receiver?.toLowerCase().includes(q) ||
               alert.device?.toLowerCase().includes(q);
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
      <div className="sidebar-header-pane">
        <div className="sidebar-headline">
          <h1>Triage Queue</h1>
          <span className="subtle-badge">2,000 / day</span>
        </div>

        {/* Quick Search */}
        <div className="search-wrapper">
          <Search size={13} className="search-icon-input" />
          <input 
            type="text" 
            className="search-input-field"
            placeholder="Filter by ID, sender, or device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Linear-Style Segmented Control */}
        <div className="segmented-control">
          <button 
            className={`segmented-btn ${filter === 'PENDING_REVIEW' ? 'active' : ''}`}
            onClick={() => setFilter('PENDING_REVIEW')}
          >
            Review <span className="count-pill">{pendingCount}</span>
          </button>
          <button 
            className={`segmented-btn ${filter === 'AUTO_CONFIRMED_FRAUD' ? 'active' : ''}`}
            onClick={() => setFilter('AUTO_CONFIRMED_FRAUD')}
          >
            Blocked <span className="count-pill">{autoFraudCount}</span>
          </button>
          <button 
            className={`segmented-btn ${filter === 'AUTO_CLEARED_SAFE' ? 'active' : ''}`}
            onClick={() => setFilter('AUTO_CLEARED_SAFE')}
          >
            Safe <span className="count-pill">{autoSafeCount}</span>
          </button>
          <button 
            className={`segmented-btn ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All <span className="count-pill">{alerts.length}</span>
          </button>
        </div>

        {/* Quiet Auto-Triage Action Strip */}
        <div className="triage-action-strip">
          <span>93.5% Auto-triage rule</span>
          <button 
            className="btn-ghost-triage"
            onClick={handleTriggerAutoTriage}
            disabled={isTriaging}
          >
            {isTriaging ? 'Processing...' : 'Run Auto-Triage'}
          </button>
        </div>
      </div>

      {/* High Density Feed */}
      <div className="alert-feed">
        {filteredAlerts.length === 0 ? (
          <div className="empty-placeholder">
            <span>No alerts matching criteria.</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isFraud = alert.triage_tier === 'AUTO_CONFIRMED_FRAUD';
            const isSafe = alert.triage_tier === 'AUTO_CLEARED_SAFE';

            const statusType = isFraud ? 'fraud' : isSafe ? 'safe' : 'review';
            const statusLabel = isFraud ? 'Blocked' : isSafe ? 'Cleared' : 'Needs Review';
            const isSelected = selectedAlert?.id === alert.id;

            return (
              <div
                key={alert.id}
                className={`alert-row ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectAlert(alert)}
              >
                <div className="alert-row-top">
                  <span className="txn-id-tag">{alert.id}</span>
                  <span className={`status-micro-badge ${statusType}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="alert-row-main">
                  <div className="amount-text">
                    <span className="currency-label">GH¢</span>
                    {alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="risk-metric-text">
                    Risk {(alert.score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="alert-row-footer">
                  <span>{alert.sender} → {alert.receiver}</span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
