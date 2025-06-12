// src/components/InterstitialsManager.js
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

  // Create interstitial scenes in OBS
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

      // Create media source for video playback
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Interstitials - Commercial Break',
        inputName: 'Commercial Video Player',
        inputKind: 'ffmpeg_source',
        inputSettings: {
          is_local_file: true,
          looping: true,
          restart_on_activate: true
        }
      });

      // Create text source for "Be Right Back" message
      await obsWebSocketService.obs.call('CreateInput', {
        sceneName: 'Interstitials - Commercial Break',
        inputName: 'Be Right Back Text',
        inputKind: 'text_gdiplus',
        inputSettings: {
          text: 'We\'ll be right back!\nNext performer setting up...',
          font: {
            face: 'Arial',
            size: 48,
            style: 'Bold'
          },
          color: 0xFFFFFFFF,
          outline: true,
          outline_size: 2,
          outline_color: 0xFF000000
        }
      });

      // Create individual scenes for each commercial
      for (const commercial of commercials) {
        const sceneName = `Commercial - ${commercial.name}`;
        
        try {
          await obsWebSocketService.obs.call('CreateScene', { sceneName });
          
          // Add media source for this specific commercial
          await obsWebSocketService.obs.call('CreateInput', {
            sceneName,
            inputName: commercial.name,
            inputKind: 'ffmpeg_source',
            inputSettings: {
              is_local_file: true,
              local_file: `C:/MakerRadio/Commercials/${commercial.file}`, // Update path
              looping: false,
              restart_on_activate: true
            }
          });
        } catch (e) {
          console.log(`Scene ${sceneName} might already exist`);
        }
      }

      alert('Interstitial scenes created successfully!');
    } catch (error) {
      console.error('Error setting up interstitial scenes:', error);
      alert('Error creating interstitial scenes: ' + error.message);
    }
  };

  // Start commercial break
  const startCommercialBreak = async () => {
    if (!obsWebSocketService.connected) {
      alert('OBS not connected');
      return;
    }

    setIsPlaying(true);
    setFadeInProgress(true);

    try {
      // Fade to commercial scene
      await obsWebSocketService.obs.call('SetCurrentProgramScene', {
        sceneName: 'Interstitials - Commercial Break'
      });

      setFadeInProgress(false);

      // Start cycling through enabled commercials
      cycleCommercials();
    } catch (error) {
      console.error('Error starting commercial break:', error);
      setIsPlaying(false);
      setFadeInProgress(false);
    }
  };

  // Cycle through commercials
  const cycleCommercials = async () => {
    const enabledCommercials = commercials.filter(c => c.enabled);
    if (enabledCommercials.length === 0) return;

    let index = 0;
    
    const playNext = async () => {
      if (!isPlaying) return;

      const commercial = enabledCommercials[index % enabledCommercials.length];
      setCurrentCommercial(commercial);

      try {
        // Update the media source with new video
        await obsWebSocketService.obs.call('SetInputSettings', {
          inputName: 'Commercial Video Player',
          inputSettings: {
            local_file: `C:/MakerRadio/Commercials/${commercial.file}`
          }
        });

        // Wait for commercial duration
        setTimeout(() => {
          index++;
          if (isPlaying) {
            playNext();
          }
        }, commercial.duration * 1000);

      } catch (error) {
        console.error('Error playing commercial:', error);
      }
    };

    playNext();
  };

  // End commercial break and return to live
  const endCommercialBreak = async () => {
    setFadeInProgress(true);

    try {
      // Fade back to main performance scene
      await obsWebSocketService.obs.call('SetCurrentProgramScene', {
        sceneName: 'Live Performance'  // Or whatever your main scene is called
      });

      setIsPlaying(false);
      setCurrentCommercial(null);
      setFadeInProgress(false);
    } catch (error) {
      console.error('Error ending commercial break:', error);
      setFadeInProgress(false);
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
          Setup OBS Scenes
        </button>
      </div>

      {/* Commercial Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <button
          onClick={startCommercialBreak}
          disabled={isPlaying || !obsWebSocketService.connected || fadeInProgress}
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
          {fadeInProgress ? 'Fading...' : isPlaying ? 'Commercials Running' : '▶️ Start Commercial Break'}
        </button>
        
        <button
          onClick={endCommercialBreak}
          disabled={!isPlaying || fadeInProgress}
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
          {fadeInProgress ? 'Fading...' : '⏹️ Return to Live'}
        </button>
      </div>

      {/* Current Status */}
      {isPlaying && currentCommercial && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid #4CAF50',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <strong>Now Playing:</strong> {currentCommercial.name} ({currentCommercial.duration}s)
        </div>
      )}

      {/* Commercial List */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <h4 style={{ color: '#FFC107', marginBottom: '10px' }}>
          Available Commercials:
        </h4>
        
        {commercials.map(commercial => (
          <div
            key={commercial.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px',
              borderBottom: '1px solid #444',
              opacity: commercial.enabled ? 1 : 0.5
            }}
          >
            <div style={{ flex: 1 }}>
              <strong style={{ color: commercial.enabled ? 'white' : '#888' }}>
                {commercial.name}
              </strong>
              <span style={{ color: '#888', marginLeft: '10px', fontSize: '14px' }}>
                ({commercial.duration}s)
              </span>
            </div>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={commercial.enabled}
                onChange={() => toggleCommercial(commercial.id)}
                style={{ marginRight: '5px' }}
              />
              <span style={{ fontSize: '14px', color: '#ccc' }}>Enabled</span>
            </label>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '5px',
        fontSize: '12px',
        color: '#aaa'
      }}>
        <strong>Setup Instructions:</strong>
        <ol style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li>Place video files in C:\MakerRadio\Commercials\</li>
          <li>Click "Setup OBS Scenes" to create the scenes</li>
          <li>Enable/disable commercials as needed</li>
          <li>Click "Start Commercial Break" between performers</li>
          <li>System will loop through enabled commercials</li>
          <li>Click "Return to Live" when ready</li>
        </ol>
      </div>
    </div>
  );
};

export default InterstitialsManager;
