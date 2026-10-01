const { app, BrowserWindow, Tray, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let tray = null;
let window = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

app.dock && app.dock.hide();

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
    // Basic positioning, more complex math needed for multi-monitor / exact taskbar position
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
  // Create a dummy icon file if it doesn't exist so it doesn't crash
  if (!fs.existsSync(path.join(__dirname, 'icon.png'))) {
    fs.writeFileSync(path.join(__dirname, 'icon.png'), ''); 
  }
  createTray();
  createWindow();
});

// IPC Handlers
ipcMain.handle('get-config', () => {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return { pcNumber: os.hostname(), username: os.userInfo().username, serverIp: 'http://localhost:4000' };
});

ipcMain.handle('save-config', (event, config) => {
  fs.writeFileSync(configPath, JSON.stringify(config));
  return true;
});
