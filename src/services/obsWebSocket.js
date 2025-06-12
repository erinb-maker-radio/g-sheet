// src/services/obsWebSocket.js
import OBSWebSocket from 'obs-websocket-js';

class OBSWebSocketService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.connectionListeners = [];
    this.sceneChangeListeners = [];
  }

  // Connect to OBS
  async connect(address = 'ws://localhost:4455', password = '') {
    try {
      await this.obs.connect(address, password);
      this.connected = true;
      console.log('Connected to OBS WebSocket');
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Notify connection listeners
      this.connectionListeners.forEach(listener => listener(true));
      
      return true;
    } catch (error) {
      console.error('Failed to connect to OBS:', error);
      this.connected = false;
      this.connectionListeners.forEach(listener => listener(false));
      return false;
    }
  }

  // Disconnect from OBS
  async disconnect() {
    try {
      await this.obs.disconnect();
      this.connected = false;
      console.log('Disconnected from OBS WebSocket');
      this.connectionListeners.forEach(listener => listener(false));
    } catch (error) {
      console.error('Error disconnecting from OBS:', error);
    }
  }

  // Set up OBS event listeners
  setupEventListeners() {
    // Scene changed event
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      console.log('Scene changed to:', data.sceneName);
      this.sceneChangeListeners.forEach(listener => listener(data.sceneName));
    });

    // Connection closed event
    this.obs.on('ConnectionClosed', () => {
      console.log('OBS connection closed');
      this.connected = false;
      this.connectionListeners.forEach(listener => listener(false));
    });

    // Connection error event
    this.obs.on('ConnectionError', (error) => {
      console.error('OBS connection error:', error);
      this.connected = false;
      this.connectionListeners.forEach(listener => listener(false));
    });
  }

  // Add connection status listener
  onConnectionChange(listener) {
    this.connectionListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    };
  }

  // Add scene change listener
  onSceneChange(listener) {
    this.sceneChangeListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.sceneChangeListeners = this.sceneChangeListeners.filter(l => l !== listener);
    };
  }

  // Get current scene
  async getCurrentScene() {
    try {
      const data = await this.obs.call('GetCurrentProgramScene');
      return data.currentProgramSceneName;
    } catch (error) {
      console.error('Error getting current scene:', error);
      return null;
    }
  }

  // Get list of scenes
  async getSceneList() {
    try {
      const data = await this.obs.call('GetSceneList');
      return data.scenes.map(scene => scene.sceneName);
    } catch (error) {
      console.error('Error getting scene list:', error);
      return [];
    }
  }

  // Switch to a specific scene
  async setCurrentScene(sceneName) {
    try {
      await this.obs.call('SetCurrentProgramScene', { sceneName });
      console.log(`Switched to scene: ${sceneName}`);
      return true;
    } catch (error) {
      console.error('Error switching scene:', error);
      return false;
    }
  }

  // Start streaming
  async startStreaming() {
    try {
      await this.obs.call('StartStream');
      console.log('Streaming started');
      return true;
    } catch (error) {
      console.error('Error starting stream:', error);
      return false;
    }
  }

  // Stop streaming
  async stopStreaming() {
    try {
      await this.obs.call('StopStream');
      console.log('Streaming stopped');
      return true;
    } catch (error) {
      console.error('Error stopping stream:', error);
      return false;
    }
  }

  // Start recording
  async startRecording() {
    try {
      await this.obs.call('StartRecord');
      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }

  // Stop recording
  async stopRecording() {
    try {
      await this.obs.call('StopRecord');
      console.log('Recording stopped');
      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      return false;
    }
  }

  // Get streaming status
  async getStreamingStatus() {
    try {
      const data = await this.obs.call('GetStreamStatus');
      return {
        streaming: data.outputActive,
        recording: data.outputReconnecting,
        duration: data.outputDuration,
        bytes: data.outputBytes
      };
    } catch (error) {
      console.error('Error getting streaming status:', error);
      return null;
    }
  }

  // Set source visibility
  async setSourceVisibility(sceneName, sourceName, visible) {
    try {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName,
        sceneItemId: await this.getSceneItemId(sceneName, sourceName),
        sceneItemEnabled: visible
      });
      console.log(`Set ${sourceName} visibility to ${visible} in scene ${sceneName}`);
      return true;
    } catch (error) {
      console.error('Error setting source visibility:', error);
      return false;
    }
  }

  // Get scene item ID (helper function)
  async getSceneItemId(sceneName, sourceName) {
    try {
      const data = await this.obs.call('GetSceneItemList', { sceneName });
      const item = data.sceneItems.find(item => item.sourceName === sourceName);
      return item ? item.sceneItemId : null;
    } catch (error) {
      console.error('Error getting scene item ID:', error);
      return null;
    }
  }

  // Set text source content
  async setTextSourceContent(sourceName, text) {
    try {
      await this.obs.call('SetInputSettings', {
        inputName: sourceName,
        inputSettings: { text }
      });
      console.log(`Updated text source ${sourceName}`);
      return true;
    } catch (error) {
      console.error('Error setting text source content:', error);
      return false;
    }
  }

  // Take a screenshot
  async takeScreenshot(sourceName = null, format = 'png') {
    try {
      const data = await this.obs.call('GetSourceScreenshot', {
        sourceName: sourceName || 'current',
        imageFormat: format,
        imageWidth: 1920,
        imageHeight: 1080
      });
      return data.imageData;
    } catch (error) {
      console.error('Error taking screenshot:', error);
      return null;
    }
  }

  // Update broadcast title/description
  async setBroadcastInfo(title, description) {
    try {
      // This updates a text source in OBS with broadcast info
      await this.obs.call('SetInputSettings', {
        inputName: 'Broadcast Title', // Name of your text source in OBS
        inputSettings: { text: title }
      });
      
      if (description) {
        await this.obs.call('SetInputSettings', {
          inputName: 'Broadcast Description',
          inputSettings: { text: description }
        });
      }
      
      console.log('Broadcast info updated');
      return true;
    } catch (error) {
      console.error('Error updating broadcast info:', error);
      return false;
    }
  }

  // Create a browser source for each performer
  async createPerformerSource(performerData) {
    try {
      const { artist, timeSlot, songs } = performerData;
      const sourceName = `${timeSlot} - ${artist}`;
      
      // Create a text source for this performer
      await this.obs.call('CreateInput', {
        sceneName: 'Performers List', // Your scene name
        inputName: sourceName,
        inputKind: 'text_gdiplus', // For Windows, use 'text_ft2_source' for Mac/Linux
        inputSettings: {
          text: `${timeSlot} - ${artist}\n${songs.filter(s => s.title).map(s => s.title).join(', ')}`,
          font: { size: 24, face: 'Arial' }
        }
      });
      
      console.log(`Created source for ${artist}`);
      return true;
    } catch (error) {
      console.error('Error creating performer source:', error);
      return false;
    }
  }

  // Update the broadcast list (like a playlist)
  async updateBroadcastList(performers) {
    try {
      // Create a formatted list of all performers
      const broadcastList = performers.map(p => 
        `${p.timeSlot} - ${p.artist}: ${p.songs.filter(s => s.title).map(s => s.title).join(', ')}`
      ).join('\n');
      
      // Update a text source with the full list
      await this.obs.call('SetInputSettings', {
        inputName: 'Broadcast Schedule', // Name of your text source
        inputSettings: { text: broadcastList }
      });
      
      console.log('Broadcast list updated');
      return true;
    } catch (error) {
      console.error('Error updating broadcast list:', error);
      return false;
    }
  }

  // Create/Update a scene collection for tonight's show
  async setupShowScenes(showDate, performers) {
    try {
      const sceneName = `What Is Art - ${showDate}`;
      
      // Create main show scene if it doesn't exist
      try {
        await this.obs.call('CreateScene', { sceneName });
      } catch (e) {
        // Scene might already exist
      }
      
      // Add text source for show title
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Show Title',
        inputKind: 'text_gdiplus',
        inputSettings: {
          text: `What Is Art? - ${showDate}\nPerformers: ${performers.length}`,
          font: { size: 36, face: 'Arial', style: 'Bold' }
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error setting up show scenes:', error);
      return false;
    }
  }

  // Create individual broadcast configurations for each song
  async createSongBroadcasts(artist, timeSlot, songs, episodeNumber) {
    const broadcasts = [];
    
    try {
      // Create a scene for each song
      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        if (!song.title.trim()) continue;
        
        // Format broadcast title
        const broadcastTitle = `What Is Art? Episode #${episodeNumber}, ${artist}, ${song.title}`;
        const writerInfo = song.writer ? `, Written by ${song.writer}` : '';
        const fullTitle = broadcastTitle + writerInfo;
        
        // Create scene name for this song
        const sceneName = `${timeSlot} - ${artist} - Song ${i + 1}`;
        
        try {
          // Create scene for this song
          await this.obs.call('CreateScene', { sceneName });
          console.log(`Created scene: ${sceneName}`);
        } catch (e) {
          // Scene might already exist, that's okay
          console.log(`Scene already exists: ${sceneName}`);
        }
        
        // Create/update text source for broadcast title in this scene
        const titleSourceName = `Title - ${timeSlot} - Song ${i + 1}`;
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: titleSourceName,
            inputKind: 'text_gdiplus', // Windows. Use 'text_ft2_source' for Mac/Linux
            inputSettings: {
              text: fullTitle,
              font: { 
                size: 32, 
                face: 'Arial', 
                style: 'Bold'
              },
              color: 0xFFFFFFFF, // White
              outline: true,
              outline_size: 2,
              outline_color: 0xFF000000 // Black outline
            }
          });
        } catch (e) {
          // If source exists, update it
          await this.obs.call('SetInputSettings', {
            inputName: titleSourceName,
            inputSettings: { text: fullTitle }
          });
        }
        
        // Create lower third for artist/song info
        const lowerThirdName = `Lower Third - ${timeSlot} - Song ${i + 1}`;
        const lowerThirdText = `${artist}\n${song.title}${song.writer ? '\nWritten by ' + song.writer : ''}`;
        
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: lowerThirdName,
            inputKind: 'text_gdiplus',
            inputSettings: {
              text: lowerThirdText,
              font: { 
                size: 24, 
                face: 'Arial', 
                style: 'Regular'
              },
              color: 0xFFFFFFFF,
              outline: true,
              outline_size: 1,
              outline_color: 0xFF000000
            }
          });
        } catch (e) {
          // Update if exists
          await this.obs.call('SetInputSettings', {
            inputName: lowerThirdName,
            inputSettings: { text: lowerThirdText }
          });
        }
        
        // Store broadcast configuration
        broadcasts.push({
          sceneName,
          broadcastTitle: fullTitle,
          artist,
          song: song.title,
          writer: song.writer,
          timeSlot,
          index: i + 1
        });
      }
      
      // Create a master scene collection for this performer
      const collectionName = `${timeSlot} - ${artist} - All Songs`;
      try {
        await this.obs.call('CreateScene', { sceneName: collectionName });
        
        // Add all song scenes as sources to the master scene
        for (const broadcast of broadcasts) {
          try {
            await this.obs.call('CreateSceneItem', {
              sceneName: collectionName,
              sourceName: broadcast.sceneName,
              enabled: true
            });
          } catch (e) {
            console.log('Could not add scene as source:', e);
          }
        }
      } catch (e) {
        console.log('Master scene might already exist');
      }
      
      console.log(`Created ${broadcasts.length} song broadcasts for ${artist}`);
      return broadcasts;
      
    } catch (error) {
      console.error('Error creating song broadcasts:', error);
      return [];
    }
  }

  // Create a broadcast preset/profile for streaming
  async createBroadcastPreset(broadcastTitle, settings = {}) {
    try {
      // This would integrate with OBS streaming settings
      // Note: OBS WebSocket doesn't directly support creating streaming profiles,
      // but we can prepare the scenes and update stream settings
      
      const streamSettings = {
        server: settings.server || 'rtmp://live.twitch.tv/live',
        key: settings.key || '', // Would need to be provided
        service: settings.service || 'Twitch'
      };
      
      // Update stream settings (requires proper authentication)
      // await this.obs.call('SetStreamServiceSettings', streamSettings);
      
      // For now, we'll create a text source with broadcast info
      const broadcastInfoSource = `Broadcast Info - ${new Date().getTime()}`;
      await this.obs.call('CreateInput', {
        sceneName: 'Studio Mode',
        inputName: broadcastInfoSource,
        inputKind: 'text_gdiplus',
        inputSettings: {
          text: `Ready to broadcast:\n${broadcastTitle}`,
          font: { size: 18, face: 'Arial' }
        }
      });
      
      return {
        success: true,
        broadcastTitle,
        presetName: broadcastInfoSource
      };
      
    } catch (error) {
      console.error('Error creating broadcast preset:', error);
      return { success: false, error: error.message };
    }
  }

  // Get list of all configured broadcasts
  async getBroadcastList() {
    try {
      const scenes = await this.obs.call('GetSceneList');
      const broadcasts = [];
      
      // Filter scenes that match our broadcast naming pattern
      for (const scene of scenes.scenes) {
        if (scene.sceneName.includes(' - Song ')) {
          // Extract broadcast info from scene name
          const parts = scene.sceneName.split(' - ');
          if (parts.length >= 3) {
            broadcasts.push({
              sceneName: scene.sceneName,
              timeSlot: parts[0],
              artist: parts[1],
              songNumber: parts[2]
            });
          }
        }
      }
      
      return broadcasts;
      
    } catch (error) {
      console.error('Error getting broadcast list:', error);
      return [];
    }
  }

  // Quick switch to a specific song broadcast
  async switchToSongBroadcast(sceneName) {
    try {
      await this.obs.call('SetCurrentProgramScene', { sceneName });
      console.log(`Switched to broadcast: ${sceneName}`);
      return true;
    } catch (error) {
      console.error('Error switching broadcast:', error);
      return false;
    }
  }

  // ========== ADD THESE METHODS TO obsWebSocket.js ==========
  // Add them inside the OBSWebSocketService class, before the line: } // END OF CLASS

  // Create intermission scenes with countdown timer
  async createIntermissionScenes() {
    try {
      const intermissionSlots = ['8:30', '9:30'];
      
      for (const slot of intermissionSlots) {
        const sceneName = `${slot} - 🎭 INTERMISSION`;
        
        try {
          // Create the intermission scene
          await this.obs.call('CreateScene', { sceneName });
          console.log(`Created intermission scene: ${sceneName}`);
        } catch (e) {
          // Scene might already exist
          console.log(`Intermission scene already exists: ${sceneName}`);
        }
        
        // Add main intermission title
        const titleSourceName = `Intermission Title - ${slot}`;
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: titleSourceName,
            inputKind: 'text_gdiplus', // Windows. Use 'text_ft2_source' for Mac/Linux
            inputSettings: {
              text: '🎭 INTERMISSION 🎭\nWe\'ll be right back!',
              font: {
                face: 'Arial',
                size: 72,
                style: 'Bold'
              },
              color: 0xFFFF6B6B,
              outline: true,
              outline_size: 3,
              outline_color: 0xFF000000,
              align: 'center',
              valign: 'center'
            }
          });
        } catch (e) {
          // Update if exists
          await this.obs.call('SetInputSettings', {
            inputName: titleSourceName,
            inputSettings: { 
              text: '🎭 INTERMISSION 🎭\nWe\'ll be right back!' 
            }
          });
        }
        
        // Add countdown timer (initially set to 15:00)
        const timerSourceName = `Intermission Timer - ${slot}`;
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: timerSourceName,
            inputKind: 'text_gdiplus',
            inputSettings: {
              text: '15:00',
              font: {
                face: 'Arial',
                size: 96,
                style: 'Bold'
              },
              color: 0xFFFFFFFF,
              outline: true,
              outline_size: 4,
              outline_color: 0xFF000000,
              align: 'center',
              valign: 'center'
            }
          });
        } catch (e) {
          await this.obs.call('SetInputSettings', {
            inputName: timerSourceName,
            inputSettings: { text: '15:00' }
          });
        }
        
        // Add time and schedule info
        const infoSourceName = `Intermission Info - ${slot}`;
        const nextSlot = slot === '8:30' ? '8:45' : '9:45';
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: infoSourceName,
            inputKind: 'text_gdiplus',
            inputSettings: {
              text: `Intermission until ${nextSlot}\n\nGrab a snack, stretch your legs,\nand be back for more amazing performances!`,
              font: {
                face: 'Arial',
                size: 36,
                style: 'Regular'
              },
              color: 0xFFCCCCCC,
              outline: true,
              outline_size: 2,
              outline_color: 0xFF000000,
              align: 'center'
            }
          });
        } catch (e) {
          await this.obs.call('SetInputSettings', {
            inputName: infoSourceName,
            inputSettings: { 
              text: `Intermission until ${nextSlot}\n\nGrab a snack, stretch your legs,\nand be back for more amazing performances!` 
            }
          });
        }
        
        // Add social media/QR codes section
        const socialSourceName = `Social Media - ${slot}`;
        try {
          await this.obs.call('CreateInput', {
            sceneName,
            inputName: socialSourceName,
            inputKind: 'text_gdiplus',
            inputSettings: {
              text: 'Follow us on social media!\n@MakerRadio',
              font: {
                face: 'Arial',
                size: 28,
                style: 'Regular'
              },
              color: 0xFF9C27B0,
              outline: true,
              outline_size: 1,
              outline_color: 0xFF000000
            }
          });
        } catch (e) {
          // Update if exists
        }
      }
      
      console.log('Intermission scenes created successfully');
      return true;
    } catch (error) {
      console.error('Error creating intermission scenes:', error);
      return false;
    }
  }

  // Start intermission with countdown timer
  async startIntermission(slot) {
    const sceneName = `${slot} - 🎭 INTERMISSION`;
    
    try {
      // Switch to intermission scene
      await this.setCurrentScene(sceneName);
      
      // Start countdown timer (15 minutes)
      let timeRemaining = 15 * 60; // 15 minutes in seconds
      const timerSourceName = `Intermission Timer - ${slot}`;
      
      const countdown = setInterval(async () => {
        if (timeRemaining <= 0) {
          clearInterval(countdown);
          // Timer finished, update display
          await this.obs.call('SetInputSettings', {
            inputName: timerSourceName,
            inputSettings: { text: 'Starting Soon!' }
          });
          return;
        }
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        try {
          await this.obs.call('SetInputSettings', {
            inputName: timerSourceName,
            inputSettings: { text: display }
          });
        } catch (e) {
          // If error updating timer, stop countdown
          clearInterval(countdown);
        }
        
        timeRemaining--;
      }, 1000);
      
      // Store countdown reference so it can be stopped if needed
      this.activeCountdown = countdown;
      
      return true;
    } catch (error) {
      console.error('Error starting intermission:', error);
      return false;
    }
  }

  // Stop intermission countdown
  async stopIntermission() {
    if (this.activeCountdown) {
      clearInterval(this.activeCountdown);
      this.activeCountdown = null;
    }
  }

  // Update intermission with next performer info
  async updateIntermissionNextUp(slot, nextPerformer) {
    const infoSourceName = `Intermission Info - ${slot}`;
    const nextSlot = slot === '8:30' ? '8:45' : '9:45';
    
    try {
      let text = `Intermission until ${nextSlot}\n\n`;
      
      if (nextPerformer) {
        text += `Next up: ${nextPerformer.artist}\n`;
        if (nextPerformer.songs && nextPerformer.songs.length > 0) {
          text += `Performing ${nextPerformer.songs.filter(s => s.title).length} songs`;
        }
      } else {
        text += 'Grab a snack, stretch your legs,\nand be back for more amazing performances!';
      }
      
      await this.obs.call('SetInputSettings', {
        inputName: infoSourceName,
        inputSettings: { text }
      });
      
      return true;
    } catch (error) {
      console.error('Error updating intermission info:', error);
      return false;
    }
  }

  // Check if current scene is an intermission
  async isIntermissionActive() {
    try {
      const currentScene = await this.getCurrentScene();
      return currentScene && currentScene.includes('🎭 INTERMISSION');
    } catch (error) {
      return false;
    }
  }
// Add these methods to your obsWebSocket.js file, BEFORE the "} // END OF CLASS" line

// Create Up Next scene with better graphics
async createUpNextScene() {
  try {
    const sceneName = 'Up Next Transition';
    
    // Create the scene
    try {
      await this.obs.call('CreateScene', { sceneName });
      console.log(`Created Up Next scene`);
    } catch (e) {
      console.log(`Up Next scene already exists`);
    }
    
    // Add background color or image
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Background',
        inputKind: 'color_source_v3',
        inputSettings: {
          color: 0xFF0A0A0A, // Very dark background
          width: 1920,
          height: 1080
        }
      });
      
      // Position the background
      const bgItemId = await this.getSceneItemId(sceneName, 'Up Next Background');
      if (bgItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: bgItemId,
          sceneItemTransform: {
            positionX: 0,
            positionY: 0,
            scaleX: 1,
            scaleY: 1
          }
        });
      }
    } catch (e) {
      console.log('Background already exists');
    }
    
    // Add decorative frame/border
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Frame',
        inputKind: 'image_source',
        inputSettings: {
          file: 'C:/MakerRadio/Graphics/up-next-frame.png' // You'll need to create this
        }
      });
    } catch (e) {
      // If no frame image, create a colored border
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Border',
        inputKind: 'color_source_v3',
        inputSettings: {
          color: 0xFFE91E63, // Pink border
          width: 1920,
          height: 10
        }
      });
    }
    
    // Main "UP NEXT" title with style
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Title',
        inputKind: 'text_gdiplus_v2',
        inputSettings: {
          text: 'UP NEXT',
          font: {
            face: 'Arial Black',
            size: 96,
            style: 'Bold'
          },
          gradient: true,
          gradient_color: 0xFF9C27B0, // Purple gradient
          gradient_dir: 90,
          gradient_opacity: 100,
          color: 0xFFE91E63, // Pink base
          outline: true,
          outline_size: 4,
          outline_color: 0xFF000000,
          align: 'center',
          valign: 'top'
        }
      });
      
      // Position the title
      const titleItemId = await this.getSceneItemId(sceneName, 'Up Next Title');
      if (titleItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: titleItemId,
          sceneItemTransform: {
            positionX: 960,
            positionY: 200,
            alignment: 0 // Center alignment
          }
        });
      }
    } catch (e) {
      console.log('Title already exists');
    }
    
    // Artist name with larger, styled text
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Artist',
        inputKind: 'text_gdiplus_v2',
        inputSettings: {
          text: 'Artist Name',
          font: {
            face: 'Arial',
            size: 72,
            style: 'Bold'
          },
          color: 0xFFFFFFFF, // White
          outline: true,
          outline_size: 3,
          outline_color: 0xFF000000,
          align: 'center',
          valign: 'center',
          // Add drop shadow effect
          drop_shadow: true,
          shadow_distance: 5,
          shadow_color: 0xFF000000
        }
      });
      
      const artistItemId = await this.getSceneItemId(sceneName, 'Up Next Artist');
      if (artistItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: artistItemId,
          sceneItemTransform: {
            positionX: 960,
            positionY: 450,
            alignment: 0
          }
        });
      }
    } catch (e) {
      console.log('Artist text already exists');
    }
    
    // Song title with subtitle styling
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Song',
        inputKind: 'text_gdiplus_v2',
        inputSettings: {
          text: 'Song Title',
          font: {
            face: 'Arial',
            size: 54,
            style: 'Italic'
          },
          color: 0xFFCCCCCC, // Light gray
          outline: true,
          outline_size: 2,
          outline_color: 0xFF000000,
          align: 'center',
          valign: 'center'
        }
      });
      
      const songItemId = await this.getSceneItemId(sceneName, 'Up Next Song');
      if (songItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: songItemId,
          sceneItemTransform: {
            positionX: 960,
            positionY: 570,
            alignment: 0
          }
        });
      }
    } catch (e) {
      console.log('Song text already exists');
    }
    
    // Time slot info
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Up Next Time',
        inputKind: 'text_gdiplus_v2',
        inputSettings: {
          text: 'Performance Time',
          font: {
            face: 'Arial',
            size: 42,
            style: 'Regular'
          },
          color: 0xFF9C27B0, // Purple
          outline: true,
          outline_size: 2,
          outline_color: 0xFF000000,
          align: 'center',
          valign: 'center'
        }
      });
      
      const timeItemId = await this.getSceneItemId(sceneName, 'Up Next Time');
      if (timeItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: timeItemId,
          sceneItemTransform: {
            positionX: 960,
            positionY: 700,
            alignment: 0
          }
        });
      }
    } catch (e) {
      console.log('Time text already exists');
    }
    
    // Add logo or show branding
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: 'Show Logo',
        inputKind: 'image_source',
        inputSettings: {
          file: 'C:/MakerRadio/Graphics/what-is-art-logo.png' // Your show logo
        }
      });
      
      const logoItemId = await this.getSceneItemId(sceneName, 'Show Logo');
      if (logoItemId) {
        await this.obs.call('SetSceneItemTransform', {
          sceneName,
          sceneItemId: logoItemId,
          sceneItemTransform: {
            positionX: 960,
            positionY: 900,
            scaleX: 0.5, // Scale down logo
            scaleY: 0.5,
            alignment: 0
          }
        });
      }
    } catch (e) {
      console.log('Logo not found or already exists');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating Up Next scene:', error);
    return false;
  }
}

// Enhanced update function with better error handling
async updateUpNextInfo(artist, song, timeSlot) {
  try {
    // Update artist name
    await this.obs.call('SetInputSettings', {
      inputName: 'Up Next Artist',
      inputSettings: {
        text: artist || 'Coming Soon'
      }
    });
    
    // Update song title - handle long titles
    const songText = song || 'Performance';
    const displaySong = songText.length > 40 ? songText.substring(0, 40) + '...' : songText;
    
    await this.obs.call('SetInputSettings', {
      inputName: 'Up Next Song',
      inputSettings: {
        text: `"${displaySong}"`
      }
    });
    
    // Update time slot with formatted text
    const timeText = timeSlot ? `Performing at ${timeSlot}` : 'Coming up next';
    
    await this.obs.call('SetInputSettings', {
      inputName: 'Up Next Time',
      inputSettings: {
        text: timeText
      }
    });
    
    console.log(`Updated Up Next: ${artist} - ${song} at ${timeSlot}`);
    return true;
  } catch (error) {
    console.error('Error updating Up Next info:', error);
    return false;
  }
}

// Optional: Create a method to update from performer data directly
async updateUpNextFromPerformer(performer) {
  if (!performer) return false;
  
  try {
    const artist = performer.artist;
    const songs = performer.songs || [];
    const firstSong = songs.find(s => s.title) || { title: 'Performance' };
    const timeSlot = performer.timeSlot;
    
    return await this.updateUpNextInfo(artist, firstSong.title, timeSlot);
  } catch (error) {
    console.error('Error updating from performer:', error);
    return false;
  }
}

// Add this to create all transition scenes at once
async createAllTransitionScenes() {
  try {
    // Create Up Next scene
    await this.createUpNextScene();
    
    // Create intermission scenes (already exists)
    await this.createIntermissionScenes();
    
    console.log('All transition scenes created');
    return true;
  } catch (error) {
    console.error('Error creating transition scenes:', error);
    return false;
  }
}
} // END OF CLASS - this closing brace is important!

// Create singleton instance
const obsWebSocketService = new OBSWebSocketService();

export default obsWebSocketService;