// check-structure.js - Simple script to check your project structure
const fs = require('fs');
const path = require('path');

console.log('📁 Checking project structure...\n');
console.log('Current directory:', process.cwd());
console.log('\nFiles in current directory:');

// List all files and folders in current directory
const files = fs.readdirSync('.');
files.forEach(file => {
  const stat = fs.statSync(file);
  const type = stat.isDirectory() ? '📁' : '📄';
  console.log(`${type} ${file}`);
});

// Check for key files
console.log('\n🔍 Checking for key files:');

const checkFile = (filepath, description) => {
  if (fs.existsSync(filepath)) {
    console.log(`✅ ${description}: Found at ${filepath}`);
  } else {
    console.log(`❌ ${description}: NOT FOUND at ${filepath}`);
  }
};

checkFile('package.json', 'Root package.json');
checkFile('src/App.js', 'React App.js');
checkFile('backend/lower-thirds-server.js', 'Lower thirds server');
checkFile('backend/package.json', 'Backend package.json');
checkFile('lower-thirds-server/package.json', 'Lower thirds folder package.json');
checkFile('node_modules', 'Node modules');

// Check if there's a lower-thirds-server folder
if (fs.existsSync('lower-thirds-server')) {
  console.log('\n📁 Found lower-thirds-server folder. Contents:');
  const lowerThirdsFiles = fs.readdirSync('lower-thirds-server');
  lowerThirdsFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
}

console.log('\n💡 TIP: Make sure you run this script from your project root directory!');
console.log('   If you see "NOT FOUND" for important files, you might be in the wrong directory.');