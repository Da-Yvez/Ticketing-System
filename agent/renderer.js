const { ipcRenderer } = require('electron');
const axios = require('axios');

document.addEventListener('DOMContentLoaded', async () => {
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const requestBtn = document.getElementById('request-btn');
  const statusText = document.getElementById('status-text');

  let config = await ipcRenderer.invoke('get-config');

  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('pc-number').value = config.pcNumber;
    document.getElementById('username').value = config.username;
    document.getElementById('server-ip').value = config.serverIp;
    mainView.classList.add('hidden');
    settingsView.classList.remove('hidden');
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    settingsView.classList.add('hidden');
    mainView.classList.remove('hidden');
  });

  document.getElementById('save-btn').addEventListener('click', async () => {
    config = {
      pcNumber: document.getElementById('pc-number').value,
      username: document.getElementById('username').value,
      serverIp: document.getElementById('server-ip').value
    };
    await ipcRenderer.invoke('save-config', config);
    settingsView.classList.add('hidden');
    mainView.classList.remove('hidden');
  });

  requestBtn.addEventListener('click', async () => {
    requestBtn.disabled = true;
    requestBtn.textContent = 'Sending...';
    try {
      await axios.post(`${config.serverIp}/api/request-help`, {
        pcNumber: config.pcNumber,
        username: config.username,
        ipAddress: 'Unknown'
      });
      requestBtn.textContent = 'Request Sent!';
      requestBtn.style.backgroundColor = '#10b981';
      statusText.textContent = 'IT has been notified.';
      
      setTimeout(() => {
        requestBtn.disabled = false;
        requestBtn.textContent = 'Request Help';
        requestBtn.style.backgroundColor = '';
        statusText.textContent = 'Click below to request help from IT.';
      }, 5000);
      
    } catch (e) {
      statusText.textContent = 'Failed to reach server.';
      requestBtn.disabled = false;
      requestBtn.textContent = 'Retry Request';
    }
  });
});
