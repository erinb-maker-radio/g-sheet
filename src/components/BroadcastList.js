// components/BroadcastList.js
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import { INTERMISSION_CONFIG, isIntermissionSlot } from '../constants/intermissions'; // ADD THIS IMPORT


const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZ9tK06Gp02UxKByceCKpKQSb_Mhs7Bz4OGodz3aeG7406KbweXw1G5Ir7VZZtkqtW/exec';

const BroadcastList = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [sheetData, setSheetData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentScene, setCurrentScene] = useState('');

  // Fetch data from spreadsheet
  const fetchSheetData = async () => {
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      if (data.takenSlots) {
        setSheetData(data.takenSlots);
      }
    } catch (error) {
      console.error('Error fetching sheet data:', error);
    }
  };

  // Load broadcast list from OBS
  const loadBroadcasts = async () => {
    if (!obsWebSocketService.connected) return;
    
    setLoading(true);
    try {
      const broadcastList = await obsWebSocketService.getBroadcastList();
      setBroadcasts(broadcastList);
      
      // Get current scene
      const current = await obsWebSocketService.getCurrentScene();
      setCurrentScene(current);
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all data
  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchSheetData(),
      loadBroadcasts()
    ]);
    setLoading(false);
  };

  // Subscribe to scene changes
  useEffect(() => {
    const unsubscribe = obsWebSocketService.onSceneChange((sceneName) => {
      setCurrentScene(sceneName);
    });

    // Load data when component mounts
    if (obsWebSocketService.connected) {
      refreshAll();
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (obsWebSocketService.connected) {
        refreshAll();
      }
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Switch to a broadcast
  const switchToBroadcast = async (sceneName) => {
    await obsWebSocketService.switchToSongBroadcast(sceneName);
  };

  // Combine OBS broadcasts with sheet data
  const getCombinedData = () => {
    const combined = [];
    
    // Add all broadcasts from OBS
    broadcasts.forEach(broadcast => {
      const sheetMatch = sheetData.find(
        sheet => sheet.timeSlot === broadcast.timeSlot && sheet.artist === broadcast.artist
      );
      combined.push({
        ...broadcast,
        inSheet: !!sheetMatch,
        sheetData: sheetMatch
      });
    });
    
    // Add any sheet entries not in OBS
    sheetData.forEach(sheet => {
      const obsMatch = broadcasts.find(
        b => b.timeSlot === sheet.timeSlot && b.artist === sheet.artist
      );
      if (!obsMatch) {
        combined.push({
          timeSlot: sheet.timeSlot,
          artist: sheet.artist,
          inOBS: false,
          inSheet: true,
          sheetData: sheet
        });
      }
    });
    
    // Sort by time slot
    return combined.sort((a, b) => {
      // Handle missing timeSlot
      if (!a.timeSlot && !b.timeSlot) return 0;
      if (!a.timeSlot) return 1;
      if (!b.timeSlot) return -1;
      
      const timeA = a.timeSlot.replace(':', '');
      const timeB = b.timeSlot.replace(':', '');
      return timeA.localeCompare(timeB);
    });
  };

  const combinedData = getCombinedData();

  return (
    <div style={{
      background: 'rgba(50, 50, 50, 0.9)',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          color: '#2196F3', 
          margin: 0,
          fontSize: '18px',
          fontWeight: '700'
        }}>
          📺 Existing Broadcasts
        </h3>
        <button
          onClick={refreshAll}
          disabled={loading}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '5px 15px',
            borderRadius: '5px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '10px',
        fontSize: '12px'
      }}>
        <span style={{ color: '#4CAF50' }}>● In OBS</span>
        <span style={{ color: '#FFC107' }}>● In Sheets Only</span>
        <span style={{ color: '#2196F3' }}>● Current</span>
      </div>

      {combinedData.length === 0 ? (
        <p style={{ color: '#888', fontSize: '14px', textAlign: 'center' }}>
          No broadcasts configured yet. Submit a performer to create broadcasts.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {combinedData.map((item, index) => {
            const isCurrentScene = item.sceneName && currentScene === item.sceneName;
            const inOBS = item.sceneName !== undefined;
            
            return (
              <div
                key={index}
                style={{
                  background: isCurrentScene ? 'rgba(33, 150, 243, 0.3)' : 
                             !inOBS ? 'rgba(255, 193, 7, 0.1)' : 
                             'rgba(0, 0, 0, 0.3)',
                  border: isCurrentScene ? '2px solid #2196F3' : 
                          !inOBS ? '1px solid #FFC107' :
                          '1px solid #444',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: inOBS ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: inOBS ? 1 : 0.7
                }}
                onClick={() => inOBS && switchToBroadcast(item.sceneName)}
                onMouseEnter={(e) => {
                  if (inOBS && !isCurrentScene) {
                    e.currentTarget.style.background = 'rgba(33, 150, 243, 0.1)';
                    e.currentTarget.style.borderColor = '#666';
                  }
                }}
                onMouseLeave={(e) => {
                  if (inOBS && !isCurrentScene) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                    e.currentTarget.style.borderColor = '#444';
                  }
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ 
                      color: isCurrentScene ? '#2196F3' : 
                             !inOBS ? '#FFC107' :
                             'white',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {item.timeSlot} - {item.artist}
                    </div>
                    <div style={{ 
                      color: '#888',
                      fontSize: '12px',
                      marginTop: '2px'
                    }}>
                      {item.songNumber || (!inOBS ? 'Not in OBS' : 'Performance')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!inOBS && (
                      <span style={{ 
                        color: '#FFC107',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        SHEETS ONLY
                      </span>
                    )}
                    {isCurrentScene && (
                      <span style={{ 
                        color: '#4CAF50',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(33, 150, 243, 0.1)',
        borderRadius: '5px',
        fontSize: '12px',
        color: '#aaa'
      }}>
        💡 <strong>Tip:</strong> This list shows both OBS scenes and Google Sheets entries. 
        Yellow items need to be synced to OBS. Data refreshes every 30 seconds.
      </div>
    </div>
  );
};

export default BroadcastList;