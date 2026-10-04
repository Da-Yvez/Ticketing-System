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
  HardDrive
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', backgroundColor: '#0a0e1a', color: '#fff', fontFamily: 'var(--font-family)' }}>
        <StackedBarPulse />
        <h2 style={{ marginTop: '24px', fontSize: '1.2rem', fontWeight: '600' }}>Backend is Offline</h2>
        <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center' }}>Waiting for the Core API to start...<br />Please start the backend via the AhasaTV Launcher.</p>
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

          {/* TAB 1: TICKETS */}
          {activeTab === 'tickets' && (
            <>
              <header className="title-area">
                <h1 className="main-title">Live Support Dispatch</h1>
                <p className="main-subtitle">Real-time incoming support tickets from authorized network PCs.</p>
              </header>

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Active Queue</span>
                    <Clock size={16} className="stat-icon" />
                  </div>
                  <div className="stat-value">{requests.length}</div>
                  <div className="stat-desc">
                    {requests.length === 0 ? 'All workstations operating smoothly' : 'Requires technician attention'}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Authorized Workstations</span>
                    <Monitor size={16} className="stat-icon" />
                  </div>
                  <div className="stat-value">{devices.length}</div>
                  <div className="stat-desc">Pre-registered inventory endpoints</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-label">Resolved Tickets</span>
                    <CheckCircle2 size={16} className="stat-icon" />
                  </div>
                  <div className="stat-value">{resolvedTickets.length}</div>
                  <div className="stat-desc">Logged in Cloud database</div>
                </div>
              </div>

              <div className="board-panel">
                <AnimatePresence>
                  {requests.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="empty-board-content"
                    >
                      <div className="empty-board-icon">
                        <Inbox size={26} />
                      </div>
                      <h2>Clear Support Queue</h2>
                      <p>
                        No active help requests pending at the moment.
                        <br />
                        When a verified workstation clicks "Request Help", it will immediately land here.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="tickets-grid-flow">
                      {requests.map((req) => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="ticket-flow-card"
                        >
                          <div className="flow-card-head">
                            <div className="device-tag">
                              <Monitor size={14} />
                              <span>{req.pcNumber}</span>
                            </div>
                            <span className="flow-time">
                              <Clock size={12} />
                              {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flow-card-body">
                            <div className="flow-data-point">
                              <User size={14} />
                              <span className="flow-key">User</span>
                              <span className="flow-val">{req.username}</span>
                            </div>
                            <div className="flow-data-point">
                              <Server size={14} />
                              <span className="flow-key">IP</span>
                              <span className="flow-val">{req.ipAddress || '127.0.0.1'}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              className="resolve-flat-btn"
                              style={{ flex: 1 }}
                              onClick={() => resolveRequest(req.id)}
                            >
                              <Check size={14} />
                              <span>Resolve</span>
                            </button>
                            <button
                              className="resolve-flat-btn"
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', width: '42px' }}
                              onClick={() => dismissRequest(req.id)}
                              title="Dismiss request"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
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
                            <td data-label="Workstation">{device.pc_number}</td>
                            <td data-label="Department">{device.department || 'General'}</td>
                            <td data-label="Assigned user">{device.assigned_user || 'Unassigned'}</td>
                              <td data-label="IP address" className="ip-text">{device.ip_address}</td>
                            <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="revoke"
                                style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}
                                onClick={() => openEditModal(device)}
                                title="Edit workstation"
                              >
                                <span>Edit</span>
                              </button>
                              <button
                                className="revoke"
                                onClick={() => handleDeleteDevice(device.id)}
                                title="Revoke authorization"
                              >
                                <span>Revoke</span>
                                <Trash2 className="icon" size={16} />
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

          {/* TAB 3: DEDICATED TICKET HISTORY */}
          {activeTab === 'history' && (
            <>
              <header className="title-area">
                <h1 className="main-title">Historical Records</h1>
                <p className="main-subtitle">Permanent audit log of all resolved and dismissed IT support tickets.</p>
              </header>

              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden' }}>
                <table className="table-glass">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Workstation</th>
                      <th>User</th>
                      <th>IP Address</th>
                      <th>Opened At</th>
                      <th>Resolved At</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedTickets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          No tickets have been resolved or closed yet.
                        </td>
                      </tr>
                    ) : (
                      resolvedTickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                            TKT-{String(ticket.id).padStart(4, '0')}
                          </td>
                          <td style={{ fontWeight: 600, color: '#f8fafc' }}>{ticket.pcNumber}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{ticket.username}</td>
                          <td style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{ticket.ipAddress}</td>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                            {new Date(ticket.timestamp).toLocaleString()}
                          </td>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                            {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: ticket.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                              color: ticket.status === 'resolved' ? '#34d399' : '#94a3b8'
                            }}>
                              {ticket.status === 'resolved' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {ticket.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 4: BROADCASTS */}
          {activeTab === 'messages' && (
            <div>
              <header className="title-area">
                <h1 className="main-title">Network Announcements</h1>
                <p className="main-subtitle">Push urgent messages and scheduled maintenance alerts to agent PCs.</p>
              </header>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 14px auto', color: 'var(--text-tertiary)' }} />
                <h3 style={{ color: '#f8fafc', margin: '0 0 6px 0', fontSize: '1.1rem' }}>Broadcast Channel Ready</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Send instant notifications to all active workstations or select specific departments.</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
