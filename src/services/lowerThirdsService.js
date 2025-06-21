// src/services/lowerThirdsService.js
// Enhanced service to communicate with the lower thirds server
// Now monitors YouTube stream status and only shows lower thirds when actually live

class LowerThirdsService {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.currentPerformer = null;
    this.currentSongIndex = 0;
    this.streamStatusInterval = null;
    this.isMonitoringStream = false;
    this.currentBroadcastId = null;
  }

  // Update the lower thirds with new performer data
  async updatePerformer(performer, songIndex = 0) {
    try {
      const song = performer.songs?.[songIndex] || null;
      
      // Send data in the format that the overlay expects
      const data = {
        artist: performer.artist,
        songTitle: song ? song.title : '',
        songWriter: song ? song.writer : '',
        timeSlot: performer.timeSlot,
        isIntermission: performer.timeSlot === '8:30' || performer.timeSlot === '9:30',
        keepVisible: false
      };

      const response = await fetch(`${this.baseUrl}/update-performer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to update performer: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Lower thirds updated:', result);
      
      this.currentPerformer = performer;
      this.currentSongIndex = songIndex;
      
      return result;
    } catch (error) {
      console.error('Error updating lower thirds:', error);
      // Don't throw - lower thirds are non-critical
      return { success: false, error: error.message };
    }
  }

  // Clear the lower thirds
  async clearPerformer() {
    try {
      const response = await fetch(`${this.baseUrl}/clear-performer`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to clear performer: ${response.statusText}`);
      }

      this.currentPerformer = null;
      this.currentSongIndex = 0;
      
      // Stop monitoring when cleared
      this.stopStreamMonitoring();
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing lower thirds:', error);
      return { success: false, error: error.message };
    }
  }

  // NEW: Start monitoring YouTube stream status and only show lower thirds when live
  async startStreamAwareDisplay(broadcastId, performer, songIndex = 0) {
    try {
      console.log('Starting stream-aware display for broadcast:', broadcastId);
      
      // Store the broadcast ID and performer data
      this.currentBroadcastId = broadcastId;
      this.currentPerformer = performer;
      this.currentSongIndex = songIndex;
      
      // Clear any existing lower thirds first
      await this.clearPerformer();
      
      // Start monitoring the stream status
      this.startStreamMonitoring();
      
      return { success: true, message: 'Started monitoring stream status' };
    } catch (error) {
      console.error('Error starting stream-aware display:', error);
      return { success: false, error: error.message };
    }
  }

  // NEW: Start monitoring YouTube stream status
  startStreamMonitoring() {
    if (this.isMonitoringStream) {
      console.log('Already monitoring stream');
      return;
    }
    
    console.log('Starting stream status monitoring');
    this.isMonitoringStream = true;
    
    // Check status immediately
    this.checkStreamStatus();
    
    // Then check every 3 seconds
    this.streamStatusInterval = setInterval(() => {
      this.checkStreamStatus();
    }, 3000);
  }

  // NEW: Stop monitoring stream status
  stopStreamMonitoring() {
    if (this.streamStatusInterval) {
      clearInterval(this.streamStatusInterval);
      this.streamStatusInterval = null;
    }
    this.isMonitoringStream = false;
    this.currentBroadcastId = null;
    console.log('Stopped stream status monitoring');
  }

  // NEW: Check YouTube stream status and control lower thirds accordingly
  async checkStreamStatus() {
    if (!this.currentBroadcastId) {
      console.log('No broadcast ID to monitor');
      return;
    }
    
    try {
      // Call our backend API to check YouTube status
      const response = await fetch(`http://localhost:3000/api/youtube-stream-status/${this.currentBroadcastId}`);
      
      if (!response.ok) {
        console.warn('Failed to get stream status:', response.statusText);
        return;
      }
      
      const statusData = await response.json();
      const { lifeCycleStatus } = statusData;
      
      console.log('Stream status:', lifeCycleStatus);
      
      // Control lower thirds based on status
      if (lifeCycleStatus === 'live') {
        // Stream is live - show lower thirds if we have performer data
        if (this.currentPerformer && !this.isDisplaying()) {
          console.log('Stream is live - showing lower thirds');
          await this.updatePerformer(this.currentPerformer, this.currentSongIndex);
        }
      } else if (lifeCycleStatus === 'complete') {
        // Stream ended - clear lower thirds and stop monitoring
        console.log('Stream completed - clearing lower thirds');
        await this.clearPerformer();
        this.stopStreamMonitoring();
      } else {
        // Stream is not live yet (ready, testing, etc.) - hide lower thirds
        if (this.isDisplaying()) {
          console.log('Stream not live yet - hiding lower thirds');
          await this.clearPerformer();
        }
      }
      
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  }

  // NEW: Check if lower thirds are currently displaying
  async isDisplaying() {
    try {
      const response = await fetch(`${this.baseUrl}/current-performer`);
      if (response.ok) {
        const data = await response.json();
        return data && data.artist;
      }
    } catch (error) {
      console.error('Error checking display status:', error);
    }
    return false;
  }

  // Show intermission
  async showIntermission(timeSlot) {
    return this.updatePerformer({
      artist: '🎭 INTERMISSION',
      timeSlot: timeSlot,
      isIntermission: true
    });
  }

  // Update to next song for current performer
  async nextSong() {
    if (!this.currentPerformer || !this.currentPerformer.songs) {
      return { success: false, error: 'No current performer' };
    }

    const nextIndex = this.currentSongIndex + 1;
    if (nextIndex < this.currentPerformer.songs.length) {
      return this.updatePerformer(this.currentPerformer, nextIndex);
    } else {
      return this.clearPerformer();
    }
  }

  // NEW: Manual control methods for testing
  async forceShow() {
    if (this.currentPerformer) {
      return this.updatePerformer(this.currentPerformer, this.currentSongIndex);
    }
    return { success: false, error: 'No performer data to show' };
  }

  async forceHide() {
    return this.clearPerformer();
  }

  // Get monitoring status
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoringStream,
      broadcastId: this.currentBroadcastId,
      hasPerformerData: !!this.currentPerformer
    };
  }

  // Check if server is running
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Get performer history (for debugging)
  async getHistory() {
    try {
      const response = await fetch(`${this.baseUrl}/performer-history`);
      return await response.json();
    } catch (error) {
      console.error('Error getting history:', error);
      return { history: [] };
    }
  }
}

// Create singleton instance
const lowerThirdsService = new LowerThirdsService();

export default lowerThirdsService;