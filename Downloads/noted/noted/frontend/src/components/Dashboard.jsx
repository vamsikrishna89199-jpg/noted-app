import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectionsAPI, eventsAPI, insightsAPI, userAPI } from '../services/api';
import { useToast } from './Toast';
import ConnectionCard from './ConnectionCard';
import AddConnectionModal from './AddConnectionModal';
import ProfileModal from './ProfileModal';
import EventMode from './EventMode';
import InsightsDashboard from './InsightsDashboard';
import AIAssistant from './AIAssistant';
import ProUpgrade from './ProUpgrade';
import { QRDisplay } from './QRConnect';
import { QRScanner } from './QRConnect';

const NAV_ITEMS = [
  { id: 'feed', icon: '🏠', label: 'Feed' },
  { id: 'events', icon: '🎟️', label: 'Events' },
  { id: 'ai', icon: '🤖', label: 'AI Search' },
  { id: 'insights', icon: '📊', label: 'Insights' },
];

export default function Dashboard() {
  const { user, logout, isPro, theme, toggleTheme, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const [view, setView] = useState('feed');
  const [connections, setConnections] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [userQR, setUserQR] = useState('');
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);

  const fetchConnections = async () => {
    try {
      const params = {};
      if (search) params.q = search;
      if (tagFilter) params.tag = tagFilter;
      const res = await connectionsAPI.getAll(params);
      setConnections(res.data);
      // collect all unique tags
      const tags = new Set();
      res.data.forEach(c => (c.tags || []).forEach(t => tags.add(t)));
      setAllTags([...tags]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEvents = async () => {
    try { const res = await eventsAPI.getAll(); setEvents(res.data); } catch {}
  };

  useEffect(() => { fetchConnections(); fetchEvents(); }, []);
  useEffect(() => { if (view === 'feed') fetchConnections(); }, [search, tagFilter]);

  const handleExport = async () => {
    try {
      const res = await connectionsAPI.export();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'noted_connections.csv'; a.click();
      showToast('Exported!', 'success');
    } catch { showToast('Export failed', 'error'); }
  };

  const handleShowMyQR = async () => {
    if (!userQR) {
      try { const res = await userAPI.getQR(); setUserQR(res.data.qr); } catch {}
    }
    setShowQRCode(true);
  };

  const getInitials = n => (n || '??').split(' ').map(s => s[0]).join('').toUpperCase().slice(0,2);
  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

  const stats = {
    total: connections.length,
    reminders: connections.filter(c => c.reminder).length,
    week: connections.filter(c => { const wa = new Date(); wa.setDate(wa.getDate()-7); return new Date(c.date) >= wa; }).length,
  };

  return (
    <div className="page dashboard-page active">
      {/* ── NAV ───────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </div>
            <span>noted</span>
            {isPro() && <span style={{ fontSize: 11, background: 'linear-gradient(135deg,var(--accent),var(--accent-light))', color: 'white', padding: '2px 8px', borderRadius: 100, fontWeight: 700, marginLeft: 4 }}>PRO</span>}
          </div>

          {/* Desktop tab nav */}
          <div className="desktop-nav-tabs">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={`nav-tab ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
                <span>{n.icon}</span> {n.label}
              </button>
            ))}
          </div>

          {view === 'feed' && (
            <div className="nav-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search connections…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}

          <div className="nav-actions">
            {/* Dark mode toggle */}
            <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {/* Scan QR */}
            <button className="icon-btn" onClick={() => setShowQRScanner(true)} title="Scan QR">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            {/* Add */}
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="hide-mobile">Add Connection</span>
            </button>

            {/* User menu */}
            <div className="user-menu">
              <div className="user-avatar" onClick={() => setShowUserDropdown(!showUserDropdown)}>
                {user?.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : getInitials(user?.name)}
              </div>
              <div className={`user-dropdown glass ${showUserDropdown ? 'show' : ''}`}>
                <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: 4 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.plan === 'pro' ? '✨ Pro Member' : 'Free Plan'}</p>
                </div>
                <button className="dropdown-item" onClick={() => { setShowProfileModal(true); setShowUserDropdown(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  My Profile
                </button>
                <button className="dropdown-item" onClick={() => { handleShowMyQR(); setShowUserDropdown(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  My QR Code
                </button>
                <button className="dropdown-item" onClick={handleExport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
                {!isPro() && (
                  <button className="dropdown-item" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={() => { setShowProModal(true); setShowUserDropdown(false); }}>
                    ✨ Upgrade to Pro
                  </button>
                )}
                <button className="dropdown-item" onClick={logout} style={{ color: '#EF4444' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN ──────────────────────────────────── */}
      <main className="main">
        {view === 'feed' && (
          <>
            <div className="welcome-section">
              <h1>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
              <p>Here's your network at a glance</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card glass">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Connections</div>
              </div>
              <div className="stat-card glass">
                <div className="stat-value">{stats.reminders}</div>
                <div className="stat-label">Active Reminders</div>
              </div>
              <div className="stat-card glass">
                <div className="stat-value">{stats.week}</div>
                <div className="stat-label">Added This Week</div>
              </div>
            </div>

            {/* Tag filter chips */}
            {allTags.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <button className={`tag-chip ${!tagFilter ? 'active-tag' : ''}`} onClick={() => setTagFilter('')} style={{ cursor: 'pointer' }}>All</button>
                {allTags.map(t => (
                  <button key={t} className={`tag-chip ${tagFilter === t ? 'active-tag' : ''}`} onClick={() => setTagFilter(tagFilter === t ? '' : t)} style={{ cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="section-header">
              <h2>Your Connections</h2>
            </div>

            <div className="connections-grid">
              {loading ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60 }}>
                  <div className="processing-ring" style={{ margin: '0 auto' }}></div>
                </div>
              ) : connections.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h3>{search || tagFilter ? 'No matches found' : 'No connections yet'}</h3>
                  <p>{search || tagFilter ? 'Try different filters' : 'Start building your network!'}</p>
                  {!search && !tagFilter && <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add First Connection</button>}
                </div>
              ) : (
                connections.map(c => <ConnectionCard key={c.id} connection={c} refresh={fetchConnections} />)
              )}
            </div>
          </>
        )}

        {view === 'events' && <EventMode />}
        {view === 'ai' && <AIAssistant />}
        {view === 'insights' && <InsightsDashboard />}
      </main>

      {/* ── BOTTOM MOBILE NAV ──────────────────────── */}
      <nav className="mobile-bottom-nav glass">
        {NAV_ITEMS.map(n => (
          <button key={n.id} className={`mobile-nav-btn ${view === n.id ? 'active' : ''}`} onClick={() => setView(n.id)}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            <span style={{ fontSize: 10 }}>{n.label}</span>
          </button>
        ))}
        <button className="mobile-nav-btn" onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: 20 }}>➕</span>
          <span style={{ fontSize: 10 }}>Add</span>
        </button>
      </nav>

      {/* ── MODALS ──────────────────────────────────── */}
      {showAddModal && <AddConnectionModal onClose={() => setShowAddModal(false)} onAdd={fetchConnections} events={events} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showProModal && <ProUpgrade onClose={() => setShowProModal(false)} />}
      {showQRScanner && <QRScanner onResult={(r) => { setShowQRScanner(false); showToast('QR scanned — open Add Connection to use it', 'success'); }} onClose={() => setShowQRScanner(false)} />}

      {showQRCode && (
        <div className="modal-overlay active" onClick={() => setShowQRCode(false)}>
          <div className="modal glass" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: 40, maxWidth: 340 }}>
            <h2 style={{ marginBottom: 8 }}>My QR Code</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Others scan this to connect with you instantly</p>
            {userQR ? <img src={userQR} alt="My QR" style={{ width: 200, height: 200, borderRadius: 12, margin: '0 auto', display: 'block' }} /> : <p>Loading…</p>}
            <button className="btn btn-secondary" style={{ marginTop: 20, width: '100%' }} onClick={() => setShowQRCode(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
