import { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useUsersStore } from '@/store/usersStore';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { QUICK_EMOJIS, EMOJI_CATEGORIES } from './emojiData';
export { QUICK_EMOJIS, EMOJI_CATEGORIES };

const DEBOUNCE_MS = 200;

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';

/**
 * High-performance, categorized Emoji Picker Grid.
 */
export const EmojiPickerContent = memo(function EmojiPickerContent({
  onSelect,
  myReaction = null,
}) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-[300px] max-w-[calc(100vw-32px)] bg-[#0e0f17]/98 backdrop-blur-2xl border border-purple-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden select-none"
    >
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2.5 py-1.5 border-b border-white/[0.06] bg-white/[0.02] overflow-x-auto no-scrollbar">
        {EMOJI_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCategory(idx);
            }}
            className={cn(
              'w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-sm transition-all',
              activeCategory === idx
                ? 'bg-purple-500/20 text-white shadow-sm ring-1 ring-purple-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5 opacity-60 hover:opacity-100'
            )}
            title={cat.name}
          >
            <span className={cn('transition-transform', activeCategory === idx && 'scale-110')}>
              {cat.icon}
            </span>
          </button>
        ))}
      </div>

      {/* Emojis grid */}
      <div
        className="p-2 max-h-[200px] overflow-y-auto no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="grid grid-cols-7 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(emoji);
              }}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-xl text-xl hover:scale-125 hover:bg-white/10 active:scale-95 transition-transform duration-150',
                myReaction === emoji && 'bg-purple-500/25 ring-1 ring-purple-400/50'
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

EmojiPickerContent.propTypes = {
  onSelect: PropTypes.func.isRequired,
  myReaction: PropTypes.string,
};

/**
 * Portaled, collision-aware Discord/Telegram-grade Emoji Picker Popover.
 * Uses Radix UI Popover to render outside scroll containers and automatically flip.
 */
export const EmojiPickerPopover = memo(function EmojiPickerPopover({
  isOpen,
  onOpenChange,
  onClose,
  onSelect,
  align = 'right',
  myReaction = null,
  children,
}) {
  const handleOpenChange = useCallback((open) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (!open) {
      onClose?.();
    }
  }, [onOpenChange, onClose]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <PopoverTrigger asChild>{children}</PopoverTrigger>
      ) : (
        <PopoverAnchor className="inline-block" />
      )}
      <PopoverContent
        side="top"
        align={align === 'right' ? 'end' : 'start'}
        sideOffset={8}
        collisionPadding={12}
        className="w-auto p-0 border-0 bg-transparent shadow-none z-[100]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <EmojiPickerContent onSelect={onSelect} myReaction={myReaction} />
      </PopoverContent>
    </Popover>
  );
});

EmojiPickerPopover.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  align: PropTypes.oneOf(['left', 'right']),
  myReaction: PropTypes.string,
  children: PropTypes.node,
};

/**
 * Message Reactions Component:
 * Displays reaction pills under the message, allows toggling, and provides
 * an inline "+" button to open the deterministically-anchored emoji picker.
 */
export const MessageReactions = memo(function MessageReactions({
  messageId,
  roomId,
  reactions = {},
  reactionUsers = {},
  socket,
  forcePickerOpen = false,
  onPickerClose,
  isOwn = false,
}) {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState(null);

  const pickerAnchorRef = useRef(null);
  const debounceRef = useRef(null);
  const pendingRef = useRef(false);

  const isPickerOpen = showPicker || forcePickerOpen;

  const closePicker = useCallback(() => {
    setShowPicker(false);
    onPickerClose?.();
  }, [onPickerClose]);

  // Listen for radial menu trigger
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.open) setShowPicker(true);
    };
    window.addEventListener(`studix:react:${messageId}`, handler);
    return () => {
      window.removeEventListener(`studix:react:${messageId}`, handler);
    };
  }, [messageId]);

  // Listen for react errors to rollback
  useEffect(() => {
    if (!socket) return;
    const handleReactError = ({ messageId: errMsgId }) => {
      if (errMsgId === messageId) {
        setPendingEmoji(null);
      }
    };
    socket.on('chat:react_error', handleReactError);
    return () => {
      socket.off('chat:react_error', handleReactError);
    };
  }, [socket, messageId]);

  // Defensively normalize reactions prop to key -> string[] dictionary
  const normalizedReactions = useMemo(() => {
    if (!reactions || typeof reactions !== 'object') return {};

    if (Array.isArray(reactions)) {
      const map = {};
      for (const item of reactions) {
        if (item && item.emoji && Array.isArray(item.users)) {
          map[item.emoji] = item.users;
        }
      }
      return map;
    }

    const map = {};
    for (const [key, users] of Object.entries(reactions)) {
      if (Array.isArray(users)) {
        map[key] = users;
      }
    }
    return map;
  }, [reactions]);

  // Derive effective reactions with optimistic local toggle
  const effectiveReactions = useMemo(() => {
    if (!pendingEmoji || !user) return normalizedReactions;

    const updated = {};
    for (const [key, users] of Object.entries(normalizedReactions)) {
      const filtered = users.filter((uid) => uid !== user.uid);
      if (filtered.length > 0) updated[key] = filtered;
    }

    const hadReaction = Boolean(normalizedReactions[pendingEmoji]?.includes(user.uid));
    if (!hadReaction) {
      if (!updated[pendingEmoji]) updated[pendingEmoji] = [];
      updated[pendingEmoji] = [...updated[pendingEmoji], user.uid];
    }

    return updated;
  }, [normalizedReactions, pendingEmoji, user]);

  // ── Single-reaction-per-user toggle (Discord/WhatsApp-style) ──
  const toggleReaction = useCallback((emoji) => {
    if (!user || !socket || pendingRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = true;
    debounceRef.current = setTimeout(() => {
      pendingRef.current = false;
    }, DEBOUNCE_MS);

    setPendingEmoji(emoji);
    socket.emit('chat:react', { roomId, messageId, emoji });
    closePicker();
  }, [user, socket, roomId, messageId, closePicker]);

  const myReaction = user
    ? Object.entries(effectiveReactions).find(([, users]) => Array.isArray(users) && users.includes(user.uid))?.[0] ?? null
    : null;

  const getReactorNames = useCallback((users) => {
    if (!user || !Array.isArray(users) || users.length === 0) return '';
    const storeUsers = useUsersStore.getState().users || {};

    const names = users.map((uid) => {
      if (uid === user.uid) return 'You';
      return (
        reactionUsers?.[uid] ||
        storeUsers[uid]?.displayName ||
        storeUsers[uid]?.name ||
        storeUsers[uid]?.username ||
        'Member'
      );
    });

    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
  }, [user, reactionUsers]);

  const hasAnyReactions = Object.values(effectiveReactions).some((u) => Array.isArray(u) && u.length > 0);

  if (!hasAnyReactions && !isPickerOpen) {
    return (
      <div className="relative inline-block" ref={pickerAnchorRef}>
        {/* Hidden button for backwards compatibility with DOM triggers */}
        <button
          data-reaction-area="1"
          onClick={() => setShowPicker(true)}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={pickerAnchorRef}>
      <button
        data-reaction-area="1"
        onClick={() => setShowPicker(true)}
        className="hidden"
        aria-hidden="true"
      />

      <div className={cn('flex items-center gap-1.5 flex-wrap', isOwn ? 'justify-end' : 'justify-start')}>
        {/* ── Existing reaction badges ── */}
        {Object.entries(effectiveReactions).map(([emoji, users]) => {
          if (!Array.isArray(users) || users.length === 0) return null;
          const hasReacted = Boolean(user && users.includes(user.uid));

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleReaction(emoji)}
                  aria-label={`React with ${emoji}`}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all duration-150 select-none border',
                    hasReacted
                      ? 'bg-purple-600/25 text-purple-200 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : 'bg-[#181926]/90 text-zinc-300 border-white/[0.08] hover:bg-[#202234] hover:text-white'
                  )}
                >
                  <motion.span
                    key={`${emoji}-${users.length}`}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    {emoji}
                  </motion.span>
                  <span className="text-[11px] font-mono">{users.length}</span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-[#0e0f17]/95 backdrop-blur-xl border border-white/10 text-white text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl"
              >
                {getReactorNames(users)}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Inline "+" button to quickly add reaction when badges are already present */}
        {hasAnyReactions && (
          <EmojiPickerPopover
            isOpen={isPickerOpen}
            onOpenChange={setShowPicker}
            onClose={closePicker}
            onSelect={toggleReaction}
            align={isOwn ? 'right' : 'left'}
            myReaction={myReaction}
          >
            <button
              type="button"
              title="Add reaction"
              className="w-6 h-6 rounded-full bg-[#181926]/80 border border-white/[0.08] hover:border-purple-500/40 hover:bg-purple-500/15 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-xs cursor-pointer"
            >
              <Plus size={12} />
            </button>
          </EmojiPickerPopover>
        )}
      </div>

      {!hasAnyReactions && isPickerOpen && (
        <EmojiPickerPopover
          isOpen={isPickerOpen}
          onOpenChange={setShowPicker}
          onClose={closePicker}
          onSelect={toggleReaction}
          align={isOwn ? 'right' : 'left'}
          myReaction={myReaction}
        />
      )}
    </div>
  );
});

MessageReactions.propTypes = {
  messageId: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired,
  reactions: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  reactionUsers: PropTypes.object,
  socket: PropTypes.object,
  forcePickerOpen: PropTypes.bool,
  onPickerClose: PropTypes.func,
  isOwn: PropTypes.bool,
};
