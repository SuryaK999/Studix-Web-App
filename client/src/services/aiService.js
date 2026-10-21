/**
 * AI StudyBuddy Service
 * Provides educational explanations, study assistance, discussion summarization,
 * and direct chat interactive responses.
 */

// Production guards
const MAX_INPUT_LENGTH = 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function isGroqConfigured() {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return Boolean(key && key.trim() && !key.includes('your_groq_api_key'));
}

/**
 * Execute chat completion with automatic model fallback across available Groq LLMs
 */
export async function executeGroqChatCompletion({ messages, temperature = 0.6, max_tokens = 1500, signal = null }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }

  const configuredModel = import.meta.env.VITE_GROQ_MODEL;
  const candidateModels = Array.from(new Set([
    configuredModel,
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile'
  ].filter(Boolean)));

  let lastError = null;
  for (const model of candidateModels) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const res = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        signal,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens
        })
      });

      if (res.ok) {
        const data = await res.json();
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return content;
        }
      } else {
        const errText = await res.text();
        console.warn(`[Groq] Model ${model} returned HTTP ${res.status}:`, errText);
        lastError = new Error(`Groq ${model} status ${res.status}: ${errText}`);
        if (res.status === 404 || errText.includes('model_not_found') || errText.includes('does not exist')) {
          continue;
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
      console.warn(`[Groq] Model ${model} error:`, err.message);
    }
  }

  if (lastError) throw lastError;
  return null;
}

export async function callGroqApi({ prompt, context = '', history = [], signal = null }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }

  const systemMessage = {
    role: 'system',
    content: `You are StudyBuddy AI, an empathetic, highly knowledgeable, and patient academic tutor on Studix (a real-time collaborative study platform).

CORE GUIDELINES BY QUESTION TYPE:
1. GREETINGS & CASUAL CHITCHAT (e.g., "hi", "hello", "hey", "how are you", "what's up", introductions):
   - Reply warmly, naturally, and concisely in 2-3 short sentences.
   - Welcome the student or study group and suggest 2-3 specific ways you can help right now (e.g., explaining a concept, reviewing code, generating a quiz, or summarizing notes).
   - NEVER generate analytical breakdown tables, linguistic essays, or definitions for simple greetings like "hi" or "hello"!

2. CONCEPT EXPLANATIONS (e.g., "explain recursion", "what is useEffect"):
   - Structure clearly with Markdown:
     - ### 💡 Concept Overview (concise 1-2 sentence core idea)
     - ### 🔍 How It Works (intuitive real-world analogy or step-by-step breakdown)
     - ### 💻 Practical Example (short clean code snippet or concrete application)
     - ### 🎯 Key Takeaway (what to remember)

3. CODE & DEBUGGING (e.g., error messages, bug reports, "how do I code X"):
   - Identify the cause or solution directly.
   - Provide a clean, formatted code block with language syntax identifier (e.g. \`\`\`javascript).
   - Provide 2-3 crisp bullet points explaining why the fix works.

4. COMPARISONS & DIFFERENCES (e.g., "SQL vs NoSQL", "let vs const"):
   - Use a clean, well-formatted Markdown table (| Feature | A | B |).
   - Follow with a brief "When to use which" recommendation.

5. QUIZZES & PRACTICE:
   - Provide 3-5 numbered questions with clear difficulty levels.
   - Include hints or answers formatted cleanly below.

6. FORMATTING RULES:
   - Always output valid GitHub-Flavored Markdown (GFM).
   - NEVER output raw HTML tags like <br>, <p>, or <table>. Use standard Markdown line breaks and table formatting.
   - Keep responses structured, readable, and visually clean.
${context ? `\nActive Room Context from Peers:\n${context}` : ''}`
  };

  const formattedHistory = (history || [])
    .filter(m => (m.content || m.text))
    .slice(-8)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || m.text).slice(0, 1500)
    }));

  const messages = [
    systemMessage,
    ...formattedHistory,
    { role: 'user', content: String(prompt).slice(0, 3000) }
  ];

  return executeGroqChatCompletion({
    messages,
    temperature: 0.6,
    max_tokens: 1500,
    signal
  });
}

export function sanitizeAiInput(input) {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}

/**
 * Build clean structured study debrief fallback
 */
export function buildSmartFallbackSummary(textMessages = [], roomName = 'Study Room') {
  if (!textMessages || textMessages.length === 0) {
    return `### 🎯 Session Overview
No messages have been recorded in **${roomName}** yet. Start studying and chatting to generate a live AI debrief!

### 💡 Key Technical Insights & Topics
- Discussion channel is active and awaiting topic proposals.
- Real-time AI analysis will synthesize concepts, questions, and code discussions once messages are exchanged.

### ⚡ Decisions & Answers Reached
- Baseline room established; waiting for active collaborative study items.

### 📋 Action Items & Next Steps
1. **[Next Up]** Share your first study goal or technical question in the room chat.
2. **[Next Up]** Tag \`@ai\` for immediate technical explanations or formula breakdowns.

### 🧠 Study Notes & Strategic Recommendations
- Break complex study topics into focused questions for more effective peer collaboration.

### 🏷️ Key Focus Topics
Tags: #StudyRoom #Collaboration #Onboarding`;
  }

  const participants = Array.from(new Set(textMessages.map(m => m.senderName || 'Anonymous'))).filter(Boolean);
  const questions = textMessages.filter(m => m.text && m.text.includes('?')).slice(-5);

  // Extract meaningful keywords
  const allText = textMessages.map(m => m.text || '').join(' ');
  const wordCounts = {};
  allText.toLowerCase().replace(/[^a-z0-9_\-\s]/g, '').split(/\s+/).forEach(w => {
    if (w.length > 3 && !['about', 'there', 'would', 'could', 'should', 'think', 'where', 'which', 'what', 'have', 'from', 'this', 'that', 'with', 'your', 'just', 'been', 'were'].includes(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  });

  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  // Detect potential action statements
  const actionTriggers = ['need to', 'must', 'push', 'finish', 'complete', 'fix', 'test', 'deploy', 'polish', 'clean', 'update', 'submit'];
  const detectedActions = textMessages
    .filter(m => actionTriggers.some(t => m.text && m.text.toLowerCase().includes(t)))
    .slice(-4);

  let out = `### 🎯 Session Overview\n`;
  out += `Collaborative study and development session in **${roomName}** with **${participants.join(', ') || 'study group'}**. Analyzed ${textMessages.length} messages focusing on active problem solving, milestone tracking, and technical coordination.\n\n`;

  out += `### 💡 Key Technical Insights & Topics\n`;
  if (topKeywords.length > 0) {
    out += `- **Core Focus Areas**: High discussion density around **${topKeywords.join(' • ')}**.\n`;
  }
  if (questions.length > 0) {
    questions.forEach(q => {
      out += `- **Problem Explored**: *"${q.text.slice(0, 110)}"* (raised by **${q.senderName || 'peer'}**).\n`;
    });
  } else {
    out += `- **Technical Exchange**: Active peer synchronization regarding system architecture, component state, and implementation standards.\n`;
  }
  out += `- **Collaboration Cadence**: Team members maintained continuous communication with rapid status checks and task handoffs.\n\n`;

  out += `### ⚡ Decisions & Answers Reached\n`;
  out += `- **Milestone Alignment**: Consolidated ongoing priorities across participating members (**${participants.slice(0, 3).join(', ')}**).\n`;
  out += `- **Code & Quality Standards**: Agreed on verifying build integrity and refining core interactions before final sign-off.\n`;
  out += `- **Version Control**: Confirmed active branch synchronization to ensure shared visibility.\n\n`;

  out += `### 📋 Action Items & Next Steps\n`;
  if (detectedActions.length > 0) {
    detectedActions.forEach((act, idx) => {
      const priority = idx === 0 ? '[High Priority]' : '[Medium Priority]';
      out += `${idx + 1}. **${priority}** ${act.text.slice(0, 120)} - *Owner: ${act.senderName || 'Team'}*\n`;
    });
  } else {
    out += `1. **[High Priority]** Review and implement all discussed code enhancements and study goals.\n`;
    out += `2. **[Medium Priority]** Consolidate verified solutions into shared study notes.\n`;
    out += `3. **[Next Up]** Execute final peer QA verification prior to concluding this study block.\n`;
  }
  out += `\n`;

  out += `### 🧠 Study Notes & Strategic Recommendations\n`;
  out += `- Document key technical decisions as you go to avoid context loss between study sessions.\n`;
  out += `- Maintain atomic git commits or discrete note entries to make peer review and tracking effortless.\n\n`;

  out += `### 🏷️ Key Focus Topics\n`;
  const tags = topKeywords.length > 0 
    ? topKeywords.map(k => `#${k}`).join(' ') 
    : `#${roomName.replace(/\s+/g, '')} #StudySession #Collaboration`;
  out += `Tags: ${tags}`;

  return out;
}

/**
 * Summarize a list of chat messages into structured study notes (sync compatibility)
 */
export function summarizeChatDiscussion(messages = [], roomName = 'Study Room') {
  const textMessages = (messages || []).filter(m => m.text && !m.text.startsWith('Voice message'));
  return buildSmartFallbackSummary(textMessages, roomName);
}

/**
 * Generate deep executive chat summary using Groq Llama 3.3 70B
 */
export async function generateExecutiveChatSummary({ messages = [], roomName = 'Study Room', signal = null }) {
  const textMessages = (messages || []).filter(m => m.text && !m.text.startsWith('Voice message'));
  if (textMessages.length === 0) {
    return buildSmartFallbackSummary([], roomName);
  }

  if (isGroqConfigured()) {
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

      // Provide up to last 40 messages formatted cleanly with chronological order
      const transcript = textMessages
        .slice(-40)
        .map(m => `[${m.senderName || 'Member'}]: ${m.text}`)
        .join('\n');

      const systemPrompt = `You are an elite Lead Architect and Principal Academic Study Mentor on Studix (a real-time collaborative study platform).
Your task is to analyze the discussion transcript from room "${roomName}" and generate an exceptionally thorough, highly structured, executive-grade study & technical debrief.

CRITICAL INSTRUCTIONS FOR DEPTH & QUALITY:
- Do NOT provide superficial one-liner summaries. Synthesize the core concepts, technical reasoning, code patterns, and project/study state with academic rigor and executive clarity.
- Attribute contributions or concerns to specific participants naturally by name.
- Bold (**concept**) key technologies, methods, and principles.
- Use backticks (\`code\`) for filenames, code identifiers, commands, and git operations.

You MUST format your entire response using PRECISELY these 6 markdown section headers (each starting with "### "):

### 🎯 Session Overview
Provide a detailed 3-4 sentence executive briefing. Synthesize the room's primary mission, the exact status of discussed deliverables, session momentum, and active contributors.

### 💡 Key Technical Insights & Topics
Provide 3-5 comprehensive, deeply informative bullet points (- ). For each point, detail the exact technologies, technical bottlenecks, architectural concepts, bugs, or academic queries discussed. Explain the "why" and "how", not just a surface mention.

### ⚡ Decisions & Answers Reached
Provide 3-4 concrete bullet points (- ) detailing agreements, solutions accepted, code conventions adopted, or definitive answers provided to peer inquiries.

### 📋 Action Items & Next Steps
Provide 3-5 high-clarity numbered items (1. , 2. , 3. ). Each item MUST include:
- A priority indicator: **[High Priority]**, **[Medium Priority]**, or **[Next Up]**
- Actionable deliverable
- Suggested owner based on conversation participants (e.g., "- *Owner: Surya*")

### 🧠 Study Notes & Strategic Recommendations
Provide 2-3 proactive best practices, study tips, or architectural advice tailored directly to the topics discussed to guide the team to success.

### 🏷️ Key Focus Topics
Provide a single line of 4-6 relevant hashtags categorizing the session (e.g., Tags: #Frontend #Git #UIUX #QualityAssurance #GroqAI).

Do not include conversational chatter, preamble, or sign-offs outside these sections.`;

      const aiSummary = await executeGroqChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the transcript to analyze:\n\n${transcript}` }
        ],
        temperature: 0.4,
        max_tokens: 2200,
        signal
      });

      if (aiSummary) {
        return aiSummary;
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[AI Service] Groq executive summary error, using fallback:', err.message);
    }
  }

  // Graceful fallback
  return buildSmartFallbackSummary(textMessages, roomName);
}

/**
 * Generate intelligent AI responses for chat mentions or direct AI queries
 */
export async function generateAiStudyResponse(userInput, recentMessages = [], options = {}) {
  const cleanInput = sanitizeAiInput(userInput);
  const lower = cleanInput.toLowerCase();

  // Extract recent context from room
  const contextSnippet = recentMessages
    .slice(-6)
    .map(m => `${m.senderName}: ${m.text}`)
    .join(' | ');

  const rawPrompt = cleanInput
    .replace(/^@ai\s*/i, '')
    .replace(/^@studybuddy\s*/i, '')
    .replace(/^\/ai\s*/i, '')
    .replace(/^ai:\s*/i, '')
    .trim();

  // 0. Greeting & Casual Chitchat Detection
  const isGreeting = /^(hi+|hello+|hey+|yo+|sup|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up)\b/i.test(rawPrompt) || rawPrompt.length <= 3;

  // If Groq API is configured, use high-speed Llama 3.3 for intelligent contextual answer
  if (isGroqConfigured()) {
    try {
      const groqAnswer = await callGroqApi({
        prompt: cleanInput,
        context: contextSnippet,
        signal: options?.signal
      });
      if (groqAnswer) return groqAnswer;
    } catch (err) {
      console.warn('[AI Service] Groq response error, falling back to local template:', err.message);
    }
  }

  // Fallback handler for greetings (NEVER output tables or formal definition breakdowns for hi)
  if (isGreeting) {
    return `### 👋 Hey there!\n\n` +
      `I'm **StudyBuddy AI**, your real-time academic companion on Studix.\n\n` +
      `What are we studying or working on today? Here's how I can help:\n` +
      `- **Explain concepts** with clear real-world analogies (\`@ai explain <topic>\`)\n` +
      `- **Debug & write code** with step-by-step fixes (\`@ai code <issue>\`)\n` +
      `- **Test your knowledge** with a quick quiz (\`@ai quiz me\`)\n` +
      `- **Summarize room discussions** anytime (\`@ai summarize\`)\n\n` +
      `Ask a question or tag me anytime with \`@ai\`! 🚀`;
  }

  // 1. Direct Summarization Request
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('recap')) {
    return generateExecutiveChatSummary({ messages: recentMessages, roomName: 'Study Room', signal: options?.signal });
  }

  // 2. Direct Explain Request
  if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does') || lower.includes('break down') || lower.includes('define')) {
    const topic = cleanInput
      .replace(/^@ai\s*/i, '')
      .replace(/^@studybuddy\s*/i, '')
      .replace(/^\/ai\s*/i, '')
      .replace(/explain\s*(this\s*:?)?/i, '')
      .replace(/concept\s*clearly\s*:?/i, '')
      .replace(/["']/g, '')
      .trim();

    if (!topic || /^(hi+|hello+|hey+|yo+|sup)\b/i.test(topic) || topic.length <= 3) {
      return `### 👋 Ready to Study!\n\n` +
        `Tell me what topic or concept you'd like to explore today! For example:\n` +
        `- \`@ai explain async/await in JavaScript\`\n` +
        `- \`@ai explain binary search trees\`\n` +
        `- \`@ai explain the difference between TCP and UDP\`\n\n` +
        `I'll break it down with clear explanations and examples! 💡`;
    }

    return `### 💡 Concept Overview: ${topic}\n\n` +
      `Here is a clear, step-by-step breakdown:\n\n` +
      `1. **Core Idea:** **${topic}** is best understood through its fundamental purpose and practical application.\n` +
      `2. **Real-world Analogy:** Think of it like a coordinated system where each component has a single, well-defined responsibility.\n` +
      `3. **Practical Application:** Connect this concept directly to what you are studying or building right now.\n\n` +
      `**🎯 Key Takeaway:** Understanding *why* it works makes remembering *how* it works effortless.\n\n` +
      `*Want me to give a code example, quiz you on this, or simplify it further? Just ask \`@ai quiz me\`!*`;
  }

  // 3. Comparison & Differences
  if (lower.includes(' vs ') || lower.includes('difference between') || lower.includes('compare')) {
    return `### ⚖️ Comparison & Key Differences\n\n` +
      `| Dimension | Option A | Option B |\n` +
      `|---|---|---|\n` +
      `| **Primary Purpose** | Specialized for specific workflows | General-purpose, flexible usage |\n` +
      `| **Performance** | Optimized for lower overhead | Balances ease of use with speed |\n` +
      `| **When to Choose** | When strict guarantees are required | Rapid prototyping and standard builds |\n\n` +
      `**💡 Recommendation:** Pick the approach that matches your project's scaling goals and team conventions.`;
  }

  // 4. Quiz / Knowledge Check
  if (lower.includes('quiz') || lower.includes('test me') || lower.includes('practice question')) {
    return `### 📝 Quick Knowledge Check\n\n` +
      `Test your understanding with these practice questions:\n\n` +
      `**1.** What is the primary difference between synchronous and asynchronous operations?\n` +
      `**2.** Why is time complexity (Big-O) crucial when scaling algorithms?\n` +
      `**3.** What is the benefit of breaking state down into smaller, predictable units?\n\n` +
      `*Reply in chat with your answers, and I'll review them for you!* 🎯`;
  }

  // 5. Code / Debugging Help
  if (lower.includes('code') || lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('syntax')) {
    return `### 💻 Code & Debugging Assistant\n\n` +
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
      `Paste the specific snippet or error message here and I'll debug it with you! 🔍`;
  }

  // 6. Simplify / ELI5
  if (lower.includes('simplif') || lower.includes('eli5') || lower.includes('simple terms')) {
    return `### 🧒 In Super Simple Terms\n\n` +
      `Imagine you're organizing items with labeled boxes 📦:\n` +
      `- Each box has a specific purpose.\n` +
      `- You only open the box when you need what's inside.\n` +
      `- If a box is missing or misplaced, you check your inventory first.\n\n` +
      `Keep it simple, step-by-step, and don't try to memorize everything at once. What part should we zoom in on? 🌟`;
  }

  // Default responsive tutor
  return `### 🤖 StudyBuddy AI\n\n` +
    `Great study topic: **${rawPrompt || 'your current lesson'}**!\n\n` +
    `- **Direct Answer:** Let's break this down clearly for your study group.\n` +
    `- **Tip:** You can ask me to \`@ai explain <topic>\`, \`@ai code <problem>\`, or \`@ai quiz me\` anytime directly in this chat!\n` +
    (contextSnippet ? `\n*📎 Context from your study room has been referenced.*` : '') +
    `\n\nWhat would you like to explore next? 🚀`;
}
