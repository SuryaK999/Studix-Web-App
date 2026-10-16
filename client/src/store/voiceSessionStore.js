import { create } from "zustand";

export const useVoiceSession = create((set, get) => ({
  connected: false,
  roomId: null,
  muted: false,
  participants: {},
  localStream: null,
  peerConnections: {},

  setConnected: (v) => set({ connected: v }),
  setRoomId: (id) => set({ roomId: id }),
  setMuted: (m) => set({ muted: m }),
  setParticipants: (p) => set({ participants: p }),
  setLocalStream: (s) => set({ localStream: s }),
  setPeerConnections: (pc) => set({ peerConnections: pc }),

  leaveVoice: async () => {
    const { localStream, peerConnections } = get();

    try {
      localStream?.getTracks()?.forEach(t => t.stop());

      Object.values(peerConnections).forEach(pc => {
        try { pc.close(); } catch {}
      });
    } catch {}

    set({
      connected: false,
      roomId: null,
      muted: false,
      participants: {},
      localStream: null,
      peerConnections: {}
    });
  }
}));
