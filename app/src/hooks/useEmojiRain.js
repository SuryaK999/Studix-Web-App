import { useCallback } from 'react';

/**
 * Emoji rain hook — disabled per user request.
 * Returns a no-op so existing call sites don't break.
 */
export function useEmojiRain() {
  const triggerEmojiRain = useCallback((_emoji, _x, _y) => {
    // Confetti removed per user request — no-op
  }, []);

  return { triggerEmojiRain };
}
