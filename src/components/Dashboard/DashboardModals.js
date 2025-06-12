// components/Dashboard/DashboardModals.js
import React from 'react';

export const OBSConnectModal = ({
  showObsConnect,
  obsSettings,
  setObsSettings,
  loading,
  handleObsConnect,
  setShowObsConnect,
  cardStyle,
  buttonStyle,
  secondaryButtonStyle
}) => {
  if (!showObsConnect) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        ...cardStyle,
        width: '450px',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: 'white',
          marginBottom: '30px',
          textTransform: 'uppercase'
        }}>
          🎛️ Connect to OBS
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            color: '#ccc', 
            display: 'block', 
            marginBottom: '10px',
            fontSize: '16px',
            textAlign: 'left'
          }}>
            WebSocket Address:
          </label>
          <input
            type="text"
            value={obsSettings.address}
            onChange={(e) => setObsSettings({ ...obsSettings, address: e.target.value })}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              borderRadius: '10px',
              border: '2px solid #555',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#e91e63';
              e.target.style.boxShadow = '0 0 20px rgba(233, 30, 99, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#555';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <label style={{ 
            color: '#ccc', 
            display: 'block', 
            marginBottom: '10px',
            fontSize: '16px',
            textAlign: 'left'
          }}>
            Password (optional):
          </label>
          <input
            type="password"
            value={obsSettings.password}
            onChange={(e) => setObsSettings({ ...obsSettings, password: e.target.value })}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              borderRadius: '10px',
              border: '2px solid #555',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#e91e63';
              e.target.style.boxShadow = '0 0 20px rgba(233, 30, 99, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#555';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={handleObsConnect}
            disabled={loading}
            style={{
              ...buttonStyle,
              flex: 1,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 35px rgba(233, 30, 99, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 25px rgba(233, 30, 99, 0.3)';
            }}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          
          <button
            onClick={() => setShowObsConnect(false)}
            style={{
              ...secondaryButtonStyle,
              flex: 1
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const YouTubeSignInModal = ({
  showYoutubeLogin,
  loading,
  handleYoutubeSignIn,
  setShowYoutubeLogin,
  cardStyle,
  buttonStyle,
  secondaryButtonStyle
}) => {
  if (!showYoutubeLogin) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        ...cardStyle,
        width: '450px',
        textAlign: 'center'
      }}>
        <h3 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: 'white',
          marginBottom: '20px',
          textTransform: 'uppercase'
        }}>
          📺 Sign in to YouTube
        </h3>
        
        <p style={{ 
          color: '#ccc', 
          marginBottom: '30px',
          fontSize: '16px',
          lineHeight: '1.6'
        }}>
          Sign in with your Google account to manage YouTube broadcasts
        </p>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={handleYoutubeSignIn}
            disabled={loading}
            style={{
              ...buttonStyle,
              flex: 1,
              background: loading ? '#555' : '#FF0000',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 35px rgba(255, 0, 0, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 25px rgba(255, 0, 0, 0.3)';
            }}
          >
            {loading ? 'Signing in...' : '🔐 Sign in with Google'}
          </button>
          
          <button
            onClick={() => setShowYoutubeLogin(false)}
            style={{
              ...secondaryButtonStyle,
              flex: 1
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};