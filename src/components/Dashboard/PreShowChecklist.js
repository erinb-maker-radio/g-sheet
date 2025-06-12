// components/Dashboard/PreShowChecklist.js
import React from 'react';

const PreShowChecklist = ({ 
  obsConnected, 
  youtubeSignedIn, 
  scenesCreated, 
  upNextSceneReady, 
  broadcastsCreated,
  cardStyle 
}) => {
  const checklistItems = [
    {
      label: 'OBS Connected',
      status: obsConnected,
      icon: '🎛️',
      action: 'Connect OBS WebSocket'
    },
    {
      label: 'YouTube Authenticated',
      status: youtubeSignedIn,
      icon: '📺',
      action: 'Sign in to YouTube'
    },
    {
      label: 'Performer Scenes Created',
      status: scenesCreated,
      icon: '🎬',
      action: 'Sync performers to OBS'
    },
    {
      label: 'Up Next Scene Ready',
      status: upNextSceneReady,
      icon: '⏭️',
      action: 'Create Up Next scene'
    },
    {
      label: 'YouTube Broadcasts Created',
      status: broadcastsCreated,
      icon: '📡',
      action: 'Create song broadcasts'
    }
  ];
  
  const allReady = checklistItems.every(item => item.status);
  
  const getItemStyle = (status) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px 20px',
    marginBottom: '10px',
    borderRadius: '10px',
    background: status ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)',
    border: `2px solid ${status ? '#4CAF50' : '#FFC107'}`,
    transition: 'all 0.3s ease'
  });
  
  const getStatusStyle = (status) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: '600',
    color: status ? '#4CAF50' : '#FFC107'
  });
  
  const getActionStyle = () => ({
    fontSize: '14px',
    color: '#aaa',
    fontStyle: 'italic'
  });

  return (
    <div style={{
      ...cardStyle,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255, 255, 255, 0.01) 10px,
          rgba(255, 255, 255, 0.01) 20px
        )`,
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{
          fontSize: '28px',
          color: 'white',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          📋 Pre-Show Checklist
          {allReady && (
            <span style={{
              fontSize: '14px',
              background: 'linear-gradient(135deg, #4CAF50, #388E3C)',
              padding: '5px 15px',
              borderRadius: '20px',
              fontWeight: '600'
            }}>
              ALL SYSTEMS GO!
            </span>
          )}
        </h2>
        
        <p style={{
          color: '#aaa',
          fontSize: '16px',
          marginBottom: '25px'
        }}>
          Complete all items before going live
        </p>
        
        <div>
          {checklistItems.map((item, index) => (
            <div
              key={index}
              style={getItemStyle(item.status)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(5px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={getStatusStyle(item.status)}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {!item.status && (
                  <span style={getActionStyle()}>
                    {item.action}
                  </span>
                )}
                
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: item.status ? '#4CAF50' : 'transparent',
                  border: `2px solid ${item.status ? '#4CAF50' : '#FFC107'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  {item.status && (
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: '700' }}>
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Progress bar */}
        <div style={{
          marginTop: '25px',
          paddingTop: '25px',
          borderTop: '1px solid #444'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ color: '#aaa', fontSize: '14px' }}>
              Setup Progress
            </span>
            <span style={{ 
              color: allReady ? '#4CAF50' : '#FFC107', 
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {checklistItems.filter(item => item.status).length} / {checklistItems.length}
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(checklistItems.filter(item => item.status).length / checklistItems.length) * 100}%`,
              height: '100%',
              background: allReady ? 
                'linear-gradient(90deg, #4CAF50, #66BB6A)' : 
                'linear-gradient(90deg, #FFC107, #FFD54F)',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
            }} />
          </div>
        </div>
        
        {/* Instructions */}
        {!allReady && (
          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: 'rgba(33, 150, 243, 0.1)',
            borderRadius: '10px',
            border: '1px solid #2196F3',
            fontSize: '14px',
            color: '#64B5F6'
          }}>
            <strong>💡 Quick Setup:</strong>
            <ol style={{ margin: '10px 0 0 20px', padding: 0 }}>
              <li>Connect to OBS WebSocket (usually ws://localhost:4455)</li>
              <li>Sign in to YouTube with your streaming account</li>
              <li>Click "Sync Sign Ups To Broadcast List" to create scenes</li>
              <li>Click "Create Up Next Scene" button</li>
              <li>YouTube broadcasts will be created automatically</li>
            </ol>
          </div>
        )}
        
        {allReady && (
          <div style={{
            marginTop: '25px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(56, 142, 60, 0.1))',
            borderRadius: '10px',
            border: '2px solid #4CAF50',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#4CAF50',
              fontSize: '20px',
              marginBottom: '10px',
              fontWeight: '700'
            }}>
              🎉 Ready to Stream!
            </h3>
            <p style={{
              color: '#A5D6A7',
              fontSize: '16px',
              margin: 0
            }}>
              All systems are configured. Start streaming in OBS when ready.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreShowChecklist;