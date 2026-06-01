import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, GraduationCap, AlertCircle, RotateCcw, Copy, Check, Lightbulb, Calculator, Code, Brain, HelpCircle, Trash2, BookOpen, ArrowUp, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';

const QUICK_ACTIONS = [
  { icon: BookOpen, label: 'Explain', prompt: 'Explain this topic in simple terms with examples.' },
  { icon: Lightbulb, label: 'Study Tips', prompt: 'Give me proven study techniques for this subject.' },
  { icon: Calculator, label: 'Practice', prompt: 'Give me a practice problem with step-by-step solution.' },
  { icon: Code, label: 'Code Help', prompt: 'Help me understand and debug this code concept.' },
  { icon: Brain, label: 'Quiz Me', prompt: 'Quiz me on this topic with 5 questions and answers.' },
  { icon: HelpCircle, label: 'Simplify', prompt: 'Break this down as if I were 5 years old.' },
];

// ─── Production Guards ──────────────────────────────────────────
const AI_TIMEOUT_MS = 15_000;
const RATE_LIMIT_MS = 3_000;
const MAX_INPUT_LENGTH = 2_000;

function sanitizeInput(input) {
  return input.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '').trim().slice(0, MAX_INPUT_LENGTH);
}

// ─── Markdown Renderer ─────────────────────────────────────────
function MarkdownContent({ content }) {
  const rendered = useMemo(() => {
    const html = content
      // Code blocks (```lang\ncode```)
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) =>
        `<pre class="ai-code-block"><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
      // Numbered lists
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ai-li-num"><span class="ai-num">$1.</span> $2</li>')
      // Unordered lists
      .replace(/^[-•] (.+)$/gm, '<li class="ai-li">$1</li>')
      // Line breaks (double newline = paragraph)
      .replace(/\n\n/g, '</p><p class="ai-p">')
      .replace(/\n/g, '<br/>');

    return `<p class="ai-p">${html}</p>`;
  }, [content]);

  return (
    <div
      className="ai-markdown"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

// ─── Expert Response Generator ──────────────────────────────────
function generateExpertResponse(
  userInput,
  roomContext,
  messageHistory,
  signal
) {
  return new Promise((resolve, reject) => {
    const delay = 600 + Math.random() * 600;
    const timer = setTimeout(() => {
      if (signal?.aborted) {
        reject(new DOMException('AI request aborted', 'AbortError'));
        return;
      }

      const input = userInput.toLowerCase();
      const hasContext = roomContext.length > 0;
      const prevUserMsgs = messageHistory.filter(m => m.role === 'user').length;

      // Contextual greeting for first message
      const greeting = prevUserMsgs === 0
        ? `Hey there 👋 I'm your StudyBuddy — think of me as a patient tutor who's always here to help.\n\n`
        : '';

      // Build context reference
      const contextRef = hasContext
        ? `\n\n---\n*📎 I noticed your group has been ${roomContext.includes('code') ? 'working on code' : roomContext.includes('math') ? 'studying math' : 'discussing topics'} — I can tie this into what you're studying.*`
        : '';

      // ─── Pattern matching with rich, expert responses ────

      if (input.includes('quiz') || input.includes('test me')) {
        resolve(`${greeting}### 📝 Quick Knowledge Check\n\nLet me quiz you Answer each question, then check below.\n\n**1.** What is the key difference between a stack and a queue?\n\n**2.** Explain the time complexity of binary search.\n\n**3.** What does "DRY" stand for in software engineering?\n\n**4.** Name two benefits of using version control.\n\n**5.** What is the purpose of an API?\n\n---\n\n### ✅ Answers\n\n1. **Stack** = LIFO (Last In, First Out), **Queue** = FIFO (First In, First Out)\n2. **O(log n)** — it halves the search space each step\n3. **Don't Repeat Yourself** — avoid duplicating logic\n4. Collaboration + history tracking\n5. Allows different software to communicate${contextRef}`);
        return;
      }

      if (input.includes('explain') || input.includes('what is') || input.includes('how does') || input.includes('define')) {
        resolve(`${greeting}### 💡 Explanation\n\nGreat question Let me break this down clearly.\n\n**Core Concept:**\nThink of it like building blocks — each concept builds on the previous one.\n\n**Step-by-step:**\n1. Start with the **fundamentals** — what you already know\n2. Connect new information to **real-world examples**\n3. Test your understanding by **explaining it to someone else**\n\n**Key Insight:**\nThe best learners don't just memorize — they understand the *why* behind each concept.\n\n**Example:**\n\`\`\`\nIf you're learning about arrays:\n- Think of them as numbered lockers\n- Each locker (index) holds one item\n- You can access any locker instantly by its number\n\`\`\`\n\n**Pro tip:** Draw a diagram. Visual learners retain 65% more information.\n\nWant me to go deeper into any specific part? 🎯${contextRef}`);
        return;
      }

      if (input.includes('study tip') || input.includes('how to study') || input.includes('learn better') || input.includes('focus')) {
        resolve(`${greeting}### 🧠 Evidence-Based Study Techniques\n\nHere's what research says actually works:\n\n**Tier 1 — Most Effective:**\n\n1. **Active Recall** — Close the book, write down everything you remember\n   - *Why it works:* Forces your brain to retrieve, strengthening neural pathways\n\n2. **Spaced Repetition** — Review at increasing intervals (1 day → 3 days → 7 days → 14 days)\n   - *Why it works:* Fights the forgetting curve\n\n3. **Feynman Technique** — Explain it like you're teaching a child\n   - *Why it works:* Exposes gaps in understanding immediately\n\n**Tier 2 — Support Techniques:**\n\n- ⏱️ **Pomodoro** — 25 min deep focus → 5 min break → repeat\n- 🎯 **Interleaving** — Mix different topics instead of studying one thing for hours\n- 📝 **Elaboration** — Ask "why?" and "how?" about everything\n\n**Your Study Schedule Template:**\n\`\`\`\n📅 Day 1: Learn + take handwritten notes\n📅 Day 2: Active recall (no notes allowed)\n📅 Day 4: Practice problems\n📅 Day 7: Teach it to someone\n📅 Day 14: Final review\n\`\`\`\n\nYou've got this Start with just ONE technique today. 💪${contextRef}`);
        return;
      }

      if (input.includes('practice') || input.includes('problem') || input.includes('exercise') || input.includes('solve')) {
        resolve(`${greeting}### 🎯 Practice Challenge\n\n**Problem:**\nDesign a function that checks if a string is a palindrome (reads the same forwards and backwards).\n\n**Constraints:**\n- Ignore spaces and punctuation\n- Case-insensitive\n- Must run in O(n) time\n\n**Hints (try before looking):**\n\n<details>\n1. Think about two pointers — one from the start, one from the end\n2. Skip non-alphabetic characters\n3. Compare characters as you move inward\n</details>\n\n**Solution:**\n\`\`\`javascript\nfunction isPalindrome(str) {\n  // Clean the string: lowercase + remove non-alphanumeric\n  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');\n  \n  let left = 0;\n  let right = cleaned.length - 1;\n  \n  while (left < right) {\n    if (cleaned[left] !== cleaned[right]) return false;\n    left++;\n    right--;\n  }\n  \n  return true;\n}\n\n// Tests\nisPalindrome("A man, a plan, a canal: Panama") // true\nisPalindrome("hello") // false\n\`\`\`\n\n**Time: O(n)** | **Space: O(n)** for cleaned string\n\nWant a harder problem? Just say the word 🔥${contextRef}`);
        return;
      }

      if (input.includes('code') || input.includes('programming') || input.includes('debug') || input.includes('error') || input.includes('bug')) {
        resolve(`${greeting}### 💻 Code Help\n\nI'd love to help you debug Here's my systematic approach:\n\n**Step 1: Read the Error**\nErrors tell you *exactly* what's wrong. Key parts:\n- **Type** — \`TypeError\`, \`ReferenceError\`, \`SyntaxError\`\n- **Message** — The human-readable description\n- **Line number** — Where it happened\n\n**Step 2: Isolate the Problem**\n\`\`\`javascript\n// Add strategic console.logs\nconsole.log('Before:', variable);\nproblematicFunction();\nconsole.log('After:', variable);\n\`\`\`\n\n**Step 3: Common Fixes**\n\n| Error | Likely Cause | Fix |\n|-------|-------------|-----|\n| \`undefined is not a function\` | Wrong variable name or missing import | Check spelling & imports |\n| \`Cannot read property of null\` | Data not loaded yet | Add null check or optional chaining \`?.\` |\n| \`Maximum call stack exceeded\` | Infinite recursion | Check base case |\n| \`Module not found\` | Wrong path | Check relative path & file extension |\n\n**Pro Tips:**\n- Use \`debugger;\` statements + browser DevTools\n- Rubber duck debugging: explain your code line by line\n- Write the test FIRST, then fix until it passes\n\nShare your code and error message, and I'll give you a specific diagnosis 🔍${contextRef}`);
        return;
      }

      if (input.includes('simplif') || input.includes('eli5') || input.includes('beginner') || input.includes('basic')) {
        resolve(`${greeting}### 🧒 Let Me Simplify This\n\nImagine you're explaining to a friend who's never heard of this before...\n\n**The Simple Version:**\nThink of it like a recipe 🍳:\n- You have **ingredients** (your inputs/data)\n- You follow **steps** in order (your process/algorithm)\n- You get a **result** (your output)\n\nIf the recipe doesn't work:\n1. Did you use the right ingredients? → *Check your inputs*\n2. Did you follow the steps in order? → *Check your logic*\n3. Is the oven the right temperature? → *Check your environment/config*\n\n**Analogy that clicks:**\n> Programming is like giving very precise instructions to a very smart but very literal friend. They'll do *exactly* what you say — which means you have to say exactly what you mean!\n\n**Next step:** Tell me exactly which part is confusing and I'll zoom in further. No question is too basic 🌟${contextRef}`);
        return;
      }

      if (input.includes('motivat') || input.includes('stuck') || input.includes('hard') || input.includes('give up') || input.includes('difficult')) {
        resolve(`${greeting}### 💪 You've Got This!\n\nI hear you — learning is hard sometimes. But here's the thing:\n\n**The struggle IS the learning.** 🧠\n\nEvery expert was once a beginner who felt exactly like you do right now.\n\n**When you feel stuck:**\n1. ✅ Take a 10-minute break (walk, stretch, hydrate)\n2. ✅ Break the problem into the *smallest* possible piece\n3. ✅ Solve just that ONE piece\n4. ✅ Celebrate the small win 🎉\n5. ✅ Move to the next piece\n\n**Reframe:**\n- "I can't do this" → "I can't do this *yet*"\n- "This is too hard" → "This is *new to me*"\n- "I'm bad at this" → "I'm *learning* this"\n\n**Fun fact:** Studies show that struggle activates deeper learning. Your brain literally grows new connections when you push through difficulty.\n\nYou're not behind. You're exactly where you need to be. Keep going 🚀${contextRef}`);
        return;
      }

      // Default: intelligent general response
      resolve(`${greeting}### 📚 Let Me Help!\n\nThat's a great question to explore. Here's how I'd approach it:\n\n**Framework for Understanding Anything:**\n\n1. **What is it?** — Define the core concept in one sentence\n2. **Why does it matter?** — Connect it to something you already know\n3. **How does it work?** — Break it into 3-5 steps\n4. **Can I use it?** — Apply it to a real example\n\n**Suggestions:**\n- 📖 Start with the "what" and "why" before the "how"\n- 🗺️ Draw a concept map connecting related ideas\n- 👥 Discuss with your study group for different perspectives\n- ✍️ Write a one-paragraph summary in your own words\n\n**Want me to:**\n- 📝 Quiz you on this topic?\n- 💡 Explain with a specific example?\n- 🎯 Create a practice problem?\n- 🧒 Simplify it further?\n\nJust let me know how I can help I'm here as long as you need. 🌟${contextRef}`);
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

// ─── Component ───────────────────────────────────────────────────
export function AiStudyBuddy({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [aiState, setAiState] = useState('idle');
  const [context, setContext] = useState('');
  const [lastFailedInput, setLastFailedInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const scrollRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const sendingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const { user } = useAuth();

  // Load message history
  useEffect(() => {
    if (!roomId) return;
    const messagesQuery = query(
      collection(db, 'rooms', roomId, 'ai-chat'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const logCleanup = logger.trackListener(`ai-chat/${roomId}`);
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({ id: doc.id, role: data.role, content: data.content, timestamp: data.timestamp || 0 });
      });
      setMessages(msgs);
    }, (error) => { logger.error('AI chat listener error', 'AiStudyBuddy', error); });

    return () => { unsubscribe(); logCleanup(); };
  }, [roomId]);

  // Gather room context
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'desc'), limit(10));
    const logCleanup = logger.trackListener(`ai-context/${roomId}`);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => { const d = doc.data(); if (d.text) msgs.push(d.text); });
      setContext(msgs.reverse().join(' '));
    });
    return () => { unsubscribe(); logCleanup(); };
  }, [roomId]);

  // Auto-scroll
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }
    });
  }, [messages, aiState]);

  // Cleanup on unmount
  useEffect(() => { return () => { abortControllerRef.current?.abort(); }; }, []);

  const persistMessage = useCallback(async (message) => {
    try {
      await withRetry(() => addDoc(collection(db, 'rooms', roomId, 'ai-chat'), {
        role: message.role, content: message.content, timestamp: message.timestamp, userId: user?.uid || null,
      }), { maxRetries: 2 });
    } catch (error) { logger.warn('Failed to persist AI message', 'AiStudyBuddy', error); }
  }, [roomId, user]);

  const sendMessage = useCallback(async (messageText) => {
    const rawText = (messageText || input).trim();
    if (!rawText || !user) return;
    if (sendingRef.current) return;

    const now = Date.now();
    if (now - lastSendTimeRef.current < RATE_LIMIT_MS) {
      toast.info('Please wait a moment before sending another message.');
      return;
    }

    const text = sanitizeInput(rawText);
    if (!text) return;

    sendingRef.current = true;
    lastSendTimeRef.current = now;

    const userMessage = { id: `user-${now}`, role: 'user', content: text, timestamp: now };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAiState('sending');
    setLastFailedInput('');
    persistMessage(userMessage);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const responseText = await generateExpertResponse(text, context, messages, controller.signal);
      const assistantMessage = { id: `ai-${Date.now()}`, role: 'assistant', content: responseText, timestamp: Date.now() };
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
    } finally { sendingRef.current = false; }
  }, [input, user, context, messages, persistMessage]);

  const handleRetry = useCallback(() => { if (lastFailedInput) sendMessage(lastFailedInput); }, [lastFailedInput, sendMessage]);

  const handleCopy = useCallback(async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('Copied to clipboard');
    } catch { toast.error('Failed to copy'); }
  }, []);

  const handleClearChat = useCallback(async () => {
    if (!confirm('Clear all AI chat messages?')) return;
    try {
      const snapshot = await getDocs(collection(db, 'rooms', roomId, 'ai-chat'));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      toast.success('Chat cleared');
    } catch (error) {
      logger.error('Failed to clear chat', 'AiStudyBuddy', error);
      toast.error('Failed to clear chat');
    }
  }, [roomId]);

  const isLoading = aiState === 'sending';
  const hasError = aiState === 'error';

  // ─── Listen for Radial Menu Actions ───────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const action = (e).detail?.action;
      if (!action || !action.startsWith('tutor-')) return;

      switch (action) {
        case 'tutor-ask':
          // Focus the input inside PlaceholdersAndVanishInput
          const inputEl = document.getElementById(`ai-tutor-${roomId}`)?.querySelector('input');
          inputEl?.focus();
          break;
        case 'tutor-clear':
          handleClearChat();
          break;
        case 'tutor-help':
          toast.info('Ask me questions about your notes, or use the quick actions below!');
          break;
        case 'tutor-settings':
          window.dispatchEvent(new CustomEvent('studix:action', { 
            detail: { action: 'tutor-settings' } 
          }));
          break;
        default:
          break;
      }
    };

    const el = document.getElementById(`ai-tutor-${roomId}`);
    if (el) {
      el.addEventListener('radial-action', handler);
      return () => el.removeEventListener('radial-action', handler);
    }
  }, [roomId, handleClearChat]);

  return (
    <div 
      id={`ai-tutor-${roomId}`}
      data-radial-context="tutor"
      className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans"
    >
      {/* Subtle radial glow of deep purple in the center */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />

      {/* 1. Header (Consolidated & Fully Responsive) */}
      <div className="relative z-10 flex items-center h-16 md:h-20 px-4 md:px-6 shrink-0 border-b border-[#27272a]/30 gap-4">
        {/* Left: Logo & Title group */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-[#c084fc]" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 md:gap-3">
            <h3 className="font-semibold text-white text-sm md:text-base lg:text-lg tracking-tight whitespace-nowrap">
              StudyBuddy AI
            </h3>
            <span className="inline-block w-fit px-1.5 py-0.5 text-[8px] md:text-[9px] lg:text-[10px] font-bold text-[#c084fc] border border-[#c084fc]/30 rounded-full tracking-wider uppercase">
              EXPERT
            </span>
          </div>
        </div>

        {/* Middle: Integrated Action Bar (Smarter & Auto-Scrolling) */}
        <div className="flex-1 min-w-0 relative h-full flex items-center justify-center">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#09090b] to-transparent z-20 pointer-events-none md:hidden" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#09090b] to-transparent z-20 pointer-events-none md:hidden" />
          
          <div className="w-full flex items-center gap-1 p-1 rounded-xl bg-[#09090b]/40 backdrop-blur-sm overflow-x-auto no-scrollbar scroll-smooth">
            {QUICK_ACTIONS.map((action, index) => (
              <button
                key={index}
                onClick={() => sendMessage(action.prompt)}
                disabled={isLoading}
                className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2.5 text-[11px] md:text-xs lg:text-sm font-medium text-[#a1a1aa] hover:text-[#d8b4fe] rounded-lg transition-all hover:bg-[#c084fc]/10 whitespace-nowrap disabled:opacity-50 flex-shrink-0"
              >
                <action.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden xl:inline">{action.label}</span>
                <span className="hidden sm:inline xl:hidden">
                  {action.label === 'Explain' ? 'Explain' : 
                   action.label === 'Study Tips' ? 'Tips' : 
                   action.label === 'Practice' ? 'Prac' : 
                   action.label === 'Code Help' ? 'Code' : 
                   action.label === 'Quiz Me' ? 'Quiz' : 'Simplify'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <button 
          onClick={handleClearChat} 
          className="p-2 text-[#52525b] hover:text-white transition-colors shrink-0"
          title="Clear History"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* 3. Main Content */}
      <ScrollArea className="flex-1 min-h-0 relative z-10 w-full" ref={scrollRef}>
        <div className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center px-4">
              <div className="flex flex-col items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-white/90">
                  StudyBuddy AI
                </h1>
                <p className="text-[#a1a1aa] text-sm max-w-[300px] mx-auto">
                  How can I help you study today?
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-5 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                    message.role === 'assistant'
                      ? 'bg-[#c084fc]/20 text-[#c084fc]'
                      : 'bg-[#27272a] text-[#a1a1aa]'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-medium">{user?.displayName?.[0] || 'U'}</span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`max-w-[85%] text-[15px] leading-relaxed ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div className="text-[#e4e4e7]">
                      {message.role === 'assistant' ? (
                        <div className="group relative">
                          <MarkdownContent content={message.content} />
                          <div className="absolute top-0 right-full pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleCopy(message.content, message.id)} className="p-1.5 text-[#52525b] hover:text-[#a1a1aa] rounded-md hover:bg-[#27272a] transition-all">
                               {copiedId === message.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                             </button>
                          </div>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-5">
                  <div className="w-8 h-8 rounded-full bg-[#c084fc]/20 text-[#c084fc] flex items-center justify-center mt-1 shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="text-[#a1a1aa] text-[15px] flex items-center">
                    Thinking...
                  </div>
                </div>
              )}

              {/* Error state */}
              {hasError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-400 flex-1">Something went wrong. Try again?</span>
                  <button onClick={handleRetry} className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 4. Dynamic Input Area */}
      <div className="shrink-0 p-6 relative z-10 w-full max-w-4xl mx-auto">
        <PlaceholdersAndVanishInput
          placeholders={[
            "What's the difference between a stack and a queue?",
            "Can you explain the time complexity of binary search?",
            "What does 'DRY' stand for in software engineering?",
            "Write a Javascript method to reverse a string",
            "Give me proven study techniques for this subject.",
          ]}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
          onSubmit={(e) => { e && e.preventDefault && e.preventDefault(); sendMessage(); }}
        />
      </div>

      {/* Styles for markdown rendering */}
      <style>{`
        .ai-markdown { line-height: 1.7; color: #e4e4e7; }
        .ai-markdown .ai-p { margin: 0 0 1rem 0; }
        .ai-markdown .ai-p:last-child { margin-bottom: 0; }
        .ai-markdown .ai-h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; color: #ffffff; }
        .ai-markdown .ai-h4 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem 0; color: #ffffff; }
        .ai-markdown strong { font-weight: 600; color: #ffffff; }
        .ai-markdown em { font-style: italic; color: #a1a1aa; }
        .ai-markdown .ai-li { margin-left: 1.5rem; position: relative; margin-bottom: 0.6rem; }
        .ai-markdown .ai-li::before { content: "•"; position: absolute; left: -1.2rem; color: #a1a1aa; }
        .ai-markdown .ai-li-num { margin-left: 1.5rem; margin-bottom: 0.6rem; }
        .ai-markdown .ai-num { color: #a1a1aa; font-weight: 500; }
        .ai-markdown .ai-inline-code { background: #27272a; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85em; font-family: 'SF Mono', 'Fira Code', monospace; color: #d8b4fe; }
        .ai-markdown .ai-code-block { background: #000000; border: 1px solid #27272a; border-radius: 8px; padding: 1rem; margin: 1rem 0; overflow-x: auto; font-size: 0.85em; font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1.5; color: #e4e4e7; }
        .ai-markdown hr { border: none; border-top: 1px solid #27272a; margin: 1.5rem 0; }
      `}</style>
    </div>
  );
}
