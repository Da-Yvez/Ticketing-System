const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const supabase = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.post('/api/request-help', async (req, res) => {
  const { pcNumber, ipAddress, username, message } = req.body;

  if (!pcNumber) {
    return res.status(400).json({ error: 'Device PC name is required' });
  }

  try {
    const { data: device, error: devErr } = await supabase
      .from('devices')
      .select('id, pc_number, ip_address, assigned_user, department')
      .eq('pc_number', pcNumber.trim())
      .maybeSingle();

    if (devErr) {
      console.error('Supabase query error:', devErr);
      return res.status(500).json({ error: 'Database verification failed' });
    }

    if (!device) {
      return res.status(403).json({
        error: 'This device is not registered in the IT system. Please contact IT Admins to register this PC.'
      });
    }

    const clientIp = (ipAddress || '').trim();
    if (clientIp && clientIp !== 'Unknown' && device.ip_address) {
      if (device.ip_address !== clientIp) {
        return res.status(403).json({
          error: `IP address mismatch for ${pcNumber}. Registered: ${device.ip_address}, Detected: ${clientIp}. Please contact IT Admins.`
        });
      }
    }

    const { data: activeRequests, error: reqCheckErr } = await supabase
      .from('requests')
      .select('id, status, created_at')
      .eq('device_id', device.id)
      .in('status', ['pending', 'in_progress'])
      .limit(1);

    if (reqCheckErr) {
      console.error('Check active requests error:', reqCheckErr);
      return res.status(500).json({ error: 'Failed to verify request state' });
    }

    if (activeRequests && activeRequests.length > 0) {
      return res.status(409).json({
        error: 'You already have an active help request. Please wait until IT resolves or dismisses your request.'
      });
    }

    const { data: newTicket, error: insertErr } = await supabase
      .from('requests')
      .insert([{
        device_id: device.id,
        status: 'pending',
        message: message ? message.trim() : null
      }])
      .select('id, status, created_at, message')
      .single();

    if (insertErr) {
      console.error('Insert request error:', insertErr);
      return res.status(500).json({ error: 'Failed to create help request' });
    }

    const requestData = {
      id: newTicket.id,
      deviceId: device.id,
      pcNumber: device.pc_number,
      username: username || device.assigned_user || 'Unknown User',
      department: device.department || 'Unknown',
      ipAddress: device.ip_address,
      status: newTicket.status,
      message: newTicket.message,
      timestamp: newTicket.created_at
    };

    io.emit('new-request', requestData);

    return res.status(201).json({
      success: true,
      message: 'Help request submitted successfully',
      request: requestData
    });
  } catch (err) {
    console.error('Unexpected error handling request-help:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/requests', async (req, res) => {
  const statusFilter = req.query.status || 'pending';

  try {
    let query = supabase
      .from('requests')
      .select(`
        id,
        status,
        created_at,
        resolved_at,
        message,
        devices (
          id,
          pc_number,
          ip_address,
          assigned_user,
          department
        )
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }

    const formatted = (data || []).map((row) => ({
      id: row.id,
      status: row.status,
      timestamp: row.created_at,
      resolvedAt: row.resolved_at,
      deviceId: row.devices?.id,
      pcNumber: row.devices?.pc_number || 'Unknown PC',
      username: row.devices?.assigned_user || 'Unknown User',
      department: row.devices?.department || 'Unknown',
      message: row.message,
      ipAddress: row.devices?.ip_address || '127.0.0.1'
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('Unexpected error fetching requests:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/requests/:id/resolve', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('requests')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select('id, status, resolved_at')
      .single();

    if (error) {
      console.error('Resolve ticket error:', error);
      return res.status(500).json({ error: 'Failed to resolve ticket' });
    }

    io.emit('ticket-resolved', { id: Number(ticketId) });
    return res.json({ success: true, ticket: data });
  } catch (err) {
    console.error('Unexpected resolve error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/requests/:id/dismiss', async (req, res) => {
  const ticketId = req.params.id;

  try {
    const { data, error } = await supabase
      .from('requests')
      .update({
        status: 'dismissed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select('id, status, resolved_at')
      .single();

    if (error) {
      console.error('Dismiss ticket error:', error);
      return res.status(500).json({ error: 'Failed to dismiss ticket' });
    }

    io.emit('ticket-dismissed', { id: Number(ticketId) });
    return res.json({ success: true, ticket: data });
  } catch (err) {
    console.error('Unexpected dismiss error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('pc_number', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch devices' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/devices', async (req, res) => {
  const { pcNumber, ipAddress, assignedUser, department } = req.body;

  if (!pcNumber || !ipAddress) {
    return res.status(400).json({ error: 'pcNumber and ipAddress are required' });
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .insert([{
        pc_number: pcNumber.trim(),
        ip_address: ipAddress.trim(),
        assigned_user: assignedUser ? assignedUser.trim() : null,
        department: department ? department.trim() : null
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ success: true, device: data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/devices/:id', async (req, res) => {
  const { pcNumber, ipAddress, assignedUser, department } = req.body;

  try {
    const updateData = {};
    if (pcNumber) updateData.pc_number = pcNumber.trim();
    if (ipAddress) updateData.ip_address = ipAddress.trim();
    if (assignedUser !== undefined) updateData.assigned_user = assignedUser ? assignedUser.trim() : null;
    if (department !== undefined) updateData.department = department ? department.trim() : null;

    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true, device: data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
