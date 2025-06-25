// src/services/youtubeService.js
import { gapi } from 'gapi-script';

const YOUTUBE_API_KEY = 'AIzaSyCAeJPFyP783eF-IcBzuziEs1fzF9oXLFQ';
const YOUTUBE_CLIENT_ID = '519208066582-a2o1g2q7taev8u8fpg5nr7htmopvrkuv.apps.googleusercontent.com';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/youtube';

class YouTubeService {
  constructor() {
    this.isInitialized = false;
    this.isSignedIn = false;
    this.initPromise = null;
  }

  // Initialize the Google API client
  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: YOUTUBE_API_KEY,
            clientId: YOUTUBE_CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          });

          // Listen for sign-in state changes
          gapi.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
            this.isSignedIn = isSignedIn;
          });

          // Handle initial sign-in state
          this.isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
          this.isInitialized = true;
          
          resolve(true);
        } catch (error) {
          console.error('Error initializing YouTube API:', error);
          reject(error);
        }
      });
    });

    return this.initPromise;
  }

  // Sign in to YouTube
  async signIn() {
    if (!this.isInitialized) await this.init();
    
    try {
      const googleAuth = gapi.auth2.getAuthInstance();
      const googleUser = await googleAuth.signIn();
      const profile = googleUser.getBasicProfile();
      
      return {
        success: true,
        user: {
          name: profile.getName(),
          email: profile.getEmail(),
          imageUrl: profile.getImageUrl()
        }
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  // Sign out from YouTube
  async signOut() {
    if (!this.isInitialized) return;
    
    try {
      await gapi.auth2.getAuthInstance().signOut();
      this.isSignedIn = false;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user info
  getCurrentUser() {
    if (!this.isSignedIn) return null;
    
    const googleUser = gapi.auth2.getAuthInstance().currentUser.get();
    const profile = googleUser.getBasicProfile();
    
    return {
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl()
    };
  }

  // Create a YouTube broadcast
  async createBroadcast(title, description, scheduledStartTime = null, privacy = 'unlisted') {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      // Create the broadcast
      const broadcastResponse = await gapi.client.youtube.liveBroadcasts.insert({
        part: 'snippet,status,contentDetails',
        resource: {
          snippet: {
            title: title,
            description: description,
            scheduledStartTime: scheduledStartTime || new Date().toISOString()
          },
          status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            recordFromStart: true,
            enableDvr: true
          }
        }
      });

      const broadcastId = broadcastResponse.result.id;

      // Create a stream
      const streamResponse = await gapi.client.youtube.liveStreams.insert({
        part: 'snippet,cdn',
        resource: {
          snippet: {
            title: `Stream for ${title}`
          },
          cdn: {
            resolution: '1080p',
            frameRate: '30fps',
            ingestionType: 'rtmp'
          }
        }
      });

      const streamId = streamResponse.result.id;
      const streamKey = streamResponse.result.cdn.ingestionInfo.streamName;
      const ingestionAddress = streamResponse.result.cdn.ingestionInfo.ingestionAddress;

      // Bind the stream to the broadcast
      await gapi.client.youtube.liveBroadcasts.bind({
        part: 'id,contentDetails',
        id: broadcastId,
        streamId: streamId
      });

      return {
        success: true,
        broadcastId: broadcastId,
        streamId: streamId,
        streamKey: streamKey,
        ingestionAddress: ingestionAddress,
        rtmpUrl: `${ingestionAddress}/${streamKey}`,
        watchUrl: `https://www.youtube.com/watch?v=${broadcastId}`
      };

    } catch (error) {
      console.error('Error creating broadcast:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // List user's broadcasts
async listBroadcasts(maxResults = 10) {
  if (!this.isSignedIn) {
    return { success: false, error: 'Not signed in to YouTube' };
  }

  try {
    const response = await gapi.client.youtube.liveBroadcasts.list({
      part: 'snippet,status',
      mine: true,
      maxResults: maxResults,
      broadcastType: 'all'
    });

    return {
      success: true,
      broadcasts: response.result.items || []
    };

  } catch (error) {
    console.error('Error listing broadcasts:', error);
    
    // Check for quota errors
    if (error.status === 403 && error.result?.error?.errors?.[0]?.reason === 'quotaExceeded') {
      return { 
        success: false, 
        error: 'YouTube API quota exceeded. Resets at midnight PT.',
        quotaExceeded: true
      };
    }
    
    return { 
      success: false, 
      error: error.result?.error?.message || error.message 
    };
  }
}

  // Get stream key for a broadcast
  async getStreamKey(broadcastId) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      // First get the broadcast to find the bound stream
      const broadcastResponse = await gapi.client.youtube.liveBroadcasts.list({
        part: 'contentDetails',
        id: broadcastId
      });

      if (!broadcastResponse.result.items || broadcastResponse.result.items.length === 0) {
        return { success: false, error: 'Broadcast not found' };
      }

      const streamId = broadcastResponse.result.items[0].contentDetails.boundStreamId;
      
      if (!streamId) {
        return { success: false, error: 'No stream bound to this broadcast' };
      }

      // Get the stream details
      const streamResponse = await gapi.client.youtube.liveStreams.list({
        part: 'cdn',
        id: streamId
      });

      if (!streamResponse.result.items || streamResponse.result.items.length === 0) {
        return { success: false, error: 'Stream not found' };
      }

      const stream = streamResponse.result.items[0];
      
      return {
        success: true,
        streamKey: stream.cdn.ingestionInfo.streamName,
        ingestionAddress: stream.cdn.ingestionInfo.ingestionAddress,
        rtmpUrl: `${stream.cdn.ingestionInfo.ingestionAddress}/${stream.cdn.ingestionInfo.streamName}`
      };

    } catch (error) {
      console.error('Error getting stream key:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // Update broadcast
  async updateBroadcast(broadcastId, updates) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      // Get current broadcast data
      const currentBroadcast = await gapi.client.youtube.liveBroadcasts.list({
        part: 'snippet,status',
        id: broadcastId
      });

      if (!currentBroadcast.result.items || currentBroadcast.result.items.length === 0) {
        return { success: false, error: 'Broadcast not found' };
      }

      const broadcast = currentBroadcast.result.items[0];
      
      // Update fields
      if (updates.title) broadcast.snippet.title = updates.title;
      if (updates.description) broadcast.snippet.description = updates.description;
      if (updates.privacy) broadcast.status.privacyStatus = updates.privacy;
      if (updates.privacyStatus) broadcast.status.privacyStatus = updates.privacyStatus; // Support both

      // Update the broadcast
      const response = await gapi.client.youtube.liveBroadcasts.update({
        part: 'snippet,status',
        resource: broadcast
      });

      return {
        success: true,
        broadcast: response.result
      };

    } catch (error) {
      console.error('Error updating broadcast:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // Delete a broadcast
  async deleteBroadcast(broadcastId) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      await gapi.client.youtube.liveBroadcasts.delete({
        id: broadcastId
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting broadcast:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // Transition broadcast to different status (testing, live, complete)
  async transitionBroadcast(broadcastId, status) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      const response = await gapi.client.youtube.liveBroadcasts.transition({
        broadcastStatus: status,
        id: broadcastId,
        part: 'id,status'
      });

      return {
        success: true,
        broadcast: response.result
      };
    } catch (error) {
      console.error('Error transitioning broadcast:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // Get broadcast details including parsed lower thirds data
  async getBroadcastDetails(broadcastId) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      const response = await gapi.client.youtube.liveBroadcasts.list({
        part: 'snippet,status',
        id: broadcastId
      });

      if (response.result.items && response.result.items.length > 0) {
        const broadcast = response.result.items[0];
        
        // Parse the title to extract performer info
        // Format: "What Is Art? #122, Artist Name, Song Title"
        const titleMatch = broadcast.snippet.title.match(/What Is Art\? #(\d+), ([^,]+), (.+)/);
        
        if (titleMatch) {
          const [, episodeNumber, artist, songTitle] = titleMatch;
          
          // Parse description to get writer info
          const writerMatch = broadcast.snippet.description.match(/Written by: (.+)/m);
          const writer = writerMatch ? writerMatch[1].trim() : '';
          
          // Parse time slot from description
          const timeSlotMatch = broadcast.snippet.description.match(/Time Slot: (.+)/m);
          const timeSlot = timeSlotMatch ? timeSlotMatch[1].trim() : '';
          
          return {
            success: true,
            broadcastId: broadcast.id,
            title: broadcast.snippet.title,
            description: broadcast.snippet.description,
            status: broadcast.status.lifeCycleStatus,
            parsedData: {
              episodeNumber: parseInt(episodeNumber),
              artist: artist.trim(),
              songTitle: songTitle.trim(),
              writer: writer,
              timeSlot: timeSlot
            }
          };
        }
      }
      
      return { success: false, error: 'Broadcast not found or title format unrecognized' };
    } catch (error) {
      console.error('Error getting broadcast details:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // NEW METHOD: Get broadcast status including stream status
  async getBroadcastStatus(broadcastId) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      const response = await gapi.client.youtube.liveBroadcasts.list({
        part: 'snippet,status,contentDetails',
        id: broadcastId
      });

      if (response.result.items && response.result.items.length > 0) {
        const broadcast = response.result.items[0];
        
        return {
          success: true,
          broadcastId: broadcast.id,
          title: broadcast.snippet.title,
          description: broadcast.snippet.description,
          lifeCycleStatus: broadcast.status.lifeCycleStatus,
          privacyStatus: broadcast.status.privacyStatus,
          recordingStatus: broadcast.status.recordingStatus,
          streamStatus: broadcast.contentDetails?.streamStatus || 'unknown',
          actualStartTime: broadcast.snippet.actualStartTime,
          actualEndTime: broadcast.snippet.actualEndTime,
          scheduledStartTime: broadcast.snippet.scheduledStartTime
        };
      }
      
      return { success: false, error: 'Broadcast not found' };
    } catch (error) {
      console.error('Error getting broadcast status:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // NEW METHOD: Check if broadcast is currently live
  async isBroadcastLive(broadcastId) {
    const status = await this.getBroadcastStatus(broadcastId);
    return status.success && status.lifeCycleStatus === 'live';
  }

  // NEW METHOD: Get detailed stream health information
  async getStreamHealth(broadcastId) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      // Get broadcast details first
      const broadcastStatus = await this.getBroadcastStatus(broadcastId);
      if (!broadcastStatus.success) {
        return broadcastStatus;
      }

      // Get the bound stream ID
      const broadcastResponse = await gapi.client.youtube.liveBroadcasts.list({
        part: 'contentDetails',
        id: broadcastId
      });

      if (!broadcastResponse.result.items || broadcastResponse.result.items.length === 0) {
        return { success: false, error: 'Broadcast not found' };
      }

      const streamId = broadcastResponse.result.items[0].contentDetails.boundStreamId;
      
      if (!streamId) {
        return { 
          success: true, 
          ...broadcastStatus,
          streamHealth: 'No stream bound',
          streamId: null
        };
      }

      // Get stream health
      const streamResponse = await gapi.client.youtube.liveStreams.list({
        part: 'status,cdn',
        id: streamId
      });

      if (streamResponse.result.items && streamResponse.result.items.length > 0) {
        const stream = streamResponse.result.items[0];
        
        return {
          success: true,
          ...broadcastStatus,
          streamId: streamId,
          streamHealth: stream.status?.streamStatus || 'unknown',
          ingestionInfo: stream.cdn?.ingestionInfo || null
        };
      }
      
      return {
        success: true,
        ...broadcastStatus,
        streamId: streamId,
        streamHealth: 'Stream not found'
      };

    } catch (error) {
      console.error('Error getting stream health:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }

  // NEW METHOD: Monitor broadcast status with callback
  startStatusMonitoring(broadcastId, callback, interval = 3000) {
    const monitor = setInterval(async () => {
      try {
        const status = await this.getBroadcastStatus(broadcastId);
        callback(status);
        
        // Stop monitoring if broadcast is complete
        if (status.success && status.lifeCycleStatus === 'complete') {
          clearInterval(monitor);
        }
      } catch (error) {
        console.error('Error in status monitoring:', error);
        callback({ success: false, error: error.message });
      }
    }, interval);

    return monitor; // Return interval ID so it can be cleared
  }

  // NEW METHOD: Bulk status check for multiple broadcasts
  async getBulkBroadcastStatus(broadcastIds) {
    if (!this.isSignedIn) {
      return { success: false, error: 'Not signed in to YouTube' };
    }

    try {
      // YouTube API allows up to 50 IDs in one request
      const chunks = [];
      for (let i = 0; i < broadcastIds.length; i += 50) {
        chunks.push(broadcastIds.slice(i, i + 50));
      }

      const allResults = [];
      
      for (const chunk of chunks) {
        const response = await gapi.client.youtube.liveBroadcasts.list({
          part: 'snippet,status,contentDetails',
          id: chunk.join(',')
        });

        if (response.result.items) {
          allResults.push(...response.result.items);
        }
      }

      return {
        success: true,
        broadcasts: allResults.map(broadcast => ({
          broadcastId: broadcast.id,
          title: broadcast.snippet.title,
          lifeCycleStatus: broadcast.status.lifeCycleStatus,
          privacyStatus: broadcast.status.privacyStatus,
          recordingStatus: broadcast.status.recordingStatus,
          streamStatus: broadcast.contentDetails?.streamStatus || 'unknown',
          actualStartTime: broadcast.snippet.actualStartTime,
          actualEndTime: broadcast.snippet.actualEndTime
        }))
      };

    } catch (error) {
      console.error('Error getting bulk broadcast status:', error);
      return { 
        success: false, 
        error: error.result?.error?.message || error.message 
      };
    }
  }
}

// Create singleton instance
const youtubeService = new YouTubeService();

// Make it available globally for debugging
window.youtubeService = youtubeService;

export default youtubeService;