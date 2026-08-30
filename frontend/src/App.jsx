import React, { useState, useEffect } from 'react';
import AlertsInbox from './components/AlertsInbox';
import InvestigationView from './components/InvestigationView';
import Login from './components/Login';
import { fetchMockAlerts } from './services/api';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  );
}

export default App;
