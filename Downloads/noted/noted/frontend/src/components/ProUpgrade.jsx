import React, { useState } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const FREE_FEATURES = [
  'Up to 50 connections',
  'Voice notes (up to 10 sec)',
  'Basic search',
  'Manual tags',
  '3 events',
];

const PRO_FEATURES = [
  '✨ Unlimited connections',
  '✨ AI voice transcription',
  '✨ Auto smart tags',
  '✨ AI network search',
  '✨ Unlimited events + QR',
  '✨ Insights & analytics charts',
  '✨ CSV export',
  '✨ 20-sec voice notes',
  '✨ Smart follow-up reminders',
  '✨ Priority support',
];

export default function ProUpgrade({ onClose }) {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await userAPI.upgrade();
      updateUserProfile({ plan: 'pro' });
      showToast('🎉 Upgraded to Pro!', 'success');
      onClose();
    } catch {
      showToast('Upgrade failed', 'error');
    } finally {
      setUpgrading(false);
    }
  };

  if (user?.plan === 'pro') {
    return (
      <div className="modal-overlay active">
        <div className="modal glass" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', marginBottom: 8 }}>You're on Pro!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Enjoy all premium features of noted.</p>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay active">
      <div className="modal glass" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Upgrade to Pro ✨</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Free */}
            <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', marginBottom: 16 }}>$0<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mo</span></div>
              {FREE_FEATURES.map(f => <p key={f} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, paddingLeft: 4 }}>· {f}</p>)}
            </div>
            {/* Pro */}
            <div style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(129,140,248,0.08))', borderRadius: 16, padding: 20, border: '1.5px solid rgba(79,70,229,0.2)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, right: 16, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'white', padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>BEST VALUE</div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--accent)' }}>Pro</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent)', marginBottom: 16 }}>$9<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mo</span></div>
              {PRO_FEATURES.map(f => <p key={f} style={{ fontSize: 12, color: 'var(--fg)', marginBottom: 7 }}>{f}</p>)}
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '18px', fontSize: 17 }} onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? 'Upgrading…' : '✨ Upgrade to Pro — $9/mo'}
          </button>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            Cancel anytime · No contracts · Instant access
          </p>
        </div>
      </div>
    </div>
  );
}
