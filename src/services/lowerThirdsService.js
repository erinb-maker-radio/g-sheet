// src/services/lowerThirdsService.js
// CLEANED VERSION - Only essential functionality

class LowerThirdsService {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.currentPerformer = null;
    this.currentSongIndex = 0;
  }

  // Update the lower thirds with new performer data (shows them)
  async updatePerformer(performer, songIndex = 0) {
    try {
      // Handle both new format (direct properties) and old format (songs array)
      let data;
      
      if (performer.songTitle !== undefined) {
        // New format with direct properties
        data = {
          artist: performer.artist,
          songTitle: performer.songTitle || '',
          songWriter: performer.songWriter || '',
          timeSlot: performer.timeSlot || '',
          isIntermission: performer.isIntermission || false,
          action: 'show'
        };
      } else {
        // Old format with songs array
        const song = performer.songs?.[songIndex] || null;
        data = {
          artist: performer.artist,
          songTitle: song ? song.title : '',
          songWriter: song ? song.writer : '',
          timeSlot: performer.timeSlot || '',
          isIntermission: performer.timeSlot === '8:30' || performer.timeSlot === '9:30',
          action: 'show'
        };
      }

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

  // Clear the lower thirds (hides them)
  async clearPerformer() {
    try {
      console.log('Clearing lower thirds - hiding display');
      
      const response = await fetch(`${this.baseUrl}/clear-performer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'hide',
          clearData: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear performer: ${response.statusText}`);
      }

      this.currentPerformer = null;
      this.currentSongIndex = 0;
      
      const result = await response.json();
      console.log('Lower thirds cleared:', result);
      
      return result;
    } catch (error) {
      console.error('Error clearing lower thirds:', error);
      return { success: false, error: error.message };
    }
  }

  // Show intermission message
  async showIntermission(timeSlot) {
    return this.updatePerformer({
      artist: '🎭 INTERMISSION',
      songTitle: 'We\'ll be right back!',
      songWriter: '',
      timeSlot: timeSlot || '',
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

  // Check if lower thirds are currently displaying
  async isDisplaying() {
    try {
      const response = await fetch(`${this.baseUrl}/current-performer`);
      if (response.ok) {
        const data = await response.json();
        return !!(data && data.artist);
      }
    } catch (error) {
      console.error('Error checking display status:', error);
    }
    return false;
  }

  // Check if server is running
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        return await response.json();
      }
      return { status: 'error', error: 'Server not responding' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Get current performer data
  async getCurrentPerformer() {
    try {
      const response = await fetch(`${this.baseUrl}/current-performer`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error getting current performer:', error);
    }
    return null;
  }

  // Manual controls for testing
  async forceShow() {
    if (this.currentPerformer) {
      return this.updatePerformer(this.currentPerformer, this.currentSongIndex);
    }
    return { success: false, error: 'No performer data to show' };
  }

  async forceHide() {
    return this.clearPerformer();
  }
}

// Create singleton instance
const lowerThirdsService = new LowerThirdsService();

// Make available for debugging
window.lowerThirdsService = lowerThirdsService;

export default lowerThirdsService;