// src/components/OBSControl.js - Fixed import
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import BroadcastList from './BroadcastList';

const OBSControl = () => {
  const [connected, setConnected] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState('');
  const [streamStatus, setStreamStatus] = useState(null);
  const [connectionSettings, setConnectionSettings] = useState({
    address: 'ws://localhost:4455',
    password: ''
  });

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribeConnection = obsWebSocketService.onConnectionChange((isConnected) => {
      setConnected(isConnected);
      if (isConnected) {
        loadScenes();
      }
    });

    // Subscribe to scene changes
    const unsubscribeScene = obsWebSocketService.onSceneChange((sceneName) => {
      setCurrentScene(sceneName);
    });

    // Cleanup
    return () => {
      unsubscribeConnection();
      unsubscribeScene();
    };
  }, []);

  const handleConnect = async () => {
    const success = await obsWebSocketService.connect(
      connectionSettings.address,
      connectionSettings.password
    );
    
    if (success) {
      await loadScenes();
      const status = await obsWebSocketService.getStreamingStatus();
      setStreamStatus(status);
    }
  };

  const handleDisconnect = async () => {
    await obsWebSocketService.disconnect();
    setScenes([]);
    setCurrentScene('');
    setStreamStatus(null);
  };

  const loadScenes = async () => {
    const sceneList = await obsWebSocketService.getSceneList();
    setScenes(sceneList);
    
    const current = await obsWebSocketService.getCurrentScene();
    setCurrentScene(current);
  };

  const handleSceneChange = async (sceneName) => {
    await obsWebSocketService.setCurrentScene(sceneName);
  };

  const handleStartStreaming = async () => {
    await obsWebSocketService.startStreaming();
    setTimeout(async () => {
      const status = await obsWebSocketService.getStreamingStatus();
      setStreamStatus(status);
    }, 1000);
  };

  const handleStopStreaming = async () => {
    await obsWebSocketService.stopStreaming();
    setTimeout(async () => {
      const status = await obsWebSocketService.getStreamingStatus();
      setStreamStatus(status);
    }, 1000);
  };

  const handleStartRecording = async () => {
    await obsWebSocketService.startRecording();
  };

  const handleStopRecording = async () => {
    await obsWebSocketService.stopRecording();
  };

  return (
    <div style={{
      background: 'rgba(50, 50, 50, 0.9)',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px'
    }}>
      <h2 style={{ color: '#9C27B0', marginBottom: '20px' }}>🎛️ OBS Control Panel</h2>
      
      {!connected ? (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: 'white', marginBottom: '15px' }}>Connect to OBS</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', display: 'block', marginBottom: '5px' }}>
              WebSocket Address:
            </label>
            <input
              type="text"
              value={connectionSettings.address}
              onChange={(e) => setConnectionSettings({
                ...connectionSettings,
                address: e.target.value
              })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid #555',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#ccc', display: 'block', marginBottom: '5px' }}>
              Password (optional):
            </label>
            <input
              type="password"
              value={connectionSettings.password}
              onChange={(e) => setConnectionSettings({
                ...connectionSettings,
                password: e.target.value
              })}
              placeholder="Leave blank if no password"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid #555',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
          </div>
          <button 
            onClick={handleConnect}
            style={{
              padding: '12px 24px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Connect to OBS
          </button>
        </div>
      ) : (
        <div>
          <div style={{ 
            marginBottom: '20px',
            padding: '10px',
            background: 'rgba(76, 175, 80, 0.2)',
            borderRadius: '5px'
          }}>
            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>● Connected to OBS</span>
            <button 
              onClick={handleDisconnect}
              style={{
                marginLeft: '15px',
                padding: '5px 15px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>

          {/* Scene Controls */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>Scenes</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '10px' 
            }}>
              {scenes.map((scene) => (
                <button
                  key={scene}
                  onClick={() => handleSceneChange(scene)}
                  style={{
                    padding: '12px 16px',
                    background: currentScene === scene ? '#2196F3' : '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>

          {/* Stream Controls */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>Stream Controls</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleStartStreaming}
                disabled={streamStatus?.streaming}
                style={{
                  padding: '12px 20px',
                  background: streamStatus?.streaming ? '#666' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: streamStatus?.streaming ? 'not-allowed' : 'pointer'
                }}
              >
                Start Streaming
              </button>
              <button
                onClick={handleStopStreaming}
                disabled={!streamStatus?.streaming}
                style={{
                  padding: '12px 20px',
                  background: !streamStatus?.streaming ? '#666' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: !streamStatus?.streaming ? 'not-allowed' : 'pointer'
                }}
              >
                Stop Streaming
              </button>
            </div>
          </div>

          {/* Recording Controls */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>Recording Controls</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleStartRecording}
                style={{
                  padding: '12px 20px',
                  background: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Start Recording
              </button>
              <button
                onClick={handleStopRecording}
                style={{
                  padding: '12px 20px',
                  background: '#795548',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Stop Recording
              </button>
            </div>
          </div>

          {/* Stream Status */}
          {streamStatus && (
            <div style={{
              padding: '15px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: 'white', marginBottom: '10px' }}>Stream Status</h4>
              <p style={{ color: '#ccc', margin: '5px 0' }}>
                Streaming: {streamStatus.streaming ? 'Yes' : 'No'}
              </p>
              <p style={{ color: '#ccc', margin: '5px 0' }}>
                Duration: {Math.floor(streamStatus.duration / 1000)} seconds
              </p>
              <p style={{ color: '#ccc', margin: '5px 0' }}>
                Data sent: {(streamStatus.bytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {/* Broadcast List */}
          <BroadcastList />
        </div>
      )}
    </div>
  );
};

export default OBSControl;