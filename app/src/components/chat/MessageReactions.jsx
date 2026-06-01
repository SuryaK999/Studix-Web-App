import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRoomPresence } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Emoji categories (WhatsApp-style grid) ─────────────────────────── */
const EMOJI_CATEGORIES = [
  {
    name: 'Quick',
    icon: '⚡',
    emojis: ['👍', '❤️', '😂', '😮', '🎉', '🔥', '😢', '🙏', '👏', '🤔', '😍', '💯', '✅', '👀', '🤣', '😊'],
  },
  {
    name: 'Smileys',
    icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗',
      '😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶',
      '😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵',
      '🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲',
      '😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
      '🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👹','👺','👻','👽','👾','🤖',
    ],
  },
  {
    name: 'Gestures',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
      '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪',
    ],
  },
  {
    name: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
      '💘','💝','🫶',
    ],
  },
  {
    name: 'Animals',
    icon: '🐱',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
      '🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🦋','🐌',
      '🐞','🐜',
    ],
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: [
      '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🍆',
      '🥑','🌽','🍕','🍔','🍟','🌭','🍿','🍳','🍞','🥐','🍝','🍜','🍣','🍩','🍪','🎂',
      '🍰','🧁','🍫','🍬','🍭','☕','🍵','🧋','🍺','🍻','🥂','🍷',
    ],
  },
  {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🏸','⛳','🏹','🥊','🎽','🛹','🎿','🏂',
      '🎯','🎲','🧩','🎮','🎰','🎳',
    ],
  },
  {
    name: 'Symbols',
    icon: '⭐',
    emojis: [
      '⭐','🌟','✨','💫','🔥','💥','🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','✅','❌',
      '❓','❗','💯','💤','💬','💭','♻️','⚠️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪',
    ],
  },
];

const DEBOUNCE_MS = 200;

export const MessageReactions = memo(function MessageReactions({
  messageId, roomId, reactions = {}, reactionUsers = {}, socket,
  forcePickerOpen = false, onPickerClose, isOwn = false
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  // Sync picker with external trigger (hover smiley button)
  useEffect(() => {
    if (forcePickerOpen && !showPicker) setShowPicker(true);
  }, [forcePickerOpen]);

  // Listen for radial menu trigger
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.open) setShowPicker(true);
    };
    window.addEventListener(`studix:react:${messageId}`, handler);
    return () => window.removeEventListener(`studix:react:${messageId}`, handler);
  }, [messageId]);

  const [optimisticReactions, setOptimisticReactions] = useState(reactions);
  const [optimisticReactionUsers, setOptimisticReactionUsers] = useState(reactionUsers);
  const { user } = useAuth();
  const presence = useRoomPresence(roomId);
  const pickerRef = useRef(null);
  const debounceRef = useRef(null);
  const pendingRef = useRef(false);

  // Sync optimistic state with server state
  useEffect(() => {
    setOptimisticReactions(reactions);
    setOptimisticReactionUsers(reactionUsers);
  }, [reactions, reactionUsers]);

  // Listen for react errors to rollback
  useEffect(() => {
    if (!socket) return;
    const handleReactError = ({ messageId: errMsgId }) => {
      if (errMsgId === messageId) {
        setOptimisticReactions(reactions);
      }
    };
    socket.on('chat:react_error', handleReactError);
    return () => { socket.off('chat:react_error', handleReactError); };
  }, [socket, messageId, reactions]);

  // Outside-click to close emoji picker
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [showPicker]);

  // ── Single-reaction-per-user toggle (WhatsApp-style) ──
  const toggleReaction = useCallback((emoji) => {
    if (!user || !socket || pendingRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = true;
    debounceRef.current = setTimeout(() => { pendingRef.current = false; }, DEBOUNCE_MS);

    let currentEmoji = null;
    for (const [key, users] of Object.entries(optimisticReactions)) {
      if (users.includes(user.uid)) {
        currentEmoji = key;
        break;
      }
    }

    setOptimisticReactions(prev => {
      const updated = {};
      for (const [key, users] of Object.entries(prev)) {
        const filtered = users.filter(uid => uid !== user.uid);
        if (filtered.length > 0) updated[key] = filtered;
      }

      if (currentEmoji !== emoji) {
        if (!updated[emoji]) updated[emoji] = [];
        updated[emoji] = [...updated[emoji], user.uid];
        setOptimisticReactionUsers(pu => ({ ...pu, [user.uid]: user.displayName || 'You' }));
      } else {
        setOptimisticReactionUsers(pu => {
          const next = { ...pu };
          delete next[user.uid];
          return next;
        });
      }

      return updated;
    });

    socket.emit('chat:react', { roomId, messageId, emoji });
    onPickerClose?.();
    setShowPicker(false);
  }, [user, socket, optimisticReactions, roomId, messageId, onPickerClose]);

  const myReaction = user
    ? Object.entries(optimisticReactions).find(([, users]) => users.includes(user.uid))?.[0] ?? null
    : null;

  const getReactorNames = useCallback((users) => {
    if (!user) return '';
    const names = users.map(uid => {
      if (uid === user.uid) return 'You';
      return optimisticReactionUsers[uid] || presence[uid]?.displayName || 'Unknown User';
    });
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
  }, [user, presence, optimisticReactionUsers]);

  return (
    <div className="relative" ref={pickerRef}>
      <button 
        data-reaction-area="1" 
        onClick={() => setShowPicker(true)} 
        className="hidden" 
        aria-hidden="true" 
      />
      <div className={cn("flex items-center gap-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
        {/* ── Existing reaction badges (always visible) ── */}
        {Object.entries(optimisticReactions).map(([emoji, users]) => {
          if (users.length === 0) return null;
          const hasReacted = user && users.includes(user.uid);

          return (
            <Tooltip key={emoji}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleReaction(emoji)}
                  aria-label={`React with ${emoji}`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    hasReacted
                      ? 'bg-primary/20 text-white ring-1 ring-primary/40'
                      : 'bg-[#1C1F2E] text-[#A1A3AB] border border-[#2A2D3E] hover:bg-[#252839]'
                  }`}
                >
                  <motion.span
                    key={`${emoji}-${users.length}`}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    {emoji}
                  </motion.span>
                  <span>{users.length}</span>
                </motion.button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-popover/95 backdrop-blur-xl border-border text-popover-foreground text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl"
              >
                {getReactorNames(users)}
              </TooltipContent>
            </Tooltip>
          );
        })}

      </div>

      {/* ── Full emoji picker (WhatsApp-style) ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
              "absolute bottom-full mb-3 bg-[#0c0c14]/95 backdrop-blur-2xl border border-white/[0.05] shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-50 overflow-hidden",
              isOwn ? "right-0" : "left-0"
            )}
            style={{ width: 'min(300px, 85vw)', borderRadius: '24px' }}
          >
            {/* Category tabs - WhatsApp Style */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.03] bg-white/[0.01] overflow-x-auto scrollbar-none">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(idx)}
                  className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl text-base transition-all duration-200 ${
                    activeCategory === idx
                      ? 'bg-primary/20 text-white shadow-lg shadow-primary/10'
                      : 'opacity-40 hover:opacity-100'
                  }`}
                  title={cat.name}
                >
                  <span className={cn("transition-transform duration-200", activeCategory === idx && "scale-110")}>
                    {cat.icon}
                  </span>
                </button>
              ))}
            </div>


            <div className="px-2 pb-3 max-h-[220px] overflow-y-auto mt-2" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-7 gap-1">
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.4 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => toggleReaction(emoji)}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl text-2xl transition-all duration-200",
                      myReaction === emoji ? "bg-primary/10" : "bg-transparent"
                    )}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
