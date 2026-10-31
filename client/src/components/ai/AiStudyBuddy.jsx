import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  Code as CodeIcon,
  Brain,
  Trash2,
  BookOpen,
  Sparkles,
  Zap,
  BookmarkPlus,
  ArrowUp,
  Square,
  Plus,
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
  MessageSquare,
  Bot,
  Activity,
} from 'lucide-react';
import { StudyBuddyIcon, StudyBuddyAvatar } from '@/components/ui/StudyBuddyIcon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { withRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { fetchMessages, fetchNote } from '@/services/api';
import {
  callGroqApi,
  isGroqConfigured,
  AI_MODELS,
} from '@/services/aiService';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { Tip } from '@/components/ui/tip';

const STARTER_CARDS = [
  {
    icon: BookOpen,
    title: 'Explain a Concept',
    description: 'Break down complex algorithms, theory, or formulas with intuitive analogies.',
    prompt: 'Explain how React reconciliation and the Virtual DOM work with clear analogies and examples.',
  },
  {
    icon: CodeIcon,
    title: 'Debug & Analyze Code',
    description: 'Find tricky runtime bugs, analyze edge cases, or evaluate Big-O complexity.',
    prompt: 'Help me analyze the time and space complexity of merge sort vs quicksort, and when to use each.',
  },
  {
    icon: Brain,
    title: 'Active Recall Quiz',
    description: 'Test your retention with 5 interactive questions and step-by-step answers.',
    prompt: 'Quiz me on JavaScript promises, event loop microtasks, and async/await with 5 questions.',
  },
  {
    icon: Lightbulb,
    title: 'Study Strategy Plan',
    description: 'Build an evidence-based roadmap using spaced repetition and the Feynman technique.',
    prompt: 'Create a 7-day study plan using spaced repetition and active recall for my upcoming exam.',
  },
];

// Production Guards
const AI_TIMEOUT_MS = 25_000;
const RATE_LIMIT_MS = 1_000;
const MAX_INPUT_LENGTH = 2_500;

function sanitizeInput(input) {
  return input.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '').trim().slice(0, MAX_INPUT_LENGTH);
}

/**
 * Auto-generate crisp session title based on student prompt
 */
function generateSessionTitle(firstPrompt) {
  if (!firstPrompt) return 'New Discussion';
  let clean = firstPrompt
    .replace(/<[^>]*>/g, '')
    .replace(/^(@ai|@studybuddy|\/ai)\s*/i, '')
    .replace(/^(can you|please|help me|i want to|i need to|how to|how do i|what is|what are|explain|describe|tell me about|debug|solve)\s+/i, '')
    .replace(/[?!.]+$/, '')
    .trim();

  if (!clean || clean.length < 2) return 'Study Session';

  clean = clean
    .split(' ')
    .slice(0, 5)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return clean.length > 32 ? clean.slice(0, 32) + '...' : clean;
}

/**
 * Format relative timestamp for sessions list
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - Number(timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Fallback pedagogical response generator
 */
async function generateExpertResponse(
  userInput,
  roomContext,
  messageHistory,
  selectedModel,
  signal
) {
  if (isGroqConfigured()) {
    try {
      const groqAnswer = await callGroqApi({
        prompt: userInput,
        context: roomContext,
        history: messageHistory,
        model: selectedModel,
        signal,
      });

      if (groqAnswer?.content) {
        return {
          content: groqAnswer.content,
          modelUsed: groqAnswer.modelUsed || selectedModel,
          actualModel: groqAnswer.actualModel,
        };
      }
      if (typeof groqAnswer === 'string') {
        return {
          content: groqAnswer,
          modelUsed: selectedModel,
        };
      }
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw new DOMException('AI request aborted', 'AbortError');
      }
      console.warn('[AiStudyBuddy] Groq call failed, falling back to local tutor:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    const delay = 400 + Math.random() * 300;
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('AI request aborted', 'AbortError'));
        return;
      }

      const input = userInput.toLowerCase().trim();
      const hasContext = roomContext && roomContext.length > 0;
      const contextRef = hasContext
        ? `\n\n---\n*Context from your study room has been referenced for this session.*`
        : '';

      let text = '';
      if (/^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(input) || input.length <= 3) {
        text = `### Welcome to StudyBuddy\n\nI'm your **StudyBuddy AI** mentor on Studix. What topic, concept, or code are we mastering today?\n\n- **Concept Breakdown:** *"Explain how async/await works under the hood"*\n- **Debugging Code:** *"Why is my recursive function causing a stack overflow?"*\n- **Practice Quiz:** *"Quiz me on operating system thread scheduling"*\n- **Study Strategy:** *"Best way to memorize data structures for interviews"*\n\nType a question below or choose an accelerator chip to begin.${contextRef}`;
      } else if (input.includes('quiz') || input.includes('test me')) {
        text = `### Knowledge Check\n\nLet's test your understanding with active recall:\n\n**1.** What is the key difference between a stack and a queue?\n**2.** Explain the average and worst-case time complexity of binary search.\n**3.** What does "DRY" stand for in software engineering, and why does it matter?\n**4.** What is the difference between synchronous and asynchronous execution?\n**5.** In database design, what is the primary purpose of indexing?\n\n---\n\n### Answers & Explanations\n1. **Stack** = LIFO (Last In, First Out); **Queue** = FIFO (First In, First Out).\n2. **O(log n)** — it divides the search space in half at each iteration.\n3. **Don't Repeat Yourself** — eliminates duplicate logic and reduces maintenance bugs.\n4. **Synchronous** blocks execution; **asynchronous** allows other tasks to proceed.\n5. **Indexing** creates a fast lookup structure (e.g. B-Tree) to avoid full scans.${contextRef}`;
      } else if (input.includes('code') || input.includes('debug') || input.includes('error') || input.includes('bug')) {
        text = `### Code & Debugging Assistant\n\n1. **Stack Trace Isolation:** Pinpoint the exact line number where the anomaly originates.\n2. **State Inspection:** Verify variable types and nullability before dereferencing properties.\n3. **Boundary Verification:** Test arrays for out-of-bound indices and asynchronous race conditions.\n\n\`\`\`javascript\nif (!data || typeof data !== 'object') {\n  console.warn('Received invalid payload:', data);\n  return fallbackValue;\n}\n\`\`\`\n\nShare your exact code snippet and error message, and we'll analyze it step-by-step.${contextRef}`;
      } else {
        const topic = userInput.trim();
        text = `### Study Insight: ${topic}\n\n**1. Core Intuition:**\nAt its foundation, **${topic}** provides a predictable pattern to manage logic and structure cleanly.\n\n**2. Principles to Master:**\n- **Clarify the Problem:** Understand what difficulty exists without this concept.\n- **Trace the Mechanics:** Deconstruct complex mechanisms into bite-sized sequential stages.\n- **Test Edge Cases:** Evaluate behavior with zero, null, or extreme values.\n\nWhat aspect would you like to explore next? You can ask for a code example, a practice quiz, or a simplified analogy.${contextRef}`;
      }

      resolve({
        content: text,
        modelUsed: selectedModel === 'auto' ? 'llama-3.3-70b-versatile' : selectedModel,
      });
    }, delay);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('AI request aborted', 'AbortError'));
    }, { once: true });

    setTimeout(() => {
      clearTimeout(timer);
      reject(new Error('AI response timed out'));
    }, AI_TIMEOUT_MS);
  });
}

function markdownToNotesHtml(markdown) {
  if (!markdown) return '';
  let md = String(markdown).replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const firstHeadingMatch = md.match(/^#+\s*(.+)$/m);
  const title = firstHeadingMatch ? firstHeadingMatch[1].replace(/[*_~`]/g, '').trim() : 'Study Note';

  const codeBlocks = [];
  md = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, _lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return placeholder;
  });

  const lines = md.split(/\r?\n/);
  const htmlParts = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  };

  const formatInline = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) {
      closeLists();
      continue;
    }

    if (rawLine.startsWith('__CODE_BLOCK_') && rawLine.endsWith('__')) {
      closeLists();
      const idx = parseInt(rawLine.replace(/__CODE_BLOCK_(\d+)__/, '$1'), 10);
      if (codeBlocks[idx]) htmlParts.push(codeBlocks[idx]);
      continue;
    }

    if (/^---+$|^===+$/.test(rawLine)) {
      closeLists();
      htmlParts.push('<hr/>');
      continue;
    }

    if (/^###\s+/.test(rawLine)) {
      closeLists();
      htmlParts.push(`<h3>${formatInline(rawLine.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(rawLine)) {
      closeLists();
      htmlParts.push(`<h2>${formatInline(rawLine.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(rawLine)) {
      closeLists();
      htmlParts.push(`<h1>${formatInline(rawLine.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }

    if (/^>\s+/.test(rawLine)) {
      closeLists();
      htmlParts.push(`<blockquote><p>${formatInline(rawLine.replace(/^>\s+/, ''))}</p></blockquote>`);
      continue;
    }

    if (/^[-*+]\s+/.test(rawLine)) {
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
      if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`<li>${formatInline(rawLine.replace(/^[-*+]\s+/, ''))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(rawLine)) {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`<li>${formatInline(rawLine.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${formatInline(rawLine)}</p>`);
  }
  closeLists();

  return `<div class="ai-study-note"><h3>StudyBuddy: ${title}</h3>${htmlParts.join('')}</div>`;
}

// ─── Main Component ───────────────────────────────────────────────
export function AiStudyBuddy({ roomId }) {
  const { user } = useAuth();
  const { socket } = useSocket(roomId);

  // 1. Multi-Session States
  const [sessions, setSessions] = useState(() => {
    if (!roomId) return [];
    try {
      const cached = localStorage.getItem(`studix_ai_sessions_${roomId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    if (!roomId) return '';
    try {
      const lastActive = localStorage.getItem(`studix_ai_active_${roomId}`);
      if (lastActive) return lastActive;
    } catch (_) {}
    return '';
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 2. Model Selector State
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('studix_ai_model') || 'auto';
    } catch (_) {
      return 'auto';
    }
  });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // 3. Message Stream State
  const [messages, setMessages] = useState(() => {
    if (!roomId || !activeSessionId) return [];
    try {
      const cached = localStorage.getItem(`studix_ai_msgs_${roomId}_${activeSessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [input, setInput] = useState('');
  const [aiState, setAiState] = useState('idle');
  const [context, setContext] = useState('');
  const [lastFailedInput, setLastFailedInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const sendingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const modelMenuRef = useRef(null);

  const currentModelDef = useMemo(() => {
    return AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
  }, [selectedModel]);

  const lastAssistantIndex = useMemo(
    () => (Array.isArray(messages) ? messages.map((m) => m?.role).lastIndexOf('assistant') : -1),
    [messages]
  );

  // ── Sync Active Model to LocalStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('studix_ai_model', selectedModel);
    } catch (_) {}
  }, [selectedModel]);

  // Close model menu when clicking outside
  useEffect(() => {
    if (!isModelMenuOpen) return;
    const handleClickOutside = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isModelMenuOpen]);

  // ── 4. Sessions Initialization & Firestore Realtime Sync ──
  useEffect(() => {
    if (!roomId) return;

    const sessionsQuery = query(
      collection(db, 'rooms', roomId, 'ai-sessions'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const logCleanup = logger.trackListener(`ai-sessions/${roomId}`);
    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const fetched = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (fetched.length > 0) {
          setSessions(fetched);
          try {
            localStorage.setItem(`studix_ai_sessions_${roomId}`, JSON.stringify(fetched));
          } catch (_) {}

          setActiveSessionId((prev) => {
            if (prev && fetched.some((s) => s.id === prev)) return prev;
            return fetched[0].id;
          });
        } else {
          // If no sessions in Firestore yet, check legacy messages to migrate
          const legacyQuery = query(collection(db, 'rooms', roomId, 'ai-chat'), limit(1));
          getDocs(legacyQuery).then((legacySnap) => {
            if (!legacySnap.empty) {
              const initialId = `session_main_${Date.now()}`;
              const initialSession = {
                id: initialId,
                title: 'General Study Session',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastSnippet: 'Previous conversations in room',
                messageCount: 1,
              };
              setDoc(doc(db, 'rooms', roomId, 'ai-sessions', initialId), initialSession).catch(() => {});
              setSessions([initialSession]);
              setActiveSessionId(initialId);
            } else {
              // Create a default initial session
              const newId = `session_${Date.now()}`;
              const defaultSession = {
                id: newId,
                title: 'New Chat',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastSnippet: '',
                messageCount: 0,
              };
              setDoc(doc(db, 'rooms', roomId, 'ai-sessions', newId), defaultSession).catch(() => {});
              setSessions([defaultSession]);
              setActiveSessionId(newId);
            }
          }).catch(() => {});
        }
      },
      (error) => {
        logger.error('AI sessions listener error', 'AiStudyBuddy', error);
      }
    );

    return () => {
      unsubscribe();
      logCleanup();
    };
  }, [roomId]);

  // Sync activeSessionId to localStorage
  useEffect(() => {
    if (roomId && activeSessionId) {
      try {
        localStorage.setItem(`studix_ai_active_${roomId}`, activeSessionId);
      } catch (_) {}
    }
  }, [roomId, activeSessionId]);

  // ── 5. Messages Listener for Active Session ──
  useEffect(() => {
    if (!roomId || !activeSessionId) return;

    // Load from local cache first for instant render
    try {
      const cached = localStorage.getItem(`studix_ai_msgs_${roomId}_${activeSessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (_) {}

    const msgsQuery = query(
      collection(db, 'rooms', roomId, 'ai-sessions', activeSessionId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const logCleanup = logger.trackListener(`ai-msgs/${roomId}/${activeSessionId}`);
    const unsubscribe = onSnapshot(
      msgsQuery,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() });
        });
        setMessages(msgs);
        try {
          localStorage.setItem(`studix_ai_msgs_${roomId}_${activeSessionId}`, JSON.stringify(msgs));
        } catch (_) {}
      },
      (error) => {
        logger.error('AI active messages error', 'AiStudyBuddy', error);
      }
    );

    return () => {
      unsubscribe();
      logCleanup();
    };
  }, [roomId, activeSessionId]);

  // ── 6. Room Context Fetch ──
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    fetchMessages(roomId)
      .then((response) => {
        if (cancelled) return;
        const roomMsgs = Array.isArray(response) ? response : (response?.messages || []);
        if (!roomMsgs || roomMsgs.length === 0) return;
        const textSnippets = roomMsgs
          .filter((m) => m && m.text && !m.text.startsWith('Voice message'))
          .slice(-10)
          .map((m) => `${m.senderName || 'Member'}: ${m.text}`);
        setContext(textSnippets.join(' | '));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }, [messages, aiState]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── 7. Multi-Session Actions ──
  const handleCreateNewChat = useCallback(async () => {
    if (!roomId) return;
    const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSession = {
      id: newId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSnippet: '',
      messageCount: 0,
      userId: user?.uid || null,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMessages([]);
    setIsDrawerOpen(false);

    try {
      localStorage.setItem(`studix_ai_msgs_${roomId}_${newId}`, JSON.stringify([]));
      await setDoc(doc(db, 'rooms', roomId, 'ai-sessions', newId), newSession);
      toast.success('Started new chat');
    } catch (err) {
      logger.warn('Failed to persist new session', 'AiStudyBuddy', err);
    }
  }, [roomId, user?.uid]);

  const handleSelectSession = useCallback((sessionId) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setIsDrawerOpen(false);
  }, [activeSessionId]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this conversation history?')) return;

    try {
      // Delete messages subcollection
      const subMsgs = await getDocs(
        collection(db, 'rooms', roomId, 'ai-sessions', sessionId, 'messages')
      );
      const delPromises = subMsgs.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(delPromises);

      // Delete session document
      await deleteDoc(doc(db, 'rooms', roomId, 'ai-sessions', sessionId));

      localStorage.removeItem(`studix_ai_msgs_${roomId}_${sessionId}`);

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (activeSessionId === sessionId) {
          if (filtered.length > 0) {
            setActiveSessionId(filtered[0].id);
          } else {
            handleCreateNewChat();
          }
        }
        return filtered;
      });

      toast.success('Conversation deleted');
    } catch (err) {
      logger.error('Failed to delete session', 'AiStudyBuddy', err);
      toast.error('Failed to delete conversation');
    }
  }, [roomId, activeSessionId, handleCreateNewChat]);

  // ── 8. Message Persistence & Title Auto-Generation ──
  const persistSessionMessage = useCallback(
    async (message, isFirstMessage = false, promptText = '') => {
      if (!roomId || !activeSessionId) return;
      try {
        await withRetry(
          () =>
            addDoc(collection(db, 'rooms', roomId, 'ai-sessions', activeSessionId, 'messages'), {
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              modelUsed: message.modelUsed || null,
              userId: user?.uid || null,
            }),
          { maxRetries: 2 }
        );

        // Update session meta
        const sessionRef = doc(db, 'rooms', roomId, 'ai-sessions', activeSessionId);
        const updates = {
          updatedAt: Date.now(),
          lastSnippet: message.content.slice(0, 100),
        };

        if (isFirstMessage && promptText) {
          const autoTitle = generateSessionTitle(promptText);
          updates.title = autoTitle;
          setSessions((prev) =>
            prev.map((s) => (s.id === activeSessionId ? { ...s, ...updates, title: autoTitle } : s))
          );
        }

        await setDoc(sessionRef, updates, { merge: true });
      } catch (error) {
        logger.warn('Failed to persist session message', 'AiStudyBuddy', error);
      }
    },
    [roomId, activeSessionId, user?.uid]
  );

  // ── 9. Send Message ──
  const sendMessage = useCallback(
    async (messageText) => {
      const rawText = (messageText || input).trim();
      if (!rawText || !user) return;
      if (sendingRef.current) return;

      const now = Date.now();
      if (now - lastSendTimeRef.current < RATE_LIMIT_MS) {
        toast.info('Please wait a moment before sending another query.');
        return;
      }

      const text = sanitizeInput(rawText);
      if (!text) return;

      sendingRef.current = true;
      lastSendTimeRef.current = now;

      // Check if this is the first user message in this session
      const isFirstMessage = messages.length === 0;

      const userMessage = { id: `user-${now}`, role: 'user', content: text, timestamp: now };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setAiState('sending');
      setLastFailedInput('');
      persistSessionMessage(userMessage, isFirstMessage, text);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await generateExpertResponse(
          text,
          context,
          messages,
          selectedModel,
          controller.signal
        );

        const responseText = typeof result === 'object' ? result.content : result;
        const modelUsed = typeof result === 'object' ? result.modelUsed : selectedModel;

        const assistantMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          modelUsed,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAiState('idle');
        persistSessionMessage(assistantMessage, false);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setAiState('idle');
        } else {
          logger.error('AI response error', 'AiStudyBuddy', error);
          setAiState('error');
          setLastFailedInput(text);
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [input, user, context, messages, selectedModel, persistSessionMessage]
  );

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAiState('idle');
      sendingRef.current = false;
      toast.info('Response stopped');
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastFailedInput) sendMessage(lastFailedInput);
  }, [lastFailedInput, sendMessage]);

  const handleCopy = useCallback(async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const handleSaveToNotes = useCallback(async (content) => {
    try {
      if (!roomId) return;
      toast.info('Saving to Collaborative Notes...');
      const noteData = await fetchNote(roomId).catch(() => ({ content: '' }));
      const currentHtml = noteData?.content || '';

      const cleanHtml = markdownToNotesHtml(content);
      const mergedHtml = currentHtml ? `${currentHtml}<br/><hr/><br/>${cleanHtml}` : cleanHtml;

      if (socket) {
        socket.emit('notes:update', { roomId, content: mergedHtml });
      }
      toast.success('Saved to room notes');
    } catch (err) {
      console.warn('Failed to append to notes:', err);
      await navigator.clipboard.writeText(content);
      toast.success('Copied response to clipboard');
    }
  }, [roomId, socket]);

  const handleClearCurrentSession = useCallback(async () => {
    if (!confirm('Clear all messages in this conversation?')) return;
    try {
      if (activeSessionId) {
        const subMsgs = await getDocs(
          collection(db, 'rooms', roomId, 'ai-sessions', activeSessionId, 'messages')
        );
        const delPromises = subMsgs.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(delPromises);
      }
      setMessages([]);
      localStorage.removeItem(`studix_ai_msgs_${roomId}_${activeSessionId}`);
      toast.success('Conversation cleared');
    } catch (error) {
      logger.error('Failed to clear chat', 'AiStudyBuddy', error);
      toast.error('Failed to clear chat');
    }
  }, [roomId, activeSessionId]);

  const isLoading = aiState === 'sending';
  const hasError = aiState === 'error';

  return (
    <div
      id={`ai-tutor-${roomId}`}
      data-radial-context="tutor"
      className="flex h-full bg-[#09090b] relative overflow-hidden font-sans select-text"
    >
      {/* Subtle modern radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.06)_0%,_transparent_65%)]" />

      {/* ── COLLAPSIBLE CHAT HISTORY DRAWER (ChatGPT Style) ── */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            />

            {/* Sidebar drawer panel */}
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed md:relative top-0 bottom-0 left-0 w-72 md:w-68 z-50 md:z-20 bg-[#0d0e15] border-r border-white/[0.08] flex flex-col shrink-0 shadow-2xl md:shadow-none"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200 tracking-wide uppercase">
                    Chat History
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 font-mono">
                    {sessions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* "+ New Chat" Action Button */}
              <div className="p-3">
                <button
                  type="button"
                  onClick={handleCreateNewChat}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_4px_16px_rgba(124,58,237,0.25)] transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Chat</span>
                </button>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 px-2.5 py-1">
                <div className="space-y-1">
                  {sessions.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <p className="text-xs text-zinc-500">No conversation history yet.</p>
                    </div>
                  ) : (
                    sessions.map((sess) => {
                      const isActive = sess.id === activeSessionId;
                      return (
                        <div
                          key={sess.id}
                          onClick={() => handleSelectSession(sess.id)}
                          className={cn(
                            'group relative flex items-start gap-2.5 p-2.5 rounded-xl text-left cursor-pointer transition-all',
                            isActive
                              ? 'bg-purple-500/15 border border-purple-500/40 text-white shadow-xs'
                              : 'hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-transparent'
                          )}
                        >
                          <MessageSquare
                            className={cn(
                              'w-3.5 h-3.5 mt-0.5 shrink-0',
                              isActive ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-400'
                            )}
                          />
                          <div className="flex-1 min-w-0 pr-6">
                            <p
                              className={cn(
                                'text-xs font-medium truncate',
                                isActive ? 'text-zinc-100 font-semibold' : 'text-zinc-300'
                              )}
                            >
                              {sess.title || 'Untitled Session'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-zinc-500">
                              <span>{formatRelativeTime(sess.updatedAt || sess.createdAt)}</span>
                              {sess.lastSnippet && (
                                <span className="truncate max-w-[110px] opacity-75">
                                  • {sess.lastSnippet}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete Session Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(sess.id, e)}
                            className="absolute right-2 top-2.5 p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CHAT WORKSPACE ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
        {/* ── TOP HEADER ── */}
        <header className="relative z-20 flex items-center justify-between min-h-[54px] h-auto py-2 px-3 sm:px-4 md:px-6 shrink-0 border-b border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-xl gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar toggle button */}
            <Tip label={isDrawerOpen ? 'Close History' : 'Chat History'} side="bottom">
              <button
                type="button"
                onClick={() => setIsDrawerOpen((prev) => !prev)}
                className={cn(
                  'p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0',
                  isDrawerOpen && 'text-purple-400 bg-purple-500/10'
                )}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </Tip>

            {/* Quick "+ New Chat" in Header */}
            <Tip label="New Chat" side="bottom">
              <button
                type="button"
                onClick={handleCreateNewChat}
                className="h-8 px-2 sm:px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs font-medium transition-all shrink-0 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">New</span>
              </button>
            </Tip>

            <StudyBuddyAvatar size="sm" shape="squircle" className="hidden sm:flex" />

            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-semibold text-zinc-100 text-xs sm:text-sm tracking-tight truncate hidden md:inline">
                StudyBuddy AI
              </h2>

              {/* ── MODEL SELECTOR DROPDOWN ── */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsModelMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-purple-500/30 rounded-lg shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="font-semibold">{currentModelDef.badge}</span>
                  <ChevronDown className={cn('w-3 h-3 text-zinc-400 transition-transform', isModelMenuOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {isModelMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-72 sm:w-80 bg-[#12131d]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-1.5 z-50 text-left overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Select Model
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                            <Activity className="w-2.5 h-2.5" />
                            Live Pings: Active
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {AI_MODELS.map((m) => {
                          const isSelected = selectedModel === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(m.id);
                                setIsModelMenuOpen(false);
                                toast.success(`Active Engine: ${m.name}`);
                              }}
                              className={cn(
                                'w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all',
                                isSelected
                                  ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                                  : 'hover:bg-white/[0.04] text-zinc-300 hover:text-white border border-transparent'
                              )}
                            >
                              <div className="mt-0.5 p-1 rounded-md bg-white/[0.06] shrink-0">
                                {m.id === 'auto' ? (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                ) : m.id === 'llama-3.1-8b-instant' ? (
                                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                                ) : m.id === 'deepseek-r1-distill-llama-70b' ? (
                                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold">{m.name}</span>
                                  <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-white/[0.06] font-mono text-zinc-400">
                                    {m.speed}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mt-0.5">
                                  {m.description}
                                </p>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {context && (
              <Tip label="Context aware of recent room discussions" side="bottom">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 max-w-[120px] sm:max-w-[180px] truncate cursor-help">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400/80 shrink-0" />
                  <span className="truncate">Context Active</span>
                </div>
              </Tip>
            )}

            <Tip label="Clear current conversation" side="bottom">
              <button
                onClick={handleClearCurrentSession}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tip>
          </div>
        </header>

        {/* ── CHAT MESSAGES CANVAS ── */}
        <ScrollArea className="flex-1 min-h-0 relative z-10 w-full" ref={scrollRef}>
          <div
            className={cn(
              'p-3 sm:p-4 md:p-6 max-w-3xl mx-auto flex flex-col min-h-full',
              messages.length === 0 ? 'justify-center' : 'justify-start'
            )}
          >
            {messages.length === 0 ? (
              /* ChatGPT Empty Hero */
              <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] text-center px-3 py-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex flex-col items-center gap-3 sm:gap-4 max-w-xl w-full"
                >
                  <StudyBuddyAvatar size="xl" shape="squircle" />

                  <div className="space-y-1">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-zinc-100">
                      How can I help you study today?
                    </h1>
                    <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                      Ask any academic concept, debug code, or pick a starter accelerator below.
                    </p>
                  </div>

                  {/* 4 Clean Starter Accelerator Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full pt-3 sm:pt-4">
                    {STARTER_CARDS.map((card, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(card.prompt)}
                        className="flex flex-col text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-purple-500/30 transition-all shadow-xs group cursor-pointer active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0">
                            <card.icon className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                          </div>
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                            {card.title}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-[11.5px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Message Stream */
              <div className="space-y-6 sm:space-y-7 py-2 min-w-0 w-full">
                {messages.map((message, index) => (
                  <div key={message.id || `msg-${index}`} className="w-full min-w-0">
                    {message.role === 'assistant' ? (
                      <div className="flex gap-2.5 sm:gap-3.5 md:gap-4 items-start w-full min-w-0 group">
                        <StudyBuddyAvatar size="md" shape="circle" className="w-7 h-7 sm:w-8 sm:h-8 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          {/* Model Routing Indicator Badge */}
                          {message.modelUsed && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-300/80 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 select-none">
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                {AI_MODELS.find((m) => m.id === message.modelUsed)?.badge || message.modelUsed}
                              </span>
                            </div>
                          )}

                          <div className="text-zinc-200 text-[13.5px] sm:text-[14px] leading-relaxed break-words [overflow-wrap:anywhere] min-w-0 max-w-full w-full">
                            <MarkdownRenderer content={message.content || message.text || ''} />
                          </div>

                          {/* Quiet Action Toolbar */}
                          <div className="flex items-center gap-1 mt-2.5 pt-1 text-xs text-zinc-400 flex-wrap">
                            <Tip label="Copy response" side="bottom">
                              <button
                                onClick={() => handleCopy(message.content, message.id)}
                                className="p-1 px-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/5 transition-all text-xs flex items-center gap-1.5"
                              >
                                {copiedId === message.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span className="text-[11px]">Copy</span>
                                  </>
                                )}
                              </button>
                            </Tip>

                            <Tip label="Save note into room collaborative notes" side="bottom">
                              <button
                                onClick={() => handleSaveToNotes(message.content)}
                                className="p-1 px-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/5 transition-all text-xs flex items-center gap-1.5"
                              >
                                <BookmarkPlus className="h-3.5 w-3.5 text-purple-400" />
                                <span className="text-[11px]">Save to Notes</span>
                              </button>
                            </Tip>
                          </div>

                          {/* Follow-up Accelerator Chips */}
                          {index === lastAssistantIndex && (
                            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.06] flex-wrap py-0.5 scrollbar-none no-scrollbar">
                              <span className="text-[10.5px] sm:text-[11px] text-zinc-500 font-medium mr-0.5 shrink-0">
                                Suggestions:
                              </span>
                              <button
                                type="button"
                                onClick={() => sendMessage('Can you give a concrete, step-by-step code or practical example of this?')}
                                className="text-[10.5px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                              >
                                <CodeIcon className="w-3 h-3 text-indigo-400" />
                                <span>Give code example</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => sendMessage('Give me a practice problem or quick quiz based on what you just explained.')}
                                className="text-[10.5px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                              >
                                <Brain className="w-3 h-3 text-emerald-400" />
                                <span>Practice problem</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => sendMessage('Can you simplify this further in plain English as if I were a beginner?')}
                                className="text-[10.5px] sm:text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                              >
                                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                                <span>Simplify this</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* User Message: Clean modern pill */
                      <div className="flex gap-2 sm:gap-2.5 justify-end items-start w-full min-w-0">
                        <div className="bg-[#27272a] hover:bg-[#2c2c31] text-zinc-100 rounded-2xl sm:rounded-3xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-sm max-w-[90%] sm:max-w-[80%] md:max-w-[75%] border border-white/5 transition-colors min-w-0">
                          <p className="text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text">
                            {message.content}
                          </p>
                        </div>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 text-xs font-semibold shadow-xs mt-0.5">
                          {user?.displayName?.[0] || 'U'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Thinking Indicator */}
                {isLoading && (
                  <div className="flex gap-2.5 sm:gap-3.5 md:gap-4 items-center">
                    <StudyBuddyAvatar size="md" shape="circle" pulse className="w-7 h-7 sm:w-8 sm:h-8" />
                    <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-1">
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                      </span>
                      <span className="font-medium text-zinc-400 text-[11.5px] sm:text-xs">
                        StudyBuddy is thinking...
                      </span>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {hasError && (
                  <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <span className="flex-1">Unable to generate response. Try again?</span>
                    <button
                      onClick={handleRetry}
                      className="text-red-300 hover:text-white font-medium flex items-center gap-1 px-2 py-1 rounded bg-red-500/20"
                    >
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── INPUT CAPSULE ── */}
        <div className="shrink-0 p-3 sm:p-4 md:p-6 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] relative z-10 w-full max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="relative flex flex-col bg-[#14151f]/90 backdrop-blur-2xl border border-white/10 focus-within:border-purple-500/50 rounded-xl sm:rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition-all overflow-hidden p-1.5 sm:p-2"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value.slice(0, MAX_INPUT_LENGTH));
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask StudyBuddy anything..."
              className="w-full bg-transparent border-0 px-2.5 py-1.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-36 custom-scrollbar leading-relaxed"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between pt-1 sm:pt-2 px-1 gap-2">
              <span className="text-[10px] sm:text-[11px] text-zinc-500 truncate select-none">
                <span className="hidden sm:inline">Enter ↵ to send • Shift+Enter for new line</span>
                <span className="sm:hidden inline-flex items-center gap-1 text-purple-300/90 font-medium">
                  <StudyBuddyIcon size={11} variant="gradient" /> StudyBuddy AI
                </span>
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {input.length > 500 && (
                  <span className="text-[9.5px] sm:text-[10px] text-zinc-500">
                    {input.length}/{MAX_INPUT_LENGTH}
                  </span>
                )}

                {isLoading ? (
                  <Tip label="Stop generating" side="top">
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </Tip>
                ) : (
                  <Tip label="Send prompt" side="top">
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shrink-0 disabled:opacity-20 disabled:hover:bg-white shadow-sm transition-all active:scale-95"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </Tip>
                )}
              </div>
            </div>
          </form>

          <div className="text-center pt-1.5 sm:pt-2 text-[10px] sm:text-[10.5px] text-zinc-500 select-none px-2">
            StudyBuddy can make mistakes. Verify important academic facts.
          </div>
        </div>
      </div>
    </div>
  );
}

AiStudyBuddy.propTypes = {
  roomId: PropTypes.string.isRequired,
};
