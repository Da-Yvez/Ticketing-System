import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  Monitor, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  Server,
  User,
  History,
  Check,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import logo from './assets/logo.jpg';
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
          status: 'Resolved',
          color: '#10b981'
        },
        ...prev
      ]);
    }
    setRequests((prev) => prev.filter(req => req.id !== id));
  };

  const sampleHistory = [
    { id: '#TKT-0042', issue: 'Network Issue', status: 'Resolved', time: '2 days ago', color: '#10b981' },
    { id: '#TKT-0041', issue: 'Laptop Setup', status: 'Closed', time: '4 days ago', color: '#3b82f6' },
    { id: '#TKT-0040', issue: 'Access Request', status: 'Resolved', time: '1 week ago', color: '#8b5cf6' },
    { id: '#TKT-0039', issue: 'Printer Not Working', status: 'Resolved', time: '1 week ago', color: '#10b981' },
    { id: '#TKT-0038', issue: 'Software Installation', status: 'Closed', time: '2 weeks ago', color: '#64748b' },
    { id: '#TKT-0037', issue: 'Email Configuration', status: 'Resolved', time: '2 weeks ago', color: '#8b5cf6' },
    { id: '#TKT-0036', issue: 'Hardware Replacement', status: 'Closed', time: '3 weeks ago', color: '#64748b' }
  ];

  const displayHistory = history.length > 0 ? history : sampleHistory;

  return (
    <div className="layout-root">
      <AnimatePresence initial={false}>
        {isSidebarOpen ? (
          <motion.aside 
            className="left-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sidebar-inner-content">
              <div className="sidebar-brand-block">
                <div className="brand-logo-wrap">
                  <img src={logo} alt="AhasaTV" className="brand-img" />
                </div>
                <div className="brand-text-col">
                  <span className="brand-main-title">AhasaTV</span>
                  <span className="brand-sub-title">IT Support System</span>
                </div>
                <button 
                  className="sidebar-toggle-btn"
                  onClick={() => setIsSidebarOpen(false)}
                  title="Hide Sidebar"
                >
                  <PanelLeftClose size={18} />
                </button>
              </div>

              <nav className="sidebar-nav-list">
                <button 
                  className={`nav-button ${activeTab === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tickets')}
                >
                  <Ticket size={18} />
                  <span>Tickets</span>
                </button>
                <button 
                  className={`nav-button ${activeTab === 'devices' ? 'active' : ''}`}
                  onClick={() => setActiveTab('devices')}
                >
                  <Monitor size={18} />
                  <span>Devices</span>
                </button>
                <button 
                  className={`nav-button ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare size={18} />
                  <span>Messages</span>
                </button>
              </nav>

              <div className="sidebar-footer">
                <div className={`status-pill ${isConnected ? 'online' : 'offline'}`}>
                  <span className="status-dot"></span>
                  <span>{isConnected ? 'Backend Connected' : 'Server Offline'}</span>
                </div>
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      {!isSidebarOpen && (
        <div className="collapsed-bar-trigger">
          <button 
            className="open-sidebar-btn"
            onClick={() => setIsSidebarOpen(true)}
            title="Open Sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
          
          <div 
            className={`collapsed-status-pill ${isConnected ? 'online' : 'offline'}`}
            title={isConnected ? 'Backend Connected' : 'Server Offline'}
          >
            <span className="status-dot"></span>
            <span className="collapsed-status-text">
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      )}

      <main className="center-workspace">
        <header className="page-header">
          <div className="page-title-box">
            <h1>Tickets</h1>
            <p>View and manage your support tickets.</p>
          </div>
        </header>

        <div className="metric-cards-row">
          <div className="metric-card">
            <div className="metric-icon-wrap blue-bg">
              <Ticket size={20} color="#2563eb" />
            </div>
            <div className="metric-info">
              <div className="metric-label-row">
                <span className="metric-label">Total Tickets</span>
                <ChevronRight size={14} className="metric-arrow" />
              </div>
              <span className="metric-val">{requests.length + history.length}</span>
              <span className="metric-subtext">
                {requests.length + history.length === 0 ? 'No tickets yet' : `${requests.length + history.length} recorded`}
              </span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap green-bg">
              <Clock size={20} color="#10b981" />
            </div>
            <div className="metric-info">
              <div className="metric-label-row">
                <span className="metric-label">Pending</span>
                <ChevronRight size={14} className="metric-arrow" />
              </div>
              <span className="metric-val">{requests.length}</span>
              <span className="metric-subtext">
                {requests.length === 0 ? 'No pending tickets' : `${requests.length} active`}
              </span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon-wrap purple-bg">
              <CheckCircle2 size={20} color="#8b5cf6" />
            </div>
            <div className="metric-info">
              <div className="metric-label-row">
                <span className="metric-label">Resolved</span>
                <ChevronRight size={14} className="metric-arrow" />
              </div>
              <span className="metric-val">{history.length}</span>
              <span className="metric-subtext">
                {history.length === 0 ? 'No resolved tickets' : `${history.length} closed`}
              </span>
            </div>
          </div>
        </div>

        <div className="canvas-panel">
          <AnimatePresence>
            {requests.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="tickets-empty-view"
              >
                <div className="empty-graphic-circle">
                  <div className="ticket-stamp-graphic">
                    <Ticket size={36} color="#3b82f6" />
                    <div className="check-badge-tiny">
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h2>No Active Tickets</h2>
                <p>
                  You don't have any active support tickets at the moment.
                  <br />
                  When an agent requests help, tickets will automatically appear here.
                </p>
              </motion.div>
            ) : (
              <div className="active-cards-grid">
                {requests.map((req) => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="ticket-active-box"
                  >
                    <div className="ticket-box-top">
                      <div className="pc-pill">
                        <Monitor size={15} color="#2563eb" />
                        <span>{req.pcNumber}</span>
                      </div>
                      <span className="ticket-time-chip">
                        <Clock size={12} />
                        {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="ticket-box-details">
                      <div className="ticket-detail-item">
                        <User size={14} />
                        <span><strong>User:</strong> {req.username}</span>
                      </div>
                      <div className="ticket-detail-item">
                        <Server size={14} />
                        <span><strong>IP:</strong> {req.ipAddress || 'Unknown'}</span>
                      </div>
                    </div>

                    <button 
                      className="resolve-ticket-btn"
                      onClick={() => resolveRequest(req.id)}
                    >
                      <CheckCircle2 size={16} />
                      <span>Resolve Ticket</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <aside className="right-history-panel">
        <div className="history-header">
          <div className="history-header-title">
            <History size={18} color="#0f172a" />
            <h3>Ticket History</h3>
          </div>
          <button className="view-all-link">
            <span>View All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="history-items-list">
          {displayHistory.map((item, index) => (
            <div key={index} className="history-row-item">
              <div className="history-dot" style={{ backgroundColor: item.color || '#10b981' }}></div>
              <div className="history-row-content">
                <span className="history-id">{item.id}</span>
                <span className="history-name">{item.issue}</span>
                <span className="history-timestamp">{item.status} • {item.time}</span>
              </div>
              <ChevronRight size={15} className="history-chevron" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default App;
