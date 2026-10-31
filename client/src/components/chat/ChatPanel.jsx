import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';
import {
  Send,
  Image,
  Paperclip,
  Loader2,
  Mic,
  Reply,
  FileText,
  X,
  ChevronUp,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { StudyBuddyIcon } from '@/components/ui/StudyBuddyIcon';
import { useAuth } from '@/context/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useSocket } from '@/hooks/useSocket';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { ChatSummaryModal } from './ChatSummaryModal';
import { Tip } from '@/components/ui/tip';

import { useChatMessages } from './hooks/useChatMessages';
import { useChatUploads } from './hooks/useChatUploads';
import { useChatAiStudy } from './hooks/useChatAiStudy';
import { useChatScroll } from './hooks/useChatScroll';

const PAGE_SIZE = 50;

export function ChatPanel({ roomId, roomData, className }) {
  const { user } = useAuth();
  usePresence(roomId);

  const roomName = useMemo(() => roomData?.name || 'Study Room', [roomData?.name]);
  const isAdmin = useMemo(
    () =>
      Boolean(
        roomData?.adminIds?.includes(user?.uid) ||
        roomData?.creatorId === user?.uid ||
        roomData?.createdBy === user?.uid
      ),
    [roomData, user?.uid]
  );
  const avatarUrl = roomData?.avatarUrl;

  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);

  const { socket } = useSocket(roomId);
  const typingEmittedRef = useRef(false);
  const typingTimeoutRef = useRef(undefined);

  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  // SRP Hook 1: Messages management
  const {
    messages,
    setMessages,
    loadingOlder,
    hasMoreMessages,
    loadOlderMessages,
    sendMessage,
    onEditMessage,
    onDeleteMessage,
  } = useChatMessages(roomId, user, socket);

  // SRP Hook 2: Radix scroll handling
  const {
    scrollRef,
    showScrollBottom,
    scrollToBottom,
  } = useChatScroll(messages, loadingOlder);

  const triggerAiRef = useRef(null);

  // Stable programmatic message dispatch (used by input bar, AI explain, and summary sharing)
  const handleSendProgrammaticMessage = useCallback((text, reply = null) => {
    const trimmed = (text || '').trim();
    if (!trimmed || !user || !socket) return;

    const result = sendMessage(trimmed, reply);
    setTimeout(() => scrollToBottom('smooth'), 100);

    if (result && triggerAiRef.current) {
      triggerAiRef.current(
        trimmed,
        [...messages, result.payload],
        result.tempId,
        user.displayName || 'Anonymous'
      );
    }
  }, [user, socket, sendMessage, scrollToBottom, messages]);

  // SRP Hook 3: AI interactions & Executive summary
  const {
    showSummaryModal,
    setShowSummaryModal,
    summary,
    isSummarizing,
    generateSummary,
    triggerAiStudyBuddyResponse,
  } = useChatAiStudy({
    roomId,
    roomName,
    messages,
    setMessages,
    socket,
    sendMessage: handleSendProgrammaticMessage,
    scrollToBottom,
  });

  useEffect(() => {
    triggerAiRef.current = triggerAiStudyBuddyResponse;
  }, [triggerAiStudyBuddyResponse]);

  // SRP Hook 4: File, Voice, and Avatar uploads
  const {
    isUploading,
    isUploadingAvatar,
    showAttachmentMenu,
    setShowAttachmentMenu,
    handleFileUpload,
    sendVoiceMessage: executeVoiceSend,
    uploadRoomAvatar: executeAvatarUpload,
  } = useChatUploads(roomId, user, socket, setMessages);

  // Typing updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleTypingUpdate = ({ userId, typingList }) => {
      if (userId === user?.uid) return;
      setTypingUsers(typingList || []);
    };

    socket.on('typing:update', handleTypingUpdate);
    return () => {
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, user?.uid]);

  // Radial menu & Global actions
  useEffect(() => {
    const handleRadialAction = (e) => {
      const { action } = e.detail || {};
      if (action === 'chat-read' && socket) {
        socket.emit('chat:read', { roomId });
        toast.success('Conversation marked as read');
      }
      if (action === 'chat-settings') {
        toast.info('Chat settings coming soon');
      }
    };

    const handleGlobalAction = (e) => {
      const { action, message } = e.detail || {};
      if (action === 'msg-reply' && message) {
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
      if (chatEl) {
        chatEl.removeEventListener('radial-action', handleRadialAction);
      }
      window.removeEventListener('studix:action', handleGlobalAction);
    };
  }, [socket, roomId]);

  // Input typing emitter with debounce
  const handleInputChange = useCallback((e) => {
    const text = e.target.value;
    setInputText(text);

    if (!socket || !user) return;

    if (text.length > 0 && !typingEmittedRef.current) {
      typingEmittedRef.current = true;
      socket.emit('typing:start', {
        roomId,
        userId: user.uid,
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

  // Message submission handler
  const handleSendMessage = useCallback(async (textToSend = inputText) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !user || !socket || isLoading) return;

    setIsLoading(true);
    setInputText('');

    if (typingEmittedRef.current) {
      typingEmittedRef.current = false;
      socket.emit('typing:stop', { roomId, userId: user.uid });
    }

    const currentReply = replyTarget;
    setReplyTarget(null);

    handleSendProgrammaticMessage(trimmed, currentReply);
    setIsLoading(false);
  }, [inputText, user, socket, isLoading, replyTarget, handleSendProgrammaticMessage, roomId]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    void handleSendMessage();
  }, [handleSendMessage]);

  const handleSendVoice = useCallback(async () => {
    await executeVoiceSend(audioBlob, recordingDuration, clearRecording);
  }, [executeVoiceSend, audioBlob, recordingDuration, clearRecording]);

  const audioBlobUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  // Group messages for neat conversational presentation
  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const nextMsg = messages[idx + 1];

      const isFirstInGroup =
        !prevMsg ||
        prevMsg.senderId !== msg.senderId ||
        differenceInMinutes(new Date(msg.createdAt), new Date(prevMsg.createdAt)) > 5;

      const isLastInGroup =
        !nextMsg ||
        nextMsg.senderId !== msg.senderId ||
        differenceInMinutes(new Date(nextMsg.createdAt), new Date(msg.createdAt)) > 5;

      return { ...msg, isFirstInGroup, isLastInGroup };
    });
  }, [messages]);

  return (
    <div className={cn('flex flex-col h-full bg-[#09090b] relative overflow-hidden', className)}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />

      {/* Room Header */}
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
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void executeAvatarUpload(e, isAdmin)}
                    disabled={isUploadingAvatar}
                  />
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
          <Tip label="Synthesize discussion into executive summary" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSummary}
              className="h-8 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white text-xs font-medium border border-white/10 gap-1.5 transition-colors"
            >
              <StudyBuddyIcon size={14} variant="gradient" />
              AI Summary
            </Button>
          </Tip>
        </div>
      </header>

      {/* Message List Area */}
      <div className="flex-1 relative overflow-hidden group/list min-h-0 z-10" data-radial-context="chat">
        <ScrollArea className="h-full w-full" ref={scrollRef}>
          <div className="px-5 py-8 max-w-5xl mx-auto min-h-full flex flex-col justify-end space-y-1">
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
                canDelete={msg.senderId === user?.uid || isAdmin}
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

        {/* Floating Scroll to Bottom Button */}
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
                New Messages &darr;
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Reply Banner */}
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
                type="button"
                onClick={() => setReplyTarget(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#8E9297] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input Bar */}
      <form onSubmit={handleSubmit} className="studix-input-bar w-full mx-auto shrink-0 group/form">
        <div className="relative shrink-0">
          <Tip label="Add attachments (images or files)" side="top">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className={cn(
                'studix-icon-btn studix-attach-btn',
                showAttachmentMenu && 'bg-white/10 text-white rotate-45'
              )}
              disabled={isUploading}
            >
              <Paperclip size={18} />
            </button>
          </Tip>

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
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && void handleFileUpload(e.target.files[0], 'image')}
                    disabled={isUploading}
                  />
                </label>
                <label className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                  <FileText className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300" />
                  <span className="text-sm font-semibold">Document</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && void handleFileUpload(e.target.files[0], 'file')}
                    disabled={isUploading}
                  />
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
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
              <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 60, ease: 'linear' }}
                  className="h-full bg-red-500"
                />
              </div>
            </div>
          )}

          <textarea
            value={inputText}
            onChange={(e) => {
              handleInputChange(e);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
                e.target.style.height = 'auto';
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="studix-input custom-scrollbar"
            disabled={isLoading || isRecording || isUploading}
          />
        </div>

        <div className="studix-actions">
          <Tip label={isRecording ? "Stop recording voice note" : "Record voice note"} side="top">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                'studix-icon-btn',
                isRecording &&
                  'animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)] !bg-red-500/20 !text-red-500 !border-red-500/50'
              )}
              disabled={isUploading}
            >
              <Mic size={18} />
            </button>
          </Tip>

          {audioBlob && !isRecording && (
            <Tip label="Send recorded voice note" side="top">
              <button
                type="button"
                onClick={handleSendVoice}
                className="studix-send-btn !w-auto px-4 !bg-emerald-500 hover:!bg-emerald-600 gap-2"
                disabled={isLoading}
              >
                <span className="text-[13px] font-bold">Voice</span>
                <Send size={15} />
              </button>
            </Tip>
          )}

          <Tip label="Send message (Enter)" side="top">
            <button
              type="submit"
              disabled={isLoading || !inputText.trim() || isRecording || isUploading}
              className="studix-send-btn"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </Tip>
        </div>
      </form>

      {/* AI Summary Modal */}
      <ChatSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        summary={summary}
        isSummarizing={isSummarizing}
        onRegenerate={generateSummary}
        onPostToChat={(text) => {
          void handleSendMessage(text);
          setShowSummaryModal(false);
          toast.success('Shared executive summary to room chat');
        }}
        roomName={roomName}
        messageCount={messages.length}
        messages={messages}
      />
    </div>
  );
}

ChatPanel.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomData: PropTypes.shape({
    name: PropTypes.string,
    avatarUrl: PropTypes.string,
    adminIds: PropTypes.arrayOf(PropTypes.string),
    creatorId: PropTypes.string,
    createdBy: PropTypes.string,
  }),
  className: PropTypes.string,
};
