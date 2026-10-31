import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, AlertCircle, RotateCcw, Copy, Check, Lightbulb,
  Calculator, Code, Brain, HelpCircle, Trash2, BookOpen, Sparkles, Zap,
  Send, BookmarkPlus, ArrowUp
} from 'lucide-react';
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

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'Explain', prompt: 'Explain this topic clearly with intuitive analogies and concrete examples.' },
  { icon: Lightbulb, label: 'Study Tips', prompt: 'Give me proven study techniques and memory cues for this subject.' },
  { icon: Calculator, label: 'Practice', prompt: 'Give me a practice problem with a step-by-step solution.' },
  { icon: Code, label: 'Code Help', prompt: 'Help me understand and debug this code concept with syntax examples.' },
  { icon: Brain, label: 'Quiz Me', prompt: 'Quiz me on this topic with 5 active-recall questions and hidden answers.' },
  { icon: HelpCircle, label: 'Simplify (ELI5)', prompt: 'Break this down simply as if I were a beginner.' },
];

const STARTER_CARDS = [
  {
    icon: BookOpen,
    title: 'Explain a Concept',
    description: 'Break down complex algorithms, theory, or formulas with simple analogies.',
    prompt: 'Explain how React reconciliation and the Virtual DOM work with clear analogies and examples.',
  },
  {
    icon: Code,
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
    description: 'Build an evidence-based roadmap using spaced repetition and Feynman technique.',
    prompt: 'Create a 7-day study plan using spaced repetition and active recall for my upcoming exam.',
  },
];

// ─── Production Guards ──────────────────────────────────────────
const AI_TIMEOUT_MS = 15_000;
const RATE_LIMIT_MS = 2_000;
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
    const delay = 500 + Math.random() * 500;
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('AI request aborted', 'AbortError'));
        return;
      }

      const input = userInput.toLowerCase().trim();
      const hasContext = roomContext && roomContext.length > 0;

      // Build context reference
      const contextRef = hasContext
        ? `\n\n---\n*📎 I noticed your room has been ${roomContext.includes('code') ? 'collaborating on code' : roomContext.includes('math') ? 'working on math problems' : 'discussing topics'} — I can tie our study directly into that.*`
        : '';

      // ─── 0. Greetings & Casual Interactions ───────────────────
      if (/^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(input) || input.length <= 3) {
        resolve(`### 👋 Hey there!

I'm your **StudyBuddy AI** tutor on Studix. What topic, concept, or code are we mastering today?

Here are quick ways I can help:
- 💡 **Concept Breakdown:** *"Explain how async/await works under the hood"*
- 💻 **Debugging Code:** *"Why is my recursive function causing a stack overflow?"*
- 📝 **Practice Quiz:** *"Quiz me on operating system thread scheduling"*
- 🧠 **Study Strategy:** *"Best way to memorize data structures for interviews"*

Type a question below or tap any accelerator chip to get started! 🚀${contextRef}`);
        return;
      }

      // ─── 1. Quizzes ──────────────────────────────────────────
      if (input.includes('quiz') || input.includes('test me')) {
        resolve(`### 📝 Quick Knowledge Check

Let's test your understanding with active recall! Try answering before checking:

**1.** What is the key difference between a stack and a queue?
**2.** Explain the average and worst-case time complexity of binary search.
**3.** What does "DRY" stand for in software engineering, and why does it matter?
**4.** What is the difference between synchronous and asynchronous execution?
**5.** In database design, what is the primary purpose of indexing?

---

### ✅ Answers & Explanations

1. **Stack** = LIFO (Last In, First Out) like a stack of plates; **Queue** = FIFO (First In, First Out) like a line of people.
2. **O(log n)** — it divides the search space in half at each step.
3. **Don't Repeat Yourself** — prevents duplicated logic and reduces bugs during updates.
4. **Synchronous** blocks execution until finished; **asynchronous** allows other tasks to run while waiting.
5. **Indexing** creates a fast lookup data structure (usually a B-Tree) to avoid costly full table scans.${contextRef}`);
        return;
      }

      // ─── 2. Explanations ──────────────────────────────────────
      if (input.includes('explain') || input.includes('what is') || input.includes('how does') || input.includes('define')) {
        const topic = input.replace(/explain\s*(this\s*:?)?/i, '').replace(/concept\s*clearly\s*:?/i, '').replace(/["']/g, '').trim() || 'the concept';
        resolve(`### 💡 Deep Dive: ${topic}

Let's break this down into clear, memorable principles:

**1. The Big Picture (Why it exists):**
**${topic}** exists to solve a specific engineering or academic problem by providing predictable structure and modularity.

**2. Intuitive Real-World Analogy:**
Imagine an organized kitchen where every chef has a dedicated workstation:
- Inputs arrive in a known, validated format.
- Operations run in orderly, isolated steps without side effects.
- Outputs are clean and ready for the next stage of the pipeline.

**3. Key Takeaways to Remember:**
- **Separation of Concerns:** Keep distinct responsibilities separated.
- **Predictability:** Given the same inputs, you should always expect the same outputs.
- **Edge Cases:** Always consider what happens when data is empty, null, or out of order.

Would you like me to write a **code example**, give you a **practice challenge**, or **simplify this further**? 🎯${contextRef}`);
        return;
      }

      // ─── 3. Code Help & Debugging ─────────────────────────────
      if (input.includes('code') || input.includes('debug') || input.includes('error') || input.includes('syntax') || input.includes('bug')) {
        resolve(`### 💻 Code Help & Systematic Debugging

Here is a senior engineer's 3-step checklist for diagnosing issues:

**Step 1: Read the Exact Error & Stack Trace**
Errors tell you the exact file and line number:
- \`TypeError: Cannot read properties of undefined\` → An object was accessed before it finished loading or was initialized.
- \`ReferenceError\` → A variable is misspelled, out of scope, or not imported.

**Step 2: Isolate the Data Flow**
\`\`\`javascript
// Add clean inspection logs before the crash
console.log('Input data:', input);
console.log('Current state:', state);
\`\`\`

**Step 3: Common Pitfalls & Fixes**
| Bug Pattern | Root Cause | Solution |
| :--- | :--- | :--- |
| **State out of sync** | Direct object/array mutation | Use immutable updates \`[...prev, item]\` |
| **Missing async data** | Component rendered before fetch resolved | Add optional chaining \`data?.property\` |
| **Infinite loop** | Missing base case or missing useEffect deps | Verify base condition and dependency array |

Share your exact code snippet and error message, and I'll debug it step-by-step with you! 🔍${contextRef}`);
        return;
      }

      // ─── 4. Study Tips & Strategy ─────────────────────────────
      if (input.includes('study tip') || input.includes('how to study') || input.includes('learn better') || input.includes('focus')) {
        resolve(`### 🧠 Evidence-Based Study Blueprint

Cognitive science shows that passive re-reading has near-zero retention. Here are the top 3 high-yield techniques:

**1. Active Recall (Testing Effect)**
- Close your notes and write everything you can remember on a blank sheet.
- *Why:* Neural pathways are strengthened during retrieval, not passive reading.

**2. Spaced Repetition (Combating the Forgetting Curve)**
\`\`\`
Day 1: Learn core concepts + write summary notes
Day 2: 10-minute active recall quiz (no looking)
Day 4: Solve 3 difficult practice problems
Day 7: Explain the concept aloud (Feynman technique)
Day 14: Final high-speed review
\`\`\`

**3. The Feynman Technique**
- Explain the concept out loud in plain English as if teaching a beginner.
- Any time you hesitate or use jargon, you've located a gap in your knowledge.

Pick **just one technique** to apply to your study session today! 💪${contextRef}`);
        return;
      }

      // ─── 5. General Pedagogical Fallback ─────────────────────
      const topic = userInput.trim();
      resolve(`### 💡 Study Insight: ${topic}

Here is a clear, structured breakdown to help you master this:

**1. Core Intuition:**
At its core, **${topic}** provides a structured way to handle logic and state with predictability and clarity.

**2. Key Principles to Master:**
- **Understand the Purpose:** Always ask *what problem does this solve?* before memorizing syntax or equations.
- **Trace the Mechanics:** Break down complex mechanisms into sequential, bite-sized stages.
- **Test with Boundary Cases:** Test what happens with zero, null, negative, or concurrent inputs.

**3. Next Step:**
Would you like me to:
- 💡 Provide a **code or calculation example**?
- 📝 Give you an **active-recall quiz** on this?
- 🧒 Explain it in **simpler, beginner-friendly terms**?

Let me know how you'd like to proceed! 🌟${contextRef}`);
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
  const title = firstHeadingMatch ? firstHeadingMatch[1].replace(/[*_~`]/g, '').trim() : 'AI Study Takeaway';

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

  return `<div class="ai-study-note"><h3>💡 StudyBuddy AI: ${title}</h3>${htmlParts.join('')}</div>`;
}

// ─── Main Component ───────────────────────────────────────────────
export function AiStudyBuddy({ roomId }) {
  const { user } = useAuth();
  const { socket } = useSocket(roomId);

  const [messages, setMessages] = useState(() => {
    if (!roomId) return [];
    try {
      const cached = localStorage.getItem(`studix_ai_${roomId}`);
      return cached ? JSON.parse(cached) : [];
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
    () => messages.map((m) => m.role).lastIndexOf('assistant'),
    [messages]
  );

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const sendingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Sync cache with local storage
  useEffect(() => {
    if (roomId && messages.length > 0) {
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
      .then(({ messages: roomMsgs }) => {
        if (cancelled || !roomMsgs || roomMsgs.length === 0) return;
        const textSnippets = roomMsgs
          .filter((m) => m.text && !m.text.startsWith('Voice message'))
          .slice(-10)
          .map((m) => `${m.senderName}: ${m.text}`);
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
        toast.info('Please wait a moment before sending another question.');
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
      const { content: currentHtml } = await fetchNote(roomId).catch(() => ({ content: '' }));
      
      const cleanHtml = markdownToNotesHtml(content);
      const mergedHtml = currentHtml ? `${currentHtml}<br/><hr/><br/>${cleanHtml}` : cleanHtml;

      if (socket) {
        socket.emit('notes:update', { roomId, content: mergedHtml });
      }
      toast.success('Appended to Room Collaborative Notes 📝');
    } catch (err) {
      console.warn('Failed to append to notes:', err);
      await navigator.clipboard.writeText(content);
      toast.success('Copied response to clipboard!');
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

  return (
    <div
      id={`ai-tutor-${roomId}`}
      data-radial-context="tutor"
      className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans select-text"
    >
      {/* Subtle radial glow of deep purple in the center */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />

      {/* ── 1. Refined, Clean Top Bar ── */}
      <header className="relative z-10 flex items-center justify-between h-14 md:h-16 px-4 md:px-6 shrink-0 border-b border-[#27272a]/30 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] shrink-0">
            <Bot className="w-4 h-4 text-purple-300" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-white text-sm md:text-base tracking-tight whitespace-nowrap">
              StudyBuddy AI
            </h2>
            {isGroqConfigured() ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full tracking-wider uppercase shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Zap className="w-2.5 h-2.5 text-emerald-400" />
                GROQ AI • LIVE
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 rounded-full tracking-wider uppercase">
                OFFLINE TUTOR
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {context && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400 max-w-[220px] truncate"
              title={`Context aware of current room discussions:\n${context}`}
            >
              <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">Room Context Active</span>
            </div>
          )}

          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Clear Chat History"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── 2. Message History & Empty State ── */}
      <ScrollArea className="flex-1 min-h-0 relative z-10 w-full" ref={scrollRef}>
        <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[420px] text-center px-4 py-8">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-4 max-w-xl w-full"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/25 to-indigo-500/25 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                    StudyBuddy AI Partner
                  </h1>
                  <p className="text-zinc-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
                    Your patient academic mentor. Ask any concept, debug code, or pick a starter accelerator below.
                  </p>
                </div>

                {/* 4 Clean Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-4">
                  {STARTER_CARDS.map((card, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(card.prompt)}
                      className="flex flex-col text-left p-3.5 rounded-xl bg-[#121320]/70 hover:bg-purple-600/10 border border-purple-500/15 hover:border-purple-500/35 transition-all shadow-sm group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <card.icon className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <span className="text-xs font-semibold text-white group-hover:text-purple-200 transition-colors">
                          {card.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={message.id} className="w-full">
                  {message.role === 'assistant' ? (
                    <div className="flex gap-3 md:gap-4 items-start w-full group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-purple-500/10">
                        <Bot className="h-4 w-4 text-purple-300" />
                      </div>

                      <div className="flex-1 min-w-0 bg-[#121320]/80 backdrop-blur-md border border-purple-500/20 hover:border-purple-500/30 transition-all rounded-2xl p-4 md:p-5 shadow-[0_4px_24px_rgba(147,51,234,0.05)] relative">
                        {/* AI Message Header */}
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-200">StudyBuddy AI</span>
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase tracking-widest border border-purple-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-purple-400" /> AI TUTOR
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSaveToNotes(message.content)}
                              className="p-1 px-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-all text-xs flex items-center gap-1 border border-white/5"
                              title="Save explanation to collaborative room notes"
                            >
                              <BookmarkPlus className="h-3.5 w-3.5 text-purple-300" />
                              <span className="text-[11px] hidden sm:inline text-zinc-300">Save to Notes</span>
                            </button>

                            <button
                              onClick={() => handleCopy(message.content, message.id)}
                              className="p-1 px-2 text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-all text-xs flex items-center gap-1 border border-white/5"
                              title="Copy response"
                            >
                              {copiedId === message.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span className="text-[11px] text-emerald-400 font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-purple-300" />
                                  <span className="text-[11px] text-zinc-300">Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="text-[#e4e4e7] overflow-hidden">
                          <MarkdownRenderer content={message.content || message.text || ''} />
                        </div>

                        {/* Follow-up accelerator chips (only on latest assistant response) */}
                        {index === lastAssistantIndex && (
                          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.04] flex-wrap">
                            <span className="text-[10px] text-zinc-500 font-medium mr-1">Follow up:</span>
                            <button
                              type="button"
                              onClick={() => sendMessage('Can you give a concrete, step-by-step code or practical example of this?')}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/15 border border-white/5 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              💡 Give code example
                            </button>
                            <button
                              type="button"
                              onClick={() => sendMessage('Give me a practice problem or quick quiz based on what you just explained.')}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/15 border border-white/5 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              🎯 Practice problem
                            </button>
                            <button
                              type="button"
                              onClick={() => sendMessage('Can you simplify this further in plain English as if I were a beginner?')}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/15 border border-white/5 hover:border-purple-500/30 text-zinc-300 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                              🧒 Simplify this
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-end items-start w-full">
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-[0_4px_16px_rgba(113,72,235,0.25)] max-w-[85%] md:max-w-[75%] border border-white/10">
                        <p className="text-[13.5px] md:text-[14px] leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm mt-1">
                        {user?.displayName?.[0] || 'U'}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 md:gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-[#c084fc]/20 text-[#c084fc] flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-purple-300 animate-pulse" />
                  </div>
                  <div className="bg-[#121320]/80 border border-purple-500/25 rounded-2xl px-4 py-2 text-purple-300 text-xs flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span>StudyBuddy is reasoning and synthesizing...</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {hasError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 flex-1">Unable to generate response. Try again?</span>
                  <button
                    onClick={handleRetry}
                    className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── 3. Quick Action Chips Docked Above Input ── */}
      <div className="shrink-0 px-4 md:px-6 pt-2 max-w-4xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {QUICK_ACTIONS.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const currentInput = input.trim();
                if (currentInput) {
                  if (action.label === 'Explain') sendMessage(`Explain this topic clearly with examples: "${currentInput}"`);
                  else if (action.label === 'Code Help') sendMessage(`Help me understand and debug this code: "${currentInput}"`);
                  else if (action.label === 'Quiz Me') sendMessage(`Quiz me on "${currentInput}" with questions and answers.`);
                  else if (action.label.includes('Simplify')) sendMessage(`Break this down simply in beginner-friendly terms: "${currentInput}"`);
                  else if (action.label === 'Practice') sendMessage(`Give me a practice problem with step-by-step solution for: "${currentInput}"`);
                  else sendMessage(`Give me proven study techniques for: "${currentInput}"`);
                } else {
                  sendMessage(action.prompt);
                }
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white rounded-full bg-[#121320]/80 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 transition-all whitespace-nowrap disabled:opacity-50 flex-shrink-0 shadow-sm active:scale-95"
            >
              <action.icon className="h-3.5 w-3.5 text-purple-400" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Polished Input Bar ── */}
      <div className="shrink-0 p-4 md:p-6 pt-2 relative z-10 w-full max-w-4xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="relative flex items-center bg-[#121320]/90 backdrop-blur-xl border border-purple-500/30 focus-within:border-purple-400/60 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all overflow-hidden p-1.5"
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
            placeholder="Ask StudyBuddy anything, paste code, or ask for study tips..."
            className="flex-1 bg-transparent border-0 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none max-h-36 custom-scrollbar"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all active:scale-95"
            title="Send (Enter ↵)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between px-2 pt-1.5 text-[10.5px] text-zinc-500">
          <span>Enter ↵ to send • Shift+Enter for new line</span>
          {input.length > 500 && (
            <span>{input.length}/{MAX_INPUT_LENGTH}</span>
          )}
        </div>
      </div>
    </div>
  );
}
