const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    startService: (type) => ipcRenderer.send('start-service', type),
    stopService: (type) => ipcRenderer.send('stop-service', type),
    restartService: (type) => ipcRenderer.send('restart-service', type),
    onStatusChange: (callback) => ipcRenderer.on('status', callback)
});
