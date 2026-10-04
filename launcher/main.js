const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let processes = {
    frontend: null,
    backend: null
};

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'AhasaTV IT Support System Launcher',
        width: 900,
        height: 680,
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
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status', type, 'stopped');
            mainWindow.webContents.send('log', type, `[SYSTEM] ${type} stopped.\n`);
        }
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
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status', type, 'running');
        mainWindow.webContents.send('log', type, `[SYSTEM] Starting ${type}...\n`);
    }

    processes[type].stdout.on('data', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('log', type, data.toString());
    });

    processes[type].stderr.on('data', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('log', type, data.toString());
    });

    processes[type].on('close', (code) => {
        processes[type] = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status', type, 'stopped');
            mainWindow.webContents.send('log', type, `[SYSTEM] ${type} exited with code ${code}.\n`);
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

ipcMain.on('open-dashboard', () => {
    shell.openExternal('http://localhost:5173');
});

ipcMain.on('open-yvexa', () => {
    shell.openExternal('https://yvexa.dev');
});

app.on('will-quit', () => {
    killProcess('frontend');
    killProcess('backend');
});
