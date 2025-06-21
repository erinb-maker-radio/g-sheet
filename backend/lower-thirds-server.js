// lower-thirds-server.js
// Enhanced server with YouTube API integration
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const app = express();
const PORT = 3001;

// YouTube API configuration
const YOUTUBE_API_KEY = 'AIzaSyCAeJPFyP783eF-IcBzuziEs1fzF9oXLFQ'; // Your API key
const youtube = google.youtube({
  version: 'v3',
  auth: YOUTUBE_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Store current state
let currentPerformer = null;
let performerHistory = [];
let clients = [];

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial data
  res.write(`data: ${JSON.stringify({ 
    type: 'initial', 
    performer: currentPerformer 
  })}\n\n`);
  
  // Add client to list
  clients.push(res);
  console.log(`Client connected. Total clients: ${clients.length}`);
  
  // Remove client on disconnect
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log(`Client disconnected. Total clients: ${clients.length}`);
  });
});

// Update performer endpoint with better data handling
app.post('/update-performer', (req, res) => {
  // Normalize the incoming data
  const performerData = {
    artist: req.body.artist || 'Unknown Artist',
    timeSlot: req.body.timeSlot || '',
    isIntermission: req.body.isIntermission || false,
    keepVisible: req.body.keepVisible || false
  };
  
  // Handle song data - support both old and new formats
  if (req.body.song) {
    performerData.song = {
      title: req.body.song.title || '',
      writer: req.body.song.writer || ''
    };
  } else if (req.body.songTitle) {
    // Support old format
    performerData.song = {
      title: req.body.songTitle || '',
      writer: req.body.songWriter || ''
    };
  } else {
    // No song data
    performerData.song = {
      title: '',
      writer: ''
    };
  }
  
  currentPerformer = performerData;
  
  // Add to history
  performerHistory.push({
    ...currentPerformer,
    timestamp: new Date().toISOString()
  });
  
  // Limit history to last 50 entries
  if (performerHistory.length > 50) {
    performerHistory = performerHistory.slice(-50);
  }
  
  console.log('Updated performer:', currentPerformer);
  
  // Send update to all connected clients
  const data = JSON.stringify({ 
    type: 'update', 
    performer: currentPerformer 
  });
  
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
  
  res.json({ success: true, performer: currentPerformer });
});

// Clear performer endpoint
app.post('/clear-performer', (req, res) => {
  currentPerformer = null;
  
  console.log('Cleared performer');
  
  // Send update to all connected clients
  const data = JSON.stringify({ 
    type: 'clear', 
    performer: null 
  });
  
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
  
  res.json({ success: true });
});

// Get current performer endpoint
app.get('/current-performer', (req, res) => {
  res.json(currentPerformer);
});

// Get performer history
app.get('/performer-history', (req, res) => {
  res.json({ history: performerHistory });
});

// NEW: YouTube stream status endpoint
app.get('/api/youtube-stream-status/:broadcastId', async (req, res) => {
  try {
    const { broadcastId } = req.params;
    console.log('Checking YouTube stream status for broadcast:', broadcastId);
    
    // Get broadcast details from YouTube API
    const response = await youtube.liveBroadcasts.list({
      part: 'snippet,status,contentDetails',
      id: broadcastId
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const broadcast = response.data.items[0];
      
      const statusData = {
        success: true,
        broadcastId: broadcast.id,
        title: broadcast.snippet.title,
        lifeCycleStatus: broadcast.status.lifeCycleStatus,
        privacyStatus: broadcast.status.privacyStatus,
        recordingStatus: broadcast.status.recordingStatus,
        streamStatus: broadcast.contentDetails?.streamStatus || 'unknown',
        actualStartTime: broadcast.snippet.actualStartTime,
        actualEndTime: broadcast.snippet.actualEndTime,
        scheduledStartTime: broadcast.snippet.scheduledStartTime
      };
      
      console.log('YouTube API response:', {
        broadcastId,
        lifeCycleStatus: statusData.lifeCycleStatus,
        streamStatus: statusData.streamStatus
      });
      
      res.json(statusData);
    } else {
      console.log('Broadcast not found:', broadcastId);
      res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }
    
  } catch (error) {
    console.error('Error getting YouTube stream status:', error);
    
    // Handle different types of YouTube API errors
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error?.message || error.message;
      
      // Handle quota exceeded
      if (error.response.status === 403) {
        errorMessage = 'YouTube API quota exceeded or invalid API key';
      }
      
      // Handle not found
      if (error.response.status === 404) {
        statusCode = 404;
        errorMessage = 'Broadcast not found';
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error.response?.status || 'UNKNOWN'
    });
  }
});

// NEW: Bulk YouTube stream status endpoint
app.post('/api/youtube-stream-status-bulk', async (req, res) => {
  try {
    const { broadcastIds } = req.body;
    
    if (!Array.isArray(broadcastIds) || broadcastIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'broadcastIds must be a non-empty array'
      });
    }
    
    console.log('Checking bulk YouTube stream status for broadcasts:', broadcastIds.length);
    
    // YouTube API allows up to 50 IDs in one request
    const chunks = [];
    for (let i = 0; i < broadcastIds.length; i += 50) {
      chunks.push(broadcastIds.slice(i, i + 50));
    }
    
    const allResults = [];
    
    for (const chunk of chunks) {
      const response = await youtube.liveBroadcasts.list({
        part: 'snippet,status,contentDetails',
        id: chunk.join(',')
      });
      
      if (response.data.items) {
        allResults.push(...response.data.items);
      }
    }
    
    const statusData = allResults.map(broadcast => ({
      broadcastId: broadcast.id,
      title: broadcast.snippet.title,
      lifeCycleStatus: broadcast.status.lifeCycleStatus,
      privacyStatus: broadcast.status.privacyStatus,
      recordingStatus: broadcast.status.recordingStatus,
      streamStatus: broadcast.contentDetails?.streamStatus || 'unknown',
      actualStartTime: broadcast.snippet.actualStartTime,
      actualEndTime: broadcast.snippet.actualEndTime
    }));
    
    console.log('Bulk status check complete:', statusData.length, 'broadcasts');
    
    res.json({
      success: true,
      broadcasts: statusData,
      total: statusData.length
    });
    
  } catch (error) {
    console.error('Error getting bulk YouTube stream status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NEW: Test YouTube API connection
app.get('/api/youtube-test', async (req, res) => {
  try {
    // Test the API key by making a simple request
    const response = await youtube.channels.list({
      part: 'snippet',
      mine: false,
      id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' // Google Developers channel
    });
    
    res.json({
      success: true,
      message: 'YouTube API connection successful',
      apiWorking: true
    });
    
  } catch (error) {
    console.error('YouTube API test failed:', error);
    res.status(500).json({
      success: false,
      message: 'YouTube API connection failed',
      error: error.message,
      apiWorking: false
    });
  }
});

// Health check endpoint (enhanced)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    currentPerformer, 
    connectedClients: clients.length,
    historyCount: performerHistory.length,
    youtubeApiEnabled: !!YOUTUBE_API_KEY,
    endpoints: {
      '/events': 'SSE for real-time updates',
      '/update-performer': 'POST - Update current performer',
      '/clear-performer': 'POST - Clear current performer',
      '/current-performer': 'GET - Get current performer',
      '/performer-history': 'GET - Get performer history',
      '/api/youtube-stream-status/:broadcastId': 'GET - YouTube stream status',
      '/api/youtube-stream-status-bulk': 'POST - Bulk YouTube stream status',
      '/api/youtube-test': 'GET - Test YouTube API connection'
    }
  });
});

// Serve the HTML file (enhanced with new features info)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>What is Art? - Lower Thirds Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1a1a1a;
            color: white;
        }
        .status { 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 10px; 
            background: #333;
        }
        .endpoint { 
            background: #2a2a2a; 
            padding: 10px; 
            margin: 5px 0; 
            border-radius: 5px; 
            font-family: monospace;
        }
        .success { border-left: 5px solid #4CAF50; }
        .info { border-left: 5px solid #2196F3; }
        h1 { color: #e91e63; }
        h2 { color: #9c27b0; }
    </style>
</head>
<body>
    <h1>🎭 What Is Art? - Lower Thirds Server</h1>
    
    <div class="status success">
        <h2>✅ Server Status: Running</h2>
        <p>Connected Clients: <strong>${clients.length}</strong></p>
        <p>Current Performer: <strong>${currentPerformer ? currentPerformer.artist : 'None'}</strong></p>
        <p>YouTube API: <strong>${YOUTUBE_API_KEY ? 'Enabled' : 'Disabled'}</strong></p>
    </div>

    <div class="status info">
        <h2>📡 Available Endpoints</h2>
        <div class="endpoint">GET /health - Server health check</div>
        <div class="endpoint">GET /events - SSE for real-time updates</div>
        <div class="endpoint">POST /update-performer - Update current performer</div>
        <div class="endpoint">POST /clear-performer - Clear current performer</div>
        <div class="endpoint">GET /current-performer - Get current performer</div>
        <div class="endpoint">GET /performer-history - Get performer history</div>
        <div class="endpoint">GET /api/youtube-stream-status/:broadcastId - YouTube stream status</div>
        <div class="endpoint">POST /api/youtube-stream-status-bulk - Bulk YouTube stream status</div>
        <div class="endpoint">GET /api/youtube-test - Test YouTube API connection</div>
    </div>

    <div class="status info">
        <h2>🎬 Stream-Aware Lower Thirds</h2>
        <p>This server now supports YouTube stream monitoring:</p>
        <ul>
            <li>Automatically shows lower thirds when stream goes live</li>
            <li>Hides lower thirds when stream ends</li>
            <li>Real-time status monitoring</li>
            <li>Supports bulk status checking</li>
        </ul>
    </div>

    <script>
        // Live status updates
        const eventSource = new EventSource('/events');
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Server event:', data);
        };
    </script>
</body>
</html>`);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎭 Lower thirds server running on http://localhost:${PORT}`);
  console.log('🔧 Enhanced with YouTube API integration');
  console.log('');
  console.log('📡 Endpoints:');
  console.log('  GET  / - Lower thirds HTML display & server info');
  console.log('  GET  /events - SSE endpoint for real-time updates');
  console.log('  POST /update-performer - Update current performer');
  console.log('  POST /clear-performer - Clear current performer');
  console.log('  GET  /current-performer - Get current performer');
  console.log('  GET  /performer-history - Get performer history');
  console.log('  GET  /health - Health check');
  console.log('  🆕 GET  /api/youtube-stream-status/:broadcastId - YouTube stream status');
  console.log('  🆕 POST /api/youtube-stream-status-bulk - Bulk YouTube stream status');
  console.log('  🆕 GET  /api/youtube-test - Test YouTube API connection');
  console.log('');
  console.log('📺 YouTube API:', YOUTUBE_API_KEY ? '✅ Enabled' : '❌ Disabled');
  console.log('🔄 Stream-aware lower thirds: Ready');
});