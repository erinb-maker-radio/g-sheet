// components/StaffLogin.js
import React, { useState } from 'react';
import { authenticateStaff } from '../utils/staffAuth';

const StaffLogin = ({ onAuthenticated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authenticateStaff(code)) {
      onAuthenticated();
      setShowLogin(false);
      setCode('');
      setError('');
    } else {
      setError('Invalid staff code');
    }
  };

  // Secret keyboard shortcut: Ctrl+Shift+O
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        setShowLogin(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!showLogin) {
    return (
      <button
        onClick={() => setShowLogin(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'rgba(156, 39, 176, 0.2)',
          border: '2px solid rgba(156, 39, 176, 0.3)',
          color: '#9c27b0',
          fontSize: '20px',
          cursor: 'pointer',
          opacity: 0.3,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1';
          e.target.style.background = 'rgba(156, 39, 176, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.3';
          e.target.style.background = 'rgba(156, 39, 176, 0.2)';
        }}
        title="Staff Access (Ctrl+Shift+O)"
      >
        🎬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'rgba(40, 40, 40, 0.95)',
        padding: '40px',
        borderRadius: '15px',
        border: '2px solid #9c27b0',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h2 style={{
          color: '#9c27b0',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          🎬 Video Staff Access
        </h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter staff code"
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #555',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              marginBottom: '15px'
            }}
            autoFocus
          />
          
          {error && (
            <div style={{
              color: '#f44336',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            gap: '10px'
          }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '15px',
                background: 'linear-gradient(135deg, #9c27b0, #7b1fa2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowLogin(false);
                setCode('');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '15px',
                background: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
        
        <p style={{
          marginTop: '20px',
          color: '#888',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          Authorized video production staff only
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;