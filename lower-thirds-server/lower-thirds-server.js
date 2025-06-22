// lower-thirds-server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
  credentials: false
}));
app.use(express.json());

// Store current state
let currentPerformer = null;
let performerHistory = [];
let clients = [];

// Serve the fixed HTML file
app.get('/stream-lower-thirds.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stream-lower-thirds.html'));
});

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial data
  const initialData = {
    type: 'initial',
    performer: currentPerformer,
    timestamp: new Date().toISOString()
  };
  
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);
  
  // Add client to list
  clients.push(res);
  console.log(`✅ Client connected. Total clients: ${clients.length}`);
  
  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
      clients = clients.filter(client => client !== res);
    }
  }, 30000);
  
  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(client => client !== res);
    console.log(`❌ Client disconnected. Total clients: ${clients.length}`);
  });
});

// Update performer endpoint - handles multiple data formats
app.post('/update-performer', (req, res) => {
  console.log('Received update request:', req.body);
  
  // Normalize the data to a consistent format
  const performerData = {
    artist: req.body.artist || 'Unknown Artist',
    timeSlot: req.body.timeSlot || '',
    isIntermission: req.body.isIntermission || false
  };
  
  // Handle song data - support multiple input formats
  if (req.body.songs && Array.isArray(req.body.songs) && req.body.songs.length > 0) {
    // Array of songs format (from your system)
    const firstSong = req.body.songs[0];
    performerData.song = {
      title: firstSong.title || '',
      writer: firstSong.writer || ''
    };
  } else if (req.body.song && typeof req.body.song === 'object') {
    // Object format
    performerData.song = {
      title: req.body.song.title || '',
      writer: req.body.song.writer || ''
    };
  } else {
    // Flat format (backward compatibility)
    performerData.song = {
      title: req.body.songTitle || req.body.title || '',
      writer: req.body.songWriter || req.body.writer || ''
    };
  }
  
  currentPerformer = performerData;
  
  // Add to history
  performerHistory.push({
    ...currentPerformer,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 50 entries
  if (performerHistory.length > 50) {
    performerHistory = performerHistory.slice(-50);
  }
  
  console.log('Updated performer:', currentPerformer);
  
  // Send update to all connected clients
  const updateMessage = JSON.stringify({
    type: 'update',
    performer: currentPerformer
  });
  
  clients.forEach(client => {
    try {
      client.write(`data: ${updateMessage}\n\n`);
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  });
  
  res.json({ success: true, performer: currentPerformer });
});

// Clear performer endpoint
app.post('/clear-performer', (req, res) => {
  currentPerformer = null;
  
  console.log('Cleared performer');
  
  // Send clear message to all clients
  const clearMessage = JSON.stringify({
    type: 'clear',
    performer: null
  });
  
  clients.forEach(client => {
    try {
      client.write(`data: ${clearMessage}\n\n`);
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  });
  
  res.json({ success: true });
});

// Get current performer
app.get('/current-performer', (req, res) => {
  res.json(currentPerformer);
});

// Get performer history
app.get('/performer-history', (req, res) => {
  res.json({ history: performerHistory });
});

// Start intermission
app.post('/intermission', (req, res) => {
  const intermissionData = {
    artist: '🎭 INTERMISSION',
    isIntermission: true,
    timeSlot: req.body.timeSlot || ''
  };
  
  currentPerformer = intermissionData;
  
  // Send to all clients
  const updateMessage = JSON.stringify({
    type: 'update',
    performer: intermissionData
  });
  
  clients.forEach(client => {
    try {
      client.write(`data: ${updateMessage}\n\n`);
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  });
  
  res.json({ success: true, message: 'Intermission started' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    currentPerformer,
    connectedClients: clients.length,
    historyCount: performerHistory.length,
    uptime: process.uptime(),
    endpoints: {
      '/stream-lower-thirds.html': 'GET - The lower thirds HTML display',
      '/events': 'GET - SSE for real-time updates',
      '/update-performer': 'POST - Update current performer',
      '/clear-performer': 'POST - Clear current performer',
      '/current-performer': 'GET - Get current performer',
      '/performer-history': 'GET - Get performer history',
      '/intermission': 'POST - Start intermission',
      '/health': 'GET - Health check'
    }
  });
});

// Root endpoint - show status
app.get('/', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lower Thirds Server</title>
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
          background: #333; 
          padding: 20px; 
          border-radius: 10px; 
          margin: 20px 0;
        }
        .endpoint {
          background: #2a2a2a;
          padding: 10px;
          margin: 5px 0;
          border-radius: 5px;
          font-family: monospace;
        }
        h1 { color: #e91e63; }
        .success { color: #4CAF50; }
        .info { color: #2196F3; }
        a { color: #e91e63; }
      </style>
    </head>
    <body>
      <h1>🎭 Lower Thirds Server</h1>
      
      <div class="status">
        <h2 class="success">✅ Server Running</h2>
        <p>Port: ${PORT}</p>
        <p>Connected Clients: <strong>${clients.length}</strong></p>
        <p>Current Performer: <strong>${currentPerformer ? currentPerformer.artist : 'None'}</strong></p>
        <p>Uptime: ${Math.floor(process.uptime() / 60)} minutes</p>
      </div>

      <div class="status">
        <h2 class="info">📺 Lower Thirds Display</h2>
        <p>Open this in OBS Browser Source:</p>
        <p><a href="/stream-lower-thirds.html" target="_blank">http://localhost:${PORT}/stream-lower-thirds.html</a></p>
      </div>

      <div class="status">
        <h2>📡 Available Endpoints</h2>
        <div class="endpoint">GET /stream-lower-thirds.html - Lower thirds display</div>
        <div class="endpoint">GET /events - Real-time updates (SSE)</div>
        <div class="endpoint">POST /update-performer - Update current performer</div>
        <div class="endpoint">POST /clear-performer - Clear display</div>
        <div class="endpoint">POST /intermission - Start intermission</div>
        <div class="endpoint">GET /current-performer - Get current data</div>
        <div class="endpoint">GET /health - Server health check</div>
      </div>

      <div class="status">
        <h2>🔧 Test Commands</h2>
        <p>Update performer (curl example):</p>
        <pre style="background: #000; padding: 10px; overflow-x: auto;">
curl -X POST http://localhost:${PORT}/update-performer \\
  -H "Content-Type: application/json" \\
  -d '{
    "artist": "John Doe",
    "songs": [{"title": "My Song", "writer": "Jane Smith"}],
    "timeSlot": "8:00"
  }'</pre>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// Start server
app.listen(PORT, () => {
  console.log(`
🎭 Lower Thirds Server Started!
================================
🌐 Server: http://localhost:${PORT}
📺 Display: http://localhost:${PORT}/stream-lower-thirds.html
📡 Real-time updates: Connected via SSE

OBS Setup:
1. Add Browser Source
2. URL: http://localhost:${PORT}/stream-lower-thirds.html
3. Width: 1920, Height: 1080
4. FPS: 30
5. Uncheck "Shutdown source when not visible"

Ready for streaming! 🎬
  `);
});