import { useState, useRef, useCallback, useEffect } from 'react';
import { generateExecutiveChatSummary, generateAiStudyResponse } from '@/services/aiService';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function useChatAiStudy({
  roomId,
  roomName,
  messages,
  setMessages,
  socket,
  sendMessage,
  scrollToBottom,
}) {
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const aiTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Clean up any pending AI response timeout
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  // AI Mention Detection (@ai, @studybuddy, /ai, ai:)
  const triggerAiStudyBuddyResponse = useCallback((trimmed, currentMessages, originalTempId, userName) => {
    const isAiQuery = /(@ai|@studybuddy|\/ai|^ai:)/i.test(trimmed);
    if (!isAiQuery || !socket) return;

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    aiTimeoutRef.current = setTimeout(async () => {
      try {
        const aiText = await generateAiStudyResponse(trimmed, currentMessages);
        if (!isMountedRef.current) return;

        const aiTempId = `ai-${Date.now()}`;
        const aiPayload = {
          tempId:         aiTempId,
          type:           'text',
          text:           aiText,
          senderId:       'ai-studybuddy',
          senderName:     'StudyBuddy AI',
          senderUsername: 'studybuddy',
          isAi:           true,
          reactions:      {},
          replyTo: {
            id:         originalTempId,
            text:       trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed,
            senderName: userName || 'Anonymous',
          },
          createdAt:      new Date().toISOString(),
        };

        setMessages(prev => [...prev, { id: aiTempId, ...aiPayload }]);
        socket.emit('chat:send', { roomId, message: aiPayload });
        setTimeout(() => scrollToBottom?.('smooth'), 100);
      } catch (err) {
        if (isMountedRef.current) {
          logger.error('Failed to generate AI response in chat', 'useChatAiStudy', err);
        }
      }
    }, 500);
  }, [socket, roomId, setMessages, scrollToBottom]);

  // Contextual AI assistance triggered from message items
  useEffect(() => {
    const handleAiExplain = (e) => {
      const msg = e.detail?.message;
      if (!msg || !msg.text) return;

      // Clean off existing prompt prefixes and quotation wraps
      const cleanText = msg.text
        .replace(/^@ai\s*/gi, '')
        .replace(/^@studybuddy\s*/gi, '')
        .replace(/^\/ai\s*/gi, '')
        .replace(/^Explain this concept clearly with examples:\s*"?/gi, '')
        .replace(/^Help analyze and debug this code\/error:\s*"?/gi, '')
        .replace(/^Help answer and break down this question for our study group:\s*"?/gi, '')
        .replace(/^Explain:\s*"?/gi, '')
        .replace(/^"?\s*$/g, '')
        .replace(/"\s*$/g, '')
        .trim();

      if (!cleanText) return;

      const isGreeting = /^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(cleanText) || cleanText.length <= 4;
      const isQuestion = cleanText.endsWith('?') || /^(what|how|why|when|where|which|who|can|does|is|are)\b/i.test(cleanText);
      const isCode = /[{};=>]|\b(function|const|let|var|class|import|return|error|traceback|def)\b/i.test(cleanText);

      let query;
      if (isGreeting) {
        query = '@ai Hey! Greet our study room and suggest a few great topics we can study together today!';
      } else if (isCode) {
        query = `@ai Help analyze and debug this code/error: "${cleanText.slice(0, 160)}"`;
      } else if (isQuestion) {
        query = `@ai Help answer this question for our study group: "${cleanText.slice(0, 160)}"`;
      } else {
        query = `@ai Explain: "${cleanText.slice(0, 160)}"`;
      }

      sendMessage(query);
    };

    window.addEventListener('studix:ai-explain', handleAiExplain);
    return () => {
      window.removeEventListener('studix:ai-explain', handleAiExplain);
    };
  }, [sendMessage]);

  // Executive summary generation
  const generateSummary = useCallback(async () => {
    setIsSummarizing(true);
    setShowSummaryModal(true);
    try {
      const summaryResult = await generateExecutiveChatSummary({
        messages,
        roomName,
      });
      if (!isMountedRef.current) return;
      setSummary(summaryResult);
    } catch (err) {
      if (!isMountedRef.current) return;
      logger.error('Failed to generate AI summary', 'useChatAiStudy', err);
      setSummary('Unable to synthesize discussion at this time. Please check your network and try again.');
      toast.error('Could not generate chat summary');
    } finally {
      if (isMountedRef.current) {
        setIsSummarizing(false);
      }
    }
  }, [messages, roomName]);

  return {
    showSummaryModal,
    setShowSummaryModal,
    summary,
    isSummarizing,
    generateSummary,
    triggerAiStudyBuddyResponse,
  };
}
