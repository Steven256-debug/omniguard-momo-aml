import React, { useState, useEffect } from 'react';
import AlertsInbox from './components/AlertsInbox';
import InvestigationView from './components/InvestigationView';
import RegionalTrends from './components/RegionalTrends';
import Login from './components/Login';
import { fetchMockAlerts, submitBatchAutoTriage } from './services/api';
import { Activity, BarChart2, CheckCircle2 } from 'lucide-react';
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
    // Update alert status or remove
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
    // Simulate auto-triage of daily volume
    const itemsToSubmit = alerts.map(a => ({
      transaction_id: a.id,
      feedback_label: a.score >= 0.90 ? 'AUTO_CONFIRMED_FRAUD' : a.score <= 0.40 ? 'AUTO_CLEARED_SAFE' : 'PENDING',
      notes: a.narrative,
      amount: a.amount
    })).filter(i => i.feedback_label !== 'PENDING');

    await submitBatchAutoTriage(itemsToSubmit);

    setTriageToast("Auto-triage completed! 1,870 high/low confidence alerts automatically resolved. 130 gray-zone cases queued for review.");
    setTimeout(() => setTriageToast(null), 6000);
  };

  if (!isAuthenticated) {
    return <Login onLogin={setIsAuthenticated} />;
  }

  return (
    <div className="app-wrapper">
      <nav className="top-nav">
        <div className="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent)'}}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          OmniGuard MoMo AML
        </div>
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'investigations' ? 'active' : ''}`}
            onClick={() => setActiveTab('investigations')}
          >
            <Activity size={18} /> FIU Triage &amp; Alerts
          </button>
          <button 
            className={`nav-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <BarChart2 size={18} /> Regional Trends
          </button>
        </div>
        <div className="nav-user">
          FIU Lead Analyst
        </div>
      </nav>

      {/* Auto-Triage Toast Notification */}
      {triageToast && (
        <div style={{
          background: '#064e3b',
          borderBottom: '1px solid #059669',
          color: '#34d399',
          padding: '10px 24px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} />
          {triageToast}
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
