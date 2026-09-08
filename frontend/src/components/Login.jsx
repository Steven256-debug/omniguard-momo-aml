import React, { useState } from 'react';
import { User, Eye, EyeOff, Shield } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
    <div className="login-backdrop-wrapper">
      <div className="apple-frosted-login-card">
        <div className="login-headline">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Shield size={20} color="#ffffff" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.8)' }}>
              OmniGuard MoMo AML
            </span>
          </div>
          <h2>Login</h2>
          <p>Welcome back please login to your account</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(248, 113, 113, 0.5)',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Username */}
          <div className="apple-frosted-input-box">
            <input 
              type="text" 
              className="apple-frosted-input"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="User Name"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff',
                caretColor: '#ffffff',
                fontSize: '16px',
                opacity: 1
              }}
              required 
            />
            <User size={18} className="input-trailing-icon" />
          </div>

          {/* Password */}
          <div className="apple-frosted-input-box">
            <input 
              type={showPassword ? "text" : "password"} 
              className="apple-frosted-input"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password"
              autoComplete="current-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{
                color: '#ffffff',
                WebkitTextFillColor: '#ffffff',
                caretColor: '#ffffff',
                fontSize: '16px',
                opacity: 1
              }}
              required 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Remember me */}
          <label className="remember-row">
            <input 
              type="checkbox" 
              className="remember-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          {/* Login Button */}
          <button type="submit" className="apple-login-btn">
            Login
          </button>
        </form>

        <div className="login-footer-text">
          <span>Don't have an account? <strong>Signup</strong></span>
          <div style={{ fontSize: '11px', marginTop: '6px', color: 'rgba(255, 255, 255, 0.65)' }}>
            Demo credentials: <span style={{ color: '#ffffff' }}>admin / password123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
