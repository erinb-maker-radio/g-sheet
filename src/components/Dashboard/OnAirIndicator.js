// components/Dashboard/OnAirIndicator.js
import React from 'react';
import { INTERMISSION_CONFIG } from '../../constants/intermissions';

const OnAirIndicator = ({ streamStatus, obsConnected, activeIntermission }) => {
  return (
    <>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1001,
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '15px 25px',
        borderRadius: '15px',
        border: '2px solid #333',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? '#ff0000' : 
                     streamStatus.isStreaming && streamStatus.bytesPerSec === 0 ? '#ffff00' :
                     obsConnected ? '#00ff00' : '#666666',
          boxShadow: streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? 
                     '0 0 20px #ff0000, inset 0 0 10px rgba(255,255,255,0.3)' : 
                     streamStatus.isStreaming && streamStatus.bytesPerSec === 0 ? 
                     '0 0 20px #ffff00, inset 0 0 10px rgba(255,255,255,0.3)' :
                     obsConnected ? '0 0 20px #00ff00, inset 0 0 10px rgba(255,255,255,0.3)' : 
                     'none',
          animation: streamStatus.reconnecting ? 'pulse 1s infinite' : 
                    streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? 'glow 2s ease-in-out infinite' : 
                    'none'
        }} />
        
        <div>
          <div style={{
            fontSize: '20px',
            fontWeight: '900',
            color: streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? '#ff0000' : '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? '0 0 10px #ff0000' : 'none'
          }}>
            {streamStatus.isStreaming && streamStatus.bytesPerSec > 0 ? 'ON AIR' : 
             streamStatus.isStreaming && streamStatus.bytesPerSec === 0 ? 'CONNECTING...' :
             obsConnected ? 'READY' : 'OFFLINE'}
          </div>
          
          {streamStatus.isStreaming && (
            <div style={{ 
              fontSize: '12px', 
              color: '#aaa',
              marginTop: '4px'
            }}>
              {streamStatus.reconnecting && <span style={{ color: '#ffff00' }}>⚠️ Reconnecting... </span>}
              {Math.floor(streamStatus.duration / 1000 / 60)}:{String(Math.floor((streamStatus.duration / 1000) % 60)).padStart(2, '0')} • 
              {streamStatus.bytesPerSec > 0 ? ` ${(streamStatus.bytesPerSec / 1024 / 1024).toFixed(1)} MB/s` : ' No data'}
            </div>
          )}
        </div>
        
        {/* Active Intermission Indicator */}
        {activeIntermission && (
          <div style={{
            background: INTERMISSION_CONFIG.backgroundColor,
            border: `1px solid ${INTERMISSION_CONFIG.borderColor}`,
            padding: '8px 16px',
            borderRadius: '8px',
            color: INTERMISSION_CONFIG.color,
            fontSize: '14px',
            fontWeight: '600',
            animation: 'pulse 2s infinite'
          }}>
            🎭 INTERMISSION
          </div>
        )}
      </div>

      {/* Add CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          
          @keyframes glow {
            0% { box-shadow: 0 0 20px #ff0000, inset 0 0 10px rgba(255,255,255,0.3); }
            50% { box-shadow: 0 0 30px #ff0000, inset 0 0 15px rgba(255,255,255,0.5); }
            100% { box-shadow: 0 0 20px #ff0000, inset 0 0 10px rgba(255,255,255,0.3); }
          }
        `}
      </style>
    </>
  );
};

export default OnAirIndicator;