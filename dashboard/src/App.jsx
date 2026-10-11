import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Monitor,
  MessageSquare,
  Clock,
  CheckCircle2,
  Server,
  User,
  History as HistoryIcon,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox,
  Plus,
  Trash2,
  XCircle,
  ShieldCheck,
  Search,
  Building,
  RefreshCw,
  HardDrive,
  Copy,
  CheckCheck,
  Activity,
  Radio,
  Pencil,
  Cpu
} from 'lucide-react';
import logo from './assets/logo.jpg';
import StackedBarPulse from './components/ui/stacked-bar-pulse';
import './App.css';
import './DevicesTab.css';

const SOCKET_URL = 'http://localhost:4000';

const DEPARTMENTS = [
  'News',
  'Engineering',
  'Edit',
  'Graphic',
  'Production',
  'Managers',
  'Makeup',
  'Scheduling',
  'HR',
  'Finance'
];

const DEPT_COLORS = {
  News: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  Engineering: { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)' },
  Edit: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  Graphic: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  Production: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  Managers: { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  Makeup: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.3)' },
  Scheduling: { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
  HR: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  Finance: { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.3)' }
};

function App() {
  const [requests, setRequests] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [devices, setDevices] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Device filtering & form state
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [newPcNumber, setNewPcNumber] = useState('');
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newAssignedUser, setNewAssignedUser] = useState('');
  const [newDepartment, setNewDepartment] = useState('News');
  const [deviceMsg, setDeviceMsg] = useState('');
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [selectedHardwareDevice, setSelectedHardwareDevice] = useState(null);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('all');
  const [broadcastTarget, setBroadcastTarget] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyIp = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const openHardwareForRequest = (req) => {
    const matched = devices.find(d => d.pc_number === req.pcNumber || (req.deviceId && d.id === req.deviceId));
    const deviceData = {
      pc_number: req.pcNumber,
      department: req.department,
      ip_address: req.ipAddress,
      assigned_user: req.username,
      hardware_info: req.hardware_info || matched?.hardware_info || null
    };
    setSelectedHardwareDevice(deviceData);
    setIsHardwareModalOpen(true);
  };

  const getElapsedString = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diffSec = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ${diffMin % 60}m ago`;
  };

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      setIsConnected(true);
      fetchRequests();
      fetchDevices();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new-request', (request) => {
      setRequests((prev) => {
        if (prev.some(r => r.id === request.id)) return prev;
        return [request, ...prev];
      });
      fetchRequests();
    });

    socket.on('ticket-resolved', ({ id }) => {
      setRequests((prev) => prev.filter(req => req.id !== id));
      fetchRequests();
    });

    socket.on('ticket-dismissed', ({ id }) => {
      setRequests((prev) => prev.filter(req => req.id !== id));
      fetchRequests();
    });

    socket.on('device-hardware-updated', ({ pcNumber, hardware }) => {
      setDevices(prev => prev.map(d => d.pc_number === pcNumber ? { ...d, hardware_info: hardware } : d));
      setSelectedHardwareDevice(prev => (prev && prev.pc_number === pcNumber ? { ...prev, hardware_info: hardware } : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const pendingRes = await fetch(`${SOCKET_URL}/api/requests?status=pending`);
      const pendingData = await pendingRes.json();
      setRequests(Array.isArray(pendingData) ? pendingData : []);

      const allRes = await fetch(`${SOCKET_URL}/api/requests?status=all`);
      const allData = await allRes.json();
      setAllTickets(Array.isArray(allData) ? allData : []);
    } catch (error) { }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/devices`);
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (error) { }
  };

  const resolveRequest = async (id) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/requests/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        setRequests(prev => prev.filter(req => req.id !== id));
        fetchRequests();
      }
    } catch (error) { }
  };

  const dismissRequest = async (id) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/requests/${id}/dismiss`, { method: 'PATCH' });
      if (res.ok) {
        setRequests(prev => prev.filter(req => req.id !== id));
        fetchRequests();
      }
    } catch (error) { }
  };

  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!newPcNumber || !newIpAddress) return;

    try {
      const res = await fetch(`${SOCKET_URL}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pcNumber: newPcNumber,
          ipAddress: newIpAddress,
          assignedUser: newAssignedUser,
          department: newDepartment
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDeviceMsg('Device authorized successfully!');
        setNewPcNumber('');
        setNewIpAddress('');
        setNewAssignedUser('');
        fetchDevices();
        setTimeout(() => {
          setDeviceMsg('');
          setIsAuthorizeModalOpen(false);
        }, 1500);
      } else {
        setDeviceMsg(data.error || 'Failed to authorize device');
      }
    } catch (error) {
      setDeviceMsg('Connection error');
    }
  };

  const openEditModal = (device) => {
    setEditingDeviceId(device.id);
    setNewPcNumber(device.pc_number || '');
    setNewIpAddress(device.ip_address || '');
    setNewAssignedUser(device.assigned_user || '');
    setNewDepartment(device.department || 'General');
    setDeviceMsg('');
    setIsEditModalOpen(true);
  };

  const handleUpdateDevice = async (e) => {
    e.preventDefault();
    if (!newPcNumber || !newIpAddress || !editingDeviceId) return;

    try {
      const res = await fetch(`${SOCKET_URL}/api/devices/${editingDeviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pcNumber: newPcNumber,
          ipAddress: newIpAddress,
          assignedUser: newAssignedUser,
          department: newDepartment
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDeviceMsg('Device updated successfully!');
        fetchDevices();
        setTimeout(() => {
          setDeviceMsg('');
          setIsEditModalOpen(false);
          setEditingDeviceId(null);
          setNewPcNumber('');
          setNewIpAddress('');
          setNewAssignedUser('');
        }, 1500);
      } else {
        setDeviceMsg(data.error || 'Failed to update device');
      }
    } catch (error) {
      setDeviceMsg('Connection error');
    }
  };

  const handleDeleteDevice = async (id) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDevices();
      }
    } catch (error) { }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      setBroadcastStatus('Sending...');
      const response = await fetch(`${SOCKET_URL}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: broadcastMessage,
          targetType: broadcastType,
          targetValue: broadcastType === 'all' ? null : [broadcastTarget]
        })
      });
      if (response.ok) {
        setBroadcastStatus('Broadcast sent successfully!');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastStatus(''), 3000);
      } else {
        setBroadcastStatus('Failed to send broadcast.');
      }
    } catch (e) {
      setBroadcastStatus('Error sending broadcast.');
    }
  };

  const filteredDevices = devices.filter(d => {
    const matchesDept = selectedDeptFilter === 'All' || d.department === selectedDeptFilter;
    const matchesSearch =
      (d.pc_number || '').toLowerCase().includes(deviceSearch.toLowerCase()) ||
      (d.ip_address || '').toLowerCase().includes(deviceSearch.toLowerCase()) ||
      (d.assigned_user || '').toLowerCase().includes(deviceSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const resolvedTickets = allTickets.filter(t => t.status === 'resolved' || t.status === 'dismissed');

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
        <img src={logo} alt="AhasaTV" style={{ width: '120px', borderRadius: '20px', marginBottom: '2rem', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.2)' }} />
        <StackedBarPulse />
        <h2 style={{ marginTop: '24px', fontSize: '1.5rem', fontWeight: '700', color: 'var(--brand-blue)' }}>Backend is Offline</h2>
        <p style={{ marginTop: '12px', fontSize: '1rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.5' }}>Waiting for the Core API to start...<br />Please start the backend via the AhasaTV Launcher.</p>
      </div>
    );
  }

  return (
    <div className="layout-root">
      <AnimatePresence initial={false}>
        {isSidebarOpen ? (
          <motion.aside
            className="left-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="sidebar-container">
              <div className="sidebar-brand-row">
                <div className="brand-group">
                  <img src={logo} alt="AhasaTV" className="brand-avatar" />
                  <div className="brand-meta">
                    <span className="brand-name">AhasaTV</span>
                    <span className="brand-role">IT Operations Hub</span>
                  </div>
                </div>
                <button
                  className="sidebar-collapse-btn"
                  onClick={() => setIsSidebarOpen(false)}
                  title="Hide sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>

              <nav className="sidebar-nav">
                <button
                  className={`nav-tab ${activeTab === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tickets')}
                >
                  <Ticket size={16} />
                  <span>Live Tickets ({requests.length})</span>
                </button>
                <button
                  className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('devices'); fetchDevices(); }}
                >
                  <Monitor size={16} />
                  <span>Devices ({devices.length})</span>
                </button>
                <button
                  className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('history'); fetchRequests(); }}
                >
                  <HistoryIcon size={16} />
                  <span>Ticket History ({resolvedTickets.length})</span>
                </button>
                <button
                  className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare size={16} />
                  <span>Broadcasts</span>
                </button>
              </nav>

              <div className="sidebar-bottom">
                <div className={`status-pill ${isConnected ? 'live' : 'dead'}`}>
                  <span className="status-dot"></span>
                  <span>{isConnected ? 'Core Engine Online' : 'Core Engine Offline'}</span>
                </div>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {!isSidebarOpen && (
        <div className="mini-rail">
          <button
            className="mini-rail-btn"
            onClick={() => setIsSidebarOpen(true)}
            title="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>

          <div
            className={`mini-status-dot ${isConnected ? 'live' : 'dead'}`}
            title={isConnected ? 'Server Online' : 'Server Offline'}
          />
        </div>
      )}

      <main className="content-stage">
        <div className="stage-inner">

          {activeTab === 'tickets' && (
            <div className="dispatch-container">
              <header className="dispatch-header">
                <div className="dispatch-headline-group">
                  <div className="dispatch-badge-row">
                    <span className={`dispatch-counter-badge ${requests.length > 0 ? 'active-queue' : 'clear-queue'}`}>
                      {requests.length > 0 ? `${requests.length} Active ${requests.length === 1 ? 'Request' : 'Requests'}` : 'All Workstations Nominal'}
                    </span>
                  </div>
                  <h1 className="main-title">Live Support Dispatch</h1>
                  <p className="main-subtitle">Incoming instant assistance requests from authorized workstations.</p>
                </div>
              </header>

              <div className="dispatch-content-area">
                <AnimatePresence mode="popLayout">
                  {requests.length === 0 ? (
                    <motion.div
                      key="empty-queue"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="dispatch-standby-card"
                    >
                      <div className="standby-radar-wrapper">
                        <div className="standby-pulse-ring ring-1"></div>
                        <div className="standby-pulse-ring ring-2"></div>
                        <div className="standby-center-core">
                          <ShieldCheck size={32} />
                        </div>
                      </div>
                      <div className="standby-copy-group">
                        <span className="standby-status-label">Operational Standby</span>
                        <h2>Dispatch Queue Clear</h2>
                        <p>
                          All networked computers are operating without open alerts.
                          When an authorized user requests help, their ticket will instantly appear here with real-time diagnostics.
                        </p>
                      </div>
                      <div className="standby-footer-specs">
                        <span className="spec-item">
                          <Activity size={13} /> Socket: Connected (Port 4000)
                        </span>
                        <span className="spec-divider">•</span>
                        <span className="spec-item">
                          <Monitor size={13} /> {devices.length} Authorized Devices Registered
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="dispatch-cards-grid">
                      {requests.map((req) => {
                        const isCopied = copiedId === req.id;

                        return (
                          <motion.div
                            key={req.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className="incident-card"
                          >
                            <div className="incident-card-topbar">
                              <div className="incident-device-group">
                                <div className="machine-code-pill">
                                  <Monitor size={15} />
                                  <span>{req.pcNumber}</span>
                                </div>
                                <span className="incident-dept-pill">
                                  {req.department}
                                </span>
                                <button
                                  type="button"
                                  className="incident-specs-btn"
                                  onClick={() => openHardwareForRequest(req)}
                                  title="View Workstation Hardware Diagnostics"
                                >
                                  <Cpu size={12} />
                                  <span>Hardware</span>
                                </button>
                              </div>

                              <div className="incident-status-badges">
                                <div
                                  className="incident-timer-badge"
                                  title={`Logged at ${new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                                >
                                  <Clock size={13} />
                                  <span>{getElapsedString(req.timestamp)}</span>
                                  <span className="timer-hover-tooltip">
                                    {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="incident-specs-matrix">
                              <div className="spec-metric-cell">
                                <span className="spec-caption">Requester</span>
                                <div className="spec-value-row">
                                  <div className="avatar-chip">
                                    {(req.username || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="spec-primary-text">{req.username}</span>
                                </div>
                              </div>

                              <div className="spec-metric-cell">
                                <span className="spec-caption">IP Address</span>
                                <div className="spec-value-row">
                                  <button
                                    type="button"
                                    className="spec-ip-pill"
                                    onClick={() => handleCopyIp(req.ipAddress || '127.0.0.1', req.id)}
                                    title="Click to copy IP"
                                  >
                                    <Server size={12} />
                                    <span>{req.ipAddress || '127.0.0.1'}</span>
                                    {isCopied ? <CheckCheck size={12} className="copied-icon" /> : <Copy size={11} className="copy-icon" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="incident-narrative-box">
                              <div className="narrative-label">
                                <MessageSquare size={13} />
                                <span>Reported Issue</span>
                              </div>
                              <p className="narrative-body">
                                {req.message ? req.message : <span className="empty-message-text">No custom message specified by user.</span>}
                              </p>
                            </div>

                            <div className="incident-card-actions">
                              <button
                                type="button"
                                className="action-resolve-btn"
                                onClick={() => resolveRequest(req.id)}
                              >
                                <Check size={16} />
                                <span>Mark Resolved</span>
                              </button>
                              <button
                                type="button"
                                className="action-dismiss-btn"
                                onClick={() => dismissRequest(req.id)}
                                title="Dismiss and close this ticket"
                              >
                                <XCircle size={16} />
                                <span>Dismiss</span>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* TAB 2: MODERN DEVICES DIRECTORY */}
          {activeTab === 'devices' && (
            <div className="devices-redesign">
              <div className="main-inner">
                <header className="page-heading">
                  <div>
                    <h1>Workstation directory</h1>
                    <p className="page-note">
                      Browse the authorized computers across AhasaTV departments.
                    </p>
                  </div>
                  <button className="primary-button" onClick={() => setIsAuthorizeModalOpen(true)}>
                    <Plus className="icon" size={17} />
                    <span>Authorize a workstation</span>
                  </button>
                </header>

                <section aria-label="Authorized workstations" className="directory">
                  <div className="controls">
                    <div className="control-group">
                      <label className="control-label" htmlFor="directory-search">
                        Search workstations
                      </label>
                      <div className="search-wrap">
                        <Search className="icon" size={17} />
                        <input
                          className="search-control"
                          id="directory-search"
                          placeholder="Hostname, IP address, or assigned user"
                          type="search"
                          value={deviceSearch}
                          onChange={(e) => setDeviceSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="control-group">
                      <label className="control-label" htmlFor="directory-department">
                        Department
                      </label>
                      <select
                        className="select-control"
                        id="directory-department"
                        value={selectedDeptFilter}
                        onChange={(e) => setSelectedDeptFilter(e.target.value)}
                      >
                        <option value="All">All departments</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <button className="quiet-button" type="button" onClick={fetchDevices}>
                      <RefreshCw className="icon" size={16} />
                      <span>Refresh list</span>
                    </button>
                  </div>

                  <div className="ledger-meta">
                    <span className="ledger-count">
                      {filteredDevices.length} workstations
                    </span>
                    <span className="scope-note">
                      {selectedDeptFilter === 'All' ? 'All departments' : selectedDeptFilter}
                    </span>
                  </div>

                  <table aria-label="Authorized workstation register" className="ledger">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">Workstation</th>
                        <th scope="col">Department</th>
                        <th scope="col">Assigned user</th>
                        <th scope="col">IP address</th>
                        <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan="5">
                            <p className="empty-title">No workstations found</p>
                            <p className="empty-copy">
                              Authorized workstations will appear here, grouped by hostname, department, assigned user and IP address.
                            </p>
                            <a className="empty-link" href="#authorize-workstation">
                              Authorize a workstation
                            </a>
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map(device => (
                          <tr key={device.id}>
                            <td data-label="Workstation">
                              <div className="workstation-info-group">
                                <span className="workstation-code">{device.pc_number}</span>
                                {device.hardware_info && (
                                  <span className="hw-mini-badge" title="Hardware telemetry synced">
                                    <Cpu size={10} />
                                    <span>
                                      {device.hardware_info.ram?.total_gb ? `${device.hardware_info.ram.total_gb}GB` : ''}
                                      {device.hardware_info.gpu ? ` • ${device.hardware_info.gpu.split(',')[0].replace(/NVIDIA|GeForce|AMD|Radeon|Intel\(R\)/gi, '').trim()}` : ''}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td data-label="Department">
                              <span className="dept-tag">{device.department || 'General'}</span>
                            </td>
                            <td data-label="Assigned user">{device.assigned_user || 'Unassigned'}</td>
                            <td data-label="IP address">
                              <span className="ip-text">{device.ip_address}</span>
                            </td>
                            <td className="actions-cell">
                              <button
                                className="action-btn-specs"
                                onClick={() => {
                                  setSelectedHardwareDevice(device);
                                  setIsHardwareModalOpen(true);
                                }}
                                title="View PC Hardware & Diagnostics"
                              >
                                <Cpu size={13} />
                                <span>Hardware</span>
                              </button>
                              <button
                                className="action-btn-edit"
                                onClick={() => openEditModal(device)}
                                title="Edit workstation"
                              >
                                <Pencil size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="action-btn-revoke"
                                onClick={() => handleDeleteDevice(device.id)}
                                title="Revoke authorization"
                              >
                                <Trash2 size={13} />
                                <span>Revoke</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </section>
              </div>

              {/* Authorize Modal */}
              <AnimatePresence>
                {isAuthorizeModalOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="devices-modal-overlay"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="devices-modal-content"
                    >
                      <button
                        className="modal-close-btn"
                        onClick={() => setIsAuthorizeModalOpen(false)}
                        title="Close"
                      >
                        <XCircle size={20} />
                      </button>

                      <section aria-labelledby="authorize-heading" className="authorize" id="authorize-workstation">
                        <div className="authorize-heading">
                          <div>
                            <h2 id="authorize-heading">Authorize a workstation</h2>
                            <p className="form-note">
                              Add a computer to the department register.
                            </p>
                          </div>
                          {deviceMsg && (
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: deviceMsg.includes('success') ? '#0066cc' : '#e02424' }}>
                              {deviceMsg}
                            </span>
                          )}
                        </div>
                        <form className="authorize-form" onSubmit={handleRegisterDevice}>
                          <div className="form-row">
                            <div className="form-field">
                              <label className="field-label" htmlFor="pc-hostname">
                                PC Hostname
                              </label>
                              <input
                                className="form-control"
                                id="pc-hostname"
                                name="pcNumber"
                                placeholder="e.g. WS-NEWS-01"
                                required
                                type="text"
                                value={newPcNumber}
                                onChange={(e) => setNewPcNumber(e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label className="field-label" htmlFor="static-ip">
                                Static / Local IP
                              </label>
                              <input
                                className="form-control"
                                id="static-ip"
                                name="ipAddress"
                                placeholder="e.g. 192.168.1.105"
                                required
                                type="text"
                                value={newIpAddress}
                                onChange={(e) => setNewIpAddress(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-field">
                              <label className="field-label" htmlFor="pc-department">
                                Department
                              </label>
                              <select
                                className="form-control"
                                id="pc-department"
                                name="department"
                                value={newDepartment}
                                onChange={(e) => setNewDepartment(e.target.value)}
                              >
                                {DEPARTMENTS.map(dept => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-field">
                              <label className="field-label" htmlFor="assigned-user">
                                Assigned User
                              </label>
                              <input
                                className="form-control"
                                id="assigned-user"
                                name="assignedUser"
                                placeholder="Assigned workstation user"
                                type="text"
                                value={newAssignedUser}
                                onChange={(e) => setNewAssignedUser(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="form-footer">
                            <button className="primary-button form-submit" type="submit">
                              <Plus className="icon" size={17} />
                              <span>Authorize workstation</span>
                            </button>
                          </div>
                        </form>
                      </section>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit Modal */}
              <AnimatePresence>
                {isEditModalOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="devices-modal-overlay"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="devices-modal-content"
                    >
                      <button
                        className="modal-close-btn"
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setNewPcNumber('');
                          setNewIpAddress('');
                          setNewAssignedUser('');
                          setDeviceMsg('');
                        }}
                        title="Close"
                      >
                        <XCircle size={20} />
                      </button>

                      <section aria-labelledby="edit-heading" className="authorize">
                        <div className="authorize-heading">
                          <div>
                            <h2 id="edit-heading">Edit workstation</h2>
                            <p className="form-note">
                              Update computer details in the department register.
                            </p>
                          </div>
                          {deviceMsg && (
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: deviceMsg.includes('success') ? '#0066cc' : '#e02424' }}>
                              {deviceMsg}
                            </span>
                          )}
                        </div>
                        <form className="authorize-form" onSubmit={handleUpdateDevice}>
                          <div className="form-row">
                            <div className="form-field">
                              <label className="field-label" htmlFor="edit-pc-hostname">
                                PC Hostname
                              </label>
                              <input
                                className="form-control"
                                id="edit-pc-hostname"
                                name="pcNumber"
                                required
                                type="text"
                                value={newPcNumber}
                                onChange={(e) => setNewPcNumber(e.target.value)}
                              />
                            </div>
                            <div className="form-field">
                              <label className="field-label" htmlFor="edit-static-ip">
                                Static / Local IP
                              </label>
                              <input
                                className="form-control"
                                id="edit-static-ip"
                                name="ipAddress"
                                required
                                type="text"
                                value={newIpAddress}
                                onChange={(e) => setNewIpAddress(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-field">
                              <label className="field-label" htmlFor="edit-pc-department">
                                Department
                              </label>
                              <select
                                className="form-control"
                                id="edit-pc-department"
                                name="department"
                                value={newDepartment}
                                onChange={(e) => setNewDepartment(e.target.value)}
                              >
                                <option value="General">General</option>
                                {DEPARTMENTS.map(dept => (
                                  <option key={dept} value={dept}>{dept}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-field">
                              <label className="field-label" htmlFor="edit-assigned-user">
                                Assigned User
                              </label>
                              <input
                                className="form-control"
                                id="edit-assigned-user"
                                name="assignedUser"
                                type="text"
                                value={newAssignedUser}
                                onChange={(e) => setNewAssignedUser(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="form-footer">
                            <button className="primary-button form-submit" type="submit">
                              <span>Update workstation</span>
                            </button>
                          </div>
                        </form>
                      </section>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              <header className="history-header">
                <div>
                  <h1 className="history-title">Historical Records</h1>
                  <p className="history-subtitle">Permanent audit log of all resolved and dismissed IT support tickets.</p>
                </div>
                <div className="history-counter-badge">
                  {resolvedTickets.length} {resolvedTickets.length === 1 ? 'Record' : 'Records'}
                </div>
              </header>

              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Workstation</th>
                      <th>Requester</th>
                      <th>IP Address</th>
                      <th>Opened At</th>
                      <th>Resolved At</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedTickets.length === 0 ? (
                      <tr className="empty-history-row">
                        <td colSpan="7">
                          No tickets have been resolved or closed yet.
                        </td>
                      </tr>
                    ) : (
                      resolvedTickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>
                            <span className="ticket-id-tag">
                              TKT-{String(ticket.id).padStart(4, '0')}
                            </span>
                          </td>
                          <td className="history-workstation">{ticket.pcNumber}</td>
                          <td className="history-user">{ticket.username}</td>
                          <td>
                            <span className="history-ip-tag">{ticket.ipAddress}</span>
                          </td>
                          <td className="history-time">
                            {new Date(ticket.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="history-time">
                            {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`history-status-badge ${ticket.status === 'resolved' ? 'status-resolved' : 'status-dismissed'}`}>
                              {ticket.status === 'resolved' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                              <span>{ticket.status === 'resolved' ? 'Resolved' : 'Dismissed'}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BROADCASTS */}
          {activeTab === 'messages' && (
            <div>
              <header className="title-area">
                <h1 className="main-title">Network Announcements</h1>
                <p className="main-subtitle">Push urgent messages and scheduled maintenance alerts to agent PCs.</p>
              </header>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '32px', color: 'var(--text-secondary)' }}>
                <h3 style={{ color: '#f8fafc', margin: '0 0 20px 0', fontSize: '1.2rem' }}>Send Broadcast Message</h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Target Type:</label>
                  <select 
                    className="filter-select"
                    value={broadcastType} 
                    onChange={e => setBroadcastType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'white' }}
                  >
                    <option value="all">All Connected PCs</option>
                    <option value="department">By Department</option>
                    <option value="pc">By PC Number</option>
                    <option value="ip">By IP Address</option>
                  </select>
                </div>

                {broadcastType !== 'all' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Target Value:</label>
                    <input 
                      type="text" 
                      value={broadcastTarget}
                      onChange={e => setBroadcastTarget(e.target.value)}
                      placeholder={
                        broadcastType === 'department' ? 'e.g. Sales' : 
                        broadcastType === 'pc' ? 'e.g. PC-001' : 'e.g. 192.168.1.5'
                      }
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'white' }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Message:</label>
                  <textarea 
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    placeholder="Type your alert message here..."
                    style={{ width: '100%', height: '120px', padding: '10px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'white', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: broadcastStatus.includes('success') ? '#10b981' : (broadcastStatus.includes('Error') || broadcastStatus.includes('Failed') ? '#ef4444' : 'var(--text-secondary)') }}>
                    {broadcastStatus}
                  </span>
                  <button 
                    onClick={handleBroadcast}
                    disabled={!broadcastMessage.trim() || (broadcastType !== 'all' && !broadcastTarget.trim()) || broadcastStatus === 'Sending...'}
                    style={{ 
                      background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 24px', 
                      borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      opacity: (!broadcastMessage.trim() || (broadcastType !== 'all' && !broadcastTarget.trim()) || broadcastStatus === 'Sending...') ? 0.6 : 1
                    }}
                  >
                    {broadcastStatus === 'Sending...' ? 'Sending...' : 'Send Broadcast'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {isHardwareModalOpen && selectedHardwareDevice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="devices-modal-overlay"
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="devices-modal-content hw-modal-content"
                >
                  <button
                    className="modal-close-btn"
                    onClick={() => {
                      setIsHardwareModalOpen(false);
                      setSelectedHardwareDevice(null);
                    }}
                    title="Close"
                  >
                    <XCircle size={20} />
                  </button>

                  <div className="hw-modal-inner">
                    <header className="hw-modal-header">
                      <div className="hw-title-row">
                        <span className="hw-pc-badge">
                          <Monitor size={15} />
                          {selectedHardwareDevice.pc_number}
                        </span>
                        <span className="dept-tag">
                          {selectedHardwareDevice.department || 'General'}
                        </span>
                        {selectedHardwareDevice.hardware_info?.lastSeen && (
                          <span className="hw-sync-pill">
                            Telemetry Synced
                          </span>
                        )}
                      </div>
                      <h2>Workstation Hardware Diagnostics</h2>
                      <p className="hw-subtitle">
                        Comprehensive hardware telemetry reported by the client workstation agent.
                      </p>
                    </header>

                    {!selectedHardwareDevice.hardware_info ? (
                      <div className="hw-empty-state">
                        <Cpu size={40} className="hw-empty-icon" />
                        <h3>No Hardware Telemetry Reported Yet</h3>
                        <p>
                          The client agent on <strong>{selectedHardwareDevice.pc_number}</strong> ({selectedHardwareDevice.ip_address}) has not reported specifications to the server yet.
                        </p>
                        <span className="hw-empty-tip">
                          Start the agent app on the workstation to synchronize hardware specs automatically.
                        </span>
                      </div>
                    ) : (
                      <div className="hw-diagnostics-grid">
                        <div className="hw-card">
                          <div className="hw-card-head">
                            <Cpu size={15} />
                            <span>Processor (CPU)</span>
                          </div>
                          <div className="hw-metric-value">
                            {selectedHardwareDevice.hardware_info.cpu?.model || 'Generic CPU'}
                          </div>
                          <div className="hw-metric-sub">
                            <span>{selectedHardwareDevice.hardware_info.cpu?.cores || 1} Logical Cores</span>
                            <span>•</span>
                            <span>{selectedHardwareDevice.hardware_info.cpu?.architecture || 'x64'}</span>
                          </div>
                        </div>

                        <div className="hw-card">
                          <div className="hw-card-head">
                            <Activity size={15} />
                            <span>Memory (RAM)</span>
                          </div>
                          <div className="hw-metric-value">
                            {selectedHardwareDevice.hardware_info.ram?.total_gb || 0} GB Physical Memory
                          </div>
                          <div className="hw-bar-wrapper">
                            <div
                              className="hw-bar-fill"
                              style={{ width: `${selectedHardwareDevice.hardware_info.ram?.percent || 0}%` }}
                            ></div>
                          </div>
                          <div className="hw-metric-sub">
                            <span>{selectedHardwareDevice.hardware_info.ram?.used_gb || 0} GB In-Use ({selectedHardwareDevice.hardware_info.ram?.percent || 0}%)</span>
                            <span>•</span>
                            <span>{selectedHardwareDevice.hardware_info.ram?.free_gb || 0} GB Free</span>
                          </div>
                        </div>

                        <div className="hw-card">
                          <div className="hw-card-head">
                            <Monitor size={15} />
                            <span>Graphics Controller (GPU)</span>
                          </div>
                          <div className="hw-metric-value">
                            {selectedHardwareDevice.hardware_info.gpu || 'Standard Video Adapter'}
                          </div>
                          <div className="hw-metric-sub">
                            Active display output adapter
                          </div>
                        </div>

                        <div className="hw-card">
                          <div className="hw-card-head">
                            <Server size={15} />
                            <span>System & Motherboard</span>
                          </div>
                          <div className="hw-metric-value">
                            {selectedHardwareDevice.hardware_info.system || 'Standard Workstation'}
                          </div>
                          <div className="hw-metric-sub">
                            MAC: {selectedHardwareDevice.hardware_info.mac || 'N/A'}
                          </div>
                        </div>

                        <div className="hw-card hw-card-full">
                          <div className="hw-card-head">
                            <HardDrive size={15} />
                            <span>Storage Partitions</span>
                          </div>
                          <div className="hw-disks-list">
                            {(selectedHardwareDevice.hardware_info.disks || []).map((disk, idx) => (
                              <div key={idx} className="hw-disk-item">
                                <div className="hw-disk-info">
                                  <span className="hw-disk-mount">{disk.mount} Drive</span>
                                  <span className="hw-disk-usage">{disk.used_gb} GB / {disk.total_gb} GB ({disk.percent}%)</span>
                                </div>
                                <div className="hw-bar-wrapper">
                                  <div
                                    className={`hw-bar-fill ${disk.percent > 90 ? 'critical-disk' : ''}`}
                                    style={{ width: `${disk.percent}%` }}
                                  ></div>
                                </div>
                                <span className="hw-disk-free">{disk.free_gb} GB Available</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="hw-card hw-card-full">
                          <div className="hw-card-head">
                            <ShieldCheck size={15} />
                            <span>Operating System & Platform</span>
                          </div>
                          <div className="hw-metric-value">
                            {selectedHardwareDevice.hardware_info.os || 'Windows OS'}
                          </div>
                          <div className="hw-metric-sub">
                            Workstation IP: {selectedHardwareDevice.ip_address} • Assigned User: {selectedHardwareDevice.assigned_user || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

export default App;
