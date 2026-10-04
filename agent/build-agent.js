const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the Server IP (e.g. http://192.168.1.100:4000): ', (ip) => {
  if (ip && ip.trim().length > 0) {
    let defaultServerIp = ip.trim();
    if (!defaultServerIp.startsWith('http://') && !defaultServerIp.startsWith('https://')) {
      defaultServerIp = 'http://' + defaultServerIp;
    }
    if (defaultServerIp.split(':').length === 2) {
      defaultServerIp += ':4000';
    }
    const config = { serverIp: defaultServerIp };
    // We will save this as default-config.json which main.js will read
    fs.writeFileSync(path.join(__dirname, 'default-config.json'), JSON.stringify(config));
    console.log(`Saved default Server IP: ${defaultServerIp}`);
  } else {
    console.log('No IP provided. Using default fallback.');
  }

  console.log('\nBuilding agent (folder structure)...');
  try {
    // This runs electron-builder --win dir
    execSync('npm run build', { stdio: 'inherit' });
    console.log('\nBuild complete! The folder is located in the dist/ directory.');
  } catch (error) {
    console.error('Build failed', error);
  }

  rl.close();
});
