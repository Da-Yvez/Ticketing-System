import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Monitor, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Server,
  User,
  History,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Inbox
} from 'lucide-react';
import logo from './assets/logo.jpg';
import StackedBarPulse from './components/ui/stacked-bar-pulse';
import './App.css';

const SOCKET_URL = 'http://localhost:4000';

function App() {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      setIsConnected(true);
      fetchRequests();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new-request', (request) => {
      setRequests((prev) => [...prev, request]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/requests`);
      const data = await response.json();
      setRequests(data);
    } catch (error) {}
  };

  const resolveRequest = (id) => {
    const resolvedItem = requests.find(req => req.id === id);
    if (resolvedItem) {
      setHistory(prev => [
        {
          id: `TKT-${String(resolvedItem.id).padStart(4, '0')}`,
          issue: `Help Request: ${resolvedItem.pcNumber}`,
          user: resolvedItem.username,
          time: 'Just now',
          status: 'Resolved'
        },
        ...prev
      ]);
    }
    setRequests((prev) => prev.filter(req => req.id !== id));
  };

  const sampleHistory = [
    { id: '#TKT-0042', issue: 'Network Issue', status: 'Resolved', time: '2 days ago' },
    { id: '#TKT-0041', issue: 'Laptop Setup', status: 'Closed', time: '4 days ago' },
    { id: '#TKT-0040', issue: 'Access Request', status: 'Resolved', time: '1 week ago' },
    { id: '#TKT-0039', issue: 'Printer Not Working', status: 'Resolved', time: '1 week ago' },
    { id: '#TKT-0038', issue: 'Software Installation', status: 'Closed', time: '2 weeks ago' },
    { id: '#TKT-0037', issue: 'Email Configuration', status: 'Resolved', time: '2 weeks ago' },
    { id: '#TKT-0036', issue: 'Hardware Replacement', status: 'Closed', time: '3 weeks ago' }
  ];

  const displayHistory = history.length > 0 ? history : sampleHistory;

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', backgroundColor: '#0a0e1a', color: '#fff', fontFamily: 'var(--font-family)' }}>
        <StackedBarPulse />
        <h2 style={{ marginTop: '24px', fontSize: '1.2rem', fontWeight: '600' }}>Backend is Offline</h2>
        <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center' }}>Waiting for the Core API to start...<br/>Please start the backend via the AhasaTV Launcher.</p>
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
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="sidebar-container">
              <div className="sidebar-brand-row">
                <div className="brand-group">
                  <img src={logo} alt="AhasaTV" className="brand-avatar" />
                  <div className="brand-meta">
                    <span className="brand-name">AhasaTV</span>
                    <span className="brand-role">IT Support System</span>
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
                  <span>Tickets</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
                  onClick={() => setActiveTab('devices')}
                >
                  <Monitor size={16} />
                  <span>Devices</span>
                </button>
                <button 
                  className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare size={16} />
                  <span>Messages</span>
                </button>
              </nav>

              <div className="sidebar-bottom">
                <div className={`status-pill ${isConnected ? 'live' : 'dead'}`}>
                  <span className="status-dot"></span>
                  <span>{isConnected ? 'Server Online' : 'Server Offline'}</span>
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
          <header className="title-area">
            <h1 className="main-title">Tickets</h1>
            <p className="main-subtitle">View and manage your support tickets.</p>
          </header>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Total Tickets</span>
                <Ticket size={16} className="stat-icon" />
              </div>
              <div className="stat-value">{requests.length + history.length}</div>
              <div className="stat-desc">
                {requests.length + history.length === 0 ? 'No tickets recorded' : 'All incoming requests'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Pending</span>
                <Clock size={16} className="stat-icon" />
              </div>
              <div className="stat-value">{requests.length}</div>
              <div className="stat-desc">
                {requests.length === 0 ? 'Queue is currently empty' : 'Awaiting technician resolution'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Resolved</span>
                <CheckCircle2 size={16} className="stat-icon" />
              </div>
              <div className="stat-value">{history.length}</div>
              <div className="stat-desc">
                {history.length === 0 ? 'No tickets resolved' : 'Completed support actions'}
              </div>
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
                    <Inbox size={28} />
                  </div>
                  <h2>No Active Tickets</h2>
                  <p>
                    You don't have any active support tickets at the moment.
                    <br />
                    When an agent requests help, tickets will automatically appear here.
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

                      <button 
                        className="resolve-flat-btn"
                        onClick={() => resolveRequest(req.id)}
                      >
                        <Check size={14} />
                        <span>Resolve Ticket</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <aside className="history-dock">
        <div className="dock-header">
          <div className="dock-title">
            <History size={16} />
            <span>Ticket History</span>
          </div>
          <button className="dock-action-link">
            <span>View All</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div className="dock-list">
          {displayHistory.map((item, index) => (
            <div key={index} className="dock-item">
              <div className="dock-dot"></div>
              <div className="dock-meta">
                <span className="dock-id">{item.id}</span>
                <span className="dock-issue">{item.issue}</span>
                <span className="dock-sub">{item.status} • {item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default App;
