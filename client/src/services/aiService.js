/**
 * AI StudyBuddy Service
 * Provides educational explanations, multi-model intelligent routing (Groq API),
 * study assistance, discussion summarization, and direct chat interactive responses.
 */

// Production guards
const MAX_INPUT_LENGTH = 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const AI_MODELS = [
  {
    id: 'auto',
    name: 'Auto (Smart Router)',
    badge: 'Auto Router',
    shortName: 'Auto',
    tag: 'Smart',
    description: 'Intelligently selects the best model based on query complexity',
    speed: 'Dynamic',
    icon: 'Sparkles',
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    badge: 'Llama 3.3 70B',
    shortName: 'Llama 3.3',
    tag: 'Balanced',
    description: 'Deep conceptual reasoning & comprehensive tutoring (Meta)',
    speed: 'Balanced',
    fallbackList: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    icon: 'Bot',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    badge: 'Llama 3.1 8B',
    shortName: '8B Instant',
    tag: 'Fastest',
    description: 'Ultra-fast low-latency answers & quick definitions (Meta)',
    speed: '< 200ms',
    fallbackList: ['llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
    icon: 'Zap',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 70B',
    badge: 'DeepSeek R1',
    shortName: 'DeepSeek R1',
    tag: 'Reasoning',
    description: 'Advanced logic, step-by-step math & code debugging',
    speed: 'Deep Logic',
    fallbackList: ['deepseek-r1-distill-llama-70b', 'qwen-2.5-32b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'],
    icon: 'Brain',
  },
];

export function isGroqConfigured() {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return Boolean(key && key.trim() && !key.includes('your_groq_api_key'));
}

/**
 * Intelligent Router: Analyzes query complexity and returns the optimal model ID
 */
export function routeModelForQuery(prompt) {
  if (!prompt || typeof prompt !== 'string') return 'llama-3.3-70b-versatile';
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // 1. Code, Math, Algorithms, Debugging -> DeepSeek R1 70B
  const codePatterns = [
    /```[\s\S]*?```/,
    /\b(function|const|let|var|def|class|import|return|export|async|await)\b/,
    /\b(debug|bug|error|exception|traceback|syntax|stack overflow|refactor|compile|segmentation fault)\b/,
    /\b(algorithm|big-o|time complexity|space complexity|binary search|dynamic programming|recursion|dfs|bfs|graph|matrix)\b/,
    /\b(derivative|integral|eigenvalue|calculus|probability|math proof|theorem|equation|polynomial)\b/,
    /[{}()[\]<>=;]{3,}/,
  ];

  if (codePatterns.some((pattern) => pattern.test(lower) || pattern.test(text))) {
    return 'deepseek-r1-distill-llama-70b';
  }

  // 2. Greetings, Quick Definitions, Short Flash Queries -> Llama 3.1 8B Instant
  const isGreeting = /^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(lower);
  const isQuickDefinition = /^(what is|define|who is|meaning of|translate)\s+[\w\s]{1,35}\??$/i.test(lower);
  const isShortQuery = text.length <= 60 && !text.includes('\n');

  if (isGreeting || isQuickDefinition || isShortQuery) {
    return 'llama-3.1-8b-instant';
  }

  // 3. Deep conceptual explanations, Study plans, Essays, General tutoring -> Llama 3.3 70B Versatile
  return 'llama-3.3-70b-versatile';
}

/**
 * Helper to get the fallback chain for a requested model
 */
function getModelChain(requestedModelId, prompt = '') {
  let effectiveId = requestedModelId;
  if (!effectiveId || effectiveId === 'auto') {
    effectiveId = routeModelForQuery(prompt);
  }

  const modelDef = AI_MODELS.find((m) => m.id === effectiveId);
  const list = modelDef?.fallbackList ? [...modelDef.fallbackList] : [effectiveId];

  // Always ensure our known active models are in the fallback chain to prevent total failure
  const robustChain = [...list, 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  return {
    targetModel: effectiveId,
    chain: Array.from(new Set(robustChain.filter(Boolean))),
  };
}

/**
 * Execute chat completion with intelligent multi-model routing and automatic fallback
 */
export async function executeGroqChatCompletion({
  messages,
  model = 'auto',
  temperature = 0.6,
  max_tokens = 2000,
  signal = null,
}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }

  const lastUserMsg = [...(messages || [])].reverse().find((m) => m.role === 'user');
  const userPrompt = lastUserMsg?.content || '';
  const { targetModel, chain } = getModelChain(model, userPrompt);

  let lastError = null;
  const startTime = Date.now();

  for (const candidateModel of chain) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
          model: candidateModel,
          messages,
          temperature,
          max_tokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const choice = data.choices?.[0];
        let content = choice?.message?.content?.trim();
        // If content is empty but model reasoning is present (e.g. gpt-oss-120b)
        if (!content && choice?.message?.reasoning) {
          content = choice.message.reasoning.trim();
        }

        if (content) {
          // Strip any raw <think> tags if present
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          const latencyMs = Date.now() - startTime;
          return {
            content,
            modelUsed: targetModel,
            actualModel: candidateModel,
            latencyMs,
          };
        }
      } else {
        const errText = await res.text();
        console.warn(`[Groq] Model ${candidateModel} HTTP ${res.status}:`, errText);
        lastError = new Error(`Groq ${candidateModel} status ${res.status}: ${errText}`);
        // Immediately try next model in fallback chain
        continue;
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
      console.warn(`[Groq] Model ${candidateModel} error:`, err.message);
    }
  }

  if (lastError) throw lastError;
  return null;
}

export async function callGroqApi({
  prompt,
  context = '',
  history = [],
  model = 'auto',
  signal = null,
}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }

  const systemMessage = {
    role: 'system',
    content: `You are StudyBuddy AI, an authentic, highly knowledgeable, and friendly study partner on Studix (a collaborative study platform).

HUMANIZER & COMMUNICATION RULES:
- Sound like a sharp, supportive human peer or mentor sitting next to the student.
- DO NOT use throat-clearing filler like "Sure! I would be happy to explain that!" or "As an AI, I...". Answer directly.
- BANNED CLICHES: Never use robotic AI words like "delve", "testament", "tapestry", "plethora", "beacon", "in conclusion", or "it is important to note".
- Use natural conversational flow, varied sentence lengths, and clear real-world examples.

CORE GUIDELINES BY QUESTION TYPE:
1. GREETINGS & CASUAL CHITCHAT (e.g., "hi", "hello", "hey", "how are you", "what's up", introductions):
   - Reply warmly and naturally in 1-2 friendly sentences.
   - Welcome them and ask what they'd like to study or code today.
   - NEVER generate tables, essays, or linguistic breakdowns for greetings!

2. CONCEPT EXPLANATIONS (e.g., "explain recursion", "what is useEffect"):
   - Structure cleanly with Markdown:
     - ### 💡 Concept Overview (concise 1-2 sentence core idea)
     - ### 🔍 How It Works (intuitive analogy or step-by-step logic)
     - ### 💻 Practical Example (short clean code snippet or concrete application)
     - ### 🎯 Key Takeaway (what to remember)

3. CODE & DEBUGGING:
   - Identify the cause or solution directly.
   - Provide a clean, formatted code block with language identifier.
   - Add 2-3 crisp bullet points explaining why the fix works.

4. COMPARISONS & DIFFERENCES:
   - Use a clean, well-formatted Markdown table (| Feature | A | B |).
   - Follow with a direct "When to use which" recommendation.

5. QUIZZES & PRACTICE:
   - Provide 3-5 numbered questions with clear difficulty levels.
   - Include hints or answers formatted cleanly below.

6. FORMATTING RULES:
   - Always output valid GitHub-Flavored Markdown (GFM).
   - NEVER output raw HTML tags like <br>, <p>, or <table>.
${context ? `\nActive Room Context from Peers:\n${context}` : ''}`,
  };

  const formattedHistory = (history || [])
    .filter((m) => m.content || m.text)
    .slice(-8)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || m.text).slice(0, 1500),
    }));

  const messages = [
    systemMessage,
    ...formattedHistory,
    { role: 'user', content: String(prompt).slice(0, 3000) },
  ];

  const result = await executeGroqChatCompletion({
    messages,
    model,
    temperature: 0.6,
    max_tokens: 2000,
    signal,
  });

  return result;
}

export function sanitizeAiInput(input) {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}

/**
 * Build clean, humanized study summary fallback when offline or when API is unavailable
 */
export function buildSmartFallbackSummary(textMessages = [], roomName = 'Study Room') {
  if (!textMessages || textMessages.length === 0) {
    return `### Summary
No messages have been recorded in **${roomName}** yet. As soon as you and your peers start chatting, you can generate a quick summary here!

### Key Discussion Points
- Waiting for the first discussion topics or questions.

### Action Items
*No pending action items or tasks.*

### Next Study Focus
Start by sharing what you're working on today or ask a question to kick off the session!`;
  }

  const participants = Array.from(new Set(textMessages.map((m) => m.senderName || 'Anonymous'))).filter(Boolean);
  const questions = textMessages.filter((m) => m.text && m.text.includes('?')).slice(-5);

  const allText = textMessages.map((m) => m.text || '').join(' ');
  const wordCounts = {};
  allText
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, '')
    .split(/\s+/)
    .forEach((w) => {
      if (
        w.length > 3 &&
        ![
          'about', 'there', 'would', 'could', 'should', 'think', 'where', 'which',
          'what', 'have', 'from', 'this', 'that', 'with', 'your', 'just', 'been',
          'were', 'hello', 'good', 'some',
        ].includes(w)
      ) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    });

  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const commitmentPatterns = [/\b(i will|i'll|let's|we need to|todo:|task:)\b/i];
  const detectedTasks = textMessages.filter((m) => commitmentPatterns.some((p) => p.test(m.text || ''))).slice(-4);

  const isBriefChat = textMessages.length <= 10;
  const participantStr = participants.length > 0 ? participants.join(', ') : 'Study group';

  let out = `### Summary\n`;
  if (isBriefChat) {
    out += `The group recently opened discussion in **${roomName}** with **${participantStr}**. Across ${textMessages.length} brief exchange${textMessages.length === 1 ? '' : 's'}, members connected and initiated conversation.\n\n`;
  } else {
    out += `Active study session in **${roomName}** with **${participantStr}** (${textMessages.length} messages analyzed). The team collaborated on shared learning objectives and problem solving.\n\n`;
  }

  out += `### Key Discussion Points\n`;
  if (questions.length > 0) {
    questions.forEach((q) => {
      out += `- **Question raised by ${q.senderName || 'peer'}**: *"${q.text.slice(0, 120)}"${q.text.length > 120 ? '...' : ''}*\n`;
    });
  } else if (topKeywords.length > 0) {
    out += `- **Topics mentioned**: High interest around **${topKeywords.join(', ')}**.\n`;
    out += `- **Interaction**: Members shared quick updates and coordinated in the room.\n`;
  } else {
    out += `- Members greeted each other and checked into the study channel.\n`;
  }
  out += `\n`;

  out += `### Action Items\n`;
  if (detectedTasks.length > 0) {
    detectedTasks.forEach((t, i) => {
      out += `${i + 1}. ${t.text.trim()} *(mentioned by ${t.senderName || 'Team'})*\n`;
    });
  } else {
    out += `*No pending action items or tasks were assigned in this discussion.*\n`;
  }
  out += `\n`;

  out += `### Next Study Focus\n`;
  out += `Continue building understanding in **${roomName}**. Feel free to tag \`@ai\` in the chat if you need an explanation, code review, or practice quiz on any topic!`;

  return out;
}

/**
 * Summarize a list of chat messages into structured study notes
 */
export function summarizeChatDiscussion(messages = [], roomName = 'Study Room') {
  const textMessages = (messages || []).filter((m) => m.text && !m.text.startsWith('Voice message'));
  return buildSmartFallbackSummary(textMessages, roomName);
}

/**
 * Generate humanized, grounded chat summary using Groq LPU with zero hallucination
 */
export async function generateExecutiveChatSummary({ messages = [], roomName = 'Study Room', signal = null }) {
  const textMessages = (messages || []).filter((m) => m.text && !m.text.startsWith('Voice message'));
  if (textMessages.length === 0) {
    return buildSmartFallbackSummary([], roomName);
  }

  if (isGroqConfigured()) {
    try {
      const transcript = textMessages
        .slice(-40)
        .map((m) => `[${m.senderName || 'Member'}]: ${m.text}`)
        .join('\n');

      const systemPrompt = `You are a thoughtful, observant study partner on Studix (a real-time collaborative study platform).
Your task is to write a clean, grounded, human summary of the recent discussion in room "${roomName}".

STRICT HUMANIZER & FACTUALITY RULES:
1. ABSOLUTE ACCURACY TO TRANSCRIPT:
   - Only summarize what participants ACTUALLY discussed in the transcript.
   - NEVER invent or hallucinate tasks, deliverables, code files, architecture proposals, or corporate style guides that nobody mentioned.
   - If the conversation was brief, casual, or introductory (e.g., people saying "hi", "how are you", sharing a room ID, or asking small questions), summarize it honestly and warmly in 1-2 friendly sentences. Do NOT force a grandiose corporate breakdown for casual greetings.

2. HUMAN VOICE & TONE:
   - Sound like an intelligent, friendly human taking clean study notes.
   - Ban robotic AI buzzwords and corporate jargon: do not use "delve", "testament", "tapestry", "plethora", "collaboration cadence", "crucial milestone alignment", "supercharge", or "deep dive".
   - Keep language clear, direct, and pleasant to read.

3. STRUCTURED OUTPUT FORMAT:
You MUST format your output strictly in valid Markdown using these 4 section headers:

### Summary
A concise 2-3 sentence overview of what actually happened, who participated, and what the conversation focused on.

### Key Discussion Points
- 2-4 bullet points (- ) capturing genuine topics, questions asked, answers given, or shared resources.
- If the chat was very brief (just greetings or short talk), 1-2 concise bullets are sufficient.

### Action Items
- List concrete tasks or promises that participants EXPLICITLY agreed to do.
- If NO tasks or commitments were made in the conversation, you MUST write:
  *No pending action items or tasks were assigned in this discussion.*

### Next Study Focus
One helpful, encouraging study tip or concept suggestion directly relevant to the subject of "${roomName}".`;

      const aiSummary = await executeGroqChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the discussion transcript from "${roomName}":\n\n${transcript}` },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1200,
        signal,
      });

      if (aiSummary?.content) {
        return aiSummary.content;
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[AI Service] Groq chat summary error, using fallback:', err.message);
    }
  }

  return buildSmartFallbackSummary(textMessages, roomName);
}

/**
 * Generate intelligent AI responses for chat mentions or direct AI queries
 */
export async function generateAiStudyResponse(userInput, recentMessages = [], options = {}) {
  const cleanInput = sanitizeAiInput(userInput);
  const lower = cleanInput.toLowerCase();

  const contextSnippet = recentMessages
    .slice(-6)
    .map((m) => `${m.senderName}: ${m.text}`)
    .join(' | ');

  const rawPrompt = cleanInput
    .replace(/^@ai\s*/i, '')
    .replace(/^@studybuddy\s*/i, '')
    .replace(/^\/ai\s*/i, '')
    .replace(/^ai:\s*/i, '')
    .trim();

  const isGreeting =
    /^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(rawPrompt) ||
    rawPrompt.length <= 3;

  if (isGroqConfigured()) {
    try {
      const groqAnswer = await callGroqApi({
        prompt: cleanInput,
        context: contextSnippet,
        model: options?.model || 'auto',
        signal: options?.signal,
      });
      if (groqAnswer?.content) return groqAnswer.content;
      if (typeof groqAnswer === 'string') return groqAnswer;
    } catch (err) {
      console.warn('[AI Service] Groq response error, falling back to local template:', err.message);
    }
  }

  if (isGreeting) {
    return (
      `### Welcome to StudyBuddy\n\n` +
      `I'm **StudyBuddy AI**, your real-time academic companion on Studix.\n\n` +
      `What are we studying or working on today? Here's how I can help:\n` +
      `- **Explain concepts** with clear real-world analogies (\`@ai explain <topic>\`)\n` +
      `- **Debug & write code** with step-by-step fixes (\`@ai code <issue>\`)\n` +
      `- **Test your knowledge** with a quick quiz (\`@ai quiz me\`)\n` +
      `- **Summarize room discussions** anytime (\`@ai summarize\`)\n\n` +
      `Ask a question or tag me anytime with \`@ai\`! 🚀`
    );
  }

  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('recap')) {
    return generateExecutiveChatSummary({ messages: recentMessages, roomName: 'Study Room', signal: options?.signal });
  }

  if (
    lower.includes('explain') ||
    lower.includes('what is') ||
    lower.includes('how does') ||
    lower.includes('break down') ||
    lower.includes('define')
  ) {
    const topic = cleanInput
      .replace(/^@ai\s*/i, '')
      .replace(/^@studybuddy\s*/i, '')
      .replace(/^\/ai\s*/i, '')
      .replace(/explain\s*(this\s*:?)?/i, '')
      .replace(/concept\s*clearly\s*:?/i, '')
      .replace(/["']/g, '')
      .trim();

    if (!topic || /^(hi+|hello+|hey+|yo+|sup)\b/i.test(topic) || topic.length <= 3) {
      return (
        `### Ready to Study\n\n` +
        `Tell me what topic or concept you'd like to explore today! For example:\n` +
        `- \`@ai explain async/await in JavaScript\`\n` +
        `- \`@ai explain binary search trees\`\n` +
        `- \`@ai explain the difference between TCP and UDP\`\n\n` +
        `I'll break it down with clear explanations and examples! 💡`
      );
    }

    return (
      `### Concept Overview: ${topic}\n\n` +
      `Here is a clear, step-by-step breakdown:\n\n` +
      `1. **Core Idea:** **${topic}** is best understood through its fundamental purpose and practical application.\n` +
      `2. **Real-world Analogy:** Think of it like a coordinated system where each component has a single, well-defined responsibility.\n` +
      `3. **Practical Application:** Connect this concept directly to what you are studying or building right now.\n\n` +
      `**🎯 Key Takeaway:** Understanding *why* it works makes remembering *how* it works effortless.\n\n` +
      `*Want me to give a code example, quiz you on this, or simplify it further? Just ask \`@ai quiz me\`!*`
    );
  }

  if (lower.includes(' vs ') || lower.includes('difference between') || lower.includes('compare')) {
    return (
      `### Comparison & Key Differences\n\n` +
      `| Dimension | Option A | Option B |\n` +
      `|---|---|---|\n` +
      `| **Primary Purpose** | Specialized for specific workflows | General-purpose, flexible usage |\n` +
      `| **Performance** | Optimized for lower overhead | Balances ease of use with speed |\n` +
      `| **When to Choose** | When strict guarantees are required | Rapid prototyping and standard builds |\n\n` +
      `**💡 Recommendation:** Pick the approach that matches your project's scaling goals and team conventions.`
    );
  }

  if (lower.includes('quiz') || lower.includes('test me') || lower.includes('practice question')) {
    return (
      `### Quick Knowledge Check\n\n` +
      `Test your understanding with these practice questions:\n\n` +
      `**1.** What is the primary difference between synchronous and asynchronous operations?\n` +
      `**2.** Why is time complexity (Big-O) crucial when scaling algorithms?\n` +
      `**3.** What is the benefit of breaking state down into smaller, predictable units?\n\n` +
      `*Reply in chat with your answers, and I'll review them for you!* 🎯`
    );
  }

  if (
    lower.includes('code') ||
    lower.includes('debug') ||
    lower.includes('error') ||
    lower.includes('bug') ||
    lower.includes('syntax')
  ) {
    return (
      `### Code & Debugging Assistant\n\n` +
      `Here is how to isolate and fix this issue:\n\n` +
      `1. **Identify the exact error line:** Check your stack trace and console output.\n` +
      `2. **Validate your data types:** Ensure values aren't \`undefined\` or \`null\` prior to access.\n` +
      `3. **Step through execution:** Add targeted logging or inspect state transitions.\n\n` +
      `\`\`\`javascript\n` +
      `// Example safe validation pattern\n` +
      `if (!data || typeof data !== 'object') {\n` +
      `  console.warn('Expected valid payload, received:', data);\n` +
      `  return fallback;\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `Paste the specific snippet or error message here and I'll debug it with you! 🔍`
    );
  }

  if (lower.includes('simplif') || lower.includes('eli5') || lower.includes('simple terms')) {
    return (
      `### Simplified Explanation\n\n` +
      `Imagine you're organizing items with labeled boxes 📦:\n` +
      `- Each box has a specific purpose.\n` +
      `- You only open the box when you need what's inside.\n` +
      `- If a box is missing or misplaced, you check your inventory first.\n\n` +
      `Keep it simple, step-by-step, and don't try to memorize everything at once. What part should we zoom in on? 🌟`
    );
  }

  return (
    `### StudyBuddy AI\n\n` +
    `Great study topic: **${rawPrompt || 'your current lesson'}**!\n\n` +
    `- **Direct Answer:** Let's break this down clearly for your study group.\n` +
    `- **Tip:** You can ask me to \`@ai explain <topic>\`, \`@ai code <problem>\`, or \`@ai quiz me\` anytime directly in this chat!\n` +
    (contextSnippet ? `\n*📎 Context from your study room has been referenced.*` : '') +
    `\n\nWhat would you like to explore next? 🚀`
  );
}
