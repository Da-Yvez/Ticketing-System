const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let processes = {
    frontend: null,
    backend: null
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 450,
        height: 520,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0a0e1a',
        autoHideMenuBar: true
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function killProcess(type) {
    if (processes[type]) {
        if (process.platform === 'win32') {
            spawn("taskkill", ["/pid", processes[type].pid, '/f', '/t']);
        } else {
            processes[type].kill();
        }
        processes[type] = null;
        mainWindow.webContents.send('status', type, 'stopped');
    }
}

ipcMain.on('start-service', (event, type) => {
    if (processes[type]) return;
    
    let cmd, args, cwd;
    const projectRoot = path.join(__dirname, '..');

    if (type === 'frontend') {
        cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        args = ['run', 'dev'];
        cwd = path.join(projectRoot, 'dashboard');
    } else if (type === 'backend') {
        cmd = process.platform === 'win32' ? 'node' : 'node';
        args = ['server.js'];
        cwd = path.join(projectRoot, 'backend');
    }

    processes[type] = spawn(cmd, args, { cwd, shell: true });
    mainWindow.webContents.send('status', type, 'running');

    processes[type].on('close', (code) => {
        processes[type] = null;
        if (mainWindow) {
            mainWindow.webContents.send('status', type, 'stopped');
        }
    });
});

ipcMain.on('stop-service', (event, type) => {
    killProcess(type);
});

ipcMain.on('restart-service', (event, type) => {
    killProcess(type);
    setTimeout(() => {
        ipcMain.emit('start-service', event, type);
    }, 1000);
});

app.on('will-quit', () => {
    killProcess('frontend');
    killProcess('backend');
});
