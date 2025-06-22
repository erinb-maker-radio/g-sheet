// test-lower-thirds.js
// Run this with: node test-lower-thirds.js

const BASE_URL = 'http://localhost:3001';

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test data
const performers = [
  {
    artist: "Sarah Johnson",
    songs: [
      { title: "Midnight Dreams", writer: "Sarah Johnson" },
      { title: "Coffee Shop Blues", writer: "Mike Williams" }
    ],
    timeSlot: "8:00"
  },
  {
    artist: "The Local Band",
    songs: [
      { title: "Street Lights", writer: "Tom Davis" },
      { title: "Summer Rain", writer: "The Local Band" }
    ],
    timeSlot: "8:15"
  },
  {
    artist: "Mike Thompson",
    songs: [
      { title: "Acoustic Journey", writer: "Mike Thompson" }
    ],
    timeSlot: "8:45"
  }
];

async function updatePerformer(performer) {
  try {
    const response = await fetch(`${BASE_URL}/update-performer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(performer)
    });
    const result = await response.json();
    console.log(`✅ Updated: ${performer.artist}`);
    return result;
  } catch (error) {
    console.error('❌ Error updating performer:', error.message);
  }
}

async function startIntermission() {
  try {
    const response = await fetch(`${BASE_URL}/intermission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSlot: "8:30" })
    });
    const result = await response.json();
    console.log(`🎭 Started intermission`);
    return result;
  } catch (error) {
    console.error('❌ Error starting intermission:', error.message);
  }
}

async function clearDisplay() {
  try {
    const response = await fetch(`${BASE_URL}/clear-performer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    console.log(`🧹 Cleared display`);
    return result;
  } catch (error) {
    console.error('❌ Error clearing display:', error.message);
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const result = await response.json();
    console.log(`📊 Server Status: ${result.status}`);
    console.log(`   Connected clients: ${result.connectedClients}`);
    console.log(`   Current performer: ${result.currentPerformer?.artist || 'None'}`);
    return result;
  } catch (error) {
    console.error('❌ Server not running! Start it with: node lower-thirds-server.js');
    process.exit(1);
  }
}

async function runDemo() {
  console.log('🎬 Lower Thirds Test Demo');
  console.log('========================\n');
  
  // Check if server is running
  await checkHealth();
  console.log('\n');
  
  console.log('Starting demo sequence...\n');
  
  // Cycle through performers
  for (const performer of performers) {
    console.log(`🎤 Now performing: ${performer.artist}`);
    await updatePerformer(performer);
    await wait(5000); // Show for 5 seconds
    
    // Show second song if they have one
    if (performer.songs.length > 1) {
      console.log(`   Playing second song: ${performer.songs[1].title}`);
      await updatePerformer({
        ...performer,
        songs: [performer.songs[1]] // Just the second song
      });
      await wait(5000);
    }
  }
  
  // Show intermission
  console.log('\n🎭 Time for intermission!');
  await startIntermission();
  await wait(5000);
  
  // Clear and show default
  console.log('\n🧹 Clearing display (showing defaults)');
  await clearDisplay();
  await wait(3000);
  
  console.log('\n✅ Demo complete!');
  console.log('The lower thirds will continue showing default content.');
  console.log('Press Ctrl+C to exit.');
}

// Run the demo
runDemo().catch(console.error);

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n\n👋 Goodbye!');
  process.exit(0);
});