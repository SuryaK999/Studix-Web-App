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

export async function callGroqApi({ prompt, context = '', history = [], signal = null }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || !apiKey.trim() || apiKey.includes('your_groq_api_key')) {
    return null;
  }

  const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';

  const systemMessage = {
    role: 'system',
    content: `You are StudyBuddy AI, an empathetic, highly knowledgeable, and patient academic tutor on Studix (a real-time collaborative study platform).
Guidelines:
- Explain ideas clearly with step-by-step breakdowns, intuitive analogies, and code/math examples where relevant.
- Format responses cleanly with GitHub-flavored markdown (bullet points, bold highlights, code blocks with syntax names, headers).
- Keep responses focused, encouraging, and easy for students to read.
${context ? `\nRoom Context from Peers:\n${context}` : ''}`
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
      temperature: 0.7,
      max_tokens: 1500
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export function sanitizeAiInput(input) {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, MAX_INPUT_LENGTH);
}

/**
 * Summarize a list of chat messages into structured study notes
 */
export function summarizeChatDiscussion(messages = []) {
  if (!messages || messages.length === 0) {
    return "No messages recorded in this study room yet. Start discussing topics with your group to generate a summary!";
  }

  const textMessages = messages.filter(m => m.text && !m.text.startsWith('Voice message'));
  if (textMessages.length === 0) {
    return "No text discussions found in the room yet.";
  }

  // Extract unique participants
  const participants = Array.from(new Set(textMessages.map(m => m.senderName || 'Anonymous')));
  
  // Extract key topics/keywords
  const allText = textMessages.map(m => m.text).join(' ');
  const wordCounts = {};
  allText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).forEach(w => {
    if (w.length > 4 && !['about', 'there', 'would', 'could', 'should', 'think', 'where', 'which'].includes(w)) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  });

  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const questions = textMessages.filter(m => m.text.includes('?')).slice(-4);
  const recentExchanges = textMessages.slice(-8);

  let summary = `### 📋 Study Session Summary\n\n`;
  summary += `**Active Collaborators:** ${participants.join(', ')}\n`;
  summary += `**Total Messages Analyzed:** ${textMessages.length}\n`;
  
  if (topKeywords.length > 0) {
    summary += `**Key Focus Areas:** ${topKeywords.join(' • ')}\n\n`;
  } else {
    summary += `\n`;
  }

  summary += `---\n\n### 💡 Key Discussion Highlights\n`;
  recentExchanges.forEach(m => {
    const preview = m.text.length > 120 ? m.text.slice(0, 117) + '...' : m.text;
    summary += `- **${m.senderName}:** ${preview}\n`;
  });

  if (questions.length > 0) {
    summary += `\n### ❓ Questions Posed by the Group\n`;
    questions.forEach(q => {
      summary += `- *"${q.text}"* — *(asked by ${q.senderName})*\n`;
    });
  }

  summary += `\n### 🎯 Recommended Next Steps\n`;
  summary += `1. Review the discussed concepts using active recall.\n`;
  summary += `2. Test your knowledge by asking StudyBuddy AI: \`@ai quiz me\` in chat.\n`;
  summary += `3. Consolidate your joint notes in the shared Notes tab.\n`;

  return summary;
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

  // 1. Direct Summarization Request
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('recap')) {
    return summarizeChatDiscussion(recentMessages);
  }

  // 2. Direct Explain Request
  if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does') || lower.includes('break down') || lower.includes('define')) {
    const topic = cleanInput
      .replace(/^@ai\s*/i, '')
      .replace(/^@studybuddy\s*/i, '')
      .replace(/^\/ai\s*/i, '')
      .replace(/explain\s*(this\s*:?)?/i, '')
      .trim();

    return `### 💡 Explanation${topic ? `: ${topic}` : ''}\n\n` +
      `Here is a clear, step-by-step breakdown:\n\n` +
      `1. **Core Idea:** ${topic ? `**${topic}** is best understood through its fundamental purpose.` : 'Break the concept into its smallest components.'}\n` +
      `2. **Real-world Analogy:** Think of it like a coordinated system where each part has a specific responsibility.\n` +
      `3. **Practical Application:** Connect this concept directly to what you are studying or coding right now.\n\n` +
      `**Key Takeaway:** Understanding *why* it works makes remembering *how* it works effortless.\n\n` +
      `*Want me to give a code example, quiz you on this, or simplify it further? Just ask \`@ai quiz me\`!*`;
  }

  // 3. Quiz / Knowledge Check
  if (lower.includes('quiz') || lower.includes('test me') || lower.includes('practice question')) {
    return `### 📝 Quick Knowledge Check\n\n` +
      `Test your understanding with these practice questions:\n\n` +
      `**1.** What is the primary difference between synchronous and asynchronous operations?\n` +
      `**2.** Why is time complexity (Big-O) crucial when scaling algorithms?\n` +
      `**3.** What is the benefit of breaking state down into smaller, predictable units?\n\n` +
      `*Reply in chat with your answers, and I'll review them for you!* 🎯`;
  }

  // 4. Code / Debugging Help
  if (lower.includes('code') || lower.includes('debug') || lower.includes('error') || lower.includes('bug') || lower.includes('syntax')) {
    return `### 💻 Code & Debugging Assistant\n\n` +
      `Here is how to isolate and fix this issue:\n\n` +
      `1. **Identify the exact error line:** Check your stack trace and console output.\n` +
      `2. **Validate your data types:** Ensure values aren't \`undefined\` or \`null\` prior to access.\n` +
      `3. **Step through execution:** Add targeted logging or inspect the state transitions.\n\n` +
      `\`\`\`javascript\n` +
      `// Example safe validation pattern\n` +
      `if (!data || typeof data !== 'object') {\n` +
      `  console.warn('Expected valid payload, received:', data);\n` +
      `  return fallback;\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `Paste the specific snippet or error message here and I'll debug it with you! 🔍`;
  }

  // 5. Simplify / ELI5
  if (lower.includes('simplif') || lower.includes('eli5') || lower.includes('simple terms')) {
    return `### 🧒 In Super Simple Terms\n\n` +
      `Imagine you're organizing items with labeled boxes 📦:\n` +
      `- Each box has a specific purpose.\n` +
      `- You only open the box when you need what's inside.\n` +
      `- If a box is missing or misplaced, you check your inventory first.\n\n` +
      `Keep it simple, step-by-step, and don't try to memorize everything at once. What part should we zoom in on? 🌟`;
  }

  // Default responsive tutor
  const prompt = cleanInput
    .replace(/^@ai\s*/i, '')
    .replace(/^@studybuddy\s*/i, '')
    .replace(/^\/ai\s*/i, '')
    .trim();

  return `### 🤖 StudyBuddy AI\n\n` +
    `Great question about: **${prompt || 'your current study topic'}**!\n\n` +
    `- **Direct Answer:** Let's break this down clearly for your study group.\n` +
    `- **Tip:** You can ask me to \`@ai explain <topic>\`, \`@ai summarize\`, or \`@ai quiz me\` anytime directly in this chat!\n` +
    (contextSnippet ? `\n*📎 Context from your study room has been referenced.*` : '') +
    `\n\nWhat would you like to explore next? 🚀`;
}
