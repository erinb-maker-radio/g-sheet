// server.js - Lower Thirds Server for What Is Art?
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Store current performer data
let currentPerformer = null;
let performerHistory = [];
let sseClients = [];

// Server-Sent Events endpoint
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial connection
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // Add this client
    const clientId = Date.now();
    const client = { id: clientId, res };
    sseClients.push(client);
    
    // Send current performer if exists
    if (currentPerformer) {
        res.write(`data: ${JSON.stringify({ type: 'update', performer: currentPerformer })}\n\n`);
    }
    
    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
    }, 30000);
    
    // Remove client on disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients = sseClients.filter(c => c.id !== clientId);
        console.log(`Client disconnected. Active clients: ${sseClients.length}`);
    });
    
    console.log(`New SSE client connected. Active clients: ${sseClients.length}`);
});

// Get current performer
app.get('/current-performer', (req, res) => {
    if (currentPerformer) {
        res.json(currentPerformer);
    } else {
        res.status(404).json({ message: 'No current performer' });
    }
});

// Update performer
app.post('/update-performer', (req, res) => {
    const performerData = req.body;
    currentPerformer = {
        artist: performerData.artist || '',
        songTitle: performerData.songTitle || performerData.song?.title || '',
        songWriter: performerData.songWriter || performerData.song?.writer || '',
        timeSlot: performerData.timeSlot || '',
        isIntermission: performerData.isIntermission || false,
        keepVisible: performerData.keepVisible || false,
        timestamp: new Date().toISOString()
    };
    
    // Add to history
    performerHistory.push(currentPerformer);
    
    // Notify all SSE clients
    const message = JSON.stringify({ type: 'update', performer: currentPerformer });
    sseClients.forEach(client => {
        client.res.write(`data: ${message}\n\n`);
    });
    
    console.log('Updated performer:', currentPerformer);
    res.json({ success: true, performer: currentPerformer });
});

// Clear performer
app.post('/clear-performer', (req, res) => {
    currentPerformer = null;
    
    // Notify all SSE clients
    const message = JSON.stringify({ type: 'clear' });
    sseClients.forEach(client => {
        client.res.write(`data: ${message}\n\n`);
    });
    
    console.log('Cleared performer display');
    res.json({ success: true });
});

// Show intermission
app.post('/intermission', (req, res) => {
    currentPerformer = {
        artist: '🎭 INTERMISSION',
        songTitle: "We'll be right back!",
        songWriter: '',
        timeSlot: req.body.timeSlot || '',
        isIntermission: true,
        keepVisible: true,
        timestamp: new Date().toISOString()
    };
    
    // Notify all SSE clients
    const message = JSON.stringify({ type: 'update', performer: currentPerformer });
    sseClients.forEach(client => {
        client.res.write(`data: ${message}\n\n`);
    });
    
    console.log('Started intermission');
    res.json({ success: true });
});

// Get performer history
app.get('/performer-history', (req, res) => {
    res.json({ 
        history: performerHistory.slice(-20), // Last 20 performers
        total: performerHistory.length 
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        connectedClients: sseClients.length,
        currentPerformer: currentPerformer ? currentPerformer.artist : 'None'
    });
});

// Serve specific overlay files
app.get('/overlay', (req, res) => {
    const overlayPath = path.join(__dirname, 'stream-lower-thirds.html');
    if (fs.existsSync(overlayPath)) {
        res.sendFile(overlayPath);
    } else {
        // Fallback to other possible names
        const altPath = path.join(__dirname, 'lower-thirds.html');
        if (fs.existsSync(altPath)) {
            res.sendFile(altPath);
        } else {
            res.status(404).send('Overlay file not found');
        }
    }
});

// API documentation
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lower Thirds Server</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #1a1a1a;
                    color: #fff;
                }
                h1 { color: #e91e63; }
                h2 { color: #2196F3; }
                .endpoint {
                    background: #333;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 5px;
                    font-family: monospace;
                }
                .status {
                    background: #4CAF50;
                    color: white;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                a { color: #2196F3; }
            </style>
        </head>
        <body>
            <h1>🎭 Lower Thirds Server</h1>
            <div class="status">
                ✅ Server Running on Port ${PORT}<br>
                Connected Clients: ${sseClients.length}<br>
                Current Performer: ${currentPerformer ? currentPerformer.artist : 'None'}<br>
                Uptime: ${Math.floor(process.uptime())} seconds
            </div>
            
            <h2>📺 Lower Thirds Display</h2>
            <p>Open this in OBS Browser Source:</p>
            <p><a href="/stream-lower-thirds.html" target="_blank">http://localhost:${PORT}/stream-lower-thirds.html</a></p>
            
            <h2>🎯 Available Endpoints</h2>
            <div class="endpoint">GET /stream-lower-thirds.html - Lower thirds display</div>
            <div class="endpoint">GET /events - Real-time updates (SSE)</div>
            <div class="endpoint">POST /update-performer - Update current performer</div>
            <div class="endpoint">POST /clear-performer - Clear display</div>
            <div class="endpoint">POST /intermission - Start intermission</div>
            <div class="endpoint">GET /current-performer - Get current data</div>
            <div class="endpoint">GET /performer-history - Get performer history</div>
            <div class="endpoint">GET /health - Server health check</div>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`
🎭 Lower Thirds Server Started!
📺 Server: http://localhost:${PORT}
📺 Overlay: http://localhost:${PORT}/stream-lower-thirds.html
🎯 Status: http://localhost:${PORT}/

Ready for connections...
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    sseClients.forEach(client => {
        client.res.end();
    });
    process.exit();
});