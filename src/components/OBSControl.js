// src/components/OBSControl.js

import BroadcastList from './BroadcastList';

import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';

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
    <div className="obs-control-panel" style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
      <h2>OBS Control Panel</h2>
      
      {!connected ? (
        <div className="connection-form">
          <h3>Connect to OBS</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>
              WebSocket Address:
              <input
                type="text"
                value={connectionSettings.address}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  address: e.target.value
                })}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Password:
              <input
                type="password"
                value={connectionSettings.password}
                onChange={(e) => setConnectionSettings({
                  ...connectionSettings,
                  password: e.target.value
                })}
                placeholder="Optional"
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </label>
          </div>
          <button 
            onClick={handleConnect}
            style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Connect to OBS
          </button>
        </div>
      ) : (
        <div className="obs-controls">
          <div style={{ marginBottom: '20px' }}>
            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>● Connected to OBS</span>
            <button 
              onClick={handleDisconnect}
              style={{ marginLeft: '10px', padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Disconnect
            </button>
          </div>

          <div className="scene-controls" style={{ marginBottom: '20px' }}>
            <h3>Scenes</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {scenes.map((scene) => (
                <button
                  key={scene}
                  onClick={() => handleSceneChange(scene)}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: currentScene === scene ? '#2196F3' : '#e0e0e0',
                    color: currentScene === scene ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {scene}
                </button>
              ))}
            </div>
          </div>

          <div className="stream-controls" style={{ marginBottom: '20px' }}>
            <h3>Stream Controls</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleStartStreaming}
                disabled={streamStatus?.streaming}
                style={{
                  padding: '10px 20px',
                  backgroundColor: streamStatus?.streaming ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: streamStatus?.streaming ? 'not-allowed' : 'pointer'
                }}
              >
                Start Streaming
              </button>
              <button
                onClick={handleStopStreaming}
                disabled={!streamStatus?.streaming}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !streamStatus?.streaming ? '#ccc' : '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !streamStatus?.streaming ? 'not-allowed' : 'pointer'
                }}
              >
                Stop Streaming
              </button>
            </div>
          </div>

          <div className="recording-controls">
            <h3>Recording Controls</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleStartRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Start Recording
              </button>
              <button
                onClick={handleStopRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#795548',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Stop Recording
              </button>
            </div>
          </div>

          {streamStatus && (
            <div className="stream-status" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
              <h4>Stream Status</h4>
              <p>Streaming: {streamStatus.streaming ? 'Yes' : 'No'}</p>
              <p>Duration: {Math.floor(streamStatus.duration / 1000)} seconds</p>
              <p>Data sent: {(streamStatus.bytes / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

{/* Add Broadcast List */}
<BroadcastList />

        </div>
      )}
    </div>
  );
};

export default OBSControl;