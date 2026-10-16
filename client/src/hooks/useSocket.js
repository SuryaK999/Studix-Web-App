import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function useSocket(roomId) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || !roomId) return;

    let mounted = true;
    let currentSocket = null;

    const initSocket = async () => {
      try {
        currentSocket = await socketService.connect();
        if (!mounted) return;

        setSocket(currentSocket);
        setIsConnected(currentSocket.connected);

        currentSocket.emit('room:join', { roomId });
        socketService.trackRoomJoin(roomId);

        currentSocket.on('connect', () => {
          setIsConnected(true);
          
          currentSocket?.emit('room:join', { roomId });
        });

        const onDisconnect = () => setIsConnected(false);

        const onRateLimited = ({ message }) => {
          toast.warning(message || 'You are sending messages too fast.');
        };

        currentSocket.on('disconnect',           onDisconnect);
        currentSocket.on('chat:rate_limited',    onRateLimited);

        return () => {
          currentSocket?.off('connect');
          currentSocket?.off('disconnect',        onDisconnect);
          currentSocket?.off('chat:rate_limited', onRateLimited);
        };
      } catch (err) {
        logger.error('Failed to initialize socket', 'useSocket', err);
      }
    };

    const cleanupListeners = initSocket();

    return () => {
      mounted = false;
      if (currentSocket) {
        currentSocket.emit('room:leave', { roomId });
        socketService.trackRoomLeave(roomId);
      }
      cleanupListeners.then(cleanup => cleanup?.());
    };
  }, [roomId, user]);

  return { socket, isConnected };
}
