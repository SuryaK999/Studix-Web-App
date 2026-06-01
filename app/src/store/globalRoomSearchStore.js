import { create } from 'zustand';

export const useGlobalRoomSearch = create((set) => ({
  query: '',
  results: [],
  allRooms: [],
  loading: false,

  setQuery: (q) => set({ query: q }),
  setResults: (r) => set({ results: r }),
  setAllRooms: (r) => set({ allRooms: r }),
  setLoading: (v) => set({ loading: v })
}));
