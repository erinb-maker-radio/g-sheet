// lower-thirds-server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Current display state
let displayState = {
  mode: 'none', // 'live', 'next', 'none'
  episode: '',
  artist: '',
  songTitle: '',
  writer: ''
};

// SSE clients
const clients = [];

// Update display state
app.post('/update', (req, res) => {
  displayState = req.body;
  console.log('Display updated:', displayState);
  
  // Notify all connected clients
  const data = JSON.stringify(displayState);
  clients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
  
  res.json({ success: true });
});

// SSE endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send current state
  res.write(`data: ${JSON.stringify(displayState)}\n\n`);
  
  // Add to clients
  clients.push(res);
  
  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

// Serve the overlay HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>What Is Art? - Display</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: transparent;
      width: 1920px;
      height: 1080px;
      position: relative;
      overflow: hidden;
    }
    
    /* Lower thirds */
    .lower-thirds {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 0 60px;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    }
    
    .lower-thirds.visible { display: flex; }
    
    .info-text {
      color: white;
      font-size: 32px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    }
    
    .logo {
      height: 80px;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8));
    }
    
    /* Up Next */
    .up-next {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      display: none;
    }
    
    .up-next.visible { display: block; }
    
    .up-next-title {
      font-size: 60px;
      color: #e91e63;
      margin-bottom: 20px;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
    }
    
    .up-next-info {
      font-size: 72px;
      color: white;
      font-weight: bold;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
    }
  </style>
</head>
<body>
  <div class="lower-thirds" id="lowerThirds">
    <div class="info-text" id="infoText"></div>
    <img class="logo" src="https://images.squarespace-cdn.com/content/v1/65233de405f7fd7c8c64268a/a7a30e11-5a04-42d8-aa24-39f00352e1e0/MakerRadioLogo2.png?format=500w" alt="Maker Radio">
  </div>
  
  <div class="up-next" id="upNext">
    <div class="up-next-title">UP NEXT</div>
    <div class="up-next-info" id="upNextInfo"></div>
  </div>
  
  <script>
    const eventSource = new EventSource('/events');
    const lowerThirds = document.getElementById('lowerThirds');
    const upNext = document.getElementById('upNext');
    const infoText = document.getElementById('infoText');
    const upNextInfo = document.getElementById('upNextInfo');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.mode === 'live') {
        // Show lower thirds
        lowerThirds.classList.add('visible');
        upNext.classList.remove('visible');
        
        let text = \`What Is Art? #\${data.episode} | \${data.artist} - \${data.songTitle}\`;
        if (data.writer) {
          text += \` - Written by \${data.writer}\`;
        }
        infoText.textContent = text;
        
      } else if (data.mode === 'next') {
        // Show up next
        lowerThirds.classList.remove('visible');
        upNext.classList.add('visible');
        upNextInfo.textContent = \`\${data.artist} - \${data.songTitle}\`;
        
      } else {
        // Hide everything
        lowerThirds.classList.remove('visible');
        upNext.classList.remove('visible');
      }
    };
  </script>
</body>
</html>
  `);
});

app.listen(3002, () => {
  console.log('Lower thirds server running on http://localhost:3002');
});