// components/BroadcastManager.js
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import { INTERMISSION_CONFIG, isIntermissionSlot } from '../constants/intermissions';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

const BroadcastManager = ({ currentShow }) => {
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performers from Google Sheets with better data handling
  const fetchPerformers = async () => {
    setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      
      console.log('Raw data from Google Sheets:', data);
      
      if (data.takenSlots) {
        // Normalize the data to ensure consistent structure
        const normalizedPerformers = data.takenSlots.map((slot, index) => {
          // If we get a string, convert to object
          if (typeof slot === 'string') {
            return {
              timeSlot: slot,
              artist: `Performer ${index + 1}`,
              songs: []
            };
          }
          
          // If we get an object, ensure all fields exist
          return {
            timeSlot: slot.timeSlot || '',
            artist: slot.artist || `Performer ${index + 1}`,
            songs: Array.isArray(slot.songs) ? slot.songs.map(song => ({
              title: song?.title || '',
              writer: song?.writer || ''
            })) : [],
            email: slot.email || ''
          };
        }).filter(slot => slot.timeSlot); // Only keep entries with a time slot
        
        console.log('Normalized performers:', normalizedPerformers);
        setPerformers(normalizedPerformers);
        setLastUpdate(new Date());
      } else {
        setPerformers([]);
      }
    } catch (err) {
      console.error('Error fetching performers:', err);
      setPerformers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and set up auto-refresh
  useEffect(() => {
    fetchPerformers();

    const interval = autoRefresh ? setInterval(fetchPerformers, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Sync all performers to OBS with better error handling
  const syncAllToOBS = async () => {
    if (!obsWebSocketService.connected) {
      alert('Please connect to OBS first!');
      return;
    }

    if (performers.length === 0) {
      alert('No performers to sync');
      return;
    }

    console.log('Starting sync with performers:', performers);

    setLoading(true);
    let successCount = 0;
    let errorMessages = [];

    try {
      const currentEpisode = getEpisodeNumber();

      for (let i = 0; i < performers.length; i++) {
        const performer = performers[i];
        console.log(`Processing performer ${i}:`, performer);
        
        try {
          // Validate minimum required data
          if (!performer.timeSlot) {
            errorMessages.push(`Performer ${i}: Missing time slot`);
            continue;
          }

          // Use artist name or default
          const artistName = performer.artist || `TBD (${performer.timeSlot})`;

          // If no songs, create placeholder
          let songs = performer.songs && performer.songs.length > 0 
            ? performer.songs 
            : [{ title: 'Performance', writer: '' }];

          // Filter out empty songs but ensure at least one
          songs = songs.filter(s => s && (s.title || '').trim());
          if (songs.length === 0) {
            songs = [{ title: 'Performance', writer: '' }];
          }

          console.log(`Creating broadcasts for ${artistName} at ${performer.timeSlot}`);
          
          const result = await obsWebSocketService.createSongBroadcasts(
            artistName,
            performer.timeSlot,
            songs,
            currentEpisode
          );
          
          if (result && result.length > 0) {
            successCount++;
          }
        } catch (error) {
          console.error(`Error creating broadcast for performer ${i}:`, error);
          errorMessages.push(`${performer.artist || 'Performer ' + i}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        alert(`Successfully created broadcasts for ${successCount} of ${performers.length} performers!`);
        window.dispatchEvent(new Event('obs-broadcasts-updated'));
      } else if (errorMessages.length > 0) {
        alert(`Failed to create broadcasts. Errors:\n${errorMessages.join('\n')}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Error syncing to OBS: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get current episode number
  const getEpisodeNumber = () => {
    const baseDate = new Date('2025-05-31');
    const baseEpisode = 122;
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - baseDate) / (7 * 24 * 60 * 60 * 1000));
    const weeksDiff = Math.floor(daysDiff / 7);
    return baseEpisode + weeksDiff;
  };

  // Format date
  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div style={{
      background: 'rgba(60, 60, 60, 0.9)',
      padding: '20px',
      borderRadius: '10px',
      marginTop: '20px',
      border: '1px solid #444'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          color: '#e91e63', 
          margin: 0,
          fontSize: '20px',
          fontWeight: '700'
        }}>
          📡 Broadcast Manager
        </h3>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontSize: '12px',
            color: '#ccc'
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          
          <button
            onClick={fetchPerformers}
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
            {loading ? '...' : '🔄'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <p style={{ color: '#ccc', marginBottom: '10px' }}>
          <strong>Show:</strong> What Is Art? - Episode #{getEpisodeNumber()}, {formatDate()}
        </p>
        <p style={{ color: '#ccc', marginBottom: '10px' }}>
          <strong>Performers Registered:</strong> {performers.length}
        </p>
        {lastUpdate && (
          <p style={{ color: '#888', fontSize: '12px' }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {obsWebSocketService.connected && performers.length > 0 && (
        <button
          onClick={() => {
            alert(`About to create broadcasts for ${performers.length} performers`);
            syncAllToOBS();
          }}
          disabled={loading}
          style={{
            background: loading ? '#666' : 'linear-gradient(135deg, #2196F3, #1976D2)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%',
            marginBottom: '15px'
          }}
        >
          {loading ? 'Working...' : `🔄 Create All ${performers.length} Broadcasts in OBS`}
        </button>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        background: 'rgba(0,0,0,0.3)', 
        borderRadius: '8px' 
      }}>
        <h4 style={{ color: '#FFC107', marginBottom: '10px' }}>
          📋 Current Lineup:
        </h4>
        {loading && performers.length === 0 ? (
          <p style={{ color: '#888', fontSize: '14px' }}>Loading...</p>
        ) : performers.length > 0 ? (
          <div style={{ 
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {performers.map((performer, index) => (
              <div key={index} style={{ 
                color: '#fff', 
                padding: '12px',
                borderBottom: '1px solid #333',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.05)',
                marginBottom: '8px',
                borderRadius: '6px'
              }}>
                <div>
                  <strong style={{ color: '#2196F3', fontSize: '16px' }}>
                    {performer.timeSlot}
                  </strong>
                  <span style={{ marginLeft: '15px', fontSize: '16px' }}>
                    {performer.artist || 'TBD'}
                  </span>
                  {performer.songs && performer.songs.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#aaa' }}>
                      {performer.songs.filter(s => s && s.title).map((s, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {s.title}
                          {s.writer && ` (by ${s.writer})`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {obsWebSocketService.connected && (
                  <button
                    onClick={async () => {
                      console.log('Individual Create button clicked for:', performer.artist);
                      setLoading(true);
                      try {
                        const ep = getEpisodeNumber();
                        const artistName = performer.artist || `TBD (${performer.timeSlot})`;
                        let songs = performer.songs && performer.songs.length > 0 
                          ? performer.songs.filter(s => s && s.title) 
                          : [{ title: 'Performance', writer: '' }];
                        
                        if (songs.length === 0) {
                          songs = [{ title: 'Performance', writer: '' }];
                        }
                        
                        console.log('Creating broadcasts with:', {
                          artist: artistName,
                          timeSlot: performer.timeSlot,
                          episode: ep,
                          songs: songs
                        });
                        
                        const result = await obsWebSocketService.createSongBroadcasts(
                          artistName,
                          performer.timeSlot,
                          songs,
                          ep
                        );
                        
                        console.log('Create result:', result);
                        alert(`Created broadcasts for ${artistName}`);
                        
                        window.dispatchEvent(new Event('obs-broadcasts-updated'));
                      } catch (error) {
                        console.error('Error creating broadcast:', error);
                        alert(`Error: ${error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '6px 16px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Create in OBS
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '14px' }}>
            No performers registered yet. 
            <br />
            <span style={{ fontSize: '12px' }}>
              Performers will appear here when they register through the form or are added to the spreadsheet.
            </span>
          </p>
        )}
      </div>

      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        background: 'rgba(33, 150, 243, 0.1)', 
        borderRadius: '5px',
        fontSize: '12px',
        color: '#ccc'
      }}>
        <strong>ℹ️ Info:</strong> This list automatically syncs with your Google Sheets every 30 seconds. 
        You can add performers directly to the spreadsheet with just an artist name and time slot.
      </div>
    </div>
  );
};

export default BroadcastManager;