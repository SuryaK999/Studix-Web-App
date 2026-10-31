import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  Calculator,
  Code as CodeIcon,
  Brain,
  HelpCircle,
  Trash2,
  BookOpen,
  Sparkles,
  Zap,
  BookmarkPlus,
  ArrowUp,
  Square
} from 'lucide-react';
import { StudyBuddyIcon, StudyBuddyAvatar } from '@/components/ui/StudyBuddyIcon';
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
  getDocs,
} from 'firebase/firestore';
import { withRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { fetchMessages, fetchNote } from '@/services/api';
import { callGroqApi, isGroqConfigured } from '@/services/aiService';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { Tip } from '@/components/ui/tip';

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'Explain', prompt: 'Explain this topic clearly with intuitive analogies and concrete examples.' },
  { icon: Lightbulb, label: 'Study Tips', prompt: 'Give me proven study techniques and memory cues for this subject.' },
  { icon: Calculator, label: 'Practice', prompt: 'Give me a practice problem with a step-by-step solution.' },
  { icon: CodeIcon, label: 'Code Help', prompt: 'Help me understand and debug this code concept with syntax examples.' },
  { icon: Brain, label: 'Quiz Me', prompt: 'Quiz me on this topic with 5 active-recall questions and hidden answers.' },
  { icon: HelpCircle, label: 'Simplify (ELI5)', prompt: 'Break this down simply as if I were a beginner.' },
];

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

// ─── Production Guards ──────────────────────────────────────────
const AI_TIMEOUT_MS = 15_000;
const RATE_LIMIT_MS = 1_500;
const MAX_INPUT_LENGTH = 2_000;

function sanitizeInput(input) {
  return input.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '').trim().slice(0, MAX_INPUT_LENGTH);
}

// ─── Authentic Pedagogical Response Generator ───────────────────
async function generateExpertResponse(
  userInput,
  roomContext,
  messageHistory,
  signal
) {
  // If Groq API key is configured, query Groq for live LLM reasoning
  if (isGroqConfigured()) {
    try {
      const groqAnswer = await callGroqApi({
        prompt: userInput,
        context: roomContext,
        history: messageHistory,
        signal,
      });
      if (groqAnswer) return groqAnswer;
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw new DOMException('AI request aborted', 'AbortError');
      }
      console.warn('[AiStudyBuddy] Groq call failed, falling back to local tutor:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    const delay = 450 + Math.random() * 400;
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('AI request aborted', 'AbortError'));
        return;
      }

      const input = userInput.toLowerCase().trim();
      const hasContext = roomContext && roomContext.length > 0;

      // Build context reference
      const contextRef = hasContext
        ? `\n\n---\n*Context from your study room has been referenced for this session.*`
        : '';

      // ─── 0. Greetings & Casual Interactions ───────────────────
      if (/^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(input) || input.length <= 3) {
        resolve(`### Welcome to StudyBuddy

I'm your **StudyBuddy AI** mentor on Studix. What topic, concept, or code are we mastering today?

Here are quick ways I can help:
- **Concept Breakdown:** *"Explain how async/await works under the hood"*
- **Debugging Code:** *"Why is my recursive function causing a stack overflow?"*
- **Practice Quiz:** *"Quiz me on operating system thread scheduling"*
- **Study Strategy:** *"Best way to memorize data structures for interviews"*

Type a question below or choose an accelerator chip to begin.${contextRef}`);
        return;
      }

      // ─── 1. Quizzes ──────────────────────────────────────────
      if (input.includes('quiz') || input.includes('test me')) {
        resolve(`### Knowledge Check

Let's test your understanding with active recall. Try answering before checking:

**1.** What is the key difference between a stack and a queue?
**2.** Explain the average and worst-case time complexity of binary search.
**3.** What does "DRY" stand for in software engineering, and why does it matter?
**4.** What is the difference between synchronous and asynchronous execution?
**5.** In database design, what is the primary purpose of indexing?

---

### Answers & Explanations

1. **Stack** = LIFO (Last In, First Out); **Queue** = FIFO (First In, First Out).
2. **O(log n)** — it divides the search space in half at each iteration.
3. **Don't Repeat Yourself** — eliminates duplicate logic and reduces maintenance bugs.
4. **Synchronous** blocks execution until finished; **asynchronous** allows other tasks to proceed while waiting.
5. **Indexing** creates an optimized lookup data structure (typically a B-Tree) to avoid costly full table scans.${contextRef}`);
        return;
      }

      // ─── 2. Explanations ──────────────────────────────────────
      if (input.includes('explain') || input.includes('what is') || input.includes('how does') || input.includes('define')) {
        const topic = input.replace(/explain\s*(this\s*:?)?/i, '').replace(/concept\s*clearly\s*:?/i, '').replace(/["']/g, '').trim() || 'the concept';
        resolve(`### Deep Dive: ${topic}

Let's break this down into clear, memorable principles:

1. **Core Purpose:**
Understanding what specific challenge **${topic}** solves gives you the mental anchor to recall its mechanisms effortlessly.

2. **Step-by-Step Logic:**
- Formulate the fundamental inputs and boundary conditions.
- Trace the internal transformations state-by-state.
- Verify the terminal or expected outcome.

3. **Key Takeaway:**
Focus on the underlying principle rather than memorizing isolated syntax.${contextRef}`);
        return;
      }

      // ─── 3. Code & Debugging ──────────────────────────────────
      if (input.includes('code') || input.includes('debug') || input.includes('error') || input.includes('bug')) {
        resolve(`### Code & Debugging Assistant

Here is a systematic diagnostic approach to resolve code issues:

1. **Stack Trace Isolation:** Pinpoint the exact line number where the anomaly originates.
2. **State Inspection:** Verify variable types and nullability before dereferencing properties.
3. **Boundary Verification:** Test arrays for out-of-bound indices and asynchronous race conditions.

\`\`\`javascript
// Safe defensive pattern
if (!data || typeof data !== 'object') {
  console.warn('Received invalid payload:', data);
  return fallbackValue;
}
\`\`\`

Share your exact code snippet and error message, and we'll analyze it step-by-step.${contextRef}`);
        return;
      }

      // ─── 4. Study Tips & Strategy ─────────────────────────────
      if (input.includes('study tip') || input.includes('how to study') || input.includes('learn better') || input.includes('focus')) {
        resolve(`### Evidence-Based Study Blueprint

Cognitive research demonstrates that passive re-reading has low retention. Here are three high-yield techniques:

**1. Active Recall (Testing Effect)**
Close your notes and write everything you can remember from scratch. Neural pathways strengthen during retrieval, not passive consumption.

**2. Spaced Repetition (Forgetting Curve)**
- Day 1: Learn core concepts and draft summary notes.
- Day 2: 10-minute active recall quiz.
- Day 4: Solve 3 challenging practice problems.
- Day 7: Explain the concept aloud using the Feynman technique.

**3. The Feynman Technique**
Explain the concept in plain English as if teaching a beginner. Any hesitation indicates an exact gap in your foundational understanding.${contextRef}`);
        return;
      }

      // ─── 5. General Pedagogical Fallback ─────────────────────
      const topic = userInput.trim();
      resolve(`### Study Insight: ${topic}

Here is a structured breakdown to master this topic:

**1. Core Intuition:**
At its foundation, **${topic}** provides a predictable pattern to manage logic and structure cleanly.

**2. Principles to Master:**
- **Clarify the Problem:** Understand what difficulty exists without this concept.
- **Trace the Mechanics:** Deconstruct complex mechanisms into bite-sized sequential stages.
- **Test Edge Cases:** Evaluate behavior with zero, null, or extreme values.

What aspect would you like to explore next? You can ask for a code example, a practice quiz, or a simplified analogy.${contextRef}`);
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

/**
 * Transforms AI markdown into semantic, dark-theme formatted HTML for collaborative TipTap notes
 */
function markdownToNotesHtml(markdown) {
  if (!markdown) return '';
  let md = String(markdown)
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  // Extract a clean topic header
  const firstHeadingMatch = md.match(/^#+\s*(.+)$/m);
  const title = firstHeadingMatch ? firstHeadingMatch[1].replace(/[*_~`]/g, '').trim() : 'Study Note';

  // Protect and extract code blocks
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

  const [messages, setMessages] = useState(() => {
    if (!roomId) return [];
    try {
      const cached = localStorage.getItem(`studix_ai_${roomId}`);
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [aiState, setAiState] = useState('idle');
  const [context, setContext] = useState('');
  const [lastFailedInput, setLastFailedInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const lastAssistantIndex = useMemo(
    () => (Array.isArray(messages) ? messages.map((m) => m?.role).lastIndexOf('assistant') : -1),
    [messages]
  );

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const sendingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Sync cache with local storage
  useEffect(() => {
    if (roomId && Array.isArray(messages) && messages.length > 0) {
      try {
        localStorage.setItem(`studix_ai_${roomId}`, JSON.stringify(messages.slice(-50)));
      } catch (_) {}
    }
  }, [roomId, messages]);

  // Load message history from Firestore
  useEffect(() => {
    if (!roomId) return;
    const messagesQuery = query(
      collection(db, 'rooms', roomId, 'ai-chat'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const logCleanup = logger.trackListener(`ai-chat/${roomId}`);
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({ id: doc.id, role: data.role, content: data.content, timestamp: data.timestamp || 0 });
        });
        setMessages(msgs);
        if (msgs.length === 0) {
          try {
            localStorage.removeItem(`studix_ai_${roomId}`);
          } catch (_) {}
        }
      },
      (error) => {
        logger.error('AI chat listener error', 'AiStudyBuddy', error);
      }
    );

    return () => {
      unsubscribe();
      logCleanup();
    };
  }, [roomId]);

  // Real room context
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const persistMessage = useCallback(
    async (message) => {
      try {
        await withRetry(
          () =>
            addDoc(collection(db, 'rooms', roomId, 'ai-chat'), {
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              userId: user?.uid || null,
            }),
          { maxRetries: 2 }
        );
      } catch (error) {
        logger.warn('Failed to persist AI message', 'AiStudyBuddy', error);
      }
    },
    [roomId, user]
  );

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

      const userMessage = { id: `user-${now}`, role: 'user', content: text, timestamp: now };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setAiState('sending');
      setLastFailedInput('');
      persistMessage(userMessage);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const responseText = await generateExpertResponse(text, context, messages, controller.signal);
        const assistantMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setAiState('idle');
        persistMessage(assistantMessage);
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
    [input, user, context, messages, persistMessage]
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

  const handleClearChat = useCallback(async () => {
    if (!confirm('Clear all AI chat messages in this room?')) return;
    try {
      const snapshot = await getDocs(collection(db, 'rooms', roomId, 'ai-chat'));
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      setMessages([]);
      localStorage.removeItem(`studix_ai_${roomId}`);
      toast.success('AI chat cleared');
    } catch (error) {
      logger.error('Failed to clear chat', 'AiStudyBuddy', error);
      toast.error('Failed to clear chat');
    }
  }, [roomId]);

  const isLoading = aiState === 'sending';
  const hasError = aiState === 'error';

  // Condition to check if user has started typing
  const isTyping = input.trim().length > 0;

  return (
    <div
      id={`ai-tutor-${roomId}`}
      data-radial-context="tutor"
      className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans select-text"
    >
      {/* Subtle modern radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.06)_0%,_transparent_65%)]" />

      {/* ── 1. Modern Minimalist Top Bar ── */}
      <header className="relative z-10 flex items-center justify-between min-h-[52px] h-auto py-2 px-3 sm:px-4 md:px-6 shrink-0 border-b border-white/[0.08] bg-[#0c0d12]/90 backdrop-blur-xl gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <StudyBuddyAvatar size="md" shape="squircle" glow />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
            <h2 className="font-semibold text-zinc-100 text-xs sm:text-sm tracking-tight truncate">
              StudyBuddy AI
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {context && (
            <Tip label="Context aware of recent room discussions" side="bottom">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10.5px] sm:text-[11px] text-zinc-400 max-w-[130px] sm:max-w-[200px] truncate cursor-help">
                <StudyBuddyIcon size={12} variant="gradient" className="shrink-0" />
                <span className="hidden sm:inline truncate">Room Context Active</span>
                <span className="sm:hidden text-[9px] font-medium text-purple-300">Context</span>
              </div>
            </Tip>
          )}

          <Tip label="Clear conversation history" side="bottom">
            <button
              onClick={handleClearChat}
              className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tip>
        </div>
      </header>

      {/* ── 2. Message History & 2026 ChatGPT Canvas ── */}
      <ScrollArea className="flex-1 min-h-0 relative z-10 w-full" ref={scrollRef}>
        <div className="p-3 sm:p-4 md:p-6 max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            /* Modern ChatGPT / Claude Empty State Hero */
            <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] sm:min-h-[460px] text-center px-3 sm:px-4 py-6 sm:py-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col items-center gap-3 sm:gap-4 max-w-xl w-full"
              >
                <StudyBuddyAvatar size="xl" shape="squircle" glow />

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
            /* Modern ChatGPT-style Message Stream */
            <div className="space-y-7 py-2">
              {messages.map((message, index) => (
                <div key={message.id || `msg-${index}`} className="w-full">
                  {message.role === 'assistant' ? (
                    <div className="flex gap-2.5 sm:gap-3.5 md:gap-4 items-start w-full group">
                      {/* Assistant Avatar */}
                      <StudyBuddyAvatar size="md" shape="circle" className="w-7 h-7 sm:w-8 sm:h-8 mt-0.5" />

                      {/* Content Canvas */}
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-200 text-[13.5px] sm:text-[14px] leading-relaxed break-words [overflow-wrap:anywhere] overflow-hidden">
                          <MarkdownRenderer content={message.content || message.text || ''} />
                        </div>

                        {/* Quiet modern action toolbar below message */}
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

                        {/* Follow-up accelerator chips (only on the latest assistant response) */}
                        {index === lastAssistantIndex && (
                          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.06] flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[10.5px] sm:text-[11px] text-zinc-500 font-medium mr-0.5 shrink-0">Suggestions:</span>
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
                              <StudyBuddyIcon size={12} variant="gradient" className="shrink-0" />
                              <span>Simplify this</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* User Message: Clean modern 2026 ChatGPT pill */
                    <div className="flex gap-2 sm:gap-2.5 justify-end items-start w-full">
                      <div className="bg-[#27272a] hover:bg-[#2c2c31] text-zinc-100 rounded-2xl sm:rounded-3xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-sm max-w-[90%] sm:max-w-[80%] md:max-w-[75%] border border-white/5 transition-colors">
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

              {/* Modern ChatGPT-style Thinking Indicator */}
              {isLoading && (
                <div className="flex gap-2.5 sm:gap-3.5 md:gap-4 items-center">
                  <StudyBuddyAvatar size="md" shape="circle" pulse className="w-7 h-7 sm:w-8 sm:h-8" />
                  <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-1">
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                    </span>
                    <span className="font-medium text-zinc-400 text-[11.5px] sm:text-xs">StudyBuddy is thinking...</span>
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

      {/* ── 3. Quick Action Chips Docked Above Input (ONLY visible when NOT typing!) ── */}
      <div className="shrink-0 px-3 sm:px-4 md:px-6 pt-1 max-w-3xl mx-auto w-full relative z-10">
        <AnimatePresence>
          {!isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 touch-pan-x">
                {QUICK_ACTIONS.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      sendMessage(action.prompt);
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-zinc-300 hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/30 transition-all whitespace-nowrap disabled:opacity-50 flex-shrink-0 shadow-xs active:scale-95 group"
                  >
                    <action.icon className="h-3.5 w-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Modern Input Capsule ── */}
      <div className="shrink-0 p-3 sm:p-4 md:p-6 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] relative z-10 w-full max-w-3xl mx-auto">
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
            className="w-full bg-transparent border-0 px-2 py-1 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-36 custom-scrollbar leading-relaxed"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between pt-1.5 sm:pt-2 px-1 gap-2">
            <span className="text-[10px] sm:text-[11px] text-zinc-500 truncate">
              <span className="hidden sm:inline">Enter ↵ to send • Shift+Enter for new line</span>
              <span className="sm:hidden">StudyBuddy AI</span>
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {input.length > 500 && (
                <span className="text-[9.5px] sm:text-[10px] text-zinc-500">{input.length}/{MAX_INPUT_LENGTH}</span>
              )}

              {isLoading ? (
                <Tip label="Stop generating" side="top">
                  <button
                    type="button"
                    onClick={handleStopGeneration}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  </button>
                </Tip>
              ) : (
                <Tip label="Send prompt" side="top">
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 flex items-center justify-center shrink-0 disabled:opacity-20 disabled:hover:bg-white shadow-sm transition-all active:scale-95"
                  >
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
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
  );
}
