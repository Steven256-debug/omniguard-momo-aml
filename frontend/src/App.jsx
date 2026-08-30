import React, { useState, useEffect } from 'react';
import AlertsInbox from './components/AlertsInbox';
import InvestigationView from './components/InvestigationView';
import RegionalTrends from './components/RegionalTrends';
import Login from './components/Login';
import { fetchMockAlerts } from './services/api';
import { Activity, BarChart2 } from 'lucide-react';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('investigations');
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      // Load initial mock alerts only after login
      const initialAlerts = fetchMockAlerts();
      setAlerts(initialAlerts);
    }
  }, [isAuthenticated]);

  const handleActionComplete = (transactionId) => {
    // Remove the processed alert from the inbox
    const updatedAlerts = alerts.filter(a => a.id !== transactionId);
    setAlerts(updatedAlerts);
    setSelectedAlert(null);
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
            <Activity size={18} /> Alerts Inbox
          </button>
          <button 
            className={`nav-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <BarChart2 size={18} /> Regional Trends
          </button>
        </div>
        <div className="nav-user">
          FIU Agent
        </div>
      </nav>

      {activeTab === 'investigations' ? (
        <div className="dashboard-container">
          <AlertsInbox 
            alerts={alerts} 
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
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
