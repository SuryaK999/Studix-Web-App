import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
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
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('studix_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('studix_user', JSON.stringify(user));
      } catch (_) {}
    } else if (!loading) {
      localStorage.removeItem('studix_user');
    }
  }, [user, loading]);

  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const basicUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };

        if (!isCancelled) {
          setUser(prev => ({ ...(prev || {}), ...basicUser }));
        }

        try {
          const profile = await fetchUserProfile();
          if (!isCancelled) {
            setUser(prev => (prev ? { ...prev, ...profile } : null));
          }
        } catch (err) {
          logger.error('Failed to fetch persistent profile', 'AuthContext', err);
        }
      } else {
        if (!isCancelled) {
          setUser(null);
        }
      }
      if (!isCancelled) {
        setLoading(false);
      }
    });

    const channel = new BroadcastChannel('studix_auth');
    channel.onmessage = (msg) => {
      if (msg.data?.type === 'PROFILE_UPDATED' && msg.data?.user) {
        setUser(msg.data.user);
      } else if (msg.data?.type === 'TOKEN_EXPIRED') {
        signOut(auth).catch(() => {});
      }
    };

    const handleProfileUpdate = (e) => {
      const updated = e.detail;
      setUser(prev => {
        const next = prev ? { ...prev, ...updated } : null;
        try {
          channel.postMessage({ type: 'PROFILE_UPDATED', user: next });
        } catch (_) {}
        return next;
      });
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);

    return () => {
      isCancelled = true;
      unsubscribe();
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      channel.close();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(firebaseUser, { displayName });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  }), [user, loading, signIn, signUp, signInWithGoogle, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      loading: true,
      signIn: async () => {},
      signUp: async () => {},
      signInWithGoogle: async () => {},
      logout: async () => {},
    };
  }
  return context;
}
