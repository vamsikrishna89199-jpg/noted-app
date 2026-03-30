import React, { useState } from 'react';
import { connectionsAPI, eventsAPI } from '../services/api';
import { useToast } from './Toast';
import VoiceCapture from './VoiceCapture';
import { QRScanner } from './QRConnect';

const STEPS = ['Who?', 'Where?', 'Details', 'Voice Note'];

export default function AddConnectionModal({ onClose, onAdd, events = [] }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', company: '', role: '', photo: '',
    email_contact: '', phone: '', linkedin: '',
    event: '', event_id: '',
    voiceNote: '', transcript: '', tags: [], intent: '', aiSummary: '',
    privateNote: '', reminder: '', isPrivate: true,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // QR Scan result handler
  const handleQRResult = async (parsed) => {
    setShowQRScanner(false);
    if (parsed.type === 'noted_user') {
      set('name', parsed.name || '');
      set('email_contact', parsed.email || '');
      set('company', parsed.company || '');
      set('linkedin', parsed.linkedin || '');
      showToast('Profile fetched from QR!', 'success');
    } else if (parsed.type === 'noted_event') {
      try {
        const res = await eventsAPI.joinByToken(parsed.token);
        set('event', res.data.name);
        set('event_id', '');
        showToast(`Joined event: ${res.data.name}`, 'success');
      } catch {
        showToast('Could not find event', 'error');
      }
    } else if (parsed.raw) {
      showToast('QR scanned — enter details manually', 'success');
    }
  };

  const handleVoiceDone = ({ audioSrc, transcript, tags, intent, aiSummary }) => {
    setForm(f => ({ ...f, voiceNote: audioSrc, transcript, tags, intent, aiSummary }));
    setStep(5); // go to confirm step
    showToast('Voice note processed!', 'success');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'error'); return; }
    if (!form.event.trim() && !form.event_id) { showToast('Event/location is required', 'error'); return; }
    setSaving(true);
    try {
      await connectionsAPI.create({
        name: form.name,
        company: form.company,
        role: form.role,
        photo: form.photo,
        email_contact: form.email_contact,
        phone: form.phone,
        linkedin: form.linkedin,
        event: form.event,
        event_id: form.event_id || null,
        voiceNote: form.voiceNote,
        transcript: form.transcript,
        tags: form.tags,
        intent: form.intent,
        aiSummary: form.aiSummary,
        privateNote: form.privateNote,
        reminder: form.reminder || null,
        isPrivate: form.isPrivate,
      });
      onAdd();
      onClose();
      showToast('Connection saved!', 'success');
    } catch (err) {
      if (err.response?.data?.limit) {
        showToast('Free plan limit (50). Upgrade to Pro!', 'error');
      } else {
        const msg = err.response?.data?.error || 'Failed to save';
        showToast(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !form.name.trim()) { showToast('Enter a name', 'error'); return; }
    if (step === 2 && !form.event.trim() && !form.event_id) { showToast('Enter event/location', 'error'); return; }
    setStep(s => s + 1);
  };

  return (
    <>
      {showQRScanner && <QRScanner onResult={handleQRResult} onClose={() => setShowQRScanner(false)} />}

      <div className="modal-overlay active" id="addModal">
        <div className="modal glass">
          <div className="modal-header">
            <h2>Add Connection</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="modal-body">
            {/* Step dots */}
            <div className="step-dots">
              {[1,2,3,4].map(i => (
                <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}></div>
              ))}
            </div>

            {/* ── STEP 1: Who ────────────────────────────── */}
            {step === 1 && (
              <div className="step active">
                <h3>Who did you meet?</h3>

                {/* QR Connect button */}
                <button className="qr-connect-btn" onClick={() => setShowQRScanner(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <rect x="5" y="5" width="3" height="3" fill="currentColor"/>
                    <rect x="16" y="5" width="3" height="3" fill="currentColor"/>
                    <rect x="16" y="16" width="3" height="3" fill="currentColor"/>
                    <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
                  </svg>
                  Scan Their QR Code
                </button>
                <div className="login-divider" style={{ margin: '16px 0' }}>or enter manually</div>

                <div className="input-group">
                  <label>Full Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Their full name" autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Company</label>
                    <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Company name" />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Role / Title</label>
                    <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. CTO" />
                  </div>
                </div>
                <div className="step-buttons" style={{ marginTop: 20 }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={nextStep}>Continue →</button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Where ──────────────────────────── */}
            {step === 2 && (
              <div className="step active">
                <h3>Where did you meet?</h3>
                {events.length > 0 && (
                  <>
                    <div className="input-group">
                      <label>Select Event</label>
                      <select
                        value={form.event_id}
                        onChange={e => {
                          const evt = events.find(ev => String(ev.id) === e.target.value);
                          set('event_id', e.target.value);
                          if (evt) set('event', evt.name);
                          else set('event', '');
                        }}
                        style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', outline: 'none' }}
                      >
                        <option value="">— choose an event —</option>
                        {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                      </select>
                    </div>
                    <div className="login-divider" style={{ margin: '12px 0' }}>or type manually</div>
                  </>
                )}
                <div className="input-group">
                  <label>Event / Location *</label>
                  <input value={form.event} onChange={e => { set('event', e.target.value); set('event_id', ''); }} placeholder="e.g. TechCrunch Disrupt 2025" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Their Email</label>
                    <input value={form.email_contact} onChange={e => set('email_contact', e.target.value)} placeholder="email@example.com" type="email" />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>LinkedIn</label>
                    <input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/..." />
                  </div>
                </div>
                <div className="step-buttons" style={{ marginTop: 20 }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Quick Notes ─────────────────────── */}
            {step === 3 && (
              <div className="step active">
                <h3>Quick notes</h3>
                <div className="input-group">
                  <label>Private Note</label>
                  <textarea value={form.privateNote} onChange={e => set('privateNote', e.target.value)} placeholder="What stood out about this person?" rows={3} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', resize: 'vertical', outline: 'none' }} />
                </div>
                <div className="input-group">
                  <label>Set Reminder</label>
                  <select
                    value={form.reminder}
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) { set('reminder', ''); return; }
                      const d = new Date();
                      if (val === 'tomorrow') d.setDate(d.getDate() + 1);
                      else if (val === '3days') d.setDate(d.getDate() + 3);
                      else if (val === 'week') d.setDate(d.getDate() + 7);
                      else if (val === '2weeks') d.setDate(d.getDate() + 14);
                      set('reminder', d.toISOString().split('T')[0]);
                    }}
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: 12, fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', outline: 'none' }}
                  >
                    <option value="">No reminder</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="3days">In 3 days</option>
                    <option value="week">Next week</option>
                    <option value="2weeks">In 2 weeks</option>
                  </select>
                </div>
                <div className="step-buttons">
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-primary" onClick={nextStep}>Add Voice Note →</button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Voice ────────────────────────────── */}
            {step === 4 && (
              <div className="step active">
                <h3>Add a voice note</h3>
                <VoiceCapture
                  name={form.name}
                  company={form.company}
                  role={form.role}
                  onDone={handleVoiceDone}
                  onCancel={() => setStep(5)}
                />
                {/* back button */}
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => setStep(3)}>← Back</button>
              </div>
            )}

            {/* ── STEP 5: Confirm ───────────────────────────── */}
            {step === 5 && (
              <div className="step active">
                <h3>Confirm & Save</h3>

                {/* Summary card */}
                <div className="confirm-card glass" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div className="card-avatar" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #818CF8, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>
                      {(form.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 17, fontFamily: 'Space Grotesk, sans-serif' }}>{form.name}</p>
                      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{[form.role, form.company].filter(Boolean).join(' at ')}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>📍 {form.event}</p>
                  {form.aiSummary && (
                    <div style={{ background: 'rgba(79,70,229,0.06)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                      <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>✨ {form.aiSummary}</p>
                    </div>
                  )}
                  {form.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {form.tags.map(t => (
                        <span key={t} style={{ background: 'var(--accent)', color: 'white', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="step-buttons">
                  <button className="btn btn-secondary" onClick={() => setStep(4)}>← Back</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : '✓ Save Connection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
