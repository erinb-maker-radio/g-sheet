// start-all.js - Start both React and Lower Thirds server
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting What Is Art? Application...\n');

// Start the lower thirds server
console.log('📺 Starting Lower Thirds Server on port 3001...');
const lowerThirds = spawn('node', ['lower-thirds-server.js'], {
  cwd: path.join(__dirname, 'lower-thirds-server'),
  stdio: 'inherit',
  shell: true
});

// Give the lower thirds server a moment to start
setTimeout(() => {
  console.log('\n🎨 Starting React App on port 3000...');
  
  // Start the React app
  const react = spawn('npm', ['run', 'start-react'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, BROWSER: 'none' } // Prevent auto-opening browser
  });

  // Handle exit
  const cleanup = () => {
    console.log('\n🛑 Shutting down servers...');
    lowerThirds.kill();
    react.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
}, 2000);