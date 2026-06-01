import { create } from 'zustand';

export const useExploreDialog = create((set) => ({
  open: false,
  openDialog: () => set({ open: true }),
  closeDialog: () => set({ open: false })
}));
