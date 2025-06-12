// components/RoleSelectPage.js
import React from 'react';
import { formCardStyle, primaryButtonStyle, backButtonStyle } from '../styles/styles';

const RoleSelectPage = ({ onSelectRole, onBack }) => {
  const handleHover = (e, isEntering) => {
    if (isEntering) {
      e.target.style.transform = 'translateY(-5px) scale(1.05)';
      e.target.style.boxShadow = '0 20px 40px rgba(233, 30, 99, 0.4)';
    } else {
      e.target.style.transform = 'translateY(0) scale(1)';
      e.target.style.boxShadow = '0 10px 25px rgba(233, 30, 99, 0.3)';
    }
  };

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

  return (
    <div style={{
      ...formCardStyle,
      textAlign: 'center',
      padding: '70px 60px'
    }}>
      <h2 style={{ 
        fontSize: '32px', 
        color: 'white', 
        marginBottom: '50px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}>
        Are you a performer or an audience member?
      </h2>
      
      <div style={{ 
        display: 'flex', 
        gap: '30px', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        marginBottom: '50px' 
      }}>
        <button 
          onClick={() => onSelectRole('performer')}
          style={{
            ...primaryButtonStyle,
            minWidth: '200px'
          }}
          onMouseEnter={(e) => handleHover(e, true)}
          onMouseLeave={(e) => handleHover(e, false)}
        >
          🎤 Performer
        </button>
        
        <button 
          onClick={() => onSelectRole('audience')}
          style={{
            ...primaryButtonStyle,
            minWidth: '200px'
          }}
          onMouseEnter={(e) => handleHover(e, true)}
          onMouseLeave={(e) => handleHover(e, false)}
        >
          👥 Audience Member
        </button>
      </div>
      
      <button 
        onClick={onBack}
        style={backButtonStyle}
        onMouseEnter={(e) => handleBackHover(e, true)}
        onMouseLeave={(e) => handleBackHover(e, false)}
      >
        ← Back
      </button>
    </div>
  );
};

export default RoleSelectPage;