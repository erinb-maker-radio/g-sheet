// components/Dashboard/ConnectionStatusBar.js
import React from 'react';
import { INTERMISSION_CONFIG } from '../../constants/intermissions';

const ConnectionStatusBar = ({
  obsConnected,
  youtubeSignedIn,
  youtubeUser,
  loading,
  performers,
  activeIntermission,
  cardStyle,
  buttonStyle,
  secondaryButtonStyle,
  onObsDisconnect,
  onShowObsConnect,
  onYoutubeSignOut,
  onShowYoutubeLogin,
  onCreateIntermissionScenes,
  onStartIntermission,
  onCreateSongBroadcasts,
  onCreateUpNextScene
}) => {
  return (
    <div style={{
      ...cardStyle,
      padding: '20px 40px',
      marginBottom: '30px',
      display: 'flex',
      gap: '40px',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      {/* OBS Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: obsConnected ? '#4CAF50' : '#f44336',
          boxShadow: obsConnected ? '0 0 15px rgba(76, 175, 80, 0.6)' : '0 0 15px rgba(244, 67, 54, 0.6)'
        }} />
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>OBS</span>
        {obsConnected ? (
          <button
            onClick={onObsDisconnect}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onShowObsConnect}
            style={{
              ...secondaryButtonStyle,
              background: 'linear-gradient(135deg, #2196F3, #1976D2)',
              border: 'none',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 15px 35px rgba(33, 150, 243, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 25px rgba(33, 150, 243, 0.3)';
            }}
          >
            Connect
          </button>
        )}
      </div>

      {/* YouTube Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: youtubeSignedIn ? '#4CAF50' : '#f44336',
          boxShadow: youtubeSignedIn ? '0 0 15px rgba(76, 175, 80, 0.6)' : '0 0 15px rgba(244, 67, 54, 0.6)'
        }} />
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>YouTube</span>
        {youtubeSignedIn ? (
          <>
            <span style={{ color: '#ccc', fontSize: '14px' }}>
              {youtubeUser?.email}
            </span>
            <button
              onClick={onYoutubeSignOut}
              style={secondaryButtonStyle}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={onShowYoutubeLogin}
            style={{
              ...secondaryButtonStyle,
              background: '#FF0000',
              border: 'none',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 15px 35px rgba(255, 0, 0, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 25px rgba(255, 0, 0, 0.3)';
            }}
          >
            Sign In
          </button>
        )}
      </div>

      {/* Sync Button Only */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={() => {
            console.log('Sync button clicked in ConnectionStatusBar');
            onCreateSongBroadcasts();
          }}
          disabled={!youtubeSignedIn || loading}
          style={{
            ...buttonStyle,
            background: loading || !youtubeSignedIn ? '#555' : 'linear-gradient(135deg, #4CAF50, #388E3C)',
            cursor: (!youtubeSignedIn || loading) ? 'not-allowed' : 'pointer',
            opacity: (!youtubeSignedIn || loading) ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (youtubeSignedIn && !loading) {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 15px 35px rgba(76, 175, 80, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 25px rgba(76, 175, 80, 0.3)';
          }}
        >
          {loading ? 'Syncing...' : `🔄 SYNC SIGN UPS TO BROADCAST LIST`}
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatusBar;