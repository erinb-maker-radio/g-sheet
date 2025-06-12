// components/Dashboard/BroadcastItem.js
import React, { useState } from 'react';
import { INTERMISSION_CONFIG } from '../../constants/intermissions';
import youtubeService from '../../services/youtubeService';
import lowerThirdsService from '../../services/lowerThirdsService';

const BroadcastItem = ({
  broadcast,
  isLive,
  isIntermissionBroadcast,
  obsConnected,
  loading,
  secondaryButtonStyle,
  onStartBroadcast,
  onEndStreamWithTransition,
  onStopBroadcast,
  onArchiveBroadcast,
  onDeleteBroadcast
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const status = broadcast.status.lifeCycleStatus;

  // Enhanced start function with automatic lower thirds sync
  const handleStartWithLowerThirds = async () => {
    setIsStarting(true);
    
    try {
      // First, get the broadcast details from YouTube
      const details = await youtubeService.getBroadcastDetails(broadcast.id);
      
      if (details.success && details.parsedData) {
        // Update lower thirds with the parsed data from YouTube
        await lowerThirdsService.updatePerformer({
          artist: details.parsedData.artist,
          songTitle: details.parsedData.songTitle,
          songWriter: details.parsedData.writer,
          timeSlot: details.parsedData.timeSlot || '',
          isIntermission: false
        });
        
        console.log('Lower thirds updated from YouTube broadcast data:', details.parsedData);
      } else {
        console.warn('Could not parse broadcast data for lower thirds');
      }
      
      // Now call the original start broadcast function
      await onStartBroadcast(broadcast.id);
      
    } catch (error) {
      console.error('Error starting broadcast with lower thirds:', error);
      alert('Error starting broadcast: ' + error.message);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div
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
            color: status === 'live' ? '#4CAF50' : 
                   status === 'ready' ? '#2196F3' : 
                   '#FFC107',
            fontWeight: '600'
          }}>
            {status.toUpperCase()}
          </span></span>
          <span>Privacy: {broadcast.status.privacyStatus}</span>
          <span>Created: {new Date(broadcast.snippet.publishedAt).toLocaleString()}</span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {!isLive && status !== 'complete' && (
          <button
            onClick={handleStartWithLowerThirds}
            disabled={!obsConnected || isStarting}
            style={{
              ...secondaryButtonStyle,
              background: !obsConnected || isStarting ? '#555' : 
                         isIntermissionBroadcast ? INTERMISSION_CONFIG.color :
                         'linear-gradient(135deg, #4CAF50, #388E3C)',
              border: 'none',
              opacity: !obsConnected || isStarting ? 0.6 : 1,
              cursor: !obsConnected || isStarting ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (obsConnected && !isStarting) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(76, 175, 80, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {isStarting ? '🔄 Starting...' : '▶️ Start'}
          </button>
        )}
        
        {isLive && (
          <>
            <button
              onClick={() => onEndStreamWithTransition(broadcast.id, broadcast.snippet.title)}
              style={{
                ...secondaryButtonStyle,
                background: 'linear-gradient(135deg, #9C27B0, #673AB7)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(156, 39, 176, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              ⏸️ End Stream
            </button>
            
            <button
              onClick={onStopBroadcast}
              style={{
                ...secondaryButtonStyle,
                background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(255, 152, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              ⏹️ Stop
            </button>
          </>
        )}
        
        {status === 'complete' && (
          <button
            onClick={() => onArchiveBroadcast(broadcast.id)}
            style={{
              ...secondaryButtonStyle,
              background: 'linear-gradient(135deg, #607D8B, #455A64)',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 20px rgba(96, 125, 139, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            📦 Archive
          </button>
        )}
        
        <button
          onClick={() => onDeleteBroadcast(broadcast.id, status)}
          disabled={loading || (status !== 'created' && status !== 'ready')}
          style={{
            ...secondaryButtonStyle,
            background: loading || (status !== 'created' && status !== 'ready') ? '#555' : 'linear-gradient(135deg, #f44336, #d32f2f)',
            border: 'none',
            opacity: loading || (status !== 'created' && status !== 'ready') ? 0.6 : 1,
            cursor: loading || (status !== 'created' && status !== 'ready') ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!loading && (status === 'created' || status === 'ready')) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 20px rgba(244, 67, 54, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🗑️ Delete
        </button>
        
        <a
          href={`https://www.youtube.com/watch?v=${broadcast.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...secondaryButtonStyle,
            background: '#FF0000',
            border: 'none',
            color: 'white',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 20px rgba(255, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          View
        </a>
      </div>
    </div>
  );
};

export default BroadcastItem;