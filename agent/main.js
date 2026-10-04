const { app, BrowserWindow, Tray, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let tray = null;
let window = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

app.dock && app.dock.hide();

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('IT Support Request');

  tray.on('click', (event, bounds) => {
    toggleWindow(bounds);
  });
}

function toggleWindow(bounds) {
  if (window.isVisible()) {
    window.hide();
  } else {
    window.show();
    window.focus();
  }
}

function createWindow() {
  window = new BrowserWindow({
    width: 320,
    height: 400,
    show: true,
    frame: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  window.loadFile('index.html');
  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });
}

app.whenReady().then(() => {
  if (!fs.existsSync(path.join(__dirname, 'icon.png'))) {
    fs.writeFileSync(path.join(__dirname, 'icon.png'), ''); 
  }
  createTray();
  createWindow();
});

ipcMain.handle('get-config', () => {
  let savedConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {}
  }

  return {
    pcNumber: savedConfig.pcNumber || os.hostname(),
    username: savedConfig.username || os.userInfo().username,
    serverIp: savedConfig.serverIp || 'http://localhost:4000',
    localIp: getLocalIpAddress()
  };
});

ipcMain.handle('save-config', (event, config) => {
  fs.writeFileSync(configPath, JSON.stringify(config));
  return true;
});
