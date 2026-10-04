const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    startService: (type) => ipcRenderer.send('start-service', type),
    stopService: (type) => ipcRenderer.send('stop-service', type),
    restartService: (type) => ipcRenderer.send('restart-service', type),
    openDashboard: () => ipcRenderer.send('open-dashboard'),
    openYvexa: () => ipcRenderer.send('open-yvexa'),
    onStatusChange: (callback) => ipcRenderer.on('status', callback),
    onLogMsg: (callback) => ipcRenderer.on('log', callback)
});
