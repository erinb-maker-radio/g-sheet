// components/EmailPage.js
import React from 'react';
import { formCardStyle, backButtonStyle, inputStyle, titleStyle } from '../styles/styles';

const EmailPage = ({ 
  email, 
  setEmail, 
  subscribeToNews, 
  setSubscribeToNews, 
  userRole, 
  onNext, 
  onBack 
}) => {
  const handleBackHover = (e, isEntering) => {
    if (isEntering) {
      e.target.style.color = 'white';
      e.target.style.borderColor = '#e91e63';
      e.target.style.background = 'rgba(233, 30, 99, 0.1)';
    } else {
      e.target.style.color = '#888';
      e.target.style.borderColor = '#555';
      e.target.style.background = 'transparent';
    }
  };

  const handleInputFocus = (e, isFocused) => {
    if (isFocused) {
      e.target.style.borderColor = '#e91e63';
      e.target.style.boxShadow = '0 0 20px rgba(233, 30, 99, 0.3)';
    } else {
      e.target.style.borderColor = '#555';
      e.target.style.boxShadow = 'none';
    }
  };

  const handleCheckboxHover = (e, isEntering) => {
    if (isEntering) {
      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
    } else {
      e.target.style.background = 'transparent';
    }
  };

  const handleSubmitHover = (e, isEntering) => {
    if (email.trim() && isEntering) {
      e.target.style.transform = 'translateY(-3px)';
      e.target.style.boxShadow = '0 15px 35px rgba(233, 30, 99, 0.4)';
    } else if (email.trim()) {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 10px 25px rgba(233, 30, 99, 0.3)';
    }
  };

  return (
    <div style={formCardStyle}>
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={onBack}
          style={backButtonStyle}
          onMouseEnter={(e) => handleBackHover(e, true)}
          onMouseLeave={(e) => handleBackHover(e, false)}
        >
          ← Back
        </button>
      </div>
      
      <h1 style={titleStyle}>Stay Connected</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          onFocus={(e) => handleInputFocus(e, true)}
          onBlur={(e) => handleInputFocus(e, false)}
        />
      </div>

      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '15px', 
          cursor: 'pointer', 
          marginBottom: '40px',
          padding: '15px',
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => handleCheckboxHover(e, true)}
        onMouseLeave={(e) => handleCheckboxHover(e, false)}
        onClick={() => setSubscribeToNews(!subscribeToNews)}
      >
        <input
          type="checkbox"
          checked={subscribeToNews}
          onChange={e => setSubscribeToNews(e.target.checked)}
          style={{ 
            transform: 'scale(1.5)',
            accentColor: '#e91e63'
          }}
        />
        <span style={{ fontSize: '16px' }}>
          I would like to receive news and events from Maker Radio
        </span>
      </div>

      <button
        onClick={() => {
          if (email.trim()) {
            onNext();
          }
        }}
        disabled={!email.trim()}
        style={{
          width: '100%',
          padding: '20px',
          background: email.trim() ? 'linear-gradient(135deg, #e91e63, #9c27b0)' : '#555',
          color: 'white',
          border: 'none',
          borderRadius: '15px',
          fontWeight: '800',
          fontSize: '18px',
          cursor: email.trim() ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          transition: 'all 0.3s ease',
          boxShadow: email.trim() ? '0 10px 25px rgba(233, 30, 99, 0.3)' : 'none'
        }}
        onMouseEnter={(e) => handleSubmitHover(e, true)}
        onMouseLeave={(e) => handleSubmitHover(e, false)}
      >
        {userRole === 'performer' ? 'Continue to Agreements' : 'Join Audience'}
      </button>
    </div>
  );
};

export default EmailPage;