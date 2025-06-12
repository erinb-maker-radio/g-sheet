// components/SimplifiedStaffDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import youtubeService from '../services/youtubeService';
import { logoutStaff } from '../utils/staffAuth';
import { containerStyle, gridBgStyle } from '../styles/styles';
import { isIntermissionSlot } from '../constants/intermissions';
import lowerThirdsService from '../services/lowerThirdsService';

// Import sub-components
import DashboardHeader from './Dashboard/DashboardHeader';
import OnAirIndicator from './Dashboard/OnAirIndicator';
import ConnectionStatusBar from './Dashboard/ConnectionStatusBar';
import BroadcastListSection from './Dashboard/BroadcastListSection';
import { OBSConnectModal, YouTubeSignInModal } from './Dashboard/DashboardModals';
import PreShowChecklist from './Dashboard/PreShowChecklist';

// Helper functions
const getEpisodeNumber = () => {
  const baseDate = new Date('2025-05-31'); // Saturday May 31, 2025 starts episode 122
  const baseEpisode = 122;
  const today = new Date();
  const daysDiff = Math.floor((today - baseDate) / (1000 * 60 * 60 * 24));
  const weeksPassed = Math.floor(daysDiff / 7);
  return baseEpisode + weeksPassed;
};

const sortBroadcastsByTimeSlot = (broadcasts, performers) => {
  const timeSlots = [
    "7:30", "7:45", "8:00", "8:15", "8:30", "8:45", 
    "9:00", "9:15", "9:30", "9:45", "10:00", "10:15"
  ];
  
  const result = [];
  let currentHeader = null;
  
  timeSlots.forEach(slot => {
    const isIntermission = isIntermissionSlot(slot);
    const slotBroadcasts = broadcasts.filter(b => {
      const performer = performers.find(p => 
        p.timeSlot === slot && 
        b.snippet.title.includes(p.artist)
      );
      return performer || (isIntermission && b.snippet.title.includes('INTERMISSION'));
    });
    
    const isCompleted = slotBroadcasts.every(b => 
      b.status.lifeCycleStatus === 'complete'
    );
    
    if (slotBroadcasts.length > 0 || isIntermission) {
      if (currentHeader !== slot) {
        result.push({
          type: 'header',
          timeSlot: slot,
          isIntermission,
          isCompleted
        });
        currentHeader = slot;
      }
      
      if (isIntermission && slotBroadcasts.length === 0) {
        result.push({
          type: 'intermission-placeholder',
          timeSlot: slot
        });
      } else {
        slotBroadcasts.forEach(broadcast => {
          result.push({
            type: 'broadcast',
            data: broadcast
          });
        });
      }
    }
  });
  
  return result;
};

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

// Global map to store broadcast ID to lower thirds data
const broadcastLowerThirdsMap = new Map();

const SimplifiedStaffDashboard = ({ onLogout }) => {
  // Connection states
  const [obsConnected, setObsConnected] = useState(false);
  const [youtubeSignedIn, setYoutubeSignedIn] = useState(false);
  const [youtubeUser, setYoutubeUser] = useState(null);
  
  // UI states
  const [showYoutubeLogin, setShowYoutubeLogin] = useState(false);
  const [showObsConnect, setShowObsConnect] = useState(false);
  const [obsSettings, setObsSettings] = useState({ address: 'ws://localhost:4455', password: '' });
  
  // Data states
  const [broadcasts, setBroadcasts] = useState([]);
  const [performers, setPerformers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingBroadcastId, setStreamingBroadcastId] = useState(null);
  const [streamStatus, setStreamStatus] = useState({
    isStreaming: false,
    bytesPerSec: 0,
    totalBytes: 0,
    duration: 0,
    reconnecting: false
  });

  // Time tracking for intermissions
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextIntermission, setNextIntermission] = useState(null);
  const [activeIntermission, setActiveIntermission] = useState(null);
  const [currentScene, setCurrentScene] = useState('');
  const [scenesCreated, setScenesCreated] = useState(false);
  const [upNextSceneReady, setUpNextSceneReady] = useState(false);

  // Styles
  const cardStyle = {
    background: 'rgba(40, 40, 40, 0.9)',
    border: '1px solid #333',
    padding: '30px',
    borderRadius: '25px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(20px)'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '15px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(233, 30, 99, 0.3)'
  };

  const secondaryButtonStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '2px solid #555',
    padding: '10px 20px',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const titleStyle = {
    fontSize: '36px',
    fontWeight: '900',
    background: 'linear-gradient(45deg, #e91e63, #9c27b0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '30px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  // Function to create broadcasts with automatic lower thirds mapping
  const createBroadcastWithLowerThirds = async (performer, songIndex = 0) => {
    const song = performer.songs[songIndex];
    if (!song || !song.title) return null;
    
    const episodeNumber = getEpisodeNumber();
    
    // Create broadcast title and description
    const broadcastTitle = `What Is Art? #${episodeNumber}, ${performer.artist}, ${song.title}`;
    
    let description = `What Is Art? Episode #${episodeNumber}\n`;
    description += `Performer: ${performer.artist}\n`;
    description += `Time Slot: ${performer.timeSlot}\n`;
    description += `Song: ${song.title}\n`;
    if (song.writer) {
      description += `Written by: ${song.writer}\n`;
    }
    
    // Create the YouTube broadcast
    const result = await youtubeService.createBroadcast(
      broadcastTitle,
      description,
      null,
      'unlisted'
    );
    
    if (result.success) {
      // Store the mapping
      broadcastLowerThirdsMap.set(result.broadcastId, {
        artist: performer.artist,
        songTitle: song.title,
        songWriter: song.writer || '',
        timeSlot: performer.timeSlot,
        episodeNumber: episodeNumber
      });
      
      console.log(`Mapped broadcast ${result.broadcastId} to lower thirds data`);
    }
    
    return result;
  };

  // Sync lower thirds from a specific broadcast
  const syncLowerThirdsFromBroadcast = async (broadcast) => {
    try {
      // First check if we have it in our local map
      const mappedData = broadcastLowerThirdsMap.get(broadcast.id);
      
      if (mappedData) {
        console.log('Using mapped lower thirds data:', mappedData);
        await lowerThirdsService.updatePerformer({
          artist: mappedData.artist,
          song: {
            title: mappedData.songTitle,
            writer: mappedData.songWriter
          },
          timeSlot: mappedData.timeSlot,
          isIntermission: false
        });
      } else {
        // Parse from YouTube broadcast
        const details = await youtubeService.getBroadcastDetails(broadcast.id);
        
        if (details.success && details.parsedData) {
          console.log('Using parsed YouTube data:', details.parsedData);
          await lowerThirdsService.updatePerformer({
            artist: details.parsedData.artist,
            song: {
              title: details.parsedData.songTitle,
              writer: details.parsedData.writer
            },
            timeSlot: details.parsedData.timeSlot || '',
            isIntermission: false
          });
        }
      }
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Lower Thirds Auto-Synced', {
          body: `Now showing: ${broadcast.snippet.title}`,
          icon: '/logo192.png'
        });
      }
    } catch (error) {
      console.error('Error syncing lower thirds:', error);
    }
  };

  // Automatically detect and sync live broadcast when streaming starts
  const detectAndSyncLiveBroadcast = async () => {
    if (!youtubeSignedIn || broadcasts.length === 0) {
      console.log('Cannot detect broadcast - YouTube not signed in or no broadcasts');
      return;
    }

    try {
      // Method 1: Check current OBS scene name for clues
      const currentScene = await obsWebSocketService.getCurrentScene();
      console.log('Current OBS scene:', currentScene);
      
      // Try to match scene name to a broadcast
      // Scene names follow pattern: "7:30 - Artist Name - Song 1"
      const sceneMatch = currentScene?.match(/(\d+:\d+) - ([^-]+) - Song (\d+)/);
      
      if (sceneMatch) {
        const [, timeSlot, artistName, songNumber] = sceneMatch;
        console.log(`Detected from scene: ${timeSlot} - ${artistName} - Song ${songNumber}`);
        
        // Find matching broadcast
        const matchingBroadcast = broadcasts.find(b => {
          return b.snippet.title.includes(artistName.trim()) && 
                 b.status.lifeCycleStatus === 'live';
        });
        
        if (matchingBroadcast) {
          console.log('Found matching live broadcast:', matchingBroadcast.snippet.title);
          await syncLowerThirdsFromBroadcast(matchingBroadcast);
          setStreamingBroadcastId(matchingBroadcast.id);
          return;
        }
      }
      
      // Method 2: Check for any broadcast that's currently live
      const liveBroadcasts = broadcasts.filter(b => b.status.lifeCycleStatus === 'live');
      
      if (liveBroadcasts.length === 1) {
        // Only one live broadcast, use it
        console.log('Found single live broadcast:', liveBroadcasts[0].snippet.title);
        await syncLowerThirdsFromBroadcast(liveBroadcasts[0]);
        setStreamingBroadcastId(liveBroadcasts[0].id);
      } else if (liveBroadcasts.length > 1) {
        // Multiple live broadcasts, try to match with current time
        const now = new Date();
        const currentHour = now.getHours() % 12 || 12;
        const currentMinutes = now.getMinutes();
        const currentTimeSlot = `${currentHour}:${currentMinutes.toString().padStart(2, '0')}`;
        
        // Find the closest matching time slot
        let closestBroadcast = liveBroadcasts[0];
        let closestTimeDiff = Infinity;
        
        for (const broadcast of liveBroadcasts) {
          const titleMatch = broadcast.snippet.title.match(/(\d+:\d+)/);
          if (titleMatch) {
            const [hour, minute] = titleMatch[1].split(':').map(Number);
            const broadcastMinutes = hour * 60 + minute;
            const currentTotalMinutes = currentHour * 60 + currentMinutes;
            const timeDiff = Math.abs(broadcastMinutes - currentTotalMinutes);
            
            if (timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff;
              closestBroadcast = broadcast;
            }
          }
        }
        
        console.log('Using closest time-matching broadcast:', closestBroadcast.snippet.title);
        await syncLowerThirdsFromBroadcast(closestBroadcast);
        setStreamingBroadcastId(closestBroadcast.id);
      } else {
        console.log('No live broadcasts found');
        
        // Method 3: Check if any broadcast is in "testing" status (about to go live)
        const testingBroadcasts = broadcasts.filter(b => b.status.lifeCycleStatus === 'testing');
        if (testingBroadcasts.length > 0) {
          console.log('Found broadcast in testing:', testingBroadcasts[0].snippet.title);
          await syncLowerThirdsFromBroadcast(testingBroadcasts[0]);
          setStreamingBroadcastId(testingBroadcasts[0].id);
        }
      }
    } catch (error) {
      console.error('Error detecting live broadcast:', error);
    }
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Test function to verify OBS functionality
  const testOBSFunctions = async () => {
    if (!obsConnected) {
      alert('OBS not connected');
      return;
    }
    
    try {
      // Test getting current scene
      const currentScene = await obsWebSocketService.getCurrentScene();
      console.log('Current scene:', currentScene);
      
      // Test getting scene list
      const scenes = await obsWebSocketService.getSceneList();
      console.log('Available scenes:', scenes);
      
      // Test streaming status
      const status = await obsWebSocketService.getStreamingStatus();
      console.log('Streaming status:', status);
      
      alert(`OBS Test Results:\n\nCurrent Scene: ${currentScene}\nAvailable Scenes: ${scenes.join(', ')}\nStreaming: ${status?.streaming ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error('OBS test error:', error);
      alert('OBS test failed: ' + error.message);
    }
  };

  // Calculate next intermission
  useEffect(() => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const intermissions = [
      { slot: '8:30', time: '8:30 PM', minutes: 20 * 60 + 30 },
      { slot: '9:30', time: '9:30 PM', minutes: 21 * 60 + 30 }
    ];
    
    const next = intermissions.find(i => i.minutes > currentMinutes);
    setNextIntermission(next);
  }, [currentTime]);

  // Load broadcasts function
  const loadBroadcasts = useCallback(async () => {
    if (!youtubeSignedIn) return;
    
    try {
      const result = await youtubeService.listBroadcasts(50);
      if (result.success) {
        const whatIsArtBroadcasts = result.broadcasts.filter(b => 
          b.snippet.title.includes('What Is Art?')
        );
        setBroadcasts(whatIsArtBroadcasts);
      }
    } catch (error) {
      console.error('Error loading broadcasts:', error);
    }
  }, [youtubeSignedIn]);

  // Monitor streaming status
  useEffect(() => {
    if (!obsConnected) {
      setStreamStatus({
        isStreaming: false,
        bytesPerSec: 0,
        totalBytes: 0,
        duration: 0,
        reconnecting: false
      });
      return;
    }

    let lastBytes = 0;
    let lastTime = Date.now();
    let lastStreamingState = false;
    let hasCleared = false;
    
    const checkStreamStatus = async () => {
      try {
        const status = await obsWebSocketService.getStreamingStatus();
        if (status) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          const bytesDiff = status.bytes - lastBytes;
          const bytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;
          
          const currentStreamingState = status.streaming;
          
          // Detect when streaming starts
          if (currentStreamingState && !lastStreamingState) {
            console.log('Stream started - checking for live YouTube broadcast');
            hasCleared = false; // Reset the cleared flag
            await detectAndSyncLiveBroadcast();
          }
          
          // Detect when streaming stops
          if (!currentStreamingState && lastStreamingState && !hasCleared) {
            console.log('Stream stopped - clearing lower thirds');
            await lowerThirdsService.clearPerformer();
            hasCleared = true; // Set flag to prevent multiple clear calls
            
            // Also clear the streaming broadcast ID
            setStreamingBroadcastId(null);
          }
          
          setStreamStatus({
            isStreaming: status.streaming,
            bytesPerSec: bytesPerSec,
            totalBytes: status.bytes,
            duration: status.duration,
            reconnecting: status.reconnecting || false
          });
          
          lastBytes = status.bytes;
          lastTime = currentTime;
          lastStreamingState = currentStreamingState;
        }
      } catch (error) {
        console.error('Error checking stream status:', error);
      }
    };

    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 1000);
    
    return () => {
      clearInterval(interval);
      // Clear lower thirds when component unmounts
      if (lastStreamingState) {
        lowerThirdsService.clearPerformer();
      }
    };
  }, [obsConnected, youtubeSignedIn, broadcasts]);

  // Initialize connections
  useEffect(() => {
    setObsConnected(obsWebSocketService.connected);
    obsWebSocketService.onConnectionChange((connected) => {
      setObsConnected(connected);
    });

    // Listen for scene changes
    obsWebSocketService.onSceneChange((sceneName) => {
      setCurrentScene(sceneName);
    });

    initializeYouTube();
    fetchPerformers();
  }, []);

  // Check if required scenes exist
  const checkScenesStatus = async () => {
    if (!obsConnected) return;
    
    try {
      const scenes = await obsWebSocketService.getSceneList();
      setScenesCreated(scenes.some(s => s.includes('Song')));
      setUpNextSceneReady(scenes.includes('Up Next Transition'));
    } catch (error) {
      console.error('Error checking scenes:', error);
    }
  };

  // Check scenes when OBS connects
  useEffect(() => {
    if (obsConnected) {
      checkScenesStatus();
    }
  }, [obsConnected]);

  // Auto-refresh broadcasts
  useEffect(() => {
    if (youtubeSignedIn && obsConnected) {
      loadBroadcasts();
      // Refresh every 30 seconds to catch status changes
      const interval = setInterval(loadBroadcasts, 30000);
      return () => clearInterval(interval);
    }
  }, [youtubeSignedIn, obsConnected, loadBroadcasts]);

  // Monitor for scene changes to update lower thirds
  useEffect(() => {
    if (!obsConnected || !streamStatus.isStreaming) return;
    
    const handleSceneChange = async (sceneName) => {
      console.log('Scene changed to:', sceneName);
      
      // Check if it's a performance scene
      const sceneMatch = sceneName?.match(/(\d+:\d+) - ([^-]+) - Song (\d+)/);
      
      if (sceneMatch) {
        const [, timeSlot, artistName, songNumber] = sceneMatch;
        const songIndex = parseInt(songNumber) - 1;
        
        // Find performer in our data
        const performer = performers.find(p => 
          p.timeSlot === timeSlot && p.artist.trim() === artistName.trim()
        );
        
        if (performer && performer.songs && performer.songs[songIndex]) {
          console.log('Updating lower thirds for song change:', performer.songs[songIndex]);
          await lowerThirdsService.updatePerformer({
            artist: performer.artist,
            song: performer.songs[songIndex],
            timeSlot: performer.timeSlot,
            isIntermission: false
          });
        }
      } else if (sceneName?.includes('INTERMISSION')) {
        // Handle intermission scenes
        const timeSlotMatch = sceneName.match(/(\d+:\d+)/);
        if (timeSlotMatch) {
          await lowerThirdsService.showIntermission(timeSlotMatch[1]);
        }
      } else if (sceneName === 'Stage Cameras' || sceneName === 'Audience' || sceneName === 'Up Next') {
        // Clear lower thirds for non-performance scenes
        await lowerThirdsService.clearPerformer();
      }
    };
    
    // Subscribe to scene changes
    const unsubscribe = obsWebSocketService.onSceneChange(handleSceneChange);
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [obsConnected, streamStatus.isStreaming, performers]);

  // Automatically handle Up Next when stream stops
  const handleAutomaticUpNext = async () => {
    try {
      // Get current scene to determine which performer just finished
      const currentScene = await obsWebSocketService.getCurrentScene();
      console.log('Current scene when stream stopped:', currentScene);
      
      // Try to find current performer from scene name
      let currentPerformerIndex = -1;
      
      // Scene names follow pattern: "7:30 - Artist Name - Song 1"
      const sceneMatch = currentScene?.match(/(\d+:\d+) - ([^-]+) - /);
      if (sceneMatch) {
        const timeSlot = sceneMatch[1];
        const artist = sceneMatch[2].trim();
        
        // Find this performer in our list
        currentPerformerIndex = performers.findIndex(p => 
          p.timeSlot === timeSlot && p.artist === artist
        );
      }
      
      // If we found the current performer, show next
      if (currentPerformerIndex >= 0 && currentPerformerIndex < performers.length - 1) {
        const nextPerformer = performers[currentPerformerIndex + 1];
        
        // Skip if next slot is intermission
        if (isIntermissionSlot(nextPerformer.timeSlot)) {
          // Show intermission scene instead
          await obsWebSocketService.setCurrentScene(`${nextPerformer.timeSlot} - 🎭 INTERMISSION`);
        } else {
          // Update Up Next with next performer info
          const firstSong = nextPerformer.songs?.find(s => s.title) || { title: 'Performance' };
          await obsWebSocketService.updateUpNextInfo(
            nextPerformer.artist,
            firstSong.title,
            nextPerformer.timeSlot
          );
          
          // Switch to Up Next scene
          await obsWebSocketService.setCurrentScene('Up Next Transition');
        }
        
        // Show notification if supported
        if (Notification.permission === 'granted') {
          new Notification('Stream Ended', {
            body: `Up Next: ${nextPerformer.artist} at ${nextPerformer.timeSlot}`,
            icon: '/logo192.png'
          });
        }
      } else {
        // No next performer or couldn't determine current
        console.log('No next performer found, showing ending credits');
        await obsWebSocketService.setCurrentScene('Ending Credits');
      }
    } catch (error) {
      console.error('Error in automatic Up Next:', error);
      // Fallback to ending credits on error
      try {
        await obsWebSocketService.setCurrentScene('Ending Credits');
      } catch (e) {
        console.error('Failed to switch to ending credits:', e);
      }
    }
  };

  // Monitor stream status and automatically handle transitions
  useEffect(() => {
    if (!obsConnected) return;

    // Stream just stopped - immediately trigger Up Next
    if (!streamStatus.isStreaming && streamStatus.duration > 0) {
      console.log('Stream stopped - triggering automatic Up Next');
      handleAutomaticUpNext();
    }
    
  }, [streamStatus.isStreaming, obsConnected, performers]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize YouTube
  const initializeYouTube = async () => {
    try {
      await youtubeService.init();
      const signedIn = youtubeService.isSignedIn;
      setYoutubeSignedIn(signedIn);
      
      if (signedIn) {
        const user = youtubeService.getCurrentUser();
        setYoutubeUser(user);
      }
    } catch (error) {
      console.error('Failed to initialize YouTube:', error);
    }
  };

  // Fetch performers
  const fetchPerformers = async () => {
    console.log('Fetching performers...');
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      console.log('Performers data received:', data);
      if (data.takenSlots) {
        setPerformers(data.takenSlots);
        console.log('Performers set:', data.takenSlots);
      }
    } catch (err) {
      console.error('Error fetching performers:', err);
    }
  };

  // Connection handlers
  const handleYoutubeSignIn = async () => {
    setLoading(true);
    try {
      const result = await youtubeService.signIn();
      if (result.success) {
        setYoutubeSignedIn(true);
        setYoutubeUser(result.user);
        setShowYoutubeLogin(false);
        await loadBroadcasts();
      }
    } catch (error) {
      console.error('YouTube sign in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeSignOut = async () => {
    await youtubeService.signOut();
    setYoutubeSignedIn(false);
    setYoutubeUser(null);
    setBroadcasts([]);
  };

  const handleObsConnect = async () => {
    setLoading(true);
    try {
      const success = await obsWebSocketService.connect(
        obsSettings.address,
        obsSettings.password
      );
      if (success) {
        setShowObsConnect(false);
      } else {
        alert('Failed to connect to OBS');
      }
    } catch (error) {
      console.error('OBS connection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleObsDisconnect = async () => {
    await obsWebSocketService.disconnect();
  };

  const handleLogout = () => {
    logoutStaff();
    onLogout();
  };

  // Create Up Next scene
  const createUpNextScene = async () => {
    if (!obsConnected) {
      alert('Please connect to OBS first');
      return;
    }

    setLoading(true);
    try {
      const result = await obsWebSocketService.createUpNextScene();
      if (result) {
        alert('Up Next scene created successfully!');
        setUpNextSceneReady(true);
      } else {
        alert('Failed to create Up Next scene');
      }
    } catch (error) {
      console.error('Error creating Up Next scene:', error);
      alert('Error creating Up Next scene: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Intermission handlers
  const createIntermissionScenes = async () => {
    if (!obsConnected) {
      alert('Please connect to OBS first');
      return;
    }

    setLoading(true);
    try {
      const result = await obsWebSocketService.createIntermissionScenes();
      if (result) {
        alert('Intermission scenes created successfully!');
      } else {
        alert('Failed to create intermission scenes');
      }
    } catch (error) {
      console.error('Error creating intermission scenes:', error);
      alert('Error creating intermission scenes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startIntermission = async (slot) => {
    if (!obsConnected) {
      alert('OBS not connected');
      return;
    }

    try {
      const nextSlot = slot === '8:30' ? '8:45' : '9:45';
      const nextPerformer = performers.find(p => p.timeSlot === nextSlot);
      
      if (nextPerformer) {
        await obsWebSocketService.updateIntermissionNextUp(slot, nextPerformer);
      }
      
      const result = await obsWebSocketService.startIntermission(slot);
      if (result) {
        setActiveIntermission(slot);
        
        if (youtubeSignedIn && streamStatus.isStreaming) {
          const episodeNumber = getEpisodeNumber();
          const title = `What Is Art? Episode #${episodeNumber} - INTERMISSION`;
          const description = `Taking a quick 15-minute break. We'll be back at ${nextSlot}!`;
          
          await youtubeService.createBroadcast(title, description, null, 'public');
        }
      }
    } catch (error) {
      console.error('Error starting intermission:', error);
      alert('Failed to start intermission: ' + error.message);
    }
  };

  // Broadcast handlers - UPDATED TO REMOVE EMPTY SHEET POPUP
  const createSongBroadcasts = async () => {
    console.log('Sync button clicked');
    console.log('YouTube signed in:', youtubeSignedIn);
    console.log('Performers:', performers);
    
    if (!youtubeSignedIn) {
      alert('Please sign in to YouTube to sync broadcasts');
      return;
    }

    // Handle empty sheet case silently
    if (performers.length === 0) {
      console.log('No performers in sheet - nothing to sync');
      return; // Just return without doing anything
    }

    // Normal sync process when sheet has data - no confirmation needed

    setLoading(true);
    const episodeNumber = getEpisodeNumber();
    let deletedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    try {
      const result = await youtubeService.listBroadcasts(50);
      const existingBroadcasts = result.success ? result.broadcasts.filter(b => 
        b.snippet.title.includes('What Is Art?')
      ) : [];
      
      // Create a map of existing broadcasts by artist and song
      const existingMap = new Map();
      existingBroadcasts.forEach(broadcast => {
        const titleMatch = broadcast.snippet.title.match(/#(\d+), ([^,]+), (.+)$/);
        if (titleMatch) {
          const key = `${titleMatch[2].trim()}_${titleMatch[3].trim()}`;
          existingMap.set(key, broadcast);
        }
      });
      
      // Delete broadcasts that aren't in the current sheet
      for (const [key, broadcast] of existingMap) {
        const [artist, song] = key.split('_');
        const stillInSheet = performers.some(p => 
          p.artist === artist && 
          p.songs?.some(s => s.title === song)
        );
        
        if (!stillInSheet && 
            broadcast.status.lifeCycleStatus !== 'live' && 
            broadcast.status.lifeCycleStatus !== 'complete') {
          try {
            const deleteResult = await youtubeService.deleteBroadcast(broadcast.id);
            if (deleteResult.success) {
              deletedCount++;
              broadcastLowerThirdsMap.delete(broadcast.id);
            }
          } catch (error) {
            console.error('Error deleting broadcast:', error);
          }
        }
      }
      
      // Now create broadcasts for performers in sheet
      for (const performer of performers) {
        const songs = performer.songs || [];
        
        for (let i = 0; i < songs.length; i++) {
          const song = songs[i];
          if (!song.title || !song.title.trim()) continue;
          
          const key = `${performer.artist}_${song.title}`;
          const existing = existingMap.get(key);
          
          if (existing) {
            // Update our map with existing broadcast
            broadcastLowerThirdsMap.set(existing.id, {
              artist: performer.artist,
              songTitle: song.title,
              songWriter: song.writer || '',
              timeSlot: performer.timeSlot,
              episodeNumber: episodeNumber
            });
            skippedCount++;
            continue;
          }
          
          // Create new broadcast with automatic lower thirds mapping
          const createResult = await createBroadcastWithLowerThirds(performer, i);
          
          if (createResult && createResult.success) {
            createdCount++;
          }
        }
      }
      
      alert(
        `Sync complete!\n\n` +
        `Deleted: ${deletedCount} broadcasts (removed from sheet)\n` +
        `Created: ${createdCount} new broadcasts\n` +
        `Preserved: ${skippedCount} existing broadcasts\n\n` +
        `YouTube broadcasts are now mapped to lower thirds data.`
      );
      
      await loadBroadcasts();
      setScenesCreated(true);
    } catch (error) {
      console.error('Error syncing broadcasts:', error);
      alert('Error syncing broadcasts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const archiveBroadcast = async (broadcastId) => {
    if (!youtubeSignedIn) return;
    
    try {
      const broadcast = broadcasts.find(b => b.id === broadcastId);
      if (broadcast) {
        const result = await youtubeService.updateBroadcast(
          broadcastId,
          { privacy: 'private' }
        );
        
        if (result.success) {
          alert(`Broadcast "${broadcast.snippet.title}" archived (set to private)`);
          await loadBroadcasts();
        } else {
          alert('Failed to archive broadcast: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error archiving broadcast:', error);
      alert('Failed to archive broadcast: ' + error.message);
    }
  };

  const deleteBroadcast = async (broadcastId, status) => {
    if (!youtubeSignedIn || (status !== 'created' && status !== 'ready')) {
      alert('Can only delete broadcasts with status "created" or "ready"');
      return;
    }
    
    setLoading(true);
    try {
      const result = await youtubeService.deleteBroadcast(broadcastId);
      if (result.success) {
        // Remove from our map
        broadcastLowerThirdsMap.delete(broadcastId);
        await loadBroadcasts();
      } else {
        alert('Failed to delete broadcast: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      alert('Failed to delete broadcast: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllBroadcasts = async () => {
    if (!window.confirm('Are you sure you want to delete ALL broadcasts? This cannot be undone!')) {
      return;
    }
    
    setLoading(true);
    let deletedCount = 0;
    
    try {
      for (const broadcast of broadcasts) {
        if (broadcast.status.lifeCycleStatus === 'created' || 
            broadcast.status.lifeCycleStatus === 'ready') {
          const result = await youtubeService.deleteBroadcast(broadcast.id);
          if (result.success) {
            deletedCount++;
            // Clear from map
            broadcastLowerThirdsMap.delete(broadcast.id);
          }
        }
      }
      
      alert(`Deleted ${deletedCount} broadcasts`);
      await loadBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcasts:', error);
      alert('Error deleting broadcasts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Start broadcast handler
  const handleStartBroadcast = async (broadcastId) => {
    if (!obsConnected) {
      alert('Please connect to OBS first');
      return;
    }

    try {
      // Find the broadcast
      const broadcast = broadcasts.find(b => b.id === broadcastId);
      if (!broadcast) {
        alert('Broadcast not found');
        return;
      }

      // First, sync lower thirds
      await syncLowerThirdsFromBroadcast(broadcast);

      // Then transition broadcast to live
      const transitionResult = await youtubeService.transitionBroadcast(broadcastId, 'live');
      
      if (transitionResult.success) {
        setStreamingBroadcastId(broadcastId);
        
        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('Broadcast Started', {
            body: `Now live: ${broadcast.snippet.title}`,
            icon: '/logo192.png'
          });
        }
        
        // Refresh broadcast list to show updated status
        await loadBroadcasts();
      } else {
        alert('Failed to start broadcast: ' + transitionResult.error);
      }
    } catch (error) {
      console.error('Error starting broadcast:', error);
      alert('Error starting broadcast: ' + error.message);
    }
  };

  // End broadcast with transition
  const handleEndStreamWithTransition = async (broadcastId, title) => {
    try {
      // Clear lower thirds
      await lowerThirdsService.clearPerformer();
      
      // Transition to complete
      const result = await youtubeService.transitionBroadcast(broadcastId, 'complete');
      
      if (result.success) {
        setStreamingBroadcastId(null);
        await loadBroadcasts();
        
        // Handle automatic Up Next
        await handleAutomaticUpNext();
      }
    } catch (error) {
      console.error('Error ending broadcast:', error);
    }
  };

  // Stop broadcast handler
  const handleStopBroadcast = async () => {
    try {
      await obsWebSocketService.stopStreaming();
      setStreamingBroadcastId(null);
      
      // Clear lower thirds
      await lowerThirdsService.clearPerformer();
    } catch (error) {
      console.error('Error stopping broadcast:', error);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={gridBgStyle} />
      
      {/* On Air Indicator */}
      <OnAirIndicator
        streamStatus={streamStatus}
        obsConnected={obsConnected}
        activeIntermission={activeIntermission}
      />
      
      {/* Dashboard Header */}
      <DashboardHeader
        episodeNumber={getEpisodeNumber()}
        nextIntermission={nextIntermission}
        onLogout={handleLogout}
        cardStyle={cardStyle}
        titleStyle={titleStyle}
        secondaryButtonStyle={secondaryButtonStyle}
      />
      
      {/* Pre-Show Checklist */}
      <div style={{ padding: '0 40px', marginBottom: '20px' }}>
        <PreShowChecklist
          obsConnected={obsConnected}
          youtubeSignedIn={youtubeSignedIn}
          scenesCreated={scenesCreated}
          upNextSceneReady={upNextSceneReady}
          broadcastsCreated={broadcasts.length > 0}
          cardStyle={cardStyle}
        />
      </div>
      
      {/* Test Button - Remove this after testing */}
      {obsConnected && (
        <div style={{ padding: '0 40px', marginBottom: '10px' }}>
          <button
            onClick={testOBSFunctions}
            style={{
              background: '#FF5722',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🧪 Test OBS Connection
          </button>
        </div>
      )}
      
      {/* Connection Status Bar */}
      <ConnectionStatusBar
        obsConnected={obsConnected}
        youtubeSignedIn={youtubeSignedIn}
        youtubeUser={youtubeUser}
        loading={loading}
        performers={performers}
        activeIntermission={activeIntermission}
        cardStyle={cardStyle}
        buttonStyle={buttonStyle}
        secondaryButtonStyle={secondaryButtonStyle}
        onObsDisconnect={handleObsDisconnect}
        onShowObsConnect={() => setShowObsConnect(true)}
        onYoutubeSignOut={handleYoutubeSignOut}
        onShowYoutubeLogin={() => setShowYoutubeLogin(true)}
        onCreateIntermissionScenes={createIntermissionScenes}
        onStartIntermission={startIntermission}
        onCreateSongBroadcasts={createSongBroadcasts}
        onCreateUpNextScene={createUpNextScene}
      />
      
      {/* Broadcast List Section */}
      <BroadcastListSection
        youtubeSignedIn={youtubeSignedIn}
        broadcasts={broadcasts}
        performers={performers}
        loading={loading}
        streamingBroadcastId={streamingBroadcastId}
        setStreamingBroadcastId={setStreamingBroadcastId}
        obsConnected={obsConnected}
        activeIntermission={activeIntermission}
        cardStyle={cardStyle}
        secondaryButtonStyle={secondaryButtonStyle}
        sortBroadcastsByTimeSlot={sortBroadcastsByTimeSlot}
        onDeleteAllBroadcasts={deleteAllBroadcasts}
        onArchiveBroadcast={archiveBroadcast}
        onDeleteBroadcast={deleteBroadcast}
        onStartIntermission={startIntermission}
        onStartBroadcast={handleStartBroadcast}
        onEndStreamWithTransition={handleEndStreamWithTransition}
        onStopBroadcast={handleStopBroadcast}
      />
      
      {/* OBS Connect Modal */}
      <OBSConnectModal
        showObsConnect={showObsConnect}
        obsSettings={obsSettings}
        setObsSettings={setObsSettings}
        loading={loading}
        handleObsConnect={handleObsConnect}
        setShowObsConnect={setShowObsConnect}
        cardStyle={cardStyle}
        buttonStyle={buttonStyle}
        secondaryButtonStyle={secondaryButtonStyle}
      />
      
      {/* YouTube Sign In Modal */}
      <YouTubeSignInModal
        showYoutubeLogin={showYoutubeLogin}
        loading={loading}
        handleYoutubeSignIn={handleYoutubeSignIn}
        setShowYoutubeLogin={setShowYoutubeLogin}
        cardStyle={cardStyle}
        buttonStyle={buttonStyle}
        secondaryButtonStyle={secondaryButtonStyle}
      />
    </div>
  );
};

export default SimplifiedStaffDashboard;
