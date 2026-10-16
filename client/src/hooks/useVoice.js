import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { globalVoiceManager } from '@/lib/globalVoiceManager';
import { useVoiceSession } from '@/store/voiceSessionStore';

export function useVoice(roomId) {
  const { user } = useAuth();

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const {
    localStream,
    muted,
    participants,
  } = useVoiceSession();

  useEffect(() => {
    if (user && roomId) {
      globalVoiceManager.init(
        user, 
        roomId, 
        setIsConnecting, 
        setError, 
        setIsSpeaking
      );
    }
  }, [user, roomId]);

  const startStream = useCallback(() => {
    globalVoiceManager.startStream();
  }, []);

  const stopStream = useCallback(() => {
    globalVoiceManager.stopStream();
  }, []);

  const toggleMute = useCallback(() => {
    globalVoiceManager.toggleMute();
  }, []);

  return {
    localStream,
    isMuted: muted,
    isSpeaking,
    isConnecting,
    error,
    peers: Object.values(participants),
    startStream,
    stopStream,
    toggleMute,
  };
}
