import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getServerUrl } from '@/lib/utils';
import { Send, Image, Paperclip, MoreVertical, Loader2, AlertCircle, Trash2, Smile, Mic, MicOff, Phone, Settings, ChevronDown, CheckCheck, BookOpen, Quote, Code, Reply, FileText, Zap, Sparkles, X, ChevronUp, MessageSquare } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { useSocket } from '@/hooks/useSocket';
import { db, storage } from '@/lib/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { storageService } from '@/lib/storage/storageService';
import { saveVoice } from '@/services/voiceStorageService';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { fetchMessages } from '@/services/api';
import { differenceInMinutes } from 'date-fns';

const PAGE_SIZE = 50;

export function ChatPanel({ roomId, roomData }) {
  const { user } = useAuth();
  const roomName = useMemo(() => roomData?.name || 'Study Room', [roomData?.name]);
  const isAdmin = useMemo(() => roomData?.adminIds?.includes(user?.uid), [roomData?.adminIds, user?.uid]);
  const avatarUrl = roomData?.avatarUrl;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);

  const oldestTimestampRef = useRef(null);

  const scrollRef = useRef(null);
  const { socket } = useSocket(roomId);
  const typingEmittedRef = useRef(false);
  const typingTimeoutRef = useRef(undefined);
  const { isRecording, recordingDuration, audioBlob, startRecording, stopRecording, clearRecording } = useAudioRecorder();

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const { messages: msgs, hasMore } = await fetchMessages(roomId);
        if (cancelled) return;
        setMessages(msgs);
        setHasMoreMessages(hasMore);
        if (msgs.length > 0) {
          oldestTimestampRef.current = msgs[0].createdAt ?? null;
        }
      } catch (err) {
        logger.error('Failed to load messages', 'ChatPanel', err);
        toast.error('Failed to load chat history.');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [roomId]);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior });
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
    setShowScrollBottom(!isAtBottom);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (messages.length > 0) {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollContainer) return;
      
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 250;
      
      if (messages.length <= PAGE_SIZE || isNearBottom) {
        scrollToBottom(messages.length <= PAGE_SIZE ? 'auto' : 'smooth');
      }
    }
  }, [messages.length, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || !oldestTimestampRef.current) return;
    setLoadingOlder(true);
    try {
      const { messages: older, hasMore } = await fetchMessages(roomId, oldestTimestampRef.current);
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
      logger.error('Failed to load older messages', 'ChatPanel', err);
      toast.error('Failed to load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, loadingOlder, hasMoreMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleTypingUpdate = ({ userId, typingList }) => {
      if (userId === user?.uid) return;
      setTypingUsers(typingList);
    };

    const handleChatReceive = (msg) => {
      setMessages(prev => {
        
        const isDupe = prev.some(m => {
          if (m.id && msg.id && String(m.id) === String(msg.id)) return true;
          if (msg.tempId && String(m.id) === msg.tempId) return true;
          return false;
        });
        
        if (isDupe) return prev;
        return [...prev, msg];
      });
    };

    const handleChatSaved = ({ tempId, id }) => {
      setMessages(prev =>
        prev.map(m => (String(m.id) === tempId ? { ...m, id } : m))
      );
    };

    const handleSaveError = ({ tempId }) => {
      toast.error('Message failed to save — please try again.');
      setMessages(prev => prev.filter(m => String(m.id) !== tempId));
    };

    const handleReactionUpdate = ({ messageId, reactions, reactionUsers }) => {
      setMessages(prev =>
        prev.map(m => (String(m.id) === messageId ? { ...m, reactions, reactionUsers } : m))
      );
    };

    const handleMessageEdited = ({ messageId, text, editedAt }) => {
      setMessages(prev =>
        prev.map(m => (String(m.id) === messageId ? { ...m, text, editedAt } : m))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => String(m.id) !== messageId));
    };

    socket.on('typing:update',        handleTypingUpdate);
    socket.on('chat:receive',         handleChatReceive);
    socket.on('chat:saved',           handleChatSaved);
    socket.on('chat:save_error',      handleSaveError);
    socket.on('chat:reaction_update', handleReactionUpdate);
    socket.on('chat:message_edited',  handleMessageEdited);
    socket.on('chat:message_deleted', handleMessageDeleted);

    const handleRadialAction = (e) => {
      const { action } = e.detail || {};
      
      if (action === 'chat-read') {
        socket.emit('chat:read', { roomId });
        toast.success('Conversation marked as read');
      }
      
      if (action === 'chat-settings') {
        toast.info('Chat settings coming soon');
      }
    };

    const handleGlobalAction = (e) => {
      const { action, message } = e.detail || {};
      if (action === 'msg-reply') {
        setReplyTarget(message);
        
        const input = document.querySelector('.studix-input');
        input?.focus();
      }
    };
    
    const chatEl = document.querySelector('[data-radial-context="chat"]');
    if (chatEl) {
      chatEl.addEventListener('radial-action', handleRadialAction);
    }
    
    window.addEventListener('studix:action', handleGlobalAction);

    return () => {
      socket.off('typing:update',        handleTypingUpdate);
      socket.off('chat:receive',         handleChatReceive);
      socket.off('chat:saved',           handleChatSaved);
      socket.off('chat:save_error',      handleSaveError);
      socket.off('chat:reaction_update', handleReactionUpdate);
      socket.off('chat:message_edited',  handleMessageEdited);
      socket.off('chat:message_deleted', handleMessageDeleted);
      
      if (chatEl) {
        chatEl.removeEventListener('radial-action', handleRadialAction);
      }
      window.removeEventListener('studix:action', handleGlobalAction);
    };
  }, [socket, user?.uid]);

  const handleInputChange = useCallback((e) => {
    const text = e.target.value;
    setInputText(text);

    if (!socket || !user) return;

    if (text.length > 0 && !typingEmittedRef.current) {
      typingEmittedRef.current = true;
      socket.emit('typing:start', {
        roomId,
        userId:   user.uid,
        userName: user.displayName || 'Anonymous',
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (text.length === 0) {
      if (typingEmittedRef.current) {
        typingEmittedRef.current = false;
        socket.emit('typing:stop', { roomId, userId: user.uid });
      }
    } else {
      typingTimeoutRef.current = setTimeout(() => {
        if (typingEmittedRef.current) {
          typingEmittedRef.current = false;
          socket.emit('typing:stop', { roomId, userId: user.uid });
        }
      }, 1500);
    }
  }, [socket, roomId, user]);

  const sendMessage = useCallback(async (text = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || !user || !socket || isLoading) return;

    setIsLoading(true);
    setInputText('');

    const tempId  = `temp-${Date.now()}`;
    const payload = {
      tempId,
      type:           'text',
      text:           trimmed,
      senderId:       user.uid,
      senderName:     user.displayName || 'Anonymous',
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

    if (typingEmittedRef.current) {
      typingEmittedRef.current = false;
      socket.emit('typing:stop', { roomId, userId: user.uid });
    }

    socket.emit('chat:send', { roomId, message: payload });

    setReplyTarget(null);
    setIsLoading(false);

    setTimeout(() => scrollToBottom('smooth'), 100);
  }, [inputText, user, roomId, socket, isLoading, scrollToBottom]);

  const handleFileUpload = useCallback(async (file, type) => {
    if (!user || !socket) return;

    if (!file || file.size === 0) {
      toast.error('Selected file is empty.');
      return;
    }
    const maxSize = 25 * 1024 * 1024; 
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${maxSize / 1024 / 1024}MB`);
      return;
    }
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const placeholder = {
      id: tempId,
      tempId,
      type,
      text: type === 'image' ? 'Uploading image...' : `Uploading ${file.name}...`,
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      senderPhotoURL: user.photoURL,
      reactions: {},
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, placeholder]);
    setIsUploading(true);
    setShowAttachmentMenu(false);

    const attemptUpload = async (retryCount) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); 

      try {
        const result = await storageService.uploadFile(file, {
          roomId,
          folder: type === 'image' ? 'images' : 'files',
          compress: type === 'image',
        });
        clearTimeout(timeoutId);
        return result;
      } catch (err) {
        clearTimeout(timeoutId);
        if (retryCount > 0) {
          logger.error(`File upload attempt failed, retrying (${retryCount} left)`, 'ChatPanel', err);
          return attemptUpload(retryCount - 1);
        }
        throw err;
      }
    };

    try {
      const result = await attemptUpload(1);

      const payload = {
        tempId,
        type,
        text: type === 'image' ? '' : `Shared ${file.type.split('/')[1] || 'file'}`,
        fileUrl: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhotoURL: user.photoURL,
        reactions: {},
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...payload, id: tempId } : m));
      socket.emit('chat:send', { roomId, message: payload });
    } catch (error) {
      
      setMessages(prev => prev.filter(m => m.id !== tempId));
      logger.error('File upload error', 'ChatPanel', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user, roomId, socket]);

  const sendVoiceMessage = useCallback(async () => {
    if (!audioBlob || !user || !socket) return;

    if (audioBlob.size === 0) {
      toast.error('Voice recording is empty. Please try again.');
      clearRecording();
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Sending voice message...');

    try {
      const { id, url } = await saveVoice(audioBlob);

      const payload = {
        tempId:         `temp-${Date.now()}`,
        type:           'voice',
        text:           'Voice message',
        voice: {
          id,
          url,
          duration: recordingDuration,
        },
        fileUrl:        url, 
        fileName:       `voice-${id}.webm`,
        fileSize:       audioBlob.size,
        fileDuration:   recordingDuration,
        senderId:       user.uid,
        senderName:     user.displayName || 'Anonymous',
        senderPhotoURL: user.photoURL,
        reactions:      {},
        createdAt:      new Date().toISOString(),
      };

      setMessages(prev => [...prev, { id: payload.tempId, ...payload }]);
      socket.emit('chat:send', { roomId, message: payload });
      toast.dismiss(toastId);
      clearRecording();
    } catch (error) {
      console.error('[VoiceUpload] Pipeline failed:', error);
      toast.dismiss(toastId);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, user, roomId, recordingDuration, clearRecording, socket]);

  const generateSummary = useCallback(async () => {
    setIsSummarizing(true);
    setTimeout(() => {
      setSummary(`Summary of recent discussion:\n\nThe group has been discussing various topics. Key points include collaborative study strategies, sharing resources, and planning upcoming sessions.\n\n(This is a demo summary. Connect Gemini API for real summarization.)`);
      setIsSummarizing(false);
    }, 1500);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    sendMessage();
  }, [sendMessage]);

  const audioBlobUrl = useMemo(() => {
    if (!audioBlob) return null;
    const url = URL.createObjectURL(audioBlob);
    return url;
  }, [audioBlob]);

  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const nextMsg = messages[idx + 1];
      
      const isFirstInGroup = !prevMsg || 
        prevMsg.senderId !== msg.senderId || 
        differenceInMinutes(new Date(msg.createdAt), new Date(prevMsg.createdAt)) > 5;
        
      const isLastInGroup = !nextMsg || 
        nextMsg.senderId !== msg.senderId || 
        differenceInMinutes(new Date(nextMsg.createdAt), new Date(msg.createdAt)) > 5;
        
      return { ...msg, isFirstInGroup, isLastInGroup };
    });
  }, [messages]);

  const onEditMessage = useCallback((messageId, newText) => {
    if (!socket || !newText.trim()) return;
    
    setMessages(prev =>
      prev.map(m => (String(m.id) === messageId ? { ...m, text: newText.trim(), editedAt: new Date().toISOString() } : m))
    );
    socket.emit('chat:edit', { roomId, messageId, newText: newText.trim() });
  }, [socket, roomId]);

  const onDeleteMessage = useCallback((messageId) => {
    if (!socket) return;
    
    setMessages(prev => prev.filter(m => String(m.id) !== messageId));
    socket.emit('chat:delete', { roomId, messageId });
  }, [socket, roomId]);

  const uploadRoomAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const refPath = ref(storage, `rooms/${roomId}/room_avatar_${Date.now()}.jpg`);
      await uploadBytes(refPath, file);
      const url = await getDownloadURL(refPath);

      await updateDoc(doc(db, "rooms", roomId), {
        avatarUrl: url
      });
      toast.success('Room profile updated');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Failed to update room profile');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    return () => { if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl); };
  }, [audioBlobUrl]);

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden">
      {}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />
      {}
      <header className="shrink-0 flex items-center justify-between h-16 md:h-20 px-5 md:px-6 border-b border-[#27272a]/30 bg-[#09090b]/40 backdrop-blur-2xl z-20 gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="relative group/avatar w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-[0_2px_12px_rgba(113,72,235,0.3)] border border-white/10 shrink-0 select-none overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Room profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-sm">{roomName?.[0]?.toUpperCase() || 'R'}</span>
              )}

              {isAdmin && (
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center cursor-pointer transition-opacity z-10 backdrop-blur-[2px]">
                  <input type="file" accept="image/*" className="hidden" onChange={uploadRoomAvatar} disabled={isUploadingAvatar} />
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-white" />
                  )}
                </label>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 md:gap-3">
              <h3 className="font-extrabold text-white text-sm md:text-base lg:text-lg tracking-tight whitespace-nowrap truncate max-w-[150px] md:max-w-[200px]">
                {roomName || 'Study Room'}
              </h3>
              <div className="flex items-center gap-1.5 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-[8px] md:text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowSummaryModal(true); generateSummary(); }}
            className="h-8 px-3.5 rounded-lg text-primary hover:text-white hover:bg-primary/20 text-[11px] font-black uppercase tracking-wide border border-primary/20 gap-1.5 transition-all duration-200"
          >
            <Zap className="h-3 w-3" />
            AI Summary
          </Button>
        </div>
      </header>

      {}

      {}
      <div className="flex-1 relative overflow-hidden group/list min-h-0 z-10" data-radial-context="chat">
        <ScrollArea className="h-full w-full" ref={scrollRef}>
          <div className="px-5 py-8 max-w-5xl mx-auto min-h-full flex flex-col justify-end space-y-1">
            {}
            {hasMoreMessages && messages.length >= PAGE_SIZE && (
              <div className="flex justify-center mb-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadOlderMessages}
                  disabled={loadingOlder}
                  className="text-[11px] font-bold uppercase tracking-widest text-[#8E9297] hover:text-white hover:bg-white/5 transition-all gap-2"
                >
                  {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronUp className="h-3 w-3" />}
                  Load older history
                </Button>
              </div>
            )}

            {}
            {messages.length === 0 && !hasMoreMessages && !loadingOlder && (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <div className="flex flex-col items-center gap-3">
                  <h2 className="text-xl font-semibold text-white/90 tracking-tight">Everything starts here.</h2>
                  <p className="text-[#8E9297] text-sm max-w-[300px]">
                    Say hello to your study partners.
                  </p>
                </div>
              </div>
            )}

            {groupedMessages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === user?.uid}
                isFirstInGroup={msg.isFirstInGroup}
                isLastInGroup={msg.isLastInGroup}
                roomId={roomId}
                socket={socket}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
              />
            ))}
            <TypingIndicator typingUsers={typingUsers} />
          </div>
        </ScrollArea>

        {}
        <AnimatePresence>
          {showScrollBottom && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-6 right-8 p-3 rounded-full bg-indigo-600 text-white shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:shadow-indigo-500/60 hover:bg-indigo-500 transition-all z-40 group border border-white/10"
            >
              <div className="relative">
                <ChevronUp className="h-5 w-5 rotate-180" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-indigo-600 animate-pulse" />
              </div>
              <span className="absolute right-full mr-4 px-3 py-1.5 rounded-xl bg-[#0E0F14] text-[11px] font-bold uppercase tracking-wider text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-nowrap shadow-2xl border border-white/10 origin-right">
                New Messages ↓
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {}
      <AnimatePresence>
        {replyTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="px-4 py-2 border-t border-white/5 bg-[#0e0f14]/80 backdrop-blur-md z-30"
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 border-l-2 border-primary pl-3 py-1 bg-white/5 rounded-r-xl pr-4 min-w-0">
                <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-primary uppercase tracking-wider">
                    Replying to {replyTarget.senderName}
                  </span>
                  <p className="text-xs text-[#8E9297] truncate pr-4">
                    {replyTarget.text || 'Attached file'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReplyTarget(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#8E9297] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="studix-input-bar w-full mx-auto shrink-0 group/form">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className={cn(
                "studix-icon-btn studix-attach-btn",
                showAttachmentMenu && "bg-white/10 text-white rotate-45"
              )}
              disabled={isUploading}
            >
              <Paperclip size={18} />
            </button>

            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full left-0 mb-4 bg-[#1A1D2B] text-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-[#2A2D3E] p-2 z-50 min-w-[160px] overflow-hidden"
                >
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                    <Image className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300" />
                    <span className="text-sm font-semibold">Photos</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')} disabled={isUploading} />
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                    <FileText className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300" />
                    <span className="text-sm font-semibold">Document</span>
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'file')} disabled={isUploading} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="studix-input-wrapper relative">
            {isRecording && (
              <div className="absolute inset-0 z-30 flex items-center justify-between bg-[#0E0F14] px-4 rounded-[24px] border border-red-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-[12px] text-red-500 font-bold uppercase tracking-widest">Recording</span>
                </div>
                <span className="text-sm text-white font-mono font-bold">
                  {Math.floor(recordingDuration / 60)}
                </span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 60, ease: "linear" }} className="h-full bg-red-500" />
                </div>
              </div>
            )}
            <textarea
              value={inputText}
              onChange={(e) => {
                handleInputChange(e);
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                  (e.target).style.height = 'auto';
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="studix-input custom-scrollbar"
              disabled={isLoading || isRecording || isUploading}
            />
          </div>

          <div className="studix-actions">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "studix-icon-btn",
                isRecording && "animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)] !bg-red-500/20 !text-red-500 !border-red-500/50"
              )}
              disabled={isUploading}
            >
              <Mic size={18} />
            </button>

            {audioBlob && !isRecording && (
               <button
                 type="button"
                 onClick={sendVoiceMessage}
                 className="studix-send-btn !w-auto px-4 !bg-emerald-500 hover:!bg-emerald-600 gap-2"
                 disabled={isLoading}
               >
                 <span className="text-[13px] font-bold">Voice</span>
                 <Send size={15} />
               </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !inputText.trim() || isRecording || isUploading}
              className="studix-send-btn"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
      </form>

      {}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="sm:max-w-lg border-border shadow-2xl bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Chat Summary
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {isSummarizing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="bg-card text-card-foreground rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
