import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

// Global cache to prevent duplicate fetches across message items
const userCache = new Map();
// Keep track of pending promises to avoid parallel fetches for same uid
const pendingFetches = new Map();

export function useUser(uid) {
  const [user, setUser] = useState(userCache.get(uid) || null);

  useEffect(() => {
    if (!uid) return;
    if (userCache.has(uid)) {
      setUser(userCache.get(uid));
      return;
    }

    let isMounted = true;

    const fetchUser = async () => {
      try {
        if (!pendingFetches.has(uid)) {
          pendingFetches.set(uid, getDoc(doc(db, 'users', uid)).then(snap => snap.exists() ? snap.data() : null));
        }
        const data = await pendingFetches.get(uid);
        if (data) {
          userCache.set(uid, data);
          if (isMounted) setUser(data);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchUser();

    return () => { isMounted = false; };
  }, [uid]);

  return user;
}
