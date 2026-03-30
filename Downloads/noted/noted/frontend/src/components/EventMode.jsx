import React, { useState, useEffect, useRef } from 'react';
import { eventsAPI, connectionsAPI } from '../services/api';
import { useToast } from './Toast';
import { QRDisplay } from './QRConnect';

function CreateEventModal({ onClose, onCreated }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', description: '', location: '', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) { showToast('Event name required', 'error'); return; }
    setSaving(true);
    try {
      const res = await eventsAPI.create(form);
      onCreated(res.data);
      showToast('Event created!', 'success');
      onClose();
    } catch { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal glass">
        <div className="modal-header">
          <h2>New Event</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="input-group"><label>Event Name *</label><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. TechCrunch 2025" /></div>
          <div className="input-group"><label>Location</label><input value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="San Francisco, CA" /></div>
          <div className="input-group"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></div>
          <div className="input-group"><label>Description</label><textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Optional event description" rows={2} style={{width:'100%',padding:'14px 16px',background:'rgba(255,255,255,0.8)',border:'1.5px solid rgba(0,0,0,0.06)',borderRadius:12,fontSize:15,resize:'vertical',outline:'none',fontFamily:'Instrument Sans,sans-serif'}}/></div>
          <div className="step-buttons">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Creating…' : 'Create Event'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ event, onBack }) {
  const [detail, setDetail] = useState(null);
  const [qr, setQr] = useState('');
  const [replaying, setReplaying] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const audioRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    eventsAPI.getOne(event.id).then(r => setDetail(r.data));
    eventsAPI.getQR(event.id).then(r => setQr(r.data.qr));
  }, [event.id]);

  const startReplay = () => {
    if (!detail?.connections?.length) { showToast('No connections with voice notes', 'error'); return; }
    setReplaying(true);
    setReplayIdx(0);
    playAt(0, detail.connections);
  };

  const playAt = (idx, conns) => {
    const conn = conns[idx];
    if (!conn || !conn.voiceNote) {
      if (idx + 1 < conns.length) playAt(idx + 1, conns);
      else setReplaying(false);
      return;
    }
    const audio = new Audio(conn.voiceNote);
    audioRef.current = audio;
    audio.play();
    setReplayIdx(idx);
    audio.onended = () => {
      if (idx + 1 < conns.length) playAt(idx + 1, conns);
      else { setReplaying(false); showToast('Replay complete', 'success'); }
    };
  };

  const stopReplay = () => { audioRef.current?.pause(); setReplaying(false); };

  const tagCounts = detail?.stats?.tag_breakdown || {};
  const connections = detail?.connections || [];
  const withVoice = connections.filter(c => c.voiceNote).length;

  return (
    <div>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>
        ← All Events
      </button>

      <div className="event-detail-header glass" style={{ padding: 28, borderRadius: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 28, fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 }}>{event.name}</h2>
            {event.location && <p style={{ color: 'var(--muted)', fontSize: 15 }}>📍 {event.location}</p>}
            {event.date && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>📅 {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
          </div>
          {/* Event QR */}
          {qr && (
            <div style={{ textAlign: 'center' }}>
              <img src={qr} alt="Event QR" style={{ width: 100, height: 100, borderRadius: 12 }} />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Event QR Code</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginTop: 20 }}>
          {[
            { label: 'Connections', value: connections.length },
            { label: 'With Voice Notes', value: withVoice },
            { label: 'Top Tags', value: Object.keys(tagCounts).length },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(79,70,229,0.06)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tag breakdown */}
        {Object.keys(tagCounts).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: 8 }}>Common Tags</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(tagCounts).map(([tag, count]) => (
                <span key={tag} style={{ background: 'var(--accent)', color: 'white', padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                  {tag} <span style={{ opacity: 0.7 }}>×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Replay button */}
        {withVoice > 0 && (
          <button className={`btn ${replaying ? 'btn-secondary' : 'btn-primary'}`} style={{ marginTop: 20 }} onClick={replaying ? stopReplay : startReplay}>
            {replaying ? (
              <>⏹ Stop Replay (playing {replayIdx + 1}/{withVoice})</>
            ) : (
              <>▶ Event Replay — Play all {withVoice} voice notes</>
            )}
          </button>
        )}
      </div>

      {/* Connections list */}
      <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', marginBottom: 16, fontSize: 18 }}>People Met</h3>
      {connections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3>No connections at this event yet</h3>
          <p>Add connections and tag them to this event.</p>
        </div>
      ) : (
        <div className="connections-grid">
          {connections.map((c, i) => (
            <div key={c.id} className={`connection-card glass ${replaying && replayIdx === i ? 'playing-highlight' : ''}`}>
              <div className="card-top">
                <div className="card-avatar" style={{ background: ['linear-gradient(135deg,#F472B6,#EC4899)','linear-gradient(135deg,#818CF8,#6366F1)','linear-gradient(135deg,#34D399,#10B981)'][i%3] }}>
                  {c.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <span className="card-date">{c.date ? new Date(c.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</span>
              </div>
              <h3 className="card-name">{c.name}</h3>
              {(c.role || c.company) && <p style={{fontSize:13,color:'var(--muted)',marginBottom:6}}>{[c.role, c.company].filter(Boolean).join(' · ')}</p>}
              {c.aiSummary && <div className="ai-summary-strip"><span style={{fontSize:11,color:'var(--accent)',fontWeight:700,marginRight:6}}>✨</span><span style={{fontSize:13}}>{c.aiSummary}</span></div>}
              {c.tags?.length > 0 && <div className="tag-row">{c.tags.map(t=><span key={t} className="tag-chip">{t}</span>)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EventMode() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const res = await eventsAPI.getAll();
      setEvents(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  if (selectedEvent) return <EventDetail event={selectedEvent} onBack={() => setSelectedEvent(null)} />;

  return (
    <div>
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => fetchEvents()} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, marginBottom: 4 }}>Event Mode</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>Group your connections by event</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Event
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="processing-ring" style={{ margin: '0 auto' }}></div></div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3>No events yet</h3>
          <p>Create an event to group your connections and generate a shareable QR code.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create First Event</button>
        </div>
      ) : (
        <div className="connections-grid">
          {events.map(evt => (
            <div key={evt.id} className="connection-card glass" onClick={() => setSelectedEvent(evt)} style={{ cursor: 'pointer' }}>
              <div className="card-top">
                <div className="card-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', borderRadius: 14 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <span className="card-date">{evt.date ? new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              </div>
              <h3 className="card-name">{evt.name}</h3>
              {evt.location && <p className="card-event"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>{evt.location}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <div style={{ background: 'rgba(79,70,229,0.08)', borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {evt.connection_count || 0} people
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>QR: {evt.qr_token}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
