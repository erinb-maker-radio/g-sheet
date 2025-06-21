// src/components/SimplifiedStaffDashboard.js - Complete Working Version
import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import youtubeService from '../services/youtubeService';
import { logoutStaff } from '../utils/staffAuth';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

const SimplifiedStaffDashboard = ({ onLogout }) => {
  // Core state
  const [performers, setPerformers] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [obsConnected, setObsConnected] = useState(false);
  const [youtubeSignedIn, setYoutubeSignedIn] = useState(false);
  const [streamingBroadcastId, setStreamingBroadcastId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Get episode number
  const getEpisodeNumber = () => {
    const baseDate = new Date('2025-05-22');
    const baseEpisode = 120;
    const currentDate = new Date();
    const weeksDiff = Math.floor((currentDate - baseDate) / (7 * 24 * 60 * 60 * 1000));
    return baseEpisode + weeksDiff;
  };

  // Load ALL broadcasts (including old ones) - SORTED BY DATE
  const loadAllBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    try {
      setLoading(true);
      const result = await youtubeService.listBroadcasts(50);
      if (result.success) {
        // Sort broadcasts by creation date - NEWEST FIRST
        const sortedBroadcasts = result.broadcasts.sort((a, b) => {
          const dateA = new Date(a.snippet.publishedAt);
          const dateB = new Date(b.snippet.publishedAt);
          return dateB - dateA; // Newest first (descending order)
        });
        
        setBroadcasts(sortedBroadcasts);
        setStatus(`Loaded ALL ${result.broadcasts.length} broadcasts (sorted by date, newest first)`);
      }
    } catch (error) {
      console.error('Error loading all broadcasts:', error);
      setStatus('Error loading all broadcasts');
    } finally {
      setLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeServices();
    fetchPerformers();
    
    // Set up OBS connection listener
    const unsubscribe = obsWebSocketService.onConnectionChange(setObsConnected);
    return unsubscribe;
  }, []);

  // Initialize services - REMOVED (now inline in useEffect)

  // Fetch performers from Google Sheets
  const fetchPerformers = async () => {
    try {
      setLoading(true);
      const response = await fetch(SCRIPT_URL + "?query=slots");
      const data = await response.json();
      
      if (data.takenSlots) {
        // Normalize data format
        const normalizedPerformers = data.takenSlots.map((slot, index) => {
          if (typeof slot === 'string') {
            return { timeSlot: slot, artist: `Performer ${index + 1}`, songs: [] };
          }
          return {
            timeSlot: slot.timeSlot || '',
            artist: slot.artist || `Performer ${index + 1}`,
            songs: Array.isArray(slot.songs) ? slot.songs.filter(s => s && s.title) : [],
            email: slot.email || ''
          };
        }).filter(slot => slot.timeSlot);
        
        setPerformers(normalizedPerformers);
        setStatus(`Found ${normalizedPerformers.length} performers`);
      }
    } catch (error) {
      console.error('Error fetching performers:', error);
      setStatus('Error fetching performers');
    } finally {
      setLoading(false);
    }
  };

  // Load YouTube broadcasts - FILTERED FOR RECENT ONLY
  const loadBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    try {
      setLoading(true);
      const result = await youtubeService.listBroadcasts(50);
      if (result.success) {
        // Filter for recent broadcasts (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentBroadcasts = result.broadcasts.filter(broadcast => {
          const createdDate = new Date(broadcast.snippet.publishedAt);
          return createdDate > sevenDaysAgo;
        });
        
        // Also filter for current episode number
        const currentEpisode = getEpisodeNumber();
        const currentEpisodeBroadcasts = result.broadcasts.filter(broadcast => {
          return broadcast.snippet.title.includes(`#${currentEpisode}`);
        });
        
        // Combine recent + current episode (remove duplicates)
        const relevantBroadcasts = [...new Map(
          [...recentBroadcasts, ...currentEpisodeBroadcasts].map(b => [b.id, b])
        ).values()];
        
        setBroadcasts(relevantBroadcasts);
        setStatus(`Found ${relevantBroadcasts.length} recent broadcasts (${result.broadcasts.length} total)`);
      }
    } catch (error) {
      console.error('Error loading broadcasts:', error);
      setStatus('Error loading broadcasts');
    } finally {
      setLoading(false);
    }
  };

  // Connect to OBS
  const connectOBS = async () => {
    setLoading(true);
    setStatus('Connecting to OBS...');
    
    const success = await obsWebSocketService.connect('ws://localhost:4455', '');
    
    if (success) {
      setObsConnected(true);
      setStatus('✅ Connected to OBS');
    } else {
      setStatus('❌ Failed to connect to OBS');
    }
    setLoading(false);
  };

  // Sign in to YouTube
  const signInYouTube = async () => {
    setLoading(true);
    setStatus('Signing in to YouTube...');
    
    try {
      const result = await youtubeService.signIn();
      if (result.success) {
        setYoutubeSignedIn(true);
        setStatus('✅ Signed in to YouTube');
        await loadBroadcasts();
      } else {
        setStatus('❌ Failed to sign in to YouTube');
      }
    } catch (error) {
      setStatus('❌ YouTube sign in error');
    }
    setLoading(false);
  };

  // Create broadcast for a specific song
  const createSongBroadcast = async (performer, song, songIndex) => {
    if (!youtubeSignedIn) {
      alert('Please sign in to YouTube first');
      return;
    }

    setLoading(true);
    setStatus(`Creating broadcast for ${performer.artist} - ${song.title}...`);
    
    try {
      const episodeNumber = getEpisodeNumber();
      const title = `What Is Art? #${episodeNumber} | ${performer.artist} | ${song.title}`;
      const description = `Episode #${episodeNumber}\nArtist: ${performer.artist}\nSong: ${song.title}\nTime Slot: ${performer.timeSlot}${song.writer ? `\nWritten by: ${song.writer}` : ''}`;
      
      const result = await youtubeService.createBroadcast(title, description, null, 'unlisted');
      
      if (result.success) {
        setStatus(`✅ Created broadcast: ${song.title}`);
        await loadBroadcasts();
      } else {
        setStatus(`❌ Failed to create broadcast: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating broadcast:', error);
      setStatus(`❌ Error creating broadcast: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get all individual songs from all performers - USED in component
  const getAllSongs = () => {
    const allSongs = [];
    
    performers.forEach(performer => {
      if (performer.timeSlot === '8:30' || performer.timeSlot === '9:30') {
        return; // Skip intermissions
      }

      const songs = performer.songs && performer.songs.length > 0 
        ? performer.songs.filter(s => s && s.title.trim()) 
        : [{ title: 'Performance', writer: '' }];
      
      songs.forEach((song, songIndex) => {
        allSongs.push({
          performer,
          song,
          songIndex,
          id: `${performer.timeSlot}-${performer.artist}-${songIndex}`,
          timeSlot: performer.timeSlot,
          artist: performer.artist,
          songTitle: song.title,
          writer: song.writer || ''
        });
      });
    });
    
    // Sort by time slot
    return allSongs.sort((a, b) => {
      const timeA = a.timeSlot.replace(':', '');
      const timeB = b.timeSlot.replace(':', '');
      return timeA.localeCompare(timeB);
    });
  };

  // Check if a song already has a broadcast
  const songHasBroadcast = (songData) => {
    return broadcasts.some(broadcast => {
      const title = broadcast.snippet.title;
      return title.includes(songData.artist) && title.includes(songData.songTitle);
    });
  };

  // State for editing song data
  const [editingSongs, setEditingSongs] = useState({});

  // Toggle editing mode for a song
  const toggleEditMode = (songId) => {
    setEditingSongs(prev => ({
      ...prev,
      [songId]: !prev[songId]
    }));
  };

  // Update song data in editing mode
  const updateSongData = (songId, field, value) => {
    setPerformers(prevPerformers => {
      return prevPerformers.map(performer => {
        const updatedSongs = performer.songs.map(song => {
          if (`${performer.timeSlot}-${performer.artist}-${performer.songs.indexOf(song)}` === songId) {
            return { ...song, [field]: value };
          }
          return song;
        });
        return { ...performer, songs: updatedSongs };
      });
    });
  };

  // Update performer data in editing mode
  const updatePerformerData = (songId, field, value) => {
    setPerformers(prevPerformers => {
      return prevPerformers.map(performer => {
        if (songId.startsWith(`${performer.timeSlot}-${performer.artist}`)) {
          return { ...performer, [field]: value };
        }
        return performer;
      });
    });
  };

  // Start a broadcast
  const startBroadcast = async (broadcastId) => {
    try {
      setLoading(true);
      const result = await youtubeService.transitionBroadcast(broadcastId, 'live');
      if (result.success) {
        setStreamingBroadcastId(broadcastId);
        setStatus('✅ Broadcast started');
        await loadBroadcasts(); // Refresh to update status
      }
    } catch (error) {
      setStatus('❌ Error starting broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Stop current broadcast
  const stopBroadcast = async (broadcastId) => {
    const targetId = broadcastId || streamingBroadcastId;
    if (!targetId) return;
    
    try {
      setLoading(true);
      const result = await youtubeService.transitionBroadcast(targetId, 'complete');
      if (result.success) {
        setStreamingBroadcastId(null);
        setStatus('✅ Broadcast stopped');
        await loadBroadcasts(); // Refresh to update status
      }
    } catch (error) {
      setStatus('❌ Error stopping broadcast');
    } finally {
      setLoading(false);
    }
  };

  // Group broadcasts by performer
  const getBroadcastsByPerformer = () => {
    const grouped = {};
    
    broadcasts.forEach(broadcast => {
      const match = broadcast.snippet.title.match(/#\d+ \| (.+) \| (.+)$/);
      if (match) {
        const artist = match[1];
        if (!grouped[artist]) {
          grouped[artist] = [];
        }
        grouped[artist].push({
          ...broadcast,
          songTitle: match[2]
        });
      }
    });
    
    return grouped;
  };

  // Auto-cleanup old "ready" broadcasts (older than 12 hours)
  const cleanupOldReadyBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    const oldReadyBroadcasts = broadcasts.filter(broadcast => {
      const createdDate = new Date(broadcast.snippet.publishedAt);
      return broadcast.status.lifeCycleStatus === 'ready' && createdDate < twelveHoursAgo;
    });
    
    if (oldReadyBroadcasts.length === 0) {
      setStatus('No old ready broadcasts to clean up');
      return;
    }
    
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Found ${oldReadyBroadcasts.length} broadcasts older than 12 hours in "ready" status. Delete them?`)) {
      return;
    }
    
    setLoading(true);
    setStatus(`Cleaning up ${oldReadyBroadcasts.length} old broadcasts...`);
    
    let cleaned = 0;
    
    for (const broadcast of oldReadyBroadcasts) {
      try {
        // Step 1: Start the broadcast briefly
        await youtubeService.transitionBroadcast(broadcast.id, 'live');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Step 2: Stop the broadcast
        await youtubeService.transitionBroadcast(broadcast.id, 'complete');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Step 3: Delete the broadcast
        const deleteResult = await youtubeService.deleteBroadcast(broadcast.id);
        
        if (deleteResult.success) {
          cleaned++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error cleaning up broadcast ${broadcast.snippet.title}:`, error);
      }
    }
    
    setStatus(`✅ Cleaned up ${cleaned} old broadcasts`);
    await loadBroadcasts(); // Refresh the list
    setLoading(false);
  };

  // Split broadcasts by status
  const getReadyBroadcasts = () => {
    return broadcasts.filter(broadcast => 
      broadcast.status.lifeCycleStatus === 'ready' || 
      broadcast.status.lifeCycleStatus === 'created'
    );
  };

  const getCompletedBroadcasts = () => {
    return broadcasts.filter(broadcast => 
      broadcast.status.lifeCycleStatus === 'complete'
    );
  };

  const getLiveBroadcasts = () => {
    return broadcasts.filter(broadcast => 
      broadcast.status.lifeCycleStatus === 'live'
    );
  };

  const readyBroadcasts = getReadyBroadcasts();
  const completedBroadcasts = getCompletedBroadcasts();
  const liveBroadcasts = getLiveBroadcasts();

  // Styles
  const cardStyle = {
    background: 'rgba(40, 40, 40, 0.9)',
    border: '1px solid #333',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '20px'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    margin: '5px'
  };

  const statusStyle = {
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    background: status.includes('✅') ? 'rgba(76, 175, 80, 0.2)' : 
               status.includes('❌') ? 'rgba(244, 67, 54, 0.2)' : 
               'rgba(33, 150, 243, 0.2)',
    border: `1px solid ${status.includes('✅') ? '#4CAF50' : 
                          status.includes('❌') ? '#f44336' : '#2196F3'}`,
    color: 'white'
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#0a0a0a',
      color: 'white',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#e91e63' }}>
            🎬 Simplified Broadcast Control - Episode #{getEpisodeNumber()}
          </h1>
          <button
            onClick={() => {
              logoutStaff();
              onLogout();
            }}
            style={{
              ...buttonStyle,
              background: '#f44336'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div style={statusStyle}>
          {status}
        </div>
      )}

      {/* Quick Setup */}
      <div style={cardStyle}>
        <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>🚀 Quick Setup</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button
            onClick={connectOBS}
            disabled={loading || obsConnected}
            style={{
              ...buttonStyle,
              background: obsConnected ? '#4CAF50' : '#9C27B0',
              opacity: loading ? 0.6 : 1
            }}
          >
            {obsConnected ? '✅ OBS Connected' : '🎛️ Connect OBS'}
          </button>
          
          <button
            onClick={signInYouTube}
            disabled={loading || youtubeSignedIn}
            style={{
              ...buttonStyle,
              background: youtubeSignedIn ? '#4CAF50' : '#FF0000',
              opacity: loading ? 0.6 : 1
            }}
          >
            {youtubeSignedIn ? '✅ YouTube Ready' : '📺 Sign in YouTube'}
          </button>
          
          <button
            onClick={fetchPerformers}
            disabled={loading}
            style={{
              ...buttonStyle,
              background: '#FF9800',
              opacity: loading ? 0.6 : 1
            }}
          >
            📋 Reload Songs ({allSongs.length})
          </button>
        </div>
      </div>

      {/* Individual Songs - RENAMED */}
      <div style={cardStyle}>
        <h2 style={{ color: '#FFC107', marginBottom: '20px' }}>
          🎵 Ready to Create Broadcasts ({allSongs.length})
        </h2>
        
        {allSongs.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No songs found. Make sure performers have registered with song details.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allSongs.map((songData) => {
              const hasBroadcast = songHasBroadcast(songData);
              const isEditing = editingSongs[songData.id];
              
              return (
                <div
                  key={songData.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isEditing ? 'flex-start' : 'center',
                    padding: '15px',
                    background: hasBroadcast ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: hasBroadcast ? '1px solid #4CAF50' : '1px solid #444',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      // EDIT MODE
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={songData.timeSlot}
                            onChange={(e) => updatePerformerData(songData.id, 'timeSlot', e.target.value)}
                            style={{ ...editInputStyle, width: '80px' }}
                            placeholder="Time"
                          />
                          <span style={{ color: '#888' }}>-</span>
                          <input
                            type="text"
                            value={songData.artist}
                            onChange={(e) => updatePerformerData(songData.id, 'artist', e.target.value)}
                            style={{ ...editInputStyle, width: '200px' }}
                            placeholder="Artist Name"
                          />
                        </div>
                        
                        <input
                          type="text"
                          value={songData.songTitle}
                          onChange={(e) => updateSongData(songData.id, 'title', e.target.value)}
                          style={{ ...editInputStyle, fontSize: '16px', fontWeight: '600' }}
                          placeholder="Song Title"
                        />
                        
                        <input
                          type="text"
                          value={songData.writer || ''}
                          onChange={(e) => updateSongData(songData.id, 'writer', e.target.value)}
                          style={editInputStyle}
                          placeholder="Written by (optional)"
                        />
                      </div>
                    ) : (
                      // VIEW MODE
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e91e63', marginBottom: '4px' }}>
                          {songData.timeSlot} - {songData.artist}
                        </div>
                        <div style={{ fontSize: '18px', color: 'white', marginBottom: '2px' }}>
                          {songData.songTitle}
                        </div>
                        {songData.writer && (
                          <div style={{ fontSize: '14px', color: '#aaa' }}>
                            Written by: {songData.writer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: isEditing ? 'flex-start' : 'center' }}>
                    {!hasBroadcast && (
                      <button
                        onClick={() => toggleEditMode(songData.id)}
                        style={{
                          ...editButtonStyle,
                          color: isEditing ? '#4CAF50' : '#2196F3',
                          borderColor: isEditing ? '#4CAF50' : '#2196F3'
                        }}
                      >
                        {isEditing ? '✓ Save' : '✏️ Edit'}
                      </button>
                    )}
                    
                    {hasBroadcast ? (
                      <div style={{
                        background: '#4CAF50',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        ✅ Broadcast Created
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isEditing) {
                            toggleEditMode(songData.id);
                          }
                          createSongBroadcast(songData.performer, songData.song, songData.songIndex);
                        }}
                        disabled={loading}
                        style={{
                          ...buttonStyle,
                          background: '#2196F3',
                          padding: '8px 16px',
                          fontSize: '14px',
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        📺 Create Broadcast
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Broadcast Loading Controls - MOVED HERE */}
      <div style={cardStyle}>
        <h2 style={{ color: '#9C27B0', marginBottom: '20px' }}>
          🔄 Broadcast Controls
        </h2>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={loadBroadcasts}
            disabled={loading || !youtubeSignedIn}
            style={{
              ...buttonStyle,
              background: '#FF9800',
              opacity: loading || !youtubeSignedIn ? 0.6 : 1
            }}
          >
            🔄 Load Recent Broadcasts ({broadcasts.length})
          </button>
          
          <button
            onClick={loadAllBroadcasts}
            disabled={loading || !youtubeSignedIn}
            style={{
              ...buttonStyle,
              background: '#9C27B0',
              opacity: loading || !youtubeSignedIn ? 0.6 : 1,
              fontSize: '14px'
            }}
          >
            📚 Load All Broadcasts
          </button>
          
          <button
            onClick={cleanupOldReadyBroadcasts}
            disabled={loading || !youtubeSignedIn || broadcasts.length === 0}
            style={{
              ...buttonStyle,
              background: '#f44336',
              opacity: loading || !youtubeSignedIn || broadcasts.length === 0 ? 0.6 : 1,
              fontSize: '14px'
            }}
          >
            🧹 Cleanup Old Ready
          </button>
        </div>
        
        <p style={{ 
          color: '#aaa', 
          fontSize: '14px', 
          marginTop: '10px',
          marginBottom: 0
        }}>
          Load recent broadcasts for tonight's show, or view all broadcasts from previous episodes
        </p>
      </div>

      {/* Live Broadcasts (if any) */}
      {liveBroadcasts.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>
            🔴 Live Broadcasts ({liveBroadcasts.length})
          </h2>
          
          {liveBroadcasts.map(broadcast => (
            <div
              key={broadcast.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid #4CAF50',
                borderRadius: '8px',
                marginBottom: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#4CAF50', marginBottom: '4px' }}>
                  {broadcast.snippet.title}
                </div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>
                  🔴 LIVE NOW | Privacy: {broadcast.status.privacyStatus}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => stopBroadcast(broadcast.id)}
                  style={{
                    ...buttonStyle,
                    background: '#f44336',
                    padding: '8px 16px',
                    fontSize: '14px'
                  }}
                >
                  ⏹️ Stop
                </button>
                
                <a
                  href={`https://www.youtube.com/watch?v=${broadcast.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...buttonStyle,
                    background: '#FF0000',
                    padding: '8px 16px',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  View Live
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ready Broadcasts */}
      <div style={cardStyle}>
        <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>
          ⚡ Ready to Stream ({readyBroadcasts.length})
        </h2>
        
        {readyBroadcasts.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No broadcasts ready to stream. Create broadcasts for your songs above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {readyBroadcasts.map(broadcast => {
              const createdDate = new Date(broadcast.snippet.publishedAt);
              const isOld = (new Date() - createdDate) > (12 * 60 * 60 * 1000); // 12 hours
              
              return (
                <div
                  key={broadcast.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: isOld ? 'rgba(255, 193, 7, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                    border: isOld ? '1px solid #FFC107' : '1px solid #2196F3',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {broadcast.snippet.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      Status: {broadcast.status.lifeCycleStatus.toUpperCase()} | 
                      Privacy: {broadcast.status.privacyStatus} |
                      Created: {new Date(broadcast.snippet.publishedAt).toLocaleDateString()}
                      {isOld && <span style={{ color: '#FFC107', marginLeft: '10px' }}>⚠️ OLD (>12h)</span>}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startBroadcast(broadcast.id)}
                      style={{
                        ...buttonStyle,
                        background: '#4CAF50',
                        padding: '8px 16px',
                        fontSize: '14px'
                      }}
                    >
                      ▶️ Start
                    </button>
                    
                    <button
                      onClick={async () => {
                        // eslint-disable-next-line no-restricted-globals
                        if (confirm(`Delete broadcast: ${broadcast.snippet.title}?`)) {
                          setLoading(true);
                          const result = await youtubeService.deleteBroadcast(broadcast.id);
                          if (result.success) {
                            setStatus('✅ Ready broadcast deleted');
                            await loadBroadcasts();
                          } else {
                            setStatus('❌ Failed to delete broadcast');
                          }
                          setLoading(false);
                        }
                      }}
                      style={{
                        ...buttonStyle,
                        background: '#f44336',
                        padding: '8px 16px',
                        fontSize: '14px'
                      }}
                    >
                      🗑️ Delete
                    </button>
                    
                    <a
                      href={`https://www.youtube.com/watch?v=${broadcast.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...buttonStyle,
                        background: '#FF0000',
                        padding: '8px 16px',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      View
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Broadcasts */}
      <div style={cardStyle}>
        <h2 style={{ color: '#9C27B0', marginBottom: '20px' }}>
          ✅ Completed Broadcasts ({completedBroadcasts.length})
        </h2>
        
        {completedBroadcasts.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No completed broadcasts yet.
          </p>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {completedBroadcasts.map(broadcast => (
              <div
                key={broadcast.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(156, 39, 176, 0.1)',
                  border: '1px solid #9C27B0',
                  borderRadius: '8px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                    {broadcast.snippet.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Completed: {new Date(broadcast.snippet.publishedAt).toLocaleDateString()} | 
                    Privacy: {broadcast.status.privacyStatus}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://www.youtube.com/watch?v=${broadcast.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...buttonStyle,
                      background: '#FF0000',
                      padding: '8px 16px',
                      fontSize: '14px',
                      textDecoration: 'none',
                      display: 'inline-block'
                    }}
                  >
                    📺 Watch
                  </a>
                  
                  <button
                    onClick={async () => {
                      // eslint-disable-next-line no-restricted-globals
                      if (confirm('Delete this completed broadcast?')) {
                        setLoading(true);
                        const result = await youtubeService.deleteBroadcast(broadcast.id);
                        if (result.success) {
                          setStatus('✅ Broadcast deleted');
                          await loadBroadcasts();
                        } else {
                          setStatus('❌ Failed to delete broadcast');
                        }
                        setLoading(false);
                      }
                    }}
                    style={{
                      ...buttonStyle,
                      background: '#f44336',
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#333',
            padding: '20px',
            borderRadius: '10px',
            color: 'white',
            fontSize: '18px'
          }}>
            Working...
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedStaffDashboard;