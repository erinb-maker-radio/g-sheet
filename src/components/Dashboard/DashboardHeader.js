// components/Dashboard/DashboardHeader.js
import React from 'react';
import { INTERMISSION_CONFIG } from '../../constants/intermissions';

const DashboardHeader = ({ 
  episodeNumber, 
  nextIntermission, 
  onLogout, 
  cardStyle, 
  titleStyle, 
  secondaryButtonStyle 
}) => {
  return (
    <div style={{
      ...cardStyle,
      borderRadius: '0',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      padding: '20px 40px',
      marginBottom: '30px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={titleStyle}>
          🎬 Broadcast Control Center - Episode #{episodeNumber}
        </h1>
        
        {/* Next Intermission Alert */}
        {nextIntermission && (
          <div style={{
            background: INTERMISSION_CONFIG.backgroundColor,
            border: `1px solid ${INTERMISSION_CONFIG.borderColor}`,
            padding: '10px 20px',
            borderRadius: '10px',
            color: INTERMISSION_CONFIG.color,
            fontSize: '16px',
            fontWeight: '600',
            marginRight: '20px'
          }}>
            Next Intermission: {nextIntermission.time}
          </div>
        )}
        
        <button
          onClick={onLogout}
          style={{
            ...secondaryButtonStyle,
            background: 'linear-gradient(135deg, #f44336, #d32f2f)',
            border: 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 15px 35px rgba(244, 67, 54, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 25px rgba(244, 67, 54, 0.3)';
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;