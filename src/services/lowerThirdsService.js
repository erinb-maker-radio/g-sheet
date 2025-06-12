// src/services/lowerThirdsService.js
// Service to communicate with the lower thirds server

class LowerThirdsService {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.currentPerformer = null;
    this.currentSongIndex = 0;
  }

  // Update the lower thirds with new performer data
  async updatePerformer(performer, songIndex = 0) {
    try {
      const song = performer.songs?.[songIndex] || null;
      
      // Send data in the OLD format that the overlay expects
      const data = {
        artist: performer.artist,
        songTitle: song ? song.title : '',
        songWriter: song ? song.writer : '',  // This was missing!
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
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing lower thirds:', error);
      return { success: false, error: error.message };
    }
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