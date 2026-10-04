const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');

let mainWindow = null;
let serverInstance = null;
let ioInstance = null;
let isServerRunning = false;

function getNetworkIp() {
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

function startServer(port = 4000) {
  if (isServerRunning) return;

  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());

  const server = http.createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    sendLog(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      sendLog(`Client disconnected: ${socket.id}`);
    });
  });

  expressApp.post('/api/request-help', (req, res) => {
    const { pcNumber, ipAddress, username } = req.body;
    sendLog(`Incoming request from ${username} (${pcNumber})`);

    db.get('SELECT id FROM devices WHERE pcNumber = ?', [pcNumber], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      let deviceId;
      if (row) {
        deviceId = row.id;
        db.run('UPDATE devices SET ipAddress = ?, username = ? WHERE id = ?', [ipAddress, username, deviceId]);
        createRequest(deviceId, res, pcNumber, username);
      } else {
        db.run('INSERT INTO devices (pcNumber, ipAddress, username) VALUES (?, ?, ?)', [pcNumber, ipAddress, username], function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to register device' });
          }
          deviceId = this.lastID;
          createRequest(deviceId, res, pcNumber, username);
        });
      }
    });
  });

  expressApp.get('/api/requests', (req, res) => {
    db.all(`
      SELECT r.id, r.status, r.timestamp, d.pcNumber, d.username, d.ipAddress 
      FROM requests r
      JOIN devices d ON r.deviceId = d.id
      WHERE r.status = 'pending'
      ORDER BY r.timestamp ASC
    `, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    });
  });

  function createRequest(deviceId, res, pcNumber, username) {
    db.run('INSERT INTO requests (deviceId) VALUES (?)', [deviceId], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create request' });
      }

      const requestData = {
        id: this.lastID,
        deviceId,
        pcNumber,
        username,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      io.emit('new-request', requestData);
      sendLog(`Ticket #${requestData.id} broadcasted via WebSocket`);
      res.json({ success: true, request: requestData });
    });
  }

  serverInstance = server.listen(port, '0.0.0.0', () => {
    isServerRunning = true;
    sendLog(`Backend server running on port ${port}`);
    updateStatus();
  });

  ioInstance = io;
}

function stopServer() {
  if (serverInstance) {
    if (ioInstance) {
      ioInstance.close();
    }
    serverInstance.close(() => {
      isServerRunning = false;
      sendLog('Backend server stopped.');
      updateStatus();
    });
  }
}

function sendLog(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', {
      timestamp: new Date().toLocaleTimeString(),
      text: message
    });
  }
}

function updateStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server-status', {
      running: isServerRunning,
      ip: getNetworkIp(),
      port: 4000
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 520,
    resizable: false,
    maximizable: false,
    frame: true,
    title: 'AhasaTV IT Support System Backend',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-finish-load', () => {
    updateStatus();
    startServer(4000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    stopServer();
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});

ipcMain.on('toggle-server', () => {
  if (isServerRunning) {
    stopServer();
  } else {
    startServer(4000);
  }
});

ipcMain.handle('get-status', () => {
  return {
    running: isServerRunning,
    ip: getNetworkIp(),
    port: 4000
  };
});
