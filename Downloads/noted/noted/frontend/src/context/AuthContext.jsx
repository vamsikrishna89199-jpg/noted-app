import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../firebase';
import { userAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Fetch extended user profile from our backend (which auto-creates if missing)
        try {
          const res = await userAPI.getProfile();
          setUser({ ...res.data, firebaseUser: currentUser });
        } catch (err) {
          // If backend fails, just set the basic firebase user
          setUser({ email: currentUser.email, name: currentUser.displayName, plan: 'free', firebaseUser: currentUser });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (name, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    // Note: getProfile() in onAuthStateChanged will fetch and trigger backend auto-create
  };

  const socialLogin = async (providerName) => {
    const provider = providerName === 'google' ? googleProvider : appleProvider;
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
    setUser(null);
  };

  const updateUserProfile = async (updated) => {
    try {
      await userAPI.updateProfile(updated);
      setUser(prev => ({ ...prev, ...updated }));
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  };

  const isPro = useCallback(() => user?.plan === 'pro', [user]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <AuthContext.Provider value={{ user, login, register, socialLogin, logout, updateUserProfile, loading, isPro, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};
