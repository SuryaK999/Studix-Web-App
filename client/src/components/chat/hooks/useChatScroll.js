import { useRef, useState, useCallback, useEffect } from 'react';

const PAGE_SIZE = 50;

export function useChatScroll(messages, loadingOlder = false) {
  const scrollRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const prevScrollHeightRef = useRef(0);

  const getViewport = useCallback(() => {
    return scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') ?? null;
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const scrollContainer = getViewport();
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior,
      });
    }
  }, [getViewport]);

  const handleScroll = useCallback(() => {
    const scrollContainer = getViewport();
    if (!scrollContainer) return;

    const isAtBottom =
      scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
    setShowScrollBottom(!isAtBottom);
  }, [getViewport]);

  useEffect(() => {
    const scrollContainer = getViewport();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [getViewport, handleScroll]);

  // Adjust scroll position after prepending older messages
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    if (loadingOlder) {
      prevScrollHeightRef.current = viewport.scrollHeight;
    } else if (prevScrollHeightRef.current > 0) {
      const addedHeight = viewport.scrollHeight - prevScrollHeightRef.current;
      viewport.scrollTop += addedHeight;
      prevScrollHeightRef.current = 0;
    }
  }, [loadingOlder, getViewport]);

  // Auto-scroll on incoming or sent messages
  useEffect(() => {
    if (messages.length > 0 && !loadingOlder && prevScrollHeightRef.current === 0) {
      const scrollContainer = getViewport();
      if (!scrollContainer) return;

      const isNearBottom =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 250;

      if (messages.length <= PAGE_SIZE || isNearBottom) {
        scrollToBottom(messages.length <= PAGE_SIZE ? 'auto' : 'smooth');
      }
    }
  }, [messages.length, loadingOlder, getViewport, scrollToBottom]);

  return {
    scrollRef,
    showScrollBottom,
    scrollToBottom,
    handleScroll,
  };
}
