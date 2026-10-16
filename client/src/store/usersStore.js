import { create } from "zustand";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";

export const useUsersStore = create((set, get) => ({
  users: {},
  initialized: false,
  initStore: () => {
    if (get().initialized) return;

    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      const usersMap = {};
      snap.forEach((doc) => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      set({ users: usersMap, initialized: true });
    }, (error) => {
      console.error("Failed to sync users store:", error);
    });

    return unsubscribe;
  }
}));
