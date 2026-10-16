import { create } from 'zustand';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export const useRoomsStore = create((set) => ({
  rooms: [],
  recentRooms: [],
  loading: true,

  subscribeRooms: () => {
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snap) => {
      const rooms = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      set({ rooms, loading: false });
    });
  },

  setRecentRooms: (rooms) => set({ recentRooms: rooms })
}));
