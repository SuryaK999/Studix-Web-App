import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { socketService } from '@/lib/socket';
import { logger } from '@/lib/logger';
import { fetchRoomPresence } from '@/services/api';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Sends presence heartbeats to server and marks user offline on cleanup.
 * Server tracks presence in Redis (TTL 60s).
 */
export function usePresence(roomId) {
  const { user } = useAuth();
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (!user || !roomId) return;

    const startHeartbeat = async () => {
      try {
        const socket = await socketService.connect();

        // Immediate heartbeat on join
        socket.emit('presence:heartbeat');

        // Periodic heartbeat every 30s
        heartbeatRef.current = setInterval(() => {
          if (socket.connected) {
            socket.emit('presence:heartbeat');
          }
        }, HEARTBEAT_INTERVAL_MS);
      } catch (err) {
        logger.warn('Presence heartbeat setup failed', 'usePresence', err);
      }
    };

    startHeartbeat();

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user, roomId]);
}

/**
 * Subscribes to room presence events from Socket.IO.
 * Returns a record of users currently in the room.
 */
export function useRoomPresence(roomId) {
  const [presence, setPresence] = useState({});

  const handleJoined = useCallback(({ userId, displayName, username, status, photoURL }) => {
    setPresence(prev => ({
      ...prev,
      [userId]: { 
        userId, 
        displayName, 
        username: username || prev[userId]?.username || null,
        status: status || prev[userId]?.status || null,
        photoURL: photoURL ?? prev[userId]?.photoURL ?? null, 
        isOnline: true 
      },
    }));
  }, []);

  const handleLeft = useCallback(({ userId }) => {
    setPresence(prev => {
      const next = { ...prev };
      if (next[userId]) {
        next[userId] = { ...next[userId], isOnline: false };
      }
      return next;
    });
  }, []);

  const handleStatusUpdate = useCallback(({ userId, status }) => {
    setPresence(prev => {
      const existing = prev[userId] || { userId, isOnline: true };
      return {
        ...prev,
        [userId]: { ...existing, status }
      };
    });
  }, []);

  const handleProfileSync = useCallback(({ userId, updates }) => {
    setPresence(prev => {
      const existing = prev[userId] || { userId, isOnline: true };
      return {
        ...prev,
        [userId]: { ...existing, ...updates }
      };
    });
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let socket = null;

    // 1. Initial fetch of online users
    fetchRoomPresence(roomId)
      .then(users => {
        const initialPresence = {};
        users.forEach(u => {
          initialPresence[u.uid] = { 
            userId: u.uid, 
            displayName: u.displayName, 
            username: u.username || null,
            photoURL: u.photoURL, 
            status: u.status || null,
            isOnline: true 
          };
        });
        setPresence(initialPresence);
      })
      .catch(err => logger.error('Failed to initial presence fetch', 'useRoomPresence', err));

    // 2. Listen for real-time updates
    socketService.connect().then(s => {
      socket = s;
      socket.on('presence:joined', handleJoined);
      socket.on('presence:left',   handleLeft);
      socket.on('presence:status_update', handleStatusUpdate);
      socket.on('presence:profile_sync', handleProfileSync);
    }).catch(() => {});

    return () => {
      if (socket) {
        socket.off('presence:joined', handleJoined);
        socket.off('presence:left',   handleLeft);
        socket.off('presence:status_update', handleStatusUpdate);
        socket.off('presence:profile_sync', handleProfileSync);
      }
      setPresence({});
    };
  }, [roomId, handleJoined, handleLeft, handleStatusUpdate, handleProfileSync]);

  return presence;
}
