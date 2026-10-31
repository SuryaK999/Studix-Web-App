import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchMessages, deleteMessageApi } from '@/services/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function useChatMessages(roomId, user, socket) {
  const [messages, setMessages] = useState(() => {
    if (!roomId) return [];
    try {
      const cached = localStorage.getItem(`studix_chat_${roomId}`);
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const oldestTimestampRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (roomId && Array.isArray(messages) && messages.length > 0) {
      try {
        localStorage.setItem(`studix_chat_${roomId}`, JSON.stringify(messages.slice(-80)));
      } catch (_) {}
    }
  }, [roomId, messages]);

  // Initial message fetch on room switch
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      oldestTimestampRef.current = null;
      setHasMoreMessages(false);
      return;
    }

    let cancelled = false;
    oldestTimestampRef.current = null;

    // Immediately switch to the new room's cache (or empty array) to avoid leaking previous room's state
    try {
      const cached = localStorage.getItem(`studix_chat_${roomId}`);
      const parsed = cached ? JSON.parse(cached) : [];
      setMessages(Array.isArray(parsed) ? parsed : []);
    } catch {
      setMessages([]);
    }

    const loadInitialMessages = async () => {
      try {
        const response = await fetchMessages(roomId);
        if (cancelled || !isMountedRef.current) return;

        const msgs = Array.isArray(response) ? response : (response?.messages || []);
        const hasMore = Boolean(response?.hasMore);

        setMessages(prev => {
          // Server messages are authoritative; preserve recent unconfirmed optimistic messages
          const recentTemps = prev.filter(m =>
            String(m.id).startsWith('temp-') &&
            (Date.now() - new Date(m.createdAt || 0).getTime() < 15000) &&
            !msgs.some(serverMsg => serverMsg.tempId === m.tempId || String(serverMsg.id) === String(m.id))
          );
          return [...msgs, ...recentTemps];
        });

        setHasMoreMessages(hasMore);
        if (msgs.length > 0) {
          oldestTimestampRef.current = msgs[0].createdAt ?? null;
        }
      } catch (err) {
        if (!cancelled && isMountedRef.current) {
          logger.error('Failed to load messages', 'useChatMessages', err);
        }
      }
    };

    void loadInitialMessages();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleChatReceive = (msg) => {
      if (!isMountedRef.current || !msg) return;
      if (msg.roomId && msg.roomId !== roomId) return;

      setMessages(prev => {
        const index = prev.findIndex(m => {
          if (m.id && msg.id && String(m.id) === String(msg.id)) return true;
          if (msg.tempId && (String(m.id) === msg.tempId || m.tempId === msg.tempId)) return true;
          return false;
        });

        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...msg };
          return next;
        }
        return [...prev, msg];
      });
    };

    const handleChatSaved = ({ tempId, id }) => {
      if (!isMountedRef.current || !tempId) return;
      setMessages(prev =>
        prev.map(m => (String(m.id) === String(tempId) || m.tempId === tempId ? { ...m, id: String(id) } : m))
      );
    };

    const handleSaveError = ({ tempId }) => {
      if (!isMountedRef.current) return;
      toast.error('Message failed to save — please try again.');
      setMessages(prev => prev.filter(m => String(m.id) !== tempId && m.tempId !== tempId));
    };

    const handleReactionUpdate = ({ messageId, tempId, reactions, reactionUsers }) => {
      if (!isMountedRef.current) return;
      setMessages(prev =>
        prev.map(m => {
          const idStr = String(m.id);
          const tempStr = String(m.tempId || '');
          const targetStr = String(messageId);
          const tempTargetStr = tempId ? String(tempId) : '';
          const isMatch =
            idStr === targetStr ||
            (tempStr && tempStr === targetStr) ||
            (tempTargetStr && (idStr === tempTargetStr || tempStr === tempTargetStr));
          return isMatch ? { ...m, reactions, reactionUsers } : m;
        })
      );
    };

    const handleMessageEdited = ({ messageId, text, editedAt }) => {
      if (!isMountedRef.current) return;
      setMessages(prev =>
        prev.map(m => (String(m.id) === messageId ? { ...m, text, editedAt } : m))
      );
    };

    const handleMessageDeleted = ({ messageId, realId, tempId }) => {
      if (!isMountedRef.current) return;
      setMessages(prev =>
        prev.filter(m => {
          const idStr = String(m.id);
          const tempStr = String(m.tempId || '');
          const targetStr = String(messageId);
          if (idStr === targetStr || tempStr === targetStr) return false;
          if (realId && (idStr === String(realId) || tempStr === String(realId))) return false;
          if (tempId && (idStr === String(tempId) || tempStr === String(tempId))) return false;
          return true;
        })
      );
    };

    socket.on('chat:receive',         handleChatReceive);
    socket.on('chat:saved',           handleChatSaved);
    socket.on('chat:save_error',      handleSaveError);
    socket.on('chat:reaction_update', handleReactionUpdate);
    socket.on('chat:message_edited',  handleMessageEdited);
    socket.on('chat:message_deleted', handleMessageDeleted);

    return () => {
      socket.off('chat:receive',         handleChatReceive);
      socket.off('chat:saved',           handleChatSaved);
      socket.off('chat:save_error',      handleSaveError);
      socket.off('chat:reaction_update', handleReactionUpdate);
      socket.off('chat:message_edited',  handleMessageEdited);
      socket.off('chat:message_deleted', handleMessageDeleted);
    };
  }, [socket, roomId]);

  // Load older messages for pagination
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || !oldestTimestampRef.current || !roomId) return;
    setLoadingOlder(true);
    try {
      const response = await fetchMessages(roomId, oldestTimestampRef.current);
      if (!isMountedRef.current) return;

      const older = Array.isArray(response) ? response : (response?.messages || []);
      const hasMore = Boolean(response?.hasMore);

      if (older.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      setMessages(prev => {
        const existingIds = new Set(prev.map(m => String(m.id)));
        const unique = older.filter(m => !existingIds.has(String(m.id)));
        return [...unique, ...prev];
      });

      setHasMoreMessages(hasMore);
      if (older.length > 0) {
        oldestTimestampRef.current = older[0].createdAt ?? null;
      }
    } catch (err) {
      if (isMountedRef.current) {
        logger.error('Failed to load older messages', 'useChatMessages', err);
        toast.error('Failed to load older messages.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingOlder(false);
      }
    }
  }, [roomId, loadingOlder, hasMoreMessages]);

  // Optimistic text message sending
  const sendMessage = useCallback((text, replyTarget = null) => {
    const trimmed = (text || '').trim();
    if (!trimmed || !user || !socket) return null;

    const tempId = `temp-${Date.now()}`;
    const payload = {
      tempId,
      type:           'text',
      text:           trimmed,
      senderId:       user.uid,
      senderName:     user.displayName || 'Anonymous',
      senderUsername: user.username || user.uniqueId || '',
      senderPhotoURL: user.photoURL,
      reactions:      {},
      replyTo:        replyTarget ? {
                        id: replyTarget.id,
                        text: replyTarget.text,
                        senderName: replyTarget.senderName
                      } : null,
      createdAt:      new Date().toISOString(),
    };

    setMessages(prev => [...prev, { id: tempId, ...payload }]);
    socket.emit('chat:send', { roomId, message: payload });

    return { tempId, payload };
  }, [user, socket, roomId]);

  // Message editing
  const onEditMessage = useCallback((messageId, newText) => {
    if (!socket || !newText?.trim()) return;

    const trimmed = newText.trim();
    setMessages(prev =>
      prev.map(m => (String(m.id) === messageId ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m))
    );
    socket.emit('chat:edit', { roomId, messageId, newText: trimmed });
  }, [socket, roomId]);

  // Message deletion
  const onDeleteMessage = useCallback((messageId) => {
    if (!messageId) return;

    setMessages(prev =>
      prev.filter(m => String(m.id) !== String(messageId) && String(m.tempId || '') !== String(messageId))
    );

    if (socket && socket.connected) {
      socket.emit('chat:delete', { roomId, messageId });
    }

    deleteMessageApi(roomId, messageId).catch(err => {
      console.warn('[useChatMessages] deleteMessageApi fallback notice:', err?.message);
    });

    toast.success('Message deleted');
  }, [socket, roomId]);

  return {
    messages,
    setMessages,
    loadingOlder,
    hasMoreMessages,
    loadOlderMessages,
    sendMessage,
    onEditMessage,
    onDeleteMessage,
  };
}
