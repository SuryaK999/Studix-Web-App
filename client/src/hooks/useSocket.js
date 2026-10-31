import { useEffect, useState } from 'react';
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

    const onDisconnect = () => {
      if (mounted) setIsConnected(false);
    };

    const onRateLimited = ({ message }) => {
      toast.warning(message || 'You are sending messages too fast.');
    };

    const onConnect = () => {
      if (mounted) {
        setIsConnected(true);
        currentSocket?.emit('room:join', { roomId });
      }
    };

    const initSocket = async () => {
      try {
        currentSocket = await socketService.connect();
        if (!mounted) return;

        setSocket(currentSocket);
        setIsConnected(currentSocket.connected);

        currentSocket.emit('room:join', { roomId });
        socketService.trackRoomJoin(roomId);

        currentSocket.on('connect', onConnect);
        currentSocket.on('disconnect', onDisconnect);
        currentSocket.on('chat:rate_limited', onRateLimited);
      } catch (err) {
        logger.error('Failed to initialize socket', 'useSocket', err);
      }
    };

    void initSocket();

    return () => {
      mounted = false;
      if (currentSocket) {
        currentSocket.off('connect', onConnect);
        currentSocket.off('disconnect', onDisconnect);
        currentSocket.off('chat:rate_limited', onRateLimited);
        currentSocket.emit('room:leave', { roomId });
        socketService.trackRoomLeave(roomId);
      }
    };
  }, [roomId, user]);

  return { socket, isConnected };
}
