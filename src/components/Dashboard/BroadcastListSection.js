// components/Dashboard/BroadcastListSection.js
import React from 'react';
import BroadcastItem from './BroadcastItem';
import { INTERMISSION_CONFIG } from '../../constants/intermissions';

const BroadcastListSection = ({
  youtubeSignedIn,
  broadcasts,
  performers,
  loading,
  streamingBroadcastId,
  obsConnected,
  activeIntermission,
  cardStyle,
  secondaryButtonStyle,
  sortBroadcastsByTimeSlot,
  onDeleteAllBroadcasts,
  onArchiveBroadcast,
  onDeleteBroadcast,
  onStartIntermission,
  onStartBroadcast,
  onEndStreamWithTransition,
  onStopBroadcast
}) => {
  return (
    <div style={{ padding: '0 40px 40px 40px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{
          fontSize: '32px',
          color: 'white',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0
        }}>
          📺 YouTube Broadcasts
        </h2>
        
        {youtubeSignedIn && broadcasts.length > 0 && (
          <button
            onClick={onDeleteAllBroadcasts}
            disabled={loading}
            style={{
              background: loading ? '#555' : 'linear-gradient(135deg, #d32f2f, #b71c1c)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(211, 47, 47, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Processing...' : '🗑️ Delete All Broadcasts'}
          </button>
        )}
      </div>
      
      {!youtubeSignedIn ? (
        <div style={cardStyle}>
          <p style={{ 
            color: '#ccc', 
            fontSize: '20px',
            textAlign: 'center',
            margin: '40px 0'
          }}>
            Please sign in to YouTube to view and manage broadcasts
          </p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ 
            color: '#ccc', 
            fontSize: '20px',
            textAlign: 'center',
            margin: '40px 0'
          }}>
            {performers.length === 0 
              ? 'No performers in the sign-up sheet. Broadcasts will appear here when performers sign up.'
              : 'No broadcasts found. Click "SYNC SIGN UPS TO BROADCAST LIST" to create broadcasts.'}
          </p>
        </div>
      ) : (
        <div style={cardStyle}>
          {sortBroadcastsByTimeSlot(broadcasts, performers).map((item, index) => {
            if (item.type === 'header') {
              const isIntermission = item.isIntermission;
              const isCompleted = item.isCompleted;
              return (
                <div key={`header-${index}`} style={{
                  padding: '15px 20px',
                  marginBottom: '10px',
                  marginTop: index > 0 ? '20px' : '0',
                  background: isCompleted ? 'linear-gradient(135deg, #666, #444)' :
                             isIntermission ? `linear-gradient(135deg, ${INTERMISSION_CONFIG.color}, ${INTERMISSION_CONFIG.borderColor})` : 
                             'linear-gradient(135deg, #2196F3, #1976D2)',
                  borderRadius: '10px',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'white',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)'
                }}>
                  {isIntermission ? `${item.timeSlot} - 🎭 INTERMISSION` : item.timeSlot}
                </div>
              );
            }
            
            if (item.type === 'intermission-placeholder') {
              return (
                <div
                  key={`intermission-${index}`}
                  style={{
                    background: INTERMISSION_CONFIG.backgroundColor,
                    border: `2px solid ${INTERMISSION_CONFIG.borderColor}`,
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    marginLeft: '20px',
                    textAlign: 'center',
                    color: INTERMISSION_CONFIG.color
                  }}
                >
                  <p style={{ margin: 0, fontSize: '16px' }}>
                    No intermission broadcast created yet
                  </p>
                  {obsConnected && (
                    <button
                      onClick={() => onStartIntermission(item.timeSlot)}
                      style={{
                        ...secondaryButtonStyle,
                        background: INTERMISSION_CONFIG.color,
                        border: 'none',
                        marginTop: '10px'
                      }}
                    >
                      🎭 Start {item.timeSlot} Intermission
                    </button>
                  )}
                </div>
              );
            }
            
            const broadcast = item.data;
            const isLive = streamingBroadcastId === broadcast.id;
            const isIntermissionBroadcast = broadcast.snippet.title.includes('INTERMISSION');
            
            return (
              <div
                key={broadcast.id}
                style={{
                  background: isLive ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2))' : 
                             isIntermissionBroadcast ? INTERMISSION_CONFIG.backgroundColor :
                             'rgba(255, 255, 255, 0.05)',
                  border: isLive ? '2px solid #4CAF50' : 
                         isIntermissionBroadcast ? `2px solid ${INTERMISSION_CONFIG.borderColor}` :
                         '2px solid #555',
                  borderRadius: '15px',
                  padding: '20px',
                  marginBottom: '15px',
                  marginLeft: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isLive) {
                    e.currentTarget.style.background = isIntermissionBroadcast ? 
                      'rgba(255, 107, 107, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = '#777';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLive) {
                    e.currentTarget.style.background = isIntermissionBroadcast ? 
                      INTERMISSION_CONFIG.backgroundColor : 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = isIntermissionBroadcast ? 
                      INTERMISSION_CONFIG.borderColor : '#555';
                  }
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ 
                    color: isIntermissionBroadcast ? INTERMISSION_CONFIG.color : 'white', 
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {broadcast.snippet.title}
                  </h4>
                  <div style={{ 
                    color: '#aaa', 
                    fontSize: '14px',
                    display: 'flex',
                    gap: '25px'
                  }}>
                    <span>Status: <span style={{ 
                      color: broadcast.status.lifeCycleStatus === 'live' ? '#4CAF50' : 
                             broadcast.status.lifeCycleStatus === 'ready' ? '#2196F3' : 
                             broadcast.status.lifeCycleStatus === 'complete' ? '#9C27B0' :
                             '#FFC107',
                      fontWeight: '600'
                    }}>
                      {broadcast.status.lifeCycleStatus.toUpperCase()}
                    </span></span>
                    <span>Privacy: {broadcast.status.privacyStatus}</span>
                    <span>Created: {new Date(broadcast.snippet.publishedAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {isLive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    background: 'rgba(76, 175, 80, 0.2)',
                    border: '1px solid #4CAF50',
                    borderRadius: '20px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#4CAF50',
                      animation: 'pulse 2s infinite'
                    }} />
                    <span style={{
                      color: '#4CAF50',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      Live Now
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add CSS animation for live indicator */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default BroadcastListSection;