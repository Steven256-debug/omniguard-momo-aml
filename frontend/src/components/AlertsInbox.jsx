import React from 'react';

const AlertsInbox = ({ alerts, selectedAlert, onSelectAlert }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>FIU Alerts Inbox</h1>
        </div>
        <div className="empty-state">
          <p>No pending alerts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>FIU Alerts Inbox</h1>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
            onClick={() => onSelectAlert(alert)}
          >
            <div className="alert-title">Transaction: {alert.id}</div>
            <div className="alert-meta">
              <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              <span className="score-badge">Risk: {alert.score.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsInbox;
