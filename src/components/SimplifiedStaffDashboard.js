/**
 * Filename: SimplifiedStaffDashboard.js
 * Component for managing YouTube broadcasts for What Is Art? live show
 * 
 * Features:
 * - Create individual YouTube broadcasts for each song
 * - Automatic lower thirds updates when broadcasts go live
 * - OBS WebSocket integration for instant start/stop detection
 * - Google Sheets performer data sync
 * - OPTIMIZED: Fast YouTube API response time tracking
 * - BULK DELETE: Select multiple completed broadcasts for deletion
 */

import React, { useState, useEffect } from 'react';
import obsWebSocketService from '../services/obsWebSocket';
import youtubeService from '../services/youtubeService';
import lowerThirdsService from '../services/lowerThirdsService';
import { logoutStaff } from '../utils/staffAuth';

// Google Sheets API endpoint for fetching performer data
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

const SimplifiedStaffDashboard = ({ onLogout }) => {
  // ===== STATE MANAGEMENT =====
  // Core data
  const [performers, setPerformers] = useState([]);        // List of performers from Google Sheets
  const [broadcasts, setBroadcasts] = useState([]);        // YouTube broadcasts
  
  // Connection states
  const [obsConnected, setObsConnected] = useState(false);
  const [youtubeSignedIn, setYoutubeSignedIn] = useState(false);
  
  // Active broadcast tracking
  const [streamingBroadcastId, setStreamingBroadcastId] = useState(null);
  const [lastLiveBroadcastId, setLastLiveBroadcastId] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [editingSongs, setEditingSongs] = useState({});   // Track which songs are in edit mode
  const [selectedBroadcasts, setSelectedBroadcasts] = useState(new Set());  // Track selected broadcasts for bulk delete

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Calculate the current episode number based on the base date
   * Episodes increment weekly starting from #120 on May 22, 2025
   */
  const getEpisodeNumber = () => {
    const baseDate = new Date('2025-05-22');
    const baseEpisode = 120;
    const currentDate = new Date();
    const weeksDiff = Math.floor((currentDate - baseDate) / (7 * 24 * 60 * 60 * 1000));
    return baseEpisode + weeksDiff;
  };

  // ===== DATA FETCHING FUNCTIONS =====
  
  /**
   * Fetch performers from Google Sheets
   * Normalizes the data format to ensure consistency
   */
  const fetchPerformers = async () => {
    try {
      setLoading(true);
      const response = await fetch(SCRIPT_URL + "?query=slots");
      const data = await response.json();
      
      if (data.takenSlots) {
        // Normalize data format (handles both string and object formats)
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
        
        // Count total songs
        const totalSongs = normalizedPerformers.reduce((total, performer) => {
          // Skip intermissions
          if (performer.timeSlot === '8:30' || performer.timeSlot === '9:30') {
            return total;
          }
          // Count songs, defaulting to 1 if no songs listed
          const songCount = performer.songs && performer.songs.length > 0 
            ? performer.songs.filter(s => s && s.title.trim()).length 
            : 1;
          return total + songCount;
        }, 0);
        
        setStatus(`Found ${totalSongs} songs by ${normalizedPerformers.length} performers`);
      }
    } catch (error) {
      console.error('Error fetching performers:', error);
      setStatus('Error fetching performers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load YouTube broadcasts - filtered for recent/current episode only
   * This is the default view showing relevant broadcasts
   */
  const loadBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    try {
      setLoading(true);
      const result = await youtubeService.listBroadcasts(50);
      
      // Check for quota errors
      if (!result.success) {
        if (result.quotaExceeded) {
          setStatus('⚠️ YouTube API quota exceeded - waiting for reset at midnight PT');
          return;
        } else {
          setStatus('❌ Error loading broadcasts: ' + result.error);
          return;
        }
      }
      
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
    } catch (error) {
      console.error('Error loading broadcasts:', error);
      setStatus('Error loading broadcasts');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load ALL broadcasts including old ones - sorted by date
   * Useful for viewing historical broadcasts or cleanup
   */
  const loadAllBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    try {
      setLoading(true);
      const result = await youtubeService.listBroadcasts(50);
      
      // Check for quota errors
      if (!result.success) {
        if (result.quotaExceeded) {
          setStatus('⚠️ YouTube API quota exceeded - waiting for reset at midnight PT');
          return;
        } else {
          setStatus('❌ Error loading broadcasts: ' + result.error);
          return;
        }
      }
      
      // Sort broadcasts by creation date - NEWEST FIRST
      const sortedBroadcasts = result.broadcasts.sort((a, b) => {
        const dateA = new Date(a.snippet.publishedAt);
        const dateB = new Date(b.snippet.publishedAt);
        return dateB - dateA; // Newest first (descending order)
      });
      
      setBroadcasts(sortedBroadcasts);
      setStatus(`Loaded ALL ${result.broadcasts.length} broadcasts (sorted by date, newest first)`);
    } catch (error) {
      console.error('Error loading all broadcasts:', error);
      setStatus('Error loading all broadcasts');
    } finally {
      setLoading(false);
    }
  };

  // ===== CONNECTION FUNCTIONS =====
  
  /**
   * Connect to OBS WebSocket
   * Default connection is localhost:4455 with no password
   */
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

  /**
   * Sign in to YouTube using OAuth
   * Opens Google sign-in popup
   */
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

  // ===== BROADCAST MANAGEMENT FUNCTIONS =====
  
  /**
   * Create a YouTube broadcast for a specific song
   * @param {Object} performer - Performer data
   * @param {Object} song - Song data
   * @param {number} songIndex - Index of the song in performer's list
   */
  const createSongBroadcast = async (performer, song, songIndex) => {
    if (!youtubeSignedIn) {
      alert('Please sign in to YouTube first');
      return;
    }

    setLoading(true);
    setStatus(`Creating broadcast for ${performer.artist} - ${song.title}...`);
    
    try {
      const episodeNumber = getEpisodeNumber();
      // Title format: What Is Art? #122 | Artist Name | Song Title
      const title = `What Is Art? #${episodeNumber} | ${performer.artist} | ${song.title}`;
      
      // Build description with all available info
      const description = `Episode #${episodeNumber}\nArtist: ${performer.artist}\nSong: ${song.title}\nTime Slot: ${performer.timeSlot}${song.writer ? `\nWritten by: ${song.writer}` : ''}`;
      
      // Create broadcast as unlisted by default
      const result = await youtubeService.createBroadcast(title, description, null, 'unlisted');
      
      if (result.success) {
        setStatus(`✅ Created broadcast: ${song.title}`);
        await loadBroadcasts(); // Refresh the list
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

  /**
   * Clean up old broadcasts that are stuck in "ready" status
   * Broadcasts older than 12 hours in ready status are considered stale
   */
  const cleanupOldReadyBroadcasts = async () => {
    if (!youtubeSignedIn) return;
    
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    // Find old ready broadcasts
    const oldReadyBroadcasts = broadcasts.filter(broadcast => {
      const createdDate = new Date(broadcast.snippet.publishedAt);
      return broadcast.status.lifeCycleStatus === 'ready' && createdDate < twelveHoursAgo;
    });
    
    if (oldReadyBroadcasts.length === 0) {
      setStatus('No old ready broadcasts to clean up');
      return;
    }
    
    // Confirm with user
    if (!window.confirm(`Found ${oldReadyBroadcasts.length} broadcasts older than 12 hours in "ready" status. Delete them?`)) {
      return;
    }
    
    setLoading(true);
    setStatus(`Cleaning up ${oldReadyBroadcasts.length} old broadcasts...`);
    
    let cleaned = 0;
    
    // Process each old broadcast
    for (const broadcast of oldReadyBroadcasts) {
      try {
        // YouTube requires broadcasts to be completed before deletion
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
        
        // Rate limiting to avoid API quota issues
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error cleaning up broadcast ${broadcast.snippet.title}:`, error);
      }
    }
    
    setStatus(`✅ Cleaned up ${cleaned} old broadcasts`);
    await loadBroadcasts(); // Refresh the list
    setLoading(false);
  };

  /**
   * Bulk delete selected completed broadcasts
   */
  const bulkDeleteSelectedBroadcasts = async () => {
    if (selectedBroadcasts.size === 0) {
      alert('No broadcasts selected');
      return;
    }

    const selectedArray = Array.from(selectedBroadcasts);
    const broadcastTitles = selectedArray.map(id => {
      const broadcast = broadcasts.find(b => b.id === id);
      return broadcast ? broadcast.snippet.title : id;
    });

    if (!window.confirm(`Delete ${selectedArray.length} selected broadcasts?\n\n${broadcastTitles.slice(0, 3).join('\n')}${selectedArray.length > 3 ? `\n...and ${selectedArray.length - 3} more` : ''}`)) {
      return;
    }

    setLoading(true);
    setStatus(`Deleting ${selectedArray.length} selected broadcasts...`);
    
    let deleted = 0;
    
    for (const broadcastId of selectedArray) {
      try {
        const result = await youtubeService.deleteBroadcast(broadcastId);
        if (result.success) {
          deleted++;
        }
        
        // Rate limiting to avoid API quota issues
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error deleting broadcast ${broadcastId}:`, error);
      }
    }
    
    setStatus(`✅ Deleted ${deleted} of ${selectedArray.length} broadcasts`);
    setSelectedBroadcasts(new Set()); // Clear selection
    await loadBroadcasts(); // Refresh the list
    setLoading(false);
  };

  /**
   * Toggle selection of a broadcast
   */
  const toggleBroadcastSelection = (broadcastId) => {
    const newSelected = new Set(selectedBroadcasts);
    if (newSelected.has(broadcastId)) {
      newSelected.delete(broadcastId);
    } else {
      newSelected.add(broadcastId);
    }
    setSelectedBroadcasts(newSelected);
  };

  /**
   * Select all completed broadcasts
   */
  const selectAllCompletedBroadcasts = () => {
    const completedIds = getCompletedBroadcasts().map(b => b.id);
    setSelectedBroadcasts(new Set(completedIds));
  };

  /**
   * Clear all selections
   */
  const clearAllSelections = () => {
    setSelectedBroadcasts(new Set());
  };

  // ===== DATA PROCESSING FUNCTIONS =====
  
  /**
   * Get all individual songs from all performers
   * Transforms performer data into a flat list of songs
   */
  const getAllSongs = () => {
    const allSongs = [];
    
    performers.forEach(performer => {
      // Skip intermission slots
      if (performer.timeSlot === '8:30' || performer.timeSlot === '9:30') {
        return;
      }

      // Ensure each performer has at least one song entry
      const songs = performer.songs && performer.songs.length > 0 
        ? performer.songs.filter(s => s && s.title.trim()) 
        : [{ title: 'Performance', writer: '' }];
      
      // Create an entry for each song
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

  /**
   * Check if a song already has a broadcast created
   * @param {Object} songData - Song data to check
   */
  const songHasBroadcast = (songData) => {
    if (!songData || !songData.artist || !songData.songTitle) return false;
    
    return broadcasts.some(broadcast => {
      const title = broadcast.snippet?.title || '';
      return title.includes(songData.artist) && title.includes(songData.songTitle);
    });
  };

  // ===== EDIT MODE FUNCTIONS =====
  
  /**
   * Toggle edit mode for a specific song
   * @param {string} songId - Unique song identifier
   */
  const toggleEditMode = (songId) => {
    setEditingSongs(prev => ({
      ...prev,
      [songId]: !prev[songId]
    }));
  };

  /**
   * Update song data when in edit mode
   * @param {string} songId - Unique song identifier
   * @param {string} field - Field to update (title, writer)
   * @param {string} value - New value
   */
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

  /**
   * Update performer data when in edit mode
   * @param {string} songId - Song identifier (used to find performer)
   * @param {string} field - Field to update (artist, timeSlot)
   * @param {string} value - New value
   */
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

  /**
   * Find the active broadcast that's currently being streamed to
   * Looks for broadcasts in "ready" status that are about to go live
   */
  const findActiveBroadcastForStream = async () => {
    try {
      const result = await youtubeService.listBroadcasts(10);
      
      if (!result.success) {
        console.error('Could not fetch broadcasts to find active stream');
        return null;
      }
      
      // Look for broadcasts that are ready to stream (most likely candidates)
      const readyBroadcasts = result.broadcasts.filter(
        broadcast => broadcast.status.lifeCycleStatus === 'ready'
      );
      
      // If we have ready broadcasts, find the most recently created one
      // (most likely to be the one selected in OBS)
      if (readyBroadcasts.length > 0) {
        const mostRecent = readyBroadcasts.sort((a, b) => {
          const dateA = new Date(a.snippet.publishedAt);
          const dateB = new Date(b.snippet.publishedAt);
          return dateB - dateA; // Most recent first
        })[0];
        
        console.log(`📍 [${new Date().toISOString()}] Selected most recent ready broadcast: "${mostRecent.snippet.title}"`);
        return mostRecent;
      }
      
      // Fallback: Look for any testing broadcasts
      const testingBroadcasts = result.broadcasts.filter(
        broadcast => broadcast.status.lifeCycleStatus === 'testing'
      );
      
      if (testingBroadcasts.length > 0) {
        console.log(`📍 [${new Date().toISOString()}] Found testing broadcast: "${testingBroadcasts[0].snippet.title}"`);
        return testingBroadcasts[0];
      }
      
      console.log(`📍 [${new Date().toISOString()}] No ready or testing broadcasts found`);
      return null;
      
    } catch (error) {
      console.error('Error finding active broadcast:', error);
      return null;
    }
  };

  // ===== LIVE BROADCAST MONITORING =====
  
  /**
   * Check for live broadcasts and update lower thirds automatically
   * OPTIMIZED VERSION with DETAILED TIMING ANALYSIS
   */
  const checkForLiveBroadcast = async () => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`🕐 [${timestamp}] Starting broadcast check...`);
    
    try {
      // Get current broadcasts
      const apiCallStart = Date.now();
      const result = await youtubeService.listBroadcasts(10);
      const apiCallEnd = Date.now();
      
      const responseTime = apiCallEnd - startTime;
      console.log(`📡 [${new Date().toISOString()}] YouTube API response time: ${responseTime}ms`);
      
      // Check for quota errors - don't clear lower thirds on quota errors!
      if (!result.success) {
        if (result.quotaExceeded) {
          console.log('⚠️ YouTube API quota exceeded - maintaining current state');
          setStatus('⚠️ YouTube API quota exceeded - waiting for reset at midnight PT');
          return; // Don't change anything
        }
        console.error('❌ YouTube API error:', result.error);
        return;
      }
      
      // Log ALL broadcast statuses for analysis
      console.log(`📊 [${new Date().toISOString()}] Found ${result.broadcasts.length} broadcasts:`);
      result.broadcasts.forEach((broadcast, index) => {
        console.log(`   ${index + 1}. "${broadcast.snippet.title}" - Status: ${broadcast.status.lifeCycleStatus}`);
      });
      
      // Find any live or testing broadcast
      const liveBroadcast = result.broadcasts.find(
        broadcast => broadcast.status.lifeCycleStatus === 'live' || broadcast.status.lifeCycleStatus === 'testing'
      );
      
      if (liveBroadcast) {
        console.log(`🎯 [${new Date().toISOString()}] Found ${liveBroadcast.status.lifeCycleStatus} broadcast: "${liveBroadcast.snippet.title}"`);
        
        if (liveBroadcast.id !== lastLiveBroadcastId) {
          // Handle new live broadcast
          console.log(`🚨 [${new Date().toISOString()}] NEW ${liveBroadcast.status.lifeCycleStatus.toUpperCase()} BROADCAST DETECTED!`);
          console.log(`   Previous ID: ${lastLiveBroadcastId}`);
          console.log(`   New ID: ${liveBroadcast.id}`);
          
          setLastLiveBroadcastId(liveBroadcast.id);
          setStreamingBroadcastId(liveBroadcast.id);
          
          // Parse and update lower thirds...
          const parseStart = Date.now();
          const titleMatch = liveBroadcast.snippet.title.match(/What Is Art\? #\d+ \| (.+) \| (.+)$/);
          
          if (titleMatch) {
            const [, artist, songTitle] = titleMatch;
            const description = liveBroadcast.snippet.description || '';
            const writerMatch = description.match(/Written by: (.+)/m);
            const timeSlotMatch = description.match(/Time Slot: (.+)/m);
            
            const performerData = {
              artist: artist.trim(),
              songTitle: songTitle.trim(),
              songWriter: writerMatch ? writerMatch[1].trim() : '',
              timeSlot: timeSlotMatch ? timeSlotMatch[1].trim() : '',
              isIntermission: false
            };
            
            const parseTime = Date.now() - parseStart;
            console.log(`🎭 [${new Date().toISOString()}] Parsed performer data in ${parseTime}ms:`, performerData);
            
            try {
              const lowerThirdsStart = Date.now();
              console.log(`📺 [${new Date().toISOString()}] Sending to lower thirds service...`);
              
              await lowerThirdsService.updatePerformer(performerData);
              
              const lowerThirdsTime = Date.now() - lowerThirdsStart;
              console.log(`✅ [${new Date().toISOString()}] Lower thirds updated in ${lowerThirdsTime}ms`);
              
              const totalTime = Date.now() - startTime;
              console.log(`⏱️ [${new Date().toISOString()}] TOTAL TIME FROM START TO LOWER THIRDS: ${totalTime}ms`);
              
              setStatus(`🔴 ${liveBroadcast.status.lifeCycleStatus === 'testing' ? 'Testing' : 'Live'}: ${performerData.artist} - ${performerData.songTitle}`);
            } catch (error) {
              console.error(`❌ [${new Date().toISOString()}] Error updating lower thirds:`, error);
            }
          } else {
            console.error(`❌ [${new Date().toISOString()}] Could not parse broadcast title: "${liveBroadcast.snippet.title}"`);
          }
        } else {
          // Same broadcast still live - no action needed
          console.log(`✓ [${new Date().toISOString()}] Same broadcast still ${liveBroadcast.status.lifeCycleStatus}, no action needed`);
        }
      } else {
        console.log(`📭 [${new Date().toISOString()}] No live/testing broadcasts found`);
        
        if (lastLiveBroadcastId) {
          // Stream ended - NO live broadcasts found
          console.log(`🛑 [${new Date().toISOString()}] Previous broadcast ended - clearing lower thirds`);
          setLastLiveBroadcastId(null);
          setStreamingBroadcastId(null);
          
          // Clear lower thirds immediately
          try {
            const clearStart = Date.now();
            await lowerThirdsService.clearPerformer();
            const clearTime = Date.now() - clearStart;
            console.log(`🧹 [${new Date().toISOString()}] Lower thirds cleared in ${clearTime}ms`);
            setStatus('No live streams - Lower thirds cleared');
          } catch (error) {
            console.error(`❌ [${new Date().toISOString()}] Error clearing lower thirds:`, error);
          }
        }
      }
      
      const totalCheckTime = Date.now() - startTime;
      console.log(`🏁 [${new Date().toISOString()}] Broadcast check completed in ${totalCheckTime}ms\n`);
      
    } catch (error) {
      console.error(`💥 [${new Date().toISOString()}] Error checking for live broadcast:`, error);
      // Don't clear lower thirds on network errors
    }
  };

  // ===== LOWER THIRDS INTEGRATION =====
  
  /**
   * Handle OBS scene changes - automatically update lower thirds
   * @param {string} sceneName - Name of the scene that was switched to
   */
  const handleSceneChange = async (sceneName) => {
    console.log('Scene changed to:', sceneName);
    
    // Handle specific scene types
    if (sceneName.toLowerCase().includes('intermission')) {
      // Handle intermission scenes
      try {
        await lowerThirdsService.showIntermission('');
        console.log('Lower thirds set to intermission');
        setStatus('Lower thirds: Intermission');
      } catch (error) {
        console.error('Error setting intermission:', error);
      }
    } else if (sceneName.toLowerCase().includes('commercial') || sceneName.toLowerCase().includes('interstitial')) {
      // Clear lower thirds during commercials
      try {
        await lowerThirdsService.clearPerformer();
        console.log('Lower thirds cleared for commercial');
        setStatus('Lower thirds cleared');
      } catch (error) {
        console.error('Error clearing lower thirds:', error);
      }
    }
  };

  // ===== INITIALIZATION =====
  
  // Initialize services and fetch data on component mount
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize YouTube API
        await youtubeService.init();
        const signedIn = youtubeService.isSignedIn;
        setYoutubeSignedIn(signedIn);
        
        // If already signed in, load broadcasts and start monitoring
        if (signedIn) {
          await loadBroadcasts();
        }
      } catch (error) {
        console.error('Failed to initialize YouTube:', error);
      }
    };

    initializeServices();
    fetchPerformers();
    
    // Set up OBS connection listener
    const unsubscribe = obsWebSocketService.onConnectionChange(setObsConnected);
    
    // Set up OBS scene change listener for auto lower thirds
    const unsubscribeScene = obsWebSocketService.onSceneChange(async (sceneName) => {
      await handleSceneChange(sceneName);
    });
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeScene();
    };
  }, []);

  // Monitor for live broadcasts when YouTube is connected (only if OBS not handling it)
  useEffect(() => {
    if (!youtubeSignedIn) return;
    
    // If OBS is connected, let OBS handle the monitoring for faster response
    if (obsConnected) {
      console.log(`🎬 [${new Date().toISOString()}] OBS connected - using OBS monitoring instead of YouTube polling`);
      return;
    }
    
    console.log(`🎬 [${new Date().toISOString()}] Starting YouTube broadcast monitoring (OBS not connected)...`);
    
    // Check for live broadcasts every 1 second for faster detection
    const interval = setInterval(async () => {
      await checkForLiveBroadcast();
    }, 1000); // Reduced from 2000ms to 1000ms for faster detection
    
    // Initial check
    checkForLiveBroadcast();
    
    return () => {
      console.log(`🎬 [${new Date().toISOString()}] Stopping YouTube broadcast monitoring`);
      clearInterval(interval);
    };
  }, [youtubeSignedIn, obsConnected, lastLiveBroadcastId]);

  // Monitor OBS streaming status for instant lower thirds start/stop
  useEffect(() => {
    if (!obsConnected || !youtubeSignedIn) return;
    
    console.log(`🎛️ [${new Date().toISOString()}] Starting OBS streaming status monitoring...`);
    
    let wasStreaming = false;
    
    const checkOBSStreaming = async () => {
      try {
        const streamStatus = await obsWebSocketService.getStreamingStatus();
        
        if (streamStatus) {
          const isStreamingNow = streamStatus.streaming;
          
          // STREAM STARTED: If we weren't streaming but now we are
          if (!wasStreaming && isStreamingNow) {
            console.log(`🚀 [${new Date().toISOString()}] OBS started streaming - finding active broadcast for lower thirds!`);
            
            try {
              // Find the currently selected broadcast for this stream
              const activeBroadcast = await findActiveBroadcastForStream();
              
              if (activeBroadcast) {
                console.log(`📺 [${new Date().toISOString()}] Found active broadcast: "${activeBroadcast.snippet.title}"`);
                
                // Parse broadcast data for lower thirds
                const parseStart = Date.now();
                const titleMatch = activeBroadcast.snippet.title.match(/What Is Art\? #\d+ \| (.+) \| (.+)$/);
                
                if (titleMatch) {
                  const [, artist, songTitle] = titleMatch;
                  const description = activeBroadcast.snippet.description || '';
                  const writerMatch = description.match(/Written by: (.+)/m);
                  const timeSlotMatch = description.match(/Time Slot: (.+)/m);
                  
                  const performerData = {
                    artist: artist.trim(),
                    songTitle: songTitle.trim(),
                    songWriter: writerMatch ? writerMatch[1].trim() : '',
                    timeSlot: timeSlotMatch ? timeSlotMatch[1].trim() : '',
                    isIntermission: false
                  };
                  
                  const parseTime = Date.now() - parseStart;
                  console.log(`🎭 [${new Date().toISOString()}] Parsed performer data in ${parseTime}ms:`, performerData);
                  
                  // Update lower thirds immediately
                  const lowerThirdsStart = Date.now();
                  await lowerThirdsService.updatePerformer(performerData);
                  const lowerThirdsTime = Date.now() - lowerThirdsStart;
                  
                  console.log(`✅ [${new Date().toISOString()}] Lower thirds updated via OBS start in ${lowerThirdsTime}ms`);
                  
                  // Track the broadcast
                  setLastLiveBroadcastId(activeBroadcast.id);
                  setStreamingBroadcastId(activeBroadcast.id);
                  setStatus(`🚀 Streaming started: ${performerData.artist} - ${performerData.songTitle}`);
                } else {
                  console.error(`❌ [${new Date().toISOString()}] Could not parse broadcast title: "${activeBroadcast.snippet.title}"`);
                }
              } else {
                console.log(`⚠️ [${new Date().toISOString()}] No active broadcast found - streaming without lower thirds`);
                setStatus('🚀 Streaming started - No broadcast selected');
              }
            } catch (error) {
              console.error(`❌ [${new Date().toISOString()}] Error starting lower thirds via OBS:`, error);
            }
          }
          
          // STREAM STOPPED: If we were streaming but now we're not, and we have lower thirds showing
          if (wasStreaming && !isStreamingNow && lastLiveBroadcastId) {
            console.log(`🛑 [${new Date().toISOString()}] OBS stopped streaming - clearing lower thirds immediately!`);
            
            try {
              const clearStart = Date.now();
              await lowerThirdsService.clearPerformer();
              const clearTime = Date.now() - clearStart;
              console.log(`🧹 [${new Date().toISOString()}] Lower thirds cleared via OBS stop in ${clearTime}ms`);
              
              // Reset tracking variables
              setLastLiveBroadcastId(null);
              setStreamingBroadcastId(null);
              setStatus('🛑 Stream stopped in OBS - Lower thirds cleared');
            } catch (error) {
              console.error(`❌ [${new Date().toISOString()}] Error clearing lower thirds via OBS stop:`, error);
            }
          }
          
          wasStreaming = isStreamingNow;
        }
      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error checking OBS streaming status:`, error);
      }
    };
    
    // Check OBS streaming status every 1 second for faster response
    const obsInterval = setInterval(checkOBSStreaming, 1000);
    
    // Initial check
    checkOBSStreaming();
    
    return () => {
      console.log(`🎛️ [${new Date().toISOString()}] Stopping OBS streaming status monitoring`);
      clearInterval(obsInterval);
    };
  }, [obsConnected, youtubeSignedIn, lastLiveBroadcastId]);

  // ===== COMPUTED VALUES =====
  
  // Get all songs
  const allSongs = performers.length > 0 ? getAllSongs() : [];

  // Get broadcasts by status
  const getReadyBroadcasts = () => {
    if (!broadcasts || broadcasts.length === 0) return [];
    return broadcasts.filter(broadcast => 
      broadcast?.status?.lifeCycleStatus === 'ready' || 
      broadcast?.status?.lifeCycleStatus === 'created'
    );
  };

  const getCompletedBroadcasts = () => {
    if (!broadcasts || broadcasts.length === 0) return [];
    return broadcasts.filter(broadcast => 
      broadcast?.status?.lifeCycleStatus === 'complete'
    );
  };

  const getLiveBroadcasts = () => {
    if (!broadcasts || broadcasts.length === 0) return [];
    return broadcasts.filter(broadcast => 
      broadcast?.status?.lifeCycleStatus === 'live'
    );
  };

  const readyBroadcasts = getReadyBroadcasts();
  const completedBroadcasts = getCompletedBroadcasts();
  const liveBroadcasts = getLiveBroadcasts();

  // ===== STYLES =====
  
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
               status.includes('🔴') ? 'rgba(244, 67, 54, 0.2)' :
               status.includes('⚠️') ? 'rgba(255, 193, 7, 0.2)' :
               'rgba(33, 150, 243, 0.2)',
    border: `1px solid ${status.includes('✅') ? '#4CAF50' : 
                          status.includes('❌') ? '#f44336' : 
                          status.includes('🔴') ? '#f44336' : 
                          status.includes('⚠️') ? '#FFC107' : '#2196F3'}`,
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const editInputStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '6px 10px',
    color: 'white',
    fontSize: '14px'
  };

  const editButtonStyle = {
    background: 'transparent',
    border: '1px solid',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  // ===== RENDER =====
  
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#0a0a0a',
      color: 'white',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header Section */}
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

      {/* Status Display */}
      {status && (
        <div style={statusStyle}>
          <span>{status}</span>
          {/* Add response time indicator */}
          {status.includes('Live:') && (
            <span style={{ 
              fontSize: '12px', 
              opacity: 0.7 
            }}>
              Check console for API response times
            </span>
          )}
        </div>
      )}

      {/* Quick Setup Section */}
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
          
          {/* Manual Clear Lower Thirds Button */}
          <button
            onClick={async () => {
              try {
                await lowerThirdsService.clearPerformer();
                setStatus('✅ Lower thirds cleared manually');
                console.log('Lower thirds cleared manually');
              } catch (error) {
                console.error('Error clearing lower thirds:', error);
                setStatus('❌ Failed to clear lower thirds');
              }
            }}
            style={{
              ...buttonStyle,
              background: '#607D8B',
              opacity: 1
            }}
          >
            🧹 Clear Lower Thirds
          </button>
        </div>
        
        {/* Auto Lower Thirds Status */}
        {youtubeSignedIn && obsConnected && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(156, 39, 176, 0.1)',
            border: '1px solid #9C27B0',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#E1BEE7'
          }}>
            🎯 <strong>Auto Lower Thirds:</strong> Active - Using OBS WebSocket for instant response
            {lastLiveBroadcastId && 
              <span style={{ marginLeft: '10px', color: '#4CAF50' }}>
                🔴 Currently showing performer info
              </span>
            }
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#aaa' }}>
              Lower thirds appear when OBS starts streaming • Clear when OBS stops streaming
            </div>
          </div>
        )}
        
        {youtubeSignedIn && !obsConnected && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid #FFC107',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#FFF8E1'
          }}>
            ⚠️ <strong>Auto Lower Thirds:</strong> YouTube only - Connect OBS for instant response
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#aaa' }}>
              Currently using YouTube API polling (slower response)
            </div>
          </div>
        )}
      </div>

      {/* Individual Songs Section - Create Broadcasts */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#FFC107', margin: 0 }}>
            🎵 Ready to Create Broadcasts ({allSongs.length})
          </h2>
          
          <button
            onClick={fetchPerformers}
            disabled={loading}
            style={{
              background: '#FFC107',
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            🔄 Refresh
          </button>
        </div>
        
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
                      // Edit Mode UI
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ 
                            padding: '6px 10px',
                            background: 'rgba(233, 30, 99, 0.2)',
                            border: '1px solid #e91e63',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#e91e63',
                            minWidth: '80px',
                            textAlign: 'center'
                          }}>
                            {songData.timeSlot}
                          </span>
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
                      // View Mode UI
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

      {/* Broadcast Loading Controls */}
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

      {/* Live Broadcasts Section (if any) */}
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

      {/* Ready Broadcasts Section */}
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
                      {isOld && <span style={{ color: '#FFC107', marginLeft: '10px' }}>⚠️ OLD (&gt;12h)</span>}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete broadcast: ${broadcast.snippet.title}?`)) {
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

      {/* Completed Broadcasts Section with Bulk Delete */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#9C27B0', margin: 0 }}>
            ✅ Completed Broadcasts ({completedBroadcasts.length})
          </h2>
          
          {/* Bulk Actions */}
          {completedBroadcasts.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: '14px' }}>
                {selectedBroadcasts.size > 0 && `${selectedBroadcasts.size} selected`}
              </span>
              
              <button
                onClick={selectAllCompletedBroadcasts}
                disabled={selectedBroadcasts.size === completedBroadcasts.length}
                style={{
                  ...buttonStyle,
                  background: '#607D8B',
                  padding: '6px 12px',
                  fontSize: '12px',
                  opacity: selectedBroadcasts.size === completedBroadcasts.length ? 0.5 : 1
                }}
              >
                Select All
              </button>
              
              <button
                onClick={clearAllSelections}
                disabled={selectedBroadcasts.size === 0}
                style={{
                  ...buttonStyle,
                  background: '#666',
                  padding: '6px 12px',
                  fontSize: '12px',
                  opacity: selectedBroadcasts.size === 0 ? 0.5 : 1
                }}
              >
                Clear
              </button>
              
              <button
                onClick={bulkDeleteSelectedBroadcasts}
                disabled={selectedBroadcasts.size === 0 || loading}
                style={{
                  ...buttonStyle,
                  background: selectedBroadcasts.size === 0 || loading ? '#666' : '#f44336',
                  padding: '6px 12px',
                  fontSize: '12px',
                  opacity: selectedBroadcasts.size === 0 || loading ? 0.5 : 1
                }}
              >
                🗑️ Delete Selected ({selectedBroadcasts.size})
              </button>
            </div>
          )}
        </div>
        
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
            {completedBroadcasts.map(broadcast => {
              const isSelected = selectedBroadcasts.has(broadcast.id);
              
              return (
                <div
                  key={broadcast.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: isSelected ? 'rgba(156, 39, 176, 0.2)' : 'rgba(156, 39, 176, 0.1)',
                    border: isSelected ? '2px solid #9C27B0' : '1px solid #9C27B0',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBroadcastSelection(broadcast.id)}
                      style={{
                        transform: 'scale(1.2)',
                        accentColor: '#9C27B0',
                        cursor: 'pointer'
                      }}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {broadcast.snippet.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>
                        Completed: {new Date(broadcast.snippet.publishedAt).toLocaleDateString()} | 
                        Privacy: {broadcast.status.privacyStatus}
                      </div>
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
                        padding: '6px 12px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      📺 Watch
                    </a>
                    
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete this completed broadcast?')) {
                          setLoading(true);
                          const result = await youtubeService.deleteBroadcast(broadcast.id);
                          if (result.success) {
                            setStatus('✅ Broadcast deleted');
                            setSelectedBroadcasts(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(broadcast.id);
                              return newSet;
                            });
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
                        padding: '6px 12px',
                        fontSize: '12px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
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