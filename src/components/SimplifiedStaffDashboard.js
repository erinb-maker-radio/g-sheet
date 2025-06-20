// Delete broadcasts that aren't in the current sheet
      // ONLY delete if the performer is completely removed, not just if details changed
      for (const [key, broadcast] of existingMap) {
        const [artist, song] = key.split('_');
        
        // Check if this artist exists AT ALL in the sheet
        const artistStillExists = performers.some(p => p.artist === artist);
        
        // Only delete if the artist is completely gone from the sheet
        if (!artistStillExists && 
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