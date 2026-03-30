import React, { useState, useRef } from 'react';
import { connectionsAPI } from '../services/api';
import { useToast } from './Toast';

const COLORS = [
  'linear-gradient(135deg, #F472B6, #EC4899)',
  'linear-gradient(135deg, #818CF8, #6366F1)',
  'linear-gradient(135deg, #34D399, #10B981)',
  'linear-gradient(135deg, #FBBF24, #F59E0B)',
  'linear-gradient(135deg, #F87171, #EF4444)',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
];

const INTENT_BADGE = {
  hiring:        { color: '#34D399', label: '🎯 Hiring' },
  investment:    { color: '#F59E0B', label: '💰 Investor' },
  collaboration: { color: '#818CF8', label: '🤝 Collab' },
  learning:      { color: '#60A5FA', label: '📚 Learning' },
  networking:    { color: '#9CA3AF', label: '🌐 Networking' },
};

function QuickActions({ connection }) {
  const actions = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M13 2C6.373 2 1 7.373 1 14c0 2.1.55 4.065 1.5 5.775L1 22l2.225-1.5A12.94 12.94 0 0 0 13 22c6.627 0 12-5.373 12-12S19.627 2 13 2z"/>
        </svg>
      ),
      label: 'WhatsApp',
      action: () => window.open(`https://wa.me/${(connection.phone || '').replace(/\D/g, '')}`, '_blank'),
      available: !!connection.phone,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/>
        </svg>
      ),
      label: 'Call',
      action: () => window.open(`tel:${connection.phone}`, '_blank'),
      available: !!connection.phone,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      label: 'Email',
      action: () => window.open(`mailto:${connection.email_contact}?subject=Great meeting you!&body=Hi ${connection.name}, it was great meeting you at ${connection.event}!`, '_blank'),
      available: !!connection.email_contact,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      label: 'LinkedIn',
      action: () => window.open(connection.linkedin?.startsWith('http') ? connection.linkedin : `https://linkedin.com/in/${connection.linkedin}`, '_blank'),
      available: !!connection.linkedin,
    },
  ];

  return (
    <div className="quick-actions">
      {actions.map(a => (
        <button
          key={a.label}
          className={`quick-action-btn ${!a.available ? 'unavailable' : ''}`}
          onClick={a.action}
          disabled={!a.available}
          title={a.label}
        >
          {a.icon}
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function ConnectionCard({ connection, refresh }) {
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const audioRef = useRef(null);

  const initials = connection.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const color = COLORS[connection.id % COLORS.length];
  const intent = INTENT_BADGE[connection.intent] || INTENT_BADGE.networking;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const formatReminder = (dateStr) => {
    if (!dateStr) return 'Remind Me';
    const date = new Date(dateStr);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.ceil((date - today) / 86400000);
    if (diff <= 0) return '⚠️ Overdue';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return `${diff} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePlay = () => {
    if (!connection.voiceNote) { showToast('No voice note recorded', 'error'); return; }
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this connection?')) return;
    await connectionsAPI.delete(connection.id);
    refresh();
    showToast('Connection deleted', 'success');
  };

  const setReminder = async (option) => {
    let reminderDate = null;
    if (option !== 'clear') {
      const d = new Date();
      if (option === 'tomorrow') d.setDate(d.getDate() + 1);
      else if (option === '3days') d.setDate(d.getDate() + 3);
      else if (option === 'week') d.setDate(d.getDate() + 7);
      else if (option === '2weeks') d.setDate(d.getDate() + 14);
      reminderDate = d.toISOString().split('T')[0];
    }
    await connectionsAPI.setReminder(connection.id, reminderDate);
    refresh();
    showToast(option === 'clear' ? 'Reminder cleared' : 'Reminder set ✓', 'success');
    setShowReminder(false);
  };

  const markFollowUp = async (status) => {
    await connectionsAPI.followUp(connection.id, status);
    refresh();
    showToast(status === 'done' ? '✓ Marked as followed up' : 'Status updated', 'success');
  };

  const isOverdue = connection.reminder && new Date(connection.reminder) < new Date() && connection.followUpStatus !== 'done';

  return (
    <div className={`connection-card glass ${isOverdue ? 'overdue-card' : ''}`}>
      {/* Hidden audio */}
      {connection.voiceNote && (
        <audio ref={audioRef} src={connection.voiceNote} onEnded={() => setIsPlaying(false)} />
      )}

      {/* Top row */}
      <div className="card-top">
        {connection.photo ? (
          <img src={connection.photo} alt={connection.name} className="card-avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="card-avatar" style={{ background: color }}>{initials}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="card-date">{formatDate(connection.date)}</span>
          {connection.intent && connection.intent !== 'networking' && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: intent.color, padding: '4px 10px', borderRadius: 100 }}>
              {intent.label}
            </span>
          )}
        </div>
      </div>

      {/* Name + role */}
      <h3 className="card-name">{connection.name}</h3>
      {(connection.role || connection.company) && (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>
          {[connection.role, connection.company].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Event */}
      <p className="card-event">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        {connection.event}
      </p>

      {/* AI Summary */}
      {connection.aiSummary && (
        <div className="ai-summary-strip">
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginRight: 6 }}>✨ AI</span>
          <span style={{ fontSize: 13, color: 'var(--fg)' }}>{connection.aiSummary}</span>
        </div>
      )}

      {/* Tags */}
      {connection.tags?.length > 0 && (
        <div className="tag-row">
          {connection.tags.map(t => (
            <span key={t} className="tag-chip">{t}</span>
          ))}
        </div>
      )}

      {/* Voice player */}
      <div className={`voice-player ${isPlaying ? 'playing' : ''}`}>
        <button className="play-btn" onClick={handlePlay}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>
        <div className="waveform">
          {Array(20).fill(0).map((_, i) => (
            <div key={i} className="wave-bar" style={{ height: `${25 + Math.sin(i * 0.8) * 50 + Math.random() * 25}%` }}></div>
          ))}
        </div>
        <span className="voice-duration">{connection.voiceNote ? '◉' : '--:--'}</span>
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="overdue-banner">
          ⚠️ Follow-up overdue · {formatReminder(connection.reminder)}
          <button onClick={() => markFollowUp('done')} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', marginLeft: 8 }}>Mark done →</button>
        </div>
      )}

      {/* Quick Actions expandable */}
      <div style={{ marginBottom: 10 }}>
        <button
          className="card-btn"
          style={{ width: '100%', marginBottom: 8 }}
          onClick={() => setShowActions(!showActions)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
          </svg>
          Quick Actions {showActions ? '▲' : '▼'}
        </button>
        {showActions && <QuickActions connection={connection} />}
      </div>

      {/* Card action row */}
      <div className="card-actions">
        <button className={`card-btn ${connection.reminder && !isOverdue ? 'active-reminder' : ''} ${isOverdue ? 'overdue-btn' : ''}`}
          onClick={() => setShowReminder(!showReminder)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {formatReminder(connection.reminder)}
        </button>

        {/* Reminder dropdown */}
        <div className={`reminder-menu glass ${showReminder ? 'show' : ''}`}>
          {['tomorrow', '3days', 'week', '2weeks'].map(o => (
            <button key={o} className="reminder-option" onClick={() => setReminder(o)}>
              {o === 'tomorrow' ? 'Tomorrow' : o === '3days' ? 'In 3 days' : o === 'week' ? 'Next week' : 'In 2 weeks'}
            </button>
          ))}
          {connection.reminder && (
            <button className="reminder-option" style={{ color: '#EF4444' }} onClick={() => setReminder('clear')}>Clear reminder</button>
          )}
        </div>

        <button className="card-btn" onClick={handleDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
