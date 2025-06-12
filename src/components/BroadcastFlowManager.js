// src/components/BroadcastFlowManager.js
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import youtubeService from '../services/youtubeService';

const BroadcastFlowManager = ({ performers = [] }) => {
  const [masterBroadcast, setMasterBroadcast] = useState(null);
  const [songBroadcasts, setSongBroadcasts] = useState([]);
  const [currentPerformerIndex, setCurrentPerformerIndex] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [broadcastStatus, setBroadcastStatus] = useState('idle'); // idle, live, commercial
  const [isStreaming, setIsStreaming] = useState(false);

  // Get episode info
  const getEpisodeNumber = () => {
    const baseDate = new Date('2025-05-22');
    const baseEpisode = 120;
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - baseDate) / (1000 * 60 * 60 * 24));
    const currentDayOfWeek = currentDate.getDay();
    const adjustedDaysDiff = daysDiff + (currentDayOfWeek >= 5 ? 0 : -7);
    const weeksDiff = Math.floor(adjustedDaysDiff / 7);
    return baseEpisode + weeksDiff;
  };

  // Create master broadcast setup in OBS
  const setupMasterBroadcast = async () => {
    if (!obsWebSocketService.connected) {
      alert('Please connect to OBS first');
      return;
    }

    try {
      // Create master scenes
      const masterScenes = [
        'Master - Live Show',
        'Master - Opening',
        'Master - Closing',
        'Master - Technical Difficulties'
      ];

      for (const sceneName of masterScenes) {
        try {
          await obsWebSocketService.obs.call('CreateScene', { sceneName });
        } catch (e) {
          console.log(`Scene ${sceneName} might already exist`);
        }
      }

      // Create nested scene source in master
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Master - Live Show',
        inputName: 'Current Performance',
        inputKind: 'scene',
        inputSettings: {
          // This will show whatever scene is currently active
        }
      });

      alert('Master broadcast scenes created!');
    } catch (error) {
      console.error('Error setting up master broadcast:', error);
    }
  };

  // Start the full show broadcast
  const startShowBroadcast = async () => {
    if (!obsWebSocketService.connected || !youtubeService.isSignedIn) {
      alert('Please connect to OBS and sign in to YouTube');
      return;
    }

    try {
      // Switch to opening scene
      await obsWebSocketService.setCurrentScene('Master - Opening');
      
      // Start streaming to the master broadcast
      if (masterBroadcast && masterBroadcast.streamKey) {
        // Configure stream settings for master broadcast
        await obsWebSocketService.obs.call('SetStreamServiceSettings', {
          streamServiceType: 'rtmp_custom',
          streamServiceSettings: {
            server: 'rtmp://a.rtmp.youtube.com/live2',
            key: masterBroadcast.streamKey
          }
        });
        
        // Start streaming
        await obsWebSocketService.startStreaming();
        setIsStreaming(true);
        setBroadcastStatus('live');
      }
    } catch (error) {
      console.error('Error starting show broadcast:', error);
    }
  };

  // Switch to next performer
  const nextPerformer = async () => {
    if (currentPerformerIndex >= performers.length - 1) {
      // Show is ending
      await endShow();
      return;
    }

    // Start commercial break
    setBroadcastStatus('commercial');
    await obsWebSocketService.setCurrentScene('Interstitials - Commercial Break');

    // Update indices
    setCurrentPerformerIndex(currentPerformerIndex + 1);
    setCurrentSongIndex(0);
  };

  // Go live with current performer
  const goLiveWithPerformer = async () => {
    const performer = performers[currentPerformerIndex];
    if (!performer) return;

    try {
      // Switch to performer's scene
      const sceneName = `${performer.timeSlot} - ${performer.artist} - Song 1`;
      await obsWebSocketService.setCurrentScene(sceneName);
      
      // If we have individual song broadcasts, update YouTube
      if (songBroadcasts.length > 0) {
        const songBroadcast = songBroadcasts.find(
          b => b.performer === performer.artist && b.songIndex === 1
        );
        
        if (songBroadcast) {
          // Update stream key for this song
          await obsWebSocketService.obs.call('SetStreamServiceSettings', {
            streamServiceType: 'rtmp_custom',
            streamServiceSettings: {
              server: 'rtmp://a.rtmp.youtube.com/live2',
              key: songBroadcast.streamKey
            }
          });
        }
      }
      
      setBroadcastStatus('live');
    } catch (error) {
      console.error('Error going live with performer:', error);
    }
  };

  // Switch to next song
  const nextSong = async () => {
    const performer = performers[currentPerformerIndex];
    const songs = performer.songs || [];
    
    if (currentSongIndex >= songs.length - 1) {
      // This performer is done, go to next
      await nextPerformer();
      return;
    }

    const nextIndex = currentSongIndex + 1;
    setCurrentSongIndex(nextIndex);

    // Switch scene
    const sceneName = `${performer.timeSlot} - ${performer.artist} - Song ${nextIndex + 1}`;
    await obsWebSocketService.setCurrentScene(sceneName);
  };

  // End the show
  const endShow = async () => {
    try {
      // Switch to closing scene
      await obsWebSocketService.setCurrentScene('Master - Closing');
      
      // Wait a bit then stop streaming
      setTimeout(async () => {
        await obsWebSocketService.stopStreaming();
        setIsStreaming(false);
        setBroadcastStatus('idle');
      }, 30000); // 30 seconds for closing
    } catch (error) {
      console.error('Error ending show:', error);
    }
  };

  // Get current performer info
  const getCurrentPerformer = () => {
    return performers[currentPerformerIndex] || null;
  };

  return (
    <div style={{
      background: 'rgba(50, 50, 50, 0.9)',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#9C27B0', margin: 0 }}>
          🎭 Show Flow Controller
        </h3>
        
        <button
          onClick={setupMasterBroadcast}
          disabled={!obsWebSocketService.connected}
          style={{
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: obsWebSocketService.connected ? 'pointer' : 'not-allowed'
          }}
        >
          Setup Master Scenes
        </button>
      </div>

      {/* Broadcast Status */}
      <div style={{
        background: broadcastStatus === 'live' ? 'rgba(76, 175, 80, 0.2)' : 
                   broadcastStatus === 'commercial' ? 'rgba(255, 193, 7, 0.2)' :
                   'rgba(96, 96, 96, 0.2)',
        border: `1px solid ${broadcastStatus === 'live' ? '#4CAF50' : 
                             broadcastStatus === 'commercial' ? '#FFC107' : '#666'}`,
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>
          Broadcast Status: {broadcastStatus.toUpperCase()}
        </h4>
        {isStreaming && (
          <div style={{ color: '#4CAF50' }}>
            🔴 STREAMING LIVE
          </div>
        )}
      </div>

      {/* Current Performer */}
      {getCurrentPerformer() && (
        <div style={{
          background: 'rgba(33, 150, 243, 0.2)',
          border: '1px solid #2196F3',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#2196F3', margin: '0 0 10px 0' }}>
            Current Performer:
          </h4>
          <div style={{ fontSize: '18px', color: 'white' }}>
            {getCurrentPerformer().timeSlot} - {getCurrentPerformer().artist}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>
            Song {currentSongIndex + 1} of {getCurrentPerformer().songs?.length || 1}
          </div>
        </div>
      )}

      {/* Show Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={startShowBroadcast}
          disabled={isStreaming || !obsWebSocketService.connected}
          style={{
            background: isStreaming ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isStreaming || !obsWebSocketService.connected ? 'not-allowed' : 'pointer'
          }}
        >
          🎬 Start Show
        </button>
        
        <button
          onClick={endShow}
          disabled={!isStreaming}
          style={{
            background: !isStreaming ? '#666' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          🏁 End Show
        </button>
      </div>

      {/* Performance Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <button
          onClick={goLiveWithPerformer}
          disabled={broadcastStatus !== 'commercial'}
          style={{
            background: broadcastStatus !== 'commercial' ? '#666' : '#2196F3',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: broadcastStatus !== 'commercial' ? 'not-allowed' : 'pointer'
          }}
        >
          🎤 Go Live
        </button>
        
        <button
          onClick={nextSong}
          disabled={broadcastStatus !== 'live'}
          style={{
            background: broadcastStatus !== 'live' ? '#666' : '#FF9800',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: broadcastStatus !== 'live' ? 'not-allowed' : 'pointer'
          }}
        >
          ⏭️ Next Song
        </button>
        
        <button
          onClick={nextPerformer}
          disabled={broadcastStatus !== 'live'}
          style={{
            background: broadcastStatus !== 'live' ? '#666' : '#9C27B0',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: broadcastStatus !== 'live' ? 'not-allowed' : 'pointer'
          }}
        >
          ⏭️ Next Performer
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(156, 39, 176, 0.1)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#ccc'
      }}>
        <strong>📋 Show Flow:</strong>
        <ol style={{ marginTop: '10px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>Create master broadcast on YouTube (full show)</li>
          <li>Create individual song broadcasts</li>
          <li>Click "Start Show" to begin streaming</li>
          <li>Use "Go Live" after commercials to start performer</li>
          <li>Use "Next Song" to move through their set</li>
          <li>Use "Next Performer" to trigger commercial break</li>
          <li>System auto-switches between live and commercials</li>
        </ol>
      </div>
    </div>
  );
};

export default BroadcastFlowManager;