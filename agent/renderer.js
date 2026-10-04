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

  document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('hide-window');
  });

  function formatServerIp(ip) {
    let formatted = ip.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    if (formatted.split(':').length === 2) {
      formatted += ':4000';
    }
    return formatted;
  }

  document.getElementById('save-btn').addEventListener('click', async () => {
    const formattedIp = formatServerIp(document.getElementById('server-ip').value);
    document.getElementById('server-ip').value = formattedIp;
    
    config = {
      ...config,
      pcNumber: document.getElementById('pc-number').value,
      username: document.getElementById('username').value,
      serverIp: formattedIp
    };
    await ipcRenderer.invoke('save-config', config);
    settingsView.classList.add('hidden');
    mainView.classList.remove('hidden');
  });

  document.getElementById('quit-btn').addEventListener('click', () => {
    ipcRenderer.send('quit-app');
  });

  requestBtn.addEventListener('click', async () => {
    requestBtn.disabled = true;
    requestBtn.textContent = 'Verifying & Sending...';
    statusText.style.color = '#94a3b8';
    statusText.textContent = 'Connecting to IT support service...';

    try {
      const baseUrl = formatServerIp(config.serverIp);
      const response = await axios.post(`${baseUrl}/api/request-help`, {
        pcNumber: config.pcNumber,
        username: config.username,
        ipAddress: config.localIp || '127.0.0.1',
        message: document.getElementById('request-message').value
      });

      requestBtn.textContent = 'Request Sent!';
      requestBtn.style.backgroundColor = '#10b981';
      statusText.style.color = '#10b981';
      statusText.textContent = 'IT has been notified. Awaiting technician.';
      document.getElementById('request-message').value = '';

      setTimeout(() => {
        requestBtn.disabled = false;
        requestBtn.textContent = 'Request Help';
        requestBtn.style.backgroundColor = '';
        statusText.style.color = '#94a3b8';
        statusText.textContent = 'Click below to request help from IT.';
      }, 7000);

    } catch (e) {
      requestBtn.disabled = false;
      requestBtn.textContent = 'Request Help';
      statusText.style.color = '#f87171';

      if (e.response && e.response.data && e.response.data.error) {
        statusText.textContent = e.response.data.error;
      } else if (e.code === 'ECONNREFUSED' || e.message.includes('Network Error')) {
        statusText.textContent = 'Cannot reach backend service. Check network or server IP.';
      } else {
        statusText.textContent = 'An error occurred while contacting IT support.';
      }
    }
  });
});
