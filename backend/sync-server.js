// sync-server.js
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration - EXTRACTED FROM YOUR EXISTING CODE
const SPREADSHEET_ID = '15Wcu7F7Iz2w5IX8YcfTNijZZoygA6i9lRJJxxyHfoaw'; // Your existing sheet
const SYNC_INTERVAL = 15000; // 15 seconds
const EDIT_DELAY = 15000; // Wait 15 seconds after last edit

// YouTube OAuth2 setup - Using your existing credentials
const YOUTUBE_CLIENT_ID = '519208066582-a2o1g2q7taev8u8fpg5nr7htmopvrkuv.apps.googleusercontent.com';
const YOUTUBE_API_KEY = 'AIzaSyCAeJPFyP783eF-IcBzuziEs1fzF9oXLFQ';

const oauth2Client = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET || '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', // Your client secret
  'http://localhost:3001/auth/callback'
);

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
const sheets = google.sheets({ version: 'v4' });

// State management
class SyncState extends EventEmitter {
  constructor() {
    super();
    this.spreadsheetData = [];
    this.youtubeBroadcasts = new Map(); // broadcastId -> broadcast data
    this.lastEditTime = null;
    this.syncPending = false;
    this.currentEpisode = this.calculateEpisodeNumber();
  }

  calculateEpisodeNumber() {
    const baseDate = new Date('2025-05-31'); // Saturday May 31, 2025 = Episode 122
    const baseEpisode = 122;
    const today = new Date();
    const daysDiff = Math.floor((today - baseDate) / (1000 * 60 * 60 * 24));
    const weeksPassed = Math.floor(daysDiff / 7);
    return baseEpisode + weeksPassed;
  }

  markEdit() {
    this.lastEditTime = Date.now();
    this.syncPending = true;
  }

  shouldSync() {
    if (!this.syncPending) return false;
    return Date.now() - this.lastEditTime >= EDIT_DELAY;
  }
}

const state = new SyncState();

// Google Sheets functions - Using your existing script URL as fallback
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

async function fetchSpreadsheetData() {
  try {
    // First try direct Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: 'A2:K50', // Adjust range as needed
    });

    const rows = response.data.values || [];
    const currentData = rows.map((row, index) => ({
      rowIndex: index + 2, // Account for header row and 0-indexing
      timeSlot: row[0] || '',
      artist: row[1] || '',
      song1Title: row[2] || '',
      song1Writer: row[3] || '',
      song2Title: row[4] || '',
      song2Writer: row[5] || '',
      song3Title: row[6] || '',
      song3Writer: row[7] || '',
      song4Title: row[8] || '',
      song4Writer: row[9] || '',
      status: row[10] || 'confirmed'
    }));

    // Check if data changed
    const dataChanged = JSON.stringify(currentData) !== JSON.stringify(state.spreadsheetData);
    if (dataChanged) {
      state.spreadsheetData = currentData;
      state.markEdit();
      console.log('Spreadsheet data changed, sync pending...');
    }

    return currentData;
  } catch (error) {
    console.error('Error fetching spreadsheet directly:', error);
    console.log('Falling back to Google Script URL...');
    
    // Fallback to your existing Google Script
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      
      if (data.takenSlots) {
        const currentData = data.takenSlots.map((slot, index) => {
          if (typeof slot === 'object') {
            return {
              rowIndex: index + 2,
              timeSlot: slot.timeSlot || '',
              artist: slot.artist || '',
              song1Title: slot.songs?.[0]?.title || '',
              song1Writer: slot.songs?.[0]?.writer || '',
              song2Title: slot.songs?.[1]?.title || '',
              song2Writer: slot.songs?.[1]?.writer || '',
              song3Title: slot.songs?.[2]?.title || '',
              song3Writer: slot.songs?.[2]?.writer || '',
              song4Title: slot.songs?.[3]?.title || '',
              song4Writer: slot.songs?.[3]?.writer || '',
              status: 'confirmed'
            };
          }
          return null;
        }).filter(Boolean);
        
        state.spreadsheetData = currentData;
        state.markEdit();
        return currentData;
      }
    } catch (scriptError) {
      console.error('Google Script fallback also failed:', scriptError);
    }
    
    return state.spreadsheetData; // Return cached data on error
  }
}

// YouTube API functions
async function fetchYouTubeBroadcasts() {
  try {
    const response = await youtube.liveBroadcasts.list({
      part: 'id,snippet,status',
      mine: true,
      maxResults: 50
    });

    const broadcasts = response.data.items || [];
    
    // Update our broadcast map
    state.youtubeBroadcasts.clear();
    broadcasts.forEach(broadcast => {
      if (broadcast.snippet.title.includes('What Is Art?')) {
        state.youtubeBroadcasts.set(broadcast.id, broadcast);
      }
    });

    return broadcasts;
  } catch (error) {
    console.error('Error fetching YouTube broadcasts:', error);
    return [];
  }
}

async function createBroadcast(performer, songIndex) {
  const song = getSongByIndex(performer, songIndex);
  if (!song || !song.title) return null;

  const title = `What Is Art? #${state.currentEpisode} | ${performer.artist} | ${song.title}`;
  const description = [
    `What Is Art? Episode #${state.currentEpisode}`,
    `Performer: ${performer.artist}`,
    `Time Slot: ${performer.timeSlot}`,
    `Song: ${song.title}`,
    song.writer ? `Written by: ${song.writer}` : ''
  ].filter(Boolean).join('\n');

  try {
    const broadcast = await youtube.liveBroadcasts.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title,
          description,
          scheduledStartTime: new Date().toISOString()
        },
        status: {
          privacyStatus: 'unlisted'
        }
      }
    });

    // Create stream
    const stream = await youtube.liveStreams.insert({
      part: 'snippet,cdn',
      requestBody: {
        snippet: {
          title: `Stream for ${title}`
        },
        cdn: {
          frameRate: '30fps',
          ingestionType: 'rtmp',
          resolution: '1080p'
        }
      }
    });

    // Bind stream to broadcast
    await youtube.liveBroadcasts.bind({
      part: 'id',
      id: broadcast.data.id,
      streamId: stream.data.id
    });

    console.log(`Created broadcast: ${title}`);
    return broadcast.data;
  } catch (error) {
    console.error('Error creating broadcast:', error);
    return null;
  }
}

async function updateBroadcast(broadcastId, title, description) {
  try {
    const response = await youtube.liveBroadcasts.update({
      part: 'snippet',
      requestBody: {
        id: broadcastId,
        snippet: {
          title,
          description
        }
      }
    });
    console.log(`Updated broadcast: ${title}`);
    return response.data;
  } catch (error) {
    console.error('Error updating broadcast:', error);
    return null;
  }
}

async function deleteBroadcast(broadcastId) {
  try {
    await youtube.liveBroadcasts.delete({ id: broadcastId });
    console.log(`Deleted broadcast: ${broadcastId}`);
    return true;
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    return false;
  }
}

// Helper functions
function getSongByIndex(performer, index) {
  const songs = [
    { title: performer.song1Title, writer: performer.song1Writer },
    { title: performer.song2Title, writer: performer.song2Writer },
    { title: performer.song3Title, writer: performer.song3Writer },
    { title: performer.song4Title, writer: performer.song4Writer }
  ];
  return songs[index] || null;
}

function getPerformerSongs(performer) {
  return [
    { title: performer.song1Title, writer: performer.song1Writer },
    { title: performer.song2Title, writer: performer.song2Writer },
    { title: performer.song3Title, writer: performer.song3Writer },
    { title: performer.song4Title, writer: performer.song4Writer }
  ].filter(song => song.title);
}

// Main sync logic
async function syncBroadcasts() {
  if (!state.shouldSync()) return;

  console.log('Starting sync...');
  state.syncPending = false;

  const performers = state.spreadsheetData.filter(p => 
    p.artist && p.status !== 'cancelled'
  );

  // Get current YouTube broadcasts
  const existingBroadcasts = Array.from(state.youtubeBroadcasts.values());

  // Build a map of what should exist
  const expectedBroadcasts = new Map();
  
  for (const performer of performers) {
    const songs = getPerformerSongs(performer);
    songs.forEach((song, index) => {
      const key = `${performer.artist}|${song.title}`;
      expectedBroadcasts.set(key, { performer, songIndex: index });
    });
  }

  // Delete broadcasts that shouldn't exist
  for (const broadcast of existingBroadcasts) {
    const status = broadcast.status.lifeCycleStatus;
    
    // Never touch live or completed broadcasts
    if (status === 'live' || status === 'complete') continue;

    // Parse broadcast title to get artist and song
    const match = broadcast.snippet.title.match(/#\d+ \| (.+) \| (.+)$/);
    if (match) {
      const key = `${match[1]}|${match[2]}`;
      if (!expectedBroadcasts.has(key)) {
        await deleteBroadcast(broadcast.id);
      }
    }
  }

  // Create or update broadcasts that should exist
  for (const [key, data] of expectedBroadcasts) {
    const { performer, songIndex } = data;
    const song = getSongByIndex(performer, songIndex);
    
    // Find existing broadcast
    const existing = existingBroadcasts.find(b => {
      const match = b.snippet.title.match(/#\d+ \| (.+) \| (.+)$/);
      return match && `${match[1]}|${match[2]}` === key;
    });

    if (existing) {
      // Update if not live/complete
      const status = existing.status.lifeCycleStatus;
      if (status !== 'live' && status !== 'complete') {
        const newTitle = `What Is Art? #${state.currentEpisode} | ${performer.artist} | ${song.title}`;
        const newDescription = [
          `What Is Art? Episode #${state.currentEpisode}`,
          `Performer: ${performer.artist}`,
          `Time Slot: ${performer.timeSlot}`,
          `Song: ${song.title}`,
          song.writer ? `Written by: ${song.writer}` : ''
        ].filter(Boolean).join('\n');

        if (existing.snippet.title !== newTitle || existing.snippet.description !== newDescription) {
          await updateBroadcast(existing.id, newTitle, newDescription);
        }
      }
    } else {
      // Create new broadcast
      await createBroadcast(performer, songIndex);
    }
  }

  // Refresh YouTube data after sync
  await fetchYouTubeBroadcasts();
  
  // Emit sync complete event
  state.emit('syncComplete');
  console.log('Sync complete!');
}

// Lower Thirds integration
async function updateLowerThirds() {
  // Find currently live broadcast
  const liveBroadcast = Array.from(state.youtubeBroadcasts.values())
    .find(b => b.status.lifeCycleStatus === 'live');

  if (liveBroadcast) {
    // Parse broadcast info
    const match = liveBroadcast.snippet.title.match(/#(\d+) \| (.+) \| (.+)$/);
    if (match) {
      const [, episode, artist, songTitle] = match;
      
      // Find writer info from spreadsheet
      const performer = state.spreadsheetData.find(p => p.artist === artist);
      let writer = '';
      if (performer) {
        const songs = getPerformerSongs(performer);
        const song = songs.find(s => s.title === songTitle);
        writer = song?.writer || '';
      }

      // Send to lower thirds server
      try {
        await fetch('http://localhost:3002/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'live',
            episode,
            artist,
            songTitle,
            writer
          })
        });
      } catch (error) {
        console.error('Error updating lower thirds:', error);
      }
    }
  } else {
    // No live broadcast, check for next up
    const upNext = findNextPerformer();
    if (upNext) {
      try {
        await fetch('http://localhost:3002/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'next',
            artist: upNext.artist,
            songTitle: upNext.songTitle
          })
        });
      } catch (error) {
        console.error('Error updating lower thirds:', error);
      }
    }
  }
}

function findNextPerformer() {
  // Logic to determine next performer based on time slots and status
  const now = new Date();
  const currentTime = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Find next performer who hasn't performed yet
  const upcoming = state.spreadsheetData
    .filter(p => p.artist && p.status === 'confirmed')
    .find(p => p.timeSlot > currentTime); // Simplified comparison
    
  if (upcoming) {
    const firstSong = getPerformerSongs(upcoming)[0];
    return {
      artist: upcoming.artist,
      songTitle: firstSong?.title || 'Performance'
    };
  }
  
  return null;
}

// Main sync loop
setInterval(async () => {
  await fetchSpreadsheetData();
  await syncBroadcasts();
  await updateLowerThirds();
}, SYNC_INTERVAL);

// API endpoints for React dashboard
app.get('/api/status', (req, res) => {
  res.json({
    episode: state.currentEpisode,
    performers: state.spreadsheetData,
    broadcasts: Array.from(state.youtubeBroadcasts.values())
      .filter(b => b.status.lifeCycleStatus !== 'complete')
      .map(b => ({
        id: b.id,
        title: b.snippet.title,
        status: b.status.lifeCycleStatus,
        privacyStatus: b.status.privacyStatus
      }))
  });
});

// OAuth2 endpoints
app.get('/auth/youtube', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube']
  });
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Save tokens to file
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
  
  res.send('Authentication successful! You can close this window.');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sync server running on port ${PORT}`);
  console.log(`Episode #${state.currentEpisode}`);
  
  // Load saved tokens if they exist
  try {
    const tokens = JSON.parse(fs.readFileSync('tokens.json'));
    oauth2Client.setCredentials(tokens);
    console.log('Loaded saved authentication tokens');
  } catch (error) {
    console.log('No saved tokens found. Please authenticate at http://localhost:3001/auth/youtube');
  }
});