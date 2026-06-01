import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

import { fetchUserProfile } from '@/services/api';
import { logger } from '@/lib/logger';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        
        const basicUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(basicUser);

        try {
          const profile = await fetchUserProfile();
          setUser(prev => prev ? { ...prev, ...profile } : null);
        } catch (err) {
          logger.error('Failed to fetch persistent profile', 'AuthContext', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const handleProfileUpdate = (e) => {
      const updated = e.detail;
      setUser(prev => {
        const next = prev ? { ...prev, ...updated } : null;
        
        const channel = new BroadcastChannel('studix_auth');
        channel.postMessage({ type: 'PROFILE_UPDATED', user: next });
        channel.close();
        return next;
      });
    };

    const channel = new BroadcastChannel('studix_auth');
    channel.onmessage = (msg) => {
      if (msg.data.type === 'PROFILE_UPDATED') {
        setUser(msg.data.user);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      channel.close();
    };
  }, []);

  const signIn = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email, password, displayName) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(firebaseUser, { displayName });
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
