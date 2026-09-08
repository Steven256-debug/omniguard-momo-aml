import React, { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password123') {
      onLogin(true);
    } else {
      setError('Invalid credentials. Use admin / password123.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield size={20} style={{ color: '#ffffff' }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>OmniGuard</span>
          </div>
          <h2>Sign in to AML Console</h2>
          <p>Real-time transaction monitoring and triage portal.</p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-field-group">
            <label>Analyst ID</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="admin"
              required 
            />
          </div>

          <div className="form-field-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="password123"
              required 
            />
          </div>

          <button type="submit" className="btn-submit-login">
            Continue
          </button>
        </form>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
          Pre-filled credentials: <span style={{ color: 'var(--text-secondary)' }}>admin / password123</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
