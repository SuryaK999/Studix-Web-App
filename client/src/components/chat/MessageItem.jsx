import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Copy, Edit2, Trash2, Reply, SmilePlus,
  Bot, Clock, CheckCircle2, AlertCircle, FileText, Download, Play, Pause, ExternalLink,
  MessageSquare, Sparkles
} from 'lucide-react';
import { cn, getServerUrl } from '@/lib/utils';

import { MessageReactions } from './MessageReactions';
import { VoiceMessage } from './VoiceMessage';
import { getVoiceUrl } from '@/services/voiceStorageService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useUsersStore } from '@/store/usersStore';

export const MessageItem = memo(function MessageItem({
  message, isOwn, isFirstInGroup, isLastInGroup, onEdit, onDelete, roomId, socket,
}) {
  const users = useUsersStore(state => state.users);
  const realUser = users[message.senderId];
  const isAi = message.isAi || message.senderId === 'ai-studybuddy' || message.senderName?.toLowerCase().includes('studybuddy');
  const displayName = isAi ? 'StudyBuddy AI' : (realUser?.displayName || realUser?.name || message.senderName || 'Anonymous');
  const photoURL = realUser?.photoURL || realUser?.avatarUrl || message.senderPhotoURL || undefined;
  const uniqueId = isAi ? 'studybuddy' : (realUser?.username || realUser?.uniqueId || message.senderUsername || null);

  const [showActions, setShowActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const editInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

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

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
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
    onDelete?.(message.id);
  }, [onDelete, message.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      const action = (e).detail?.action;
      if (action === 'msg-copy') handleCopy();
      if (action === 'msg-edit') handleEditStart();
      if (action === 'msg-delete') handleDelete();
      if (action === 'msg-reply') {
        window.dispatchEvent(new CustomEvent('studix:action', {
          detail: { action: 'msg-reply', message }
        }));
      }
      if (action === 'msg-react') {
        
        window.dispatchEvent(new CustomEvent(`studix:react:${message.id}`, { detail: { open: true } }));
      }
    };

    el.addEventListener('radial-action', handler);
    return () => el.removeEventListener('radial-action', handler);
  }, [handleCopy, handleEditStart, handleDelete, message]);

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
          <VoiceMessage audioUrl={audioSrc} duration={message.voice?.duration || message.fileDuration} />
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
            <div className="space-y-2 text-[14.2px] leading-relaxed pr-14">
              {message.text.split('\n\n').map((para, i) => {
                const trimmed = para.trim();
                if (trimmed.startsWith('### ')) {
                  return (
                    <h4 key={i} className="text-[13.5px] font-bold text-purple-300 mt-2 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      {trimmed.replace(/^###\s+/, '')}
                    </h4>
                  );
                }
                if (trimmed.startsWith('```')) {
                  const code = trimmed.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
                  return (
                    <pre key={i} className="bg-black/40 border border-purple-500/20 rounded-lg p-2.5 text-xs font-mono text-purple-200 overflow-x-auto my-1.5">
                      <code>{code}</code>
                    </pre>
                  );
                }
                return (
                  <p key={i} className="whitespace-pre-wrap">
                    {trimmed.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, j) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                      }
                      if (part.startsWith('`') && part.endsWith('`')) {
                        return <code key={j} className="bg-black/30 text-purple-300 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
                      }
                      return part;
                    })}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="text-[14.2px] leading-relaxed pr-14 whitespace-pre-wrap">{message.text}</p>
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
      data-message-id={message.id}
      data-message-own={isOwn ? '1' : '0'}
      data-radial-text={message.text || (message.type === 'voice' ? 'Voice Message' : message.fileName ? `File: ${message.fileName}` : '')}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="w-9 h-9 flex-shrink-0 relative">
        {isFirstInGroup && !isOwn && (
          <Avatar className={cn(
            "h-9 w-9 shadow-md shrink-0 animate-in zoom-in-50 duration-300",
            isAi ? "border border-purple-500/50 shadow-purple-500/20" : "border border-white/[0.08]"
          )}>
            {isAi ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white">
                <Bot className="w-5 h-5 text-white" />
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

      <div className={cn("flex flex-col max-w-[85%] md:max-w-[70%]", isOwn ? "items-end" : "items-start")}>
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
              <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-300 text-[9px] font-black uppercase tracking-widest border border-purple-500/40 shrink-0 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI TUTOR
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
            className={cn(
              "px-4 py-2.5 rounded-2xl relative shadow-sm border transition-all duration-300",
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
                    {format(new Date(message.createdAt), 'h:mm a')}
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

            {!isEditing && showActions && (
              <div className={cn(
                "absolute top-[-10px] flex items-center gap-1.5 z-30",
                isOwn ? "left-[-10px]" : "right-[-10px]"
              )}>
                {!isAi && message.text && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.dispatchEvent(new CustomEvent('studix:ai-explain', { detail: { message } }));
                      toast.info('Asking StudyBuddy AI to explain...');
                    }}
                    title="Explain with StudyBuddy AI"
                    className="h-6 px-2 rounded-full bg-[#1e1f2b] border border-purple-500/40 flex items-center gap-1 text-purple-300 hover:text-white hover:bg-purple-600/40 transition-all duration-200 shadow-xl text-[10px] font-medium"
                  >
                    <Sparkles size={11} className="text-purple-400" />
                    <span>Explain</span>
                  </button>
                )}
                <button
                  data-reaction-trigger="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const reactionArea = containerRef.current?.querySelector('[data-reaction-area]');
                    (reactionArea)?.click();
                  }}
                  className="w-6 h-6 rounded-full bg-[#1e1f2b] border border-white/10 flex items-center justify-center text-[#8e9297] hover:text-white hover:bg-primary/20 hover:border-primary/30 transition-all duration-200 shadow-xl"
                >
                  <SmilePlus size={14} />
                </button>
              </div>
            )}
          </div>

        </div>

        <div className="mt-1">
          <MessageReactions 
            messageId={message.id} 
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
