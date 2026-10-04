function startService(type) {
    window.api.startService(type);
}

function stopService(type) {
    window.api.stopService(type);
}

function restartService(type) {
    window.api.restartService(type);
}

function startAll() {
    startService('backend');
    setTimeout(() => {
        startService('frontend');
    }, 1000);
}

function openDashboard() {
    window.api.openDashboard();
}

function openYvexa() {
    window.api.openYvexa();
}

function clearLogs() {
    document.getElementById('log-output').innerHTML = '';
}

window.api.onStatusChange((event, type, status) => {
    const isRunning = status === 'running';
    
    // Update UI elements
    document.getElementById(`status-${type}`).innerText = isRunning ? 'Running - Healthy' : 'Stopped';
    document.getElementById(`indicator-${type}`).classList.toggle('active', isRunning);
    document.getElementById(`card-${type}`).classList.toggle('running', isRunning);
    
    // Toggle buttons
    document.getElementById(`btn-start-${type}`).disabled = isRunning;
    document.getElementById(`btn-stop-${type}`).disabled = !isRunning;
    document.getElementById(`btn-restart-${type}`).disabled = !isRunning;
    
    if (type === 'frontend') {
        document.getElementById('btn-open-dashboard').disabled = !isRunning;
    }
});

window.api.onLogMsg((event, type, msg) => {
    const logBox = document.getElementById('log-output');
    
    const lines = msg.split('\n').filter(line => line.trim() !== '');
    
    lines.forEach(line => {
        const span = document.createElement('div');
        span.className = 'log-line';
        
        const prefix = document.createElement('span');
        prefix.className = `log-prefix-${type}`;
        prefix.innerText = `[${type.toUpperCase()}] `;
        
        const content = document.createElement('span');
        content.innerText = line;
        
        span.appendChild(prefix);
        span.appendChild(content);
        logBox.appendChild(span);
    });
    
    // Auto scroll to bottom
    logBox.scrollTop = logBox.scrollHeight;
});
