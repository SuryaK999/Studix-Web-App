import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Copy, Edit2, Trash2, Reply, SmilePlus,
  Bot, Clock, CheckCircle2, AlertCircle, FileText, Download, Play, Pause, ExternalLink,
  MessageSquare, Image as ImageIcon, X, Check
} from 'lucide-react';
import { cn, getServerUrl } from '@/lib/utils';

import { MessageReactions, EmojiPickerPopover, QUICK_EMOJIS } from './MessageReactions';
import { VoiceMessage } from './VoiceMessage';
import { getVoiceUrl } from '@/services/voiceStorageService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useUsersStore } from '@/store/usersStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Tip } from '@/components/ui/tip';
import { StudyBuddyIcon, StudyBuddyMentionBadge } from '@/components/ui/StudyBuddyIcon';

export const MessageItem = memo(function MessageItem({
  message, isOwn, canDelete, isFirstInGroup, isLastInGroup, onEdit, onDelete, roomId, socket,
}) {
  const realUser = useUsersStore(
    useCallback(state => state.users[message.senderId] ?? null, [message.senderId])
  );
  const isAi = message.isAi || message.senderId === 'ai-studybuddy' || message.senderName?.toLowerCase().includes('studybuddy');
  const displayName = isAi ? 'StudyBuddy AI' : (realUser?.displayName || realUser?.name || message.senderName || 'Anonymous');
  const photoURL = realUser?.photoURL || realUser?.avatarUrl || message.senderPhotoURL || undefined;
  const uniqueId = isAi ? 'studybuddy' : (realUser?.username || realUser?.uniqueId || message.senderUsername || null);

  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const editInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const formattedTime = useMemo(() => {
    if (!message?.createdAt) return '';
    const date = new Date(message.createdAt);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm a');
  }, [message.createdAt]);

  const isAdmin = (message).senderRole === 'admin' || message.senderName?.toLowerCase().includes('bot');

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFormattedMessageText = useCallback((text) => {
    if (!text || typeof text !== 'string') return null;
    const parts = text.split(/(@ai\b|@studybuddy\b|\/ai\b)/i);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      if (/^(@ai|@studybuddy|\/ai)$/i.test(part)) {
        return <StudyBuddyMentionBadge key={i} text={part} />;
      }
      return part;
    });
  }, []);

  const getFullUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    const baseUrl = getServerUrl();
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleCopy = useCallback(async () => {
    const text = message.text || '';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy text');
    }
  }, [message.text]);

  const handleEditStart = useCallback(() => {
    setEditText(message.text || '');
    setIsEditing(true);
  }, [message.text]);

  const handleEditSave = useCallback(() => {
    const trimmed = editText.trim();
    if (!trimmed) {
      toast.error('Message cannot be empty');
      return;
    }
    if (trimmed === message.text) {
      setIsEditing(false);
      return;
    }
    onEdit?.(message.id, trimmed);
    setIsEditing(false);
  }, [editText, message.text, message.id, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditText(message.text || '');
    setIsEditing(false);
  }, [message.text]);

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    }
    if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  const handleDelete = useCallback(() => {
    const idToDelete = message.id || message.tempId;
    if (idToDelete) {
      onDelete?.(idToDelete);
    }
  }, [onDelete, message.id, message.tempId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      const action = e.detail?.action;
      if (action === 'msg-copy') handleCopy();
      if (action === 'msg-edit') handleEditStart();
      if (action === 'msg-delete') handleDelete();
      if (action === 'msg-reply') {
        window.dispatchEvent(new CustomEvent('studix:action', {
          detail: { action: 'msg-reply', message }
        }));
      }
      if (action === 'msg-react') {
        setShowPicker(true);
      }
    };

    el.addEventListener('radial-action', handler);
    el.addEventListener('studix-action', handler);
    return () => {
      el.removeEventListener('radial-action', handler);
      el.removeEventListener('studix-action', handler);
    };
  }, [handleCopy, handleEditStart, handleDelete, message]);

  // Mobile/touch: dismiss floating action bar when tapping outside
  useEffect(() => {
    if (!showActions || showPicker) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [showActions, showPicker]);

  const renderContent = () => {
    const fullFileUrl = getFullUrl(message.fileUrl);

    if (message.type === 'image' && fullFileUrl) {
      return (
        <div className="space-y-2">
          <div className="relative">
            {!imageLoaded && (
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <img
              src={fullFileUrl}
              alt={message.fileName || 'Shared image'}
              className={`max-w-full rounded-lg max-h-60 object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          </div>
          {message.text && <p className="text-sm pr-12">{message.text}</p>}
        </div>
      );
    }

    if (message.type === 'file' && fullFileUrl) {
      return (
        <div className="space-y-2">
          <a
            href={fullFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg border border-white/5"
          >
            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{message.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(message.fileSize)}
              </p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </a>
          {message.text && message.text !== `Shared ${message.fileName?.split('.').pop() || 'file'}` && (
            <p className="text-sm pr-12">{message.text}</p>
          )}
        </div>
      );
    }

    const audioSrc = message.type === 'voice' ? getVoiceUrl(message) || getFullUrl(message.fileUrl) : null;
    if (message.type === 'voice' && audioSrc) {
      return (
        <div className="space-y-2">
          <VoiceMessage
            key={audioSrc}
            audioUrl={audioSrc}
            duration={message.voiceDuration || message.voice?.duration || message.fileDuration || 0}
          />
          {message.text && message.text !== 'Voice message' && <p className="text-sm pr-12">{message.text}</p>}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[14.2px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none min-h-[40px]"
            rows={Math.min(editText.split('\n').length + 1, 5)}
          />
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditCancel}
              className="h-6 px-2 text-[10px] text-white/50 hover:text-white hover:bg-white/5"
            >
              <X className="h-3 w-3 mr-0.5" />
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditSave}
              className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <Check className="h-3 w-3 mr-0.5" />
              Save
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {message.replyTo && (
          <div className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-l-2 mb-1 min-w-[120px] max-w-full",
            isOwn ? "bg-white/10 border-white/30" : "bg-white/5 border-primary/50"
          )}>
            <Reply size={10} className={isOwn ? "text-white/60" : "text-primary"} />
            <div className="flex flex-col min-w-0">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider",
                isOwn ? "text-white/80" : "text-primary"
              )}>
                {message.replyTo.senderName}
              </span>
              <p className={cn(
                "text-[10px] truncate opacity-70",
                isOwn ? "text-white" : "text-[#E8EAF0]"
              )}>
                {message.replyTo.text || 'Attached file'}
              </p>
            </div>
          </div>
        )}

        <div className="relative">
          {isAi ? (
            <div className="text-[13.5px] md:text-[14px] leading-relaxed pr-6 pb-2 min-w-[260px] overflow-hidden">
              <MarkdownRenderer content={message.text} />
            </div>
          ) : (
            <p className="text-[14.2px] leading-relaxed pr-14 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderFormattedMessageText(message.text)}</p>
          )}
          {message.editedAt && (
            <span className="text-[9px] text-white/30 italic ml-1 select-none">(edited)</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-2.5 px-2 relative group focus:outline-none",
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isFirstInGroup ? 'mt-4' : 'mt-1',
        isLastInGroup && "mb-2"
      )}
      data-radial-context="message"
      data-message-id={message.id || message.tempId}
      data-message-own={isOwn ? '1' : '0'}
      data-message-can-delete={(canDelete || isOwn) ? '1' : '0'}
      data-radial-text={message.text || (message.type === 'voice' ? 'Voice Message' : message.fileName ? `File: ${message.fileName}` : '')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        if (!showPicker) setShowActions(false);
      }}
    >
      <div className="w-9 h-9 flex-shrink-0 relative">
        {isFirstInGroup && !isOwn && (
          <Avatar className={cn(
            "h-9 w-9 shadow-sm shrink-0 animate-in zoom-in-50 duration-300",
            isAi ? "border border-white/10 bg-[#161722]" : "border border-white/[0.08]"
          )}>
            {isAi ? (
              <div className="w-full h-full bg-white/[0.04] flex items-center justify-center text-zinc-200">
                <StudyBuddyIcon size={18} variant="gradient" />
              </div>
            ) : (
              <>
                <AvatarImage src={photoURL} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-[10px] font-bold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </>
            )}
          </Avatar>
        )}
      </div>

      <div className={cn("flex flex-col", isAi ? "max-w-[96%] md:max-w-[85%]" : (isOwn ? "max-w-[85%] md:max-w-[70%]" : "max-w-[85%] md:max-w-[70%]"), isOwn ? "items-end" : "items-start")}>
        {isFirstInGroup && !isOwn && (
          <div className="flex items-center gap-2 mb-1 ml-1 scale-in-center overflow-hidden">
            <span className={cn(
              "text-[12.5px] font-extrabold capitalize tracking-tight truncate max-w-[120px]",
              isAi ? "text-purple-300" : "text-[#B4A0FF]"
            )}>
              {displayName}
            </span>
            {uniqueId && (
              <span className="text-[10px] text-white/40 font-medium tracking-tight truncate max-w-[100px]">
                @{uniqueId}
              </span>
            )}
            {isAi && (
              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-purple-300 text-[9px] font-bold uppercase tracking-wider border border-white/10 shrink-0 flex items-center gap-1">
                <StudyBuddyIcon size={10} variant="monochrome" /> StudyBuddy AI
              </span>
            )}
            {isAdmin && !isAi && (
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/30 shrink-0">
                Admin
              </span>
            )}
          </div>
        )}

        <div className={cn("flex items-end gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
          <div
            onClick={() => setShowActions(prev => !prev)}
            className={cn(
              "px-4 py-2.5 rounded-2xl relative shadow-sm border transition-all duration-300 cursor-pointer md:cursor-auto",
              isOwn
                ? 'bg-gradient-to-br from-primary to-purple-600 text-white border-white/10 shadow-[0_4px_16px_rgba(113,72,235,0.15)]'
                : isAi
                  ? 'bg-purple-950/25 backdrop-blur-md text-[#E8EAF0] border-purple-500/30 shadow-[0_4px_20px_rgba(168,85,247,0.12)]'
                  : 'bg-white/[0.03] backdrop-blur-md text-[#E8EAF0] border-white/10',
              isFirstInGroup && isOwn && "rounded-tr-none",
              isFirstInGroup && !isOwn && "rounded-tl-none",
              !isFirstInGroup && "rounded-[1.2rem]"
            )}
          >
            {isFirstInGroup && (
              <div
                className={cn(
                  "absolute top-0 w-3 h-3",
                  isOwn
                    ? "right-[-6px] bg-primary [clip-path:polygon(0%_0%,100%_0%,0%_100%)]"
                    : isAi
                      ? "left-[-6px] bg-purple-950/25 backdrop-blur-md [clip-path:polygon(0%_0%,100%_0%,100%_100%)]"
                      : "left-[-6px] bg-white/[0.03] backdrop-blur-md [clip-path:polygon(0%_0%,100%_0%,100%_100%)]"
                )}
              />
            )}

            <div className="relative z-10 pb-1.5 break-words overflow-hidden">
              {renderContent()}
              
              {!isEditing && (
                <div className={cn(
                  "flex items-center gap-0.5 absolute bottom-0 right-[-4px]",
                  message.type === 'text' ? "" : "bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full"
                )}>
                  <span className={cn(
                    "text-[9px] font-bold leading-none select-none tracking-tight",
                    isOwn ? "text-white/40" : "text-[#8E9297]"
                  )}>
                    {formattedTime}
                  </span>
                  {isOwn && (
                    <div className="flex items-center text-white/60 ml-0.5 scale-[0.75] origin-right">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                         <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/>
                      </svg>
                    </div>
                  )}
                </div>
              )}

            </div>

            {!isEditing && (showActions || showPicker) && (
              <div
                className={cn(
                  "absolute -top-3.5 flex items-center gap-1 z-30 bg-[#0c0d15]/95 backdrop-blur-2xl border border-purple-500/30 rounded-full px-2 py-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.65)] select-none max-w-[calc(100vw-32px)]",
                  isOwn ? "right-2" : "left-2"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Quick Reactions (Discord/Telegram style) */}
                <div className="flex items-center gap-0.5">
                  {QUICK_EMOJIS.map((emoji, idx) => (
                    <Tip key={emoji} label={`React ${emoji}`} side="top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetId = message.id || message.tempId;
                          if (socket && user && targetId) {
                            socket.emit('chat:react', { roomId, messageId: targetId, emoji });
                          }
                          setShowActions(false);
                        }}
                        className={cn(
                          "w-5 h-5 md:w-6 md:h-6 flex items-center justify-center text-xs md:text-sm rounded-full hover:scale-130 active:scale-95 hover:bg-white/10 transition-transform",
                          idx >= 4 && "hidden sm:flex"
                        )}
                      >
                        {emoji}
                      </button>
                    </Tip>
                  ))}
                </div>

                {/* 2. More Reactions (SmilePlus / +) with anchored popover */}
                <div className="relative">
                  <EmojiPickerPopover
                    isOpen={showPicker}
                    onOpenChange={setShowPicker}
                    onClose={() => setShowPicker(false)}
                    onSelect={(emoji) => {
                      const targetId = message.id || message.tempId;
                      if (socket && user && targetId) {
                        socket.emit('chat:react', { roomId, messageId: targetId, emoji });
                      }
                      setShowPicker(false);
                      setShowActions(false);
                    }}
                    align={isOwn ? 'right' : 'left'}
                  >
                    <button
                      type="button"
                      title="More reactions"
                      aria-label="More reactions"
                      className={cn(
                        "w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-purple-500/20 transition-all cursor-pointer",
                        showPicker && "text-purple-300 bg-purple-500/25 ring-1 ring-purple-400/50"
                      )}
                    >
                      <SmilePlus size={13} />
                    </button>
                  </EmojiPickerPopover>
                </div>

                <div className="w-px h-3.5 bg-white/10 mx-0.5" />

                {/* 3. Explain / Ask AI */}
                {!isAi && message.text && !message.text.trim().startsWith('@ai') && !message.text.trim().startsWith('/ai') && (() => {
                  const raw = message.text.trim();
                  const isGreetingMsg = /^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(raw) || raw.length <= 4;
                  return (
                    <Tip label={isGreetingMsg ? "Ask StudyBuddy AI" : "Explain with AI"} side="top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent('studix:ai-explain', { detail: { message } }));
                          toast.info(isGreetingMsg ? 'Asking StudyBuddy AI...' : 'Asking StudyBuddy AI to explain...');
                          setShowActions(false);
                        }}
                        className="h-6 px-2 sm:px-2.5 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center gap-1 text-purple-200 hover:text-white hover:bg-purple-500/25 transition-all text-[10.5px] font-medium shrink-0 active:scale-95"
                      >
                        <StudyBuddyIcon size={12} variant="gradient" />
                        <span className="text-[10px] sm:text-[10.5px]">{isGreetingMsg ? 'Ask AI' : 'Explain'}</span>
                      </button>
                    </Tip>
                  );
                })()}

                {/* 4. Copy */}
                <Tip label="Copy text" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                      setShowActions(false);
                    }}
                    className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Copy size={11} />
                  </button>
                </Tip>

                {/* 5. Reply */}
                <Tip label="Reply to message" side="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('studix:action', {
                        detail: { action: 'msg-reply', message }
                      }));
                      setShowActions(false);
                    }}
                    className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Reply size={11} />
                  </button>
                </Tip>

                {/* 6. Edit */}
                {isOwn && message.type === 'text' && (
                  <Tip label="Edit message" side="top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart();
                        setShowActions(false);
                      }}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 size={11} />
                    </button>
                  </Tip>
                )}

                {/* 7. Delete */}
                {(isOwn || canDelete) && (
                  <Tip label="Delete message" side="top">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                        setShowActions(false);
                      }}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </Tip>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="mt-1">
          <MessageReactions 
            messageId={message.id || message.tempId || ''} 
            roomId={roomId} 
            reactions={message.reactions}
            reactionUsers={message.reactionUsers}
            socket={socket}
            isHovered={showActions}
            isOwn={isOwn}
          />
        </div>
      </div>

    </motion.div>
  );
});
