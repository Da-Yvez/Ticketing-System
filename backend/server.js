const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.post('/api/request-help', (req, res) => {
    const { pcNumber, ipAddress, username } = req.body;
    
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
            db.run('INSERT INTO devices (pcNumber, ipAddress, username) VALUES (?, ?, ?)', [pcNumber, ipAddress, username], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to register device' });
                }
                deviceId = this.lastID;
                createRequest(deviceId, res, pcNumber, username);
            });
        }
    });
});

app.get('/api/requests', (req, res) => {
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
    db.run('INSERT INTO requests (deviceId) VALUES (?)', [deviceId], function(err) {
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
        res.json({ success: true, request: requestData });
    });
}

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
});
