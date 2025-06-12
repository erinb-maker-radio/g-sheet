// src/components/YouTubeBroadcastManager.js
import React, { useState, useEffect } from 'react';
import youtubeService from '../services/youtubeService';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

const YouTubeBroadcastManager = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdBroadcast, setCreatedBroadcast] = useState(null);

  // Initialize YouTube service
  useEffect(() => {
    initializeYouTube();
  }, []);

  // Fetch performers when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchPerformers();
      loadBroadcasts();
    }
  }, [isSignedIn]);

  const initializeYouTube = async () => {
    try {
      await youtubeService.init();
      const signedIn = youtubeService.isSignedIn;
      setIsSignedIn(signedIn);
      
      if (signedIn) {
        const currentUser = youtubeService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to initialize YouTube:', error);
      setError('Failed to initialize YouTube API');
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await youtubeService.signIn();
      if (result.success) {
        setIsSignedIn(true);
        setUser(result.user);
        setSuccess('Successfully signed in to YouTube!');
      } else {
        setError(result.error || 'Failed to sign in');
      }
    } catch (error) {
      setError('Sign in failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await youtubeService.signOut();
    setIsSignedIn(false);
    setUser(null);
    setBroadcasts([]);
    setCreatedBroadcast(null);
  };

  const fetchPerformers = async () => {
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      if (data.takenSlots) {
        setPerformers(data.takenSlots);
      }
    } catch (err) {
      console.error('Error fetching performers:', err);
    }
  };

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const result = await youtubeService.listBroadcasts(20);
      if (result.success) {
        setBroadcasts(result.broadcasts);
      }
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const createBroadcast = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const episodeNumber = getEpisodeNumber();
      const title = `What Is Art? Episode #${episodeNumber} - ${formatDate()}`;
      
      // Build description with performer lineup
      let description = `What Is Art? - Open Stage • Open Mic • Livestream\n\n`;
      description += `Episode #${episodeNumber}\n`;
      description += `Date: ${formatDate()}\n\n`;
      description += `Tonight's Lineup:\n`;
      description += `===============\n\n`;
      
      performers.forEach(performer => {
        description += `${performer.timeSlot} - ${performer.artist}\n`;
        if (performer.songs && performer.songs.length > 0) {
          performer.songs.forEach((song, index) => {
            if (song.title) {
              description += `  • ${song.title}`;
              if (song.writer) {
                description += ` (by ${song.writer})`;
              }
              description += '\n';
            }
          });
        }
        description += '\n';
      });
      
      description += `\nJoin us live at Maker Nexus, 1330 Park Street, Chico CA\n`;
      description += `Every Thursday at 7:30 PM PST\n\n`;
      description += `#OpenMic #LiveMusic #WhatIsArt #MakerRadio`;
      
      // Create the broadcast
      const result = await youtubeService.createBroadcast(
        title,
        description,
        null, // Start now
        'unlisted' // Privacy setting
      );
      
      if (result.success) {
        setCreatedBroadcast(result);
        setSuccess('Broadcast created successfully!');
        
        // Copy stream key to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(result.streamKey);
          setSuccess('Broadcast created! Stream key copied to clipboard.');
        }
        
        // Reload broadcasts list
        await loadBroadcasts();
      } else {
        setError('Failed to create broadcast: ' + result.error);
      }
    } catch (error) {
      setError('Error creating broadcast: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyStreamKey = async (streamKey) => {
    try {
      await navigator.clipboard.writeText(streamKey);
      setSuccess('Stream key copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to copy stream key');
    }
  };

  if (!isSignedIn) {
    return (
      <div style={{
        background: 'rgba(50, 50, 50, 0.9)',
        padding: '40px',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#FF0000', marginBottom: '20px' }}>
          📺 YouTube Broadcast Manager
        </h2>
        
        <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '16px' }}>
          Sign in to YouTube to create and manage broadcasts
        </p>
        
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            background: '#FF0000',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Signing in...' : '🔐 Sign in with Google'}
        </button>
        
        {error && (
          <div style={{
            color: '#f44336',
            marginTop: '20px',
            padding: '10px',
            background: 'rgba(244, 67, 54, 0.1)',
            borderRadius: '5px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(50, 50, 50, 0.9)',
      padding: '20px',
      borderRadius: '10px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#FF0000', margin: 0 }}>
          📺 YouTube Broadcast Manager
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#ccc', fontSize: '14px' }}>
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            style={{
              background: '#666',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid #4CAF50',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px',
          color: '#4CAF50'
        }}>
          ✅ {success}
        </div>
      )}
      
      {error && (
        <div style={{
          background: 'rgba(244, 67, 54, 0.2)',
          border: '1px solid #f44336',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '20px',
          color: '#f44336'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Create Broadcast Section */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#FFC107', marginBottom: '15px' }}>
          Create Tonight's Broadcast
        </h3>
        
        <div style={{ marginBottom: '15px' }}>
          <p style={{ color: '#ccc', margin: '5px 0' }}>
            <strong>Title:</strong> What Is Art? Episode #{getEpisodeNumber()} - {formatDate()}
          </p>
          <p style={{ color: '#ccc', margin: '5px 0' }}>
            <strong>Performers:</strong> {performers.length} registered
          </p>
          <p style={{ color: '#ccc', margin: '5px 0' }}>
            <strong>Privacy:</strong> Unlisted
          </p>
        </div>
        
        <button
          onClick={createBroadcast}
          disabled={loading || performers.length === 0}
          style={{
            background: loading ? '#666' : '#FF0000',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || performers.length === 0 ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? 'Creating Broadcast...' : '📺 Create YouTube Broadcast'}
        </button>
        
        {performers.length === 0 && (
          <p style={{ color: '#888', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
            No performers registered yet
          </p>
        )}
      </div>

      {/* Created Broadcast Info */}
      {createdBroadcast && (
        <div style={{
          background: 'rgba(33, 150, 243, 0.2)',
          border: '1px solid #2196F3',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#2196F3', marginBottom: '10px' }}>
            🎉 Broadcast Created Successfully!
          </h4>
          
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            <p><strong>Stream Key:</strong> {createdBroadcast.streamKey}</p>
            <p><strong>RTMP URL:</strong> {createdBroadcast.rtmpUrl}</p>
            <p><strong>Watch URL:</strong> <a href={createdBroadcast.watchUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2196F3' }}>{createdBroadcast.watchUrl}</a></p>
          </div>
          
          <button
            onClick={() => copyStreamKey(createdBroadcast.streamKey)}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            📋 Copy Stream Key
          </button>
          
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '5px',
            fontSize: '12px',
            color: '#aaa'
          }}>
            <strong>Next Steps:</strong>
            <ol style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
              <li>In OBS: Settings → Stream</li>
              <li>Service: YouTube - RTMPS</li>
              <li>Paste the Stream Key</li>
              <li>Or use "Manage Broadcast" → "Select Existing Broadcast"</li>
            </ol>
          </div>
        </div>
      )}

      {/* Existing Broadcasts */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h3 style={{ color: '#2196F3', margin: 0 }}>
            📡 Your YouTube Broadcasts
          </h3>
          
          <button
            onClick={loadBroadcasts}
            disabled={loading}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '5px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
        
        {broadcasts.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>
            No broadcasts found. Create one above!
          </p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {broadcasts.map((broadcast) => (
              <div
                key={broadcast.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h4 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '16px' }}>
                      {broadcast.snippet.title}
                    </h4>
                    <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                      Status: <span style={{ color: broadcast.status.lifeCycleStatus === 'live' ? '#4CAF50' : '#FFC107' }}>
                        {broadcast.status.lifeCycleStatus}
                      </span>
                    </p>
                    <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>
                      Privacy: {broadcast.status.privacyStatus}
                    </p>
                  </div>
                  
                  <a
                    href={`https://www.youtube.com/watch?v=${broadcast.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#FF0000',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '5px',
                      fontSize: '12px',
                      textDecoration: 'none'
                    }}
                  >
                    View on YouTube
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
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
        <strong>💡 Pro Tip:</strong> After creating a broadcast, you can select it in OBS by going to 
        "Manage Broadcast" → "Select Existing Broadcast". Your new broadcast will appear in the list!
      </div>
    </div>
  );
};

export default YouTubeBroadcastManager;