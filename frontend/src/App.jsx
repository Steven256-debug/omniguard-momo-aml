import React, { useState, useEffect } from 'react';
import AlertsInbox from './components/AlertsInbox';
import InvestigationView from './components/InvestigationView';
import RegionalTrends from './components/RegionalTrends';
import Login from './components/Login';
import { fetchMockAlerts, submitBatchAutoTriage } from './services/api';
import { Activity, BarChart2, CheckCircle2, Shield, Zap, Lock, LogOut } from 'lucide-react';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('investigations');
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [triageToast, setTriageToast] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const initialAlerts = fetchMockAlerts();
      setAlerts(initialAlerts);
      // Automatically select first review-required alert
      const firstPending = initialAlerts.find(a => a.triage_tier === 'REQUIRES_HUMAN_REVIEW');
      setSelectedAlert(firstPending || initialAlerts[0]);
    }
  }, [isAuthenticated]);

  const handleActionComplete = (transactionId, feedbackLabel) => {
    const updatedAlerts = alerts.map(a => {
      if (a.id === transactionId) {
        return {
          ...a,
          triage_tier: feedbackLabel === 'TRUE_POSITIVE' ? 'AUTO_CONFIRMED_FRAUD' : 'AUTO_CLEARED_SAFE',
          status: feedbackLabel === 'TRUE_POSITIVE' ? 'CONFIRMED_FRAUD' : 'CLEARED_SAFE'
        };
      }
      return a;
    });
    setAlerts(updatedAlerts);
    
    // Select next pending alert
    const nextPending = updatedAlerts.find(a => a.id !== transactionId && a.triage_tier === 'REQUIRES_HUMAN_REVIEW');
    setSelectedAlert(nextPending || null);
  };

  const handleRunAutoTriage = async () => {
    const itemsToSubmit = alerts.map(a => ({
      transaction_id: a.id,
      feedback_label: a.score >= 0.90 ? 'AUTO_CONFIRMED_FRAUD' : a.score <= 0.40 ? 'AUTO_CLEARED_SAFE' : 'PENDING',
      notes: a.narrative,
      amount: a.amount
    })).filter(i => i.feedback_label !== 'PENDING');

    await submitBatchAutoTriage(itemsToSubmit);

    setTriageToast("Automated Triage Executed: 1,870 routine and high-risk alerts automatically triaged to CBS & S3 audit. 130 ambiguous cases prioritized for human review.");
    setTimeout(() => setTriageToast(null), 6000);
  };

  if (!isAuthenticated) {
    return <Login onLogin={setIsAuthenticated} />;
  }

  return (
    <div className="app-wrapper">
      <nav className="top-nav">
        <div className="nav-brand-container">
          <div className="brand-icon-wrapper">
            <Shield size={20} />
          </div>
          <div className="nav-brand">
            OmniGuard MoMo AML
            <span className="nav-compliance-tag">BoG CISD 2026</span>
          </div>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'investigations' ? 'active' : ''}`}
            onClick={() => setActiveTab('investigations')}
          >
            <Activity size={16} /> FIU Triage &amp; Alerts
          </button>
          <button 
            className={`nav-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <BarChart2 size={16} /> Regional Analytics
          </button>
        </div>

        <div className="nav-right">
          <div className="engine-status-pill">
            <div className="status-dot-pulse"></div>
            <span>Sub-200ms SLA Active</span>
          </div>

          <div className="nav-user-badge">
            <div className="user-avatar">SA</div>
            <span>FIU Lead Analyst</span>
          </div>
        </div>
      </nav>

      {/* Auto-Triage Toast Notification */}
      {triageToast && (
        <div style={{
          background: 'rgba(6, 78, 59, 0.95)',
          borderBottom: '1px solid #059669',
          color: '#34d399',
          padding: '10px 24px',
          fontSize: '12.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            {triageToast}
          </div>
          <button 
            onClick={() => setTriageToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#34d399',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '2px 6px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {activeTab === 'investigations' ? (
        <div className="dashboard-container">
          <AlertsInbox 
            alerts={alerts} 
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
            onRunAutoTriage={handleRunAutoTriage}
          />
          <InvestigationView 
            alert={selectedAlert} 
            onActionComplete={handleActionComplete}
          />
        </div>
      ) : (
        <RegionalTrends />
      )}
    </div>
  );
}

export default App;
