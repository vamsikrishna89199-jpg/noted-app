import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function Login() {
  const { login, register, socialLogin } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'login') {
        await login(formData.email, formData.password);
        showToast('Welcome back!', 'success');
      } else {
        await register(formData.name, formData.email, formData.password);
        showToast('Account created!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Authentication failed', 'error');
    }
  };

  return (
    <div className="page login-page active" id="loginPage">
        <div className="login-box">
            <div className="login-header">
                <div className="login-logo">
                    <div className="logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                    </div>
                    <h1>noted</h1>
                </div>
                <p className="login-tagline">Never forget who you met and why</p>
            </div>

            <div className="login-card glass">
                <div className="login-tabs">
                    <button 
                      className={`login-tab ${activeTab === 'login' ? 'active' : ''}`} 
                      onClick={() => setActiveTab('login')}
                    >Sign In</button>
                    <button 
                      className={`login-tab ${activeTab === 'signup' ? 'active' : ''}`} 
                      onClick={() => setActiveTab('signup')}
                    >Create Account</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {activeTab === 'login' ? (
                        <div className="form-section active" id="loginForm">
                            <div className="input-group">
                                <label htmlFor="loginEmail">Email</label>
                                <input 
                                  type="email" 
                                  id="loginEmail" 
                                  placeholder="you@example.com" 
                                  value={formData.email}
                                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                                  required 
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="loginPassword">Password</label>
                                <input 
                                  type="password" 
                                  id="loginPassword" 
                                  placeholder="Enter your password"
                                  value={formData.password}
                                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                                  required 
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
                        </div>
                    ) : (
                        <div className="form-section active" id="signupForm">
                            <div className="input-group">
                                <label htmlFor="signupName">Full Name</label>
                                <input 
                                  type="text" 
                                  id="signupName" 
                                  placeholder="Your name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  required 
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="signupEmail">Email</label>
                                <input 
                                  type="email" 
                                  id="signupEmail" 
                                  placeholder="you@example.com"
                                  value={formData.email}
                                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                                  required 
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="signupPassword">Password</label>
                                <input 
                                  type="password" 
                                  id="signupPassword" 
                                  placeholder="Create a password"
                                  value={formData.password}
                                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                                  required 
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
                        </div>
                    )}
                </form>

                <div className="login-divider">or continue with</div>

                <div className="social-buttons">
                    <button type="button" className="social-btn" onClick={() => socialLogin('google')}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                    </button>
                    <button type="button" className="social-btn" onClick={() => socialLogin('apple')}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        Apple
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
