import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password123') {
      onLogin(true);
    } else {
      setError('Invalid FIU credentials. Please use admin / password123.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="brand-icon-wrapper" style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
            <Shield size={26} />
          </div>
        </div>

        <h2>OmniGuard FIU Portal</h2>
        <p className="login-subtitle">
          Real-Time Graph AI &amp; Anti-Money Laundering Engine
        </p>
        
        {error && (
          <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>FIU Officer ID</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter officer ID (admin)"
                style={{ paddingLeft: '36px' }}
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Security Token / Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (password123)"
                style={{ paddingLeft: '36px' }}
                required 
              />
            </div>
          </div>

          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            background: 'rgba(255, 255, 255, 0.03)', 
            padding: '8px 12px', 
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Demo credentials pre-filled:</span>
            <strong style={{ color: 'var(--accent)' }}>admin / password123</strong>
          </div>
          
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>Sign In to AML Console</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
