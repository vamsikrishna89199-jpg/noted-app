import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { useToast } from './Toast';

export default function ProfileModal({ onClose }) {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ name: user?.name || '', email: user?.email || '', bio: user?.bio || '', avatar: user?.avatar || '' });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, avatar: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await userAPI.updateProfile({ name: formData.name, bio: formData.bio, avatar: formData.avatar });
      updateUserProfile(formData);
      showToast('Profile updated', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to update profile', 'error');
    }
  };

  return (
    <div className="modal-overlay active" id="profileModal">
        <div className="modal glass">
            <div className="modal-header">
                <h2>Your Profile</h2>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <div className="modal-body">
                <div className="avatar-upload" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div className="avatar-preview" style={{ width: 100, height: 100, borderRadius: '50%', background: '#ddd', margin: '0 auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, border: '2px solid var(--accent)' }} id="profilePreview">
                        {formData.avatar ? (
                            <img src={formData.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                        ) : '👤'}
                    </div>
                    <input type="file" id="avatarUpload" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    <button type="button" className="btn btn-secondary" id="uploadAvatarBtn" style={{ marginTop: 10 }} onClick={() => document.getElementById('avatarUpload').click()}>
                        Upload photo
                    </button>
                </div>
                <div className="input-group">
                    <label htmlFor="profileName">Full Name</label>
                    <input 
                      type="text" 
                      id="profileName" 
                      placeholder="Your name" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="profileEmail">Email</label>
                    <input 
                      type="email" 
                      id="profileEmail" 
                      placeholder="Email" 
                      value={formData.email}
                      disabled
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="profileBio">Bio (optional)</label>
                    <textarea 
                      id="profileBio" 
                      placeholder="Short bio" 
                      rows={2}
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    />
                </div>
                <div className="step-buttons">
                    <button type="button" className="btn btn-secondary" id="cancelProfileModal" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary" id="saveProfileBtn" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    </div>
  );
}
