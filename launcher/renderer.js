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
});
