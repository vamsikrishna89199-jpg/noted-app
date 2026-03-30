import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Toast, { ToastProvider } from './components/Toast';

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        {/* Video Background */}
        <div className="video-bg">
            <video autoPlay muted loop playsInline>
                <source src="https://cdn.coverr.co/videos/coverr-networking-event-5762/1080p.mp4" type="video/mp4" />
            </video>
        </div>
        <div className="video-overlay"></div>

        {/* Ambient Shapes */}
        <div className="ambient-shape shape-1"></div>
        <div className="ambient-shape shape-2"></div>
        <div className="ambient-shape shape-3"></div>

        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
