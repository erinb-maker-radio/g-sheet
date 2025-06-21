// src/components/InterstitialsManager.js - Fixed for OBS compatibility
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';

const InterstitialsManager = () => {
  const [commercials, setCommercials] = useState([
    { id: 1, name: 'Get a Snack!', file: 'get-a-snack.mp4', duration: 30, enabled: true },
    { id: 2, name: 'Volunteer with Maker Radio', file: 'volunteer-mr.mp4', duration: 45, enabled: true },
    { id: 3, name: 'Follow us on YouTube', file: 'follow-youtube-qr.mp4', duration: 20, enabled: true },
    { id: 4, name: 'Follow us on Instagram', file: 'follow-ig-qr.mp4', duration: 20, enabled: true },
    { id: 5, name: 'Follow us on Facebook', file: 'follow-fb-qr.mp4', duration: 20, enabled: true },
    { id: 6, name: 'Upcoming Events', file: 'upcoming-events.mp4', duration: 60, enabled: true }
  ]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCommercial, setCurrentCommercial] = useState(null);
  const [fadeInProgress, setFadeInProgress] = useState(false);

  // Create interstitial scenes in OBS - FIXED VERSION
  const setupInterstitialScenes = async () => {
    if (!obsWebSocketService.connected) {
      alert('Please connect to OBS first');
      return;
    }

    try {
      // Create main interstitial scene
      await obsWebSocketService.obs.call('CreateScene', { 
        sceneName: 'Interstitials - Commercial Break' 
      });

      // Create media source for video playback - FIXED INPUT KIND
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Interstitials - Commercial Break',
        inputName: 'Commercial Video Player',
        inputKind: 'vlc_source', // Changed from 'ffmpeg_source' to 'vlc_source'
        inputSettings: {
          playlist: [],
          loop: true,
          network_caching: 400
        }
      });

      // Create text source for "Be Right Back" message - FIXED INPUT KIND
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Interstitials - Commercial Break',
        inputName: 'Be Right Back Text',
        inputKind: 'text_gdiplus_v2', // Updated to v2
        inputSettings: {
          text: 'We\'ll be right back!\nNext performer setting up...',
          font: {
            face: 'Arial',
            size: 48,
            flags: 1 // Bold
          },
          color: 0xFFFFFFFF,
          outline: true,
          outline_size: 2,
          outline_color: 0xFF000000
        }
      });

      // Create color source for background
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Interstitials - Commercial Break',
        inputName: 'Background Color',
        inputKind: 'color_source_v3',
        inputSettings: {
          color: 0xFF000000, // Black background
          width: 1920,
          height: 1080
        }
      });

      alert('Interstitial scenes created successfully!');
    } catch (error) {
      console.error('Error setting up interstitial scenes:', error);
      
      // More helpful error message
      if (error.message && error.message.includes('input kind')) {
        alert(`Error: The input type is not supported by your OBS version. 
        
Please check:
1. OBS Studio is updated to latest version
2. Required plugins are installed
3. WebSocket plugin is up to date

Error: ${error.message}`);
      } else {
        alert('Error creating interstitial scenes: ' + error.message);
      }
    }
  };

  // Alternative setup with basic sources only
  const setupBasicScenes = async () => {
    if (!obsWebSocketService.connected) {
      alert('Please connect to OBS first');
      return;
    }

    try {
      // Create main interstitial scene
      await obsWebSocketService.obs.call('CreateScene', { 
        sceneName: 'Basic Intermission' 
      });

      // Just create a text source - most compatible
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Basic Intermission',
        inputName: 'Intermission Text',
        inputKind: 'text_gdiplus_v2',
        inputSettings: {
          text: '🎭 INTERMISSION 🎭\n\nWe\'ll be right back!\n\nGrab a snack, stretch your legs,\nand get ready for more amazing performances!',
          font: {
            face: 'Arial',
            size: 72,
            flags: 1 // Bold
          },
          color: 0xFFFFFFFF,
          outline: true,
          outline_size: 3,
          outline_color: 0xFF000000,
          align: 'center',
          valign: 'center'
        }
      });

      // Create a simple colored background
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Basic Intermission',
        inputName: 'Intermission Background',
        inputKind: 'color_source_v3',
        inputSettings: {
          color: 0xFF2C2C2C, // Dark gray
          width: 1920,
          height: 1080
        }
      });

      alert('Basic intermission scene created successfully!');
    } catch (error) {
      console.error('Error setting up basic scenes:', error);
      alert('Error creating basic scenes: ' + error.message);
    }
  };

  // Start commercial break - simplified
  const startCommercialBreak = async () => {
    if (!obsWebSocketService.connected) {
      alert('OBS not connected');
      return;
    }

    try {
      // Try to switch to the intermission scene
      const scenes = await obsWebSocketService.getSceneList();
      
      if (scenes.includes('Basic Intermission')) {
        await obsWebSocketService.setCurrentScene('Basic Intermission');
        setIsPlaying(true);
        alert('Switched to intermission scene');
      } else if (scenes.includes('Interstitials - Commercial Break')) {
        await obsWebSocketService.setCurrentScene('Interstitials - Commercial Break');
        setIsPlaying(true);
        alert('Switched to commercial break scene');
      } else {
        alert('No intermission scene found. Please create scenes first.');
      }
    } catch (error) {
      console.error('Error starting commercial break:', error);
      alert('Error starting commercial break: ' + error.message);
    }
  };

  // End commercial break and return to live
  const endCommercialBreak = async () => {
    try {
      // Get available scenes and let user choose
      const scenes = await obsWebSocketService.getSceneList();
      
      // Look for a likely "live" scene
      const liveScene = scenes.find(scene => 
        scene.toLowerCase().includes('live') || 
        scene.toLowerCase().includes('main') ||
        scene.toLowerCase().includes('performance')
      );
      
      if (liveScene) {
        await obsWebSocketService.setCurrentScene(liveScene);
        setIsPlaying(false);
        setCurrentCommercial(null);
        alert(`Returned to ${liveScene}`);
      } else {
        // Just switch to the first available scene
        if (scenes.length > 0) {
          await obsWebSocketService.setCurrentScene(scenes[0]);
          setIsPlaying(false);
          setCurrentCommercial(null);
          alert(`Switched to ${scenes[0]}`);
        }
      }
    } catch (error) {
      console.error('Error ending commercial break:', error);
      alert('Error returning to live: ' + error.message);
      setIsPlaying(false);
    }
  };

  // Toggle commercial enabled status
  const toggleCommercial = (id) => {
    setCommercials(commercials.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    ));
  };

  return (
    <div style={{
      background: 'rgba(60, 60, 60, 0.9)',
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
        <h3 style={{ color: '#FFC107', margin: 0 }}>
          📺 Commercial Break Manager
        </h3>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={setupBasicScenes}
            disabled={!obsWebSocketService.connected}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: obsWebSocketService.connected ? 'pointer' : 'not-allowed'
            }}
          >
            Setup Basic Scene
          </button>
          
          <button
            onClick={setupInterstitialScenes}
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
            Setup Advanced Scenes
          </button>
        </div>
      </div>

      {/* Commercial Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <button
          onClick={startCommercialBreak}
          disabled={isPlaying || !obsWebSocketService.connected}
          style={{
            flex: 1,
            background: isPlaying ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isPlaying || !obsWebSocketService.connected ? 'not-allowed' : 'pointer'
          }}
        >
          {isPlaying ? 'Intermission Active' : '▶️ Start Intermission'}
        </button>
        
        <button
          onClick={endCommercialBreak}
          disabled={!isPlaying}
          style={{
            flex: 1,
            background: !isPlaying ? '#666' : '#f44336',
            color: 'white',
            border: 'none',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !isPlaying ? 'not-allowed' : 'pointer'
          }}
        >
          ⏹️ Return to Live
        </button>
      </div>

      {/* Current Status */}
      {isPlaying && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid #4CAF50',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <strong style={{ color: '#4CAF50' }}>
            🎭 INTERMISSION ACTIVE
          </strong>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '15px',
        padding: '15px',
        background: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '5px',
        fontSize: '12px',
        color: '#aaa'
      }}>
        <strong>📋 Instructions:</strong>
        <ol style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li><strong>Basic Scene:</strong> Creates a simple intermission screen with text</li>
          <li><strong>Advanced Scenes:</strong> Attempts to create video playback (may fail on some OBS versions)</li>
          <li>Use "Start Intermission" to switch to the intermission scene</li>
          <li>Use "Return to Live" to switch back to your main scene</li>
          <li>Make sure OBS is connected first!</li>
        </ol>
        
        <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '3px' }}>
          <strong>⚠️ If you get errors:</strong> Use "Setup Basic Scene" instead. Some OBS versions have different input type names.
        </div>
      </div>
    </div>
  );
};

export default InterstitialsManager;