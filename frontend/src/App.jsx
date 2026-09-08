import React, { useState, useEffect } from 'react';
import AlertsInbox from './components/AlertsInbox';
import InvestigationView from './components/InvestigationView';
import RegionalTrends from './components/RegionalTrends';
import Login from './components/Login';
import { fetchMockAlerts, submitBatchAutoTriage } from './services/api';
import { Shield, Activity, BarChart2, Check, X, Sun, Moon } from 'lucide-react';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('investigations');
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [notification, setNotification] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('omniguard_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omniguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (isAuthenticated) {
      const initialAlerts = fetchMockAlerts();
      setAlerts(initialAlerts);
      const firstPending = initialAlerts.find(a => a.triage_tier === 'REQUIRES_HUMAN_REVIEW');
      setSelectedAlert(firstPending || initialAlerts[0]);
    }
  }, [isAuthenticated]);

  const handleSelectAlert = (alert) => {
    setSelectedAlert(alert);
    setMobileDetailOpen(true);
  };

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

    setNotification("Automated triage finished: 1,870 transactions resolved, 130 queued for review.");
    setTimeout(() => setNotification(null), 5000);
  };

  if (!isAuthenticated) {
    return <Login onLogin={setIsAuthenticated} />;
  }

  return (
    <div className="app-wrapper">
      <header className="top-nav">
        <div className="nav-left">
          <div className="brand-link">
            <Shield className="brand-icon" />
            <span>OmniGuard</span>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>MoMo AML</span>
          </div>

          <div className="nav-divider"></div>

          <nav className="nav-tabs">
            <button 
              className={`nav-tab-link ${activeTab === 'investigations' ? 'active' : ''}`}
              onClick={() => setActiveTab('investigations')}
            >
              <Activity size={14} /> Triage Queue
            </button>
            <button 
              className={`nav-tab-link ${activeTab === 'trends' ? 'active' : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              <BarChart2 size={14} /> Regional Analytics
            </button>
          </nav>
        </div>

        <div className="nav-right">
          <div className="status-indicator-tag">
            <div className="dot-status"></div>
            <span>Live (42ms SLA)</span>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="user-profile-menu">
            <div className="user-avatar-circle">SA</div>
            <span>Lead Analyst</span>
          </div>
        </div>
      </header>

      {notification && (
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          padding: '8px 24px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={14} style={{ color: 'var(--success)' }} />
            {notification}
          </div>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {activeTab === 'investigations' ? (
        <div className={`dashboard-container ${mobileDetailOpen ? 'show-detail' : ''}`}>
          <AlertsInbox 
            alerts={alerts} 
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            onRunAutoTriage={handleRunAutoTriage}
          />
          <InvestigationView 
            alert={selectedAlert} 
            onActionComplete={handleActionComplete}
            onBack={() => setMobileDetailOpen(false)}
          />
        </div>
      ) : (
        <RegionalTrends theme={theme} />
      )}
    </div>
  );
}

export default App;
