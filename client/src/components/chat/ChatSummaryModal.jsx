import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Zap,
  Send,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Target,
  Lightbulb,
  CheckCircle2,
  ListTodo,
  HelpCircle,
  Users,
  Download,
  CheckSquare,
  Square,
  Tag,
  BookOpen,
  Layers,
  ArrowRight,
  Share2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { isGroqConfigured } from '@/services/aiService';

export function ChatSummaryModal({
  open,
  onOpenChange,
  summary,
  isSummarizing,
  onRegenerate,
  onPostToChat,
  roomName = 'Study Room',
  messageCount = 0,
  messages = []
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [completedTasks, setCompletedTasks] = useState(() => new Set());
  const groqActive = useMemo(() => isGroqConfigured(), [open]);

  // Extract unique participants from messages or fallback
  const participants = useMemo(() => {
    if (messages && messages.length > 0) {
      const set = new Set(messages.map(m => m.senderName || 'Anonymous').filter(Boolean));
      return Array.from(set).slice(0, 6);
    }
    return [];
  }, [messages]);

  // Parse markdown summary into structured sections
  const { sections, topicTags, actionItemsList } = useMemo(() => {
    if (!summary) return { sections: [], topicTags: [], actionItemsList: [] };

    let tags = [];
    const rawSections = summary.split(/^(?=#{1,4}\s+)/m).filter(Boolean);
    const parsed = [];
    let actions = [];

    if (rawSections.length > 0 && rawSections.some(s => /^#{1,4}\s+/.test(s))) {
      rawSections.forEach((sec) => {
        const firstLineEnd = sec.indexOf('\n');
        const headerLine = firstLineEnd === -1 ? sec : sec.slice(0, firstLineEnd);
        const title = headerLine.replace(/^#{1,4}\s+/, '').trim();
        const body = firstLineEnd === -1 ? '' : sec.slice(firstLineEnd).trim();

        // Extract topic tags section separately for top chips
        if (title.toLowerCase().includes('topic') || title.toLowerCase().includes('tag')) {
          const match = body.match(/#[A-Za-z0-9_-]+/g);
          if (match) tags = match;
        }

        // Extract action items into structured objects
        if (title.toLowerCase().includes('action') || title.toLowerCase().includes('next step') || title.toLowerCase().includes('todo')) {
          const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
          lines.forEach((line, idx) => {
            const clean = line.replace(/^\d+\.\s*/, '').replace(/^[-*•]\s*/, '').trim();
            if (clean) {
              const priorityMatch = clean.match(/\[(High Priority|Medium Priority|Next Up|Low Priority)\]/i);
              const ownerMatch = clean.match(/-\s*\*?Owner:\s*([^*]+)\*?/i);
              
              let displayText = clean
                .replace(/\[(High Priority|Medium Priority|Next Up|Low Priority)\]/gi, '')
                .replace(/-\s*\*?Owner:\s*[^*]+\*?/gi, '')
                .replace(/^\*\*/, '')
                .replace(/\*\*$/, '')
                .trim();

              actions.push({
                id: `task-${idx}`,
                raw: clean,
                text: displayText || clean,
                priority: priorityMatch ? priorityMatch[1] : null,
                owner: ownerMatch ? ownerMatch[1].trim() : null
              });
            }
          });
        }

        parsed.push({
          title,
          body,
          key: getSectionKey(title)
        });
      });
    } else {
      parsed.push({
        title: 'Executive Summary',
        body: summary.trim(),
        key: 'overview'
      });
    }

    return { sections: parsed, topicTags: tags, actionItemsList: actions };
  }, [summary]);

  // Toggle interactive task completion
  const toggleTask = useCallback((taskId) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Copy full summary markdown
  const handleCopyFull = useCallback(() => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopiedType('full');
    toast.success('Complete debrief copied to clipboard');
    setTimeout(() => setCopiedType(null), 2200);
  }, [summary]);

  // Copy action items only
  const handleCopyTasks = useCallback(() => {
    if (actionItemsList.length === 0) return;
    const taskText = actionItemsList
      .map((t, i) => `${i + 1}. [${completedTasks.has(t.id) ? 'x' : ' '}] ${t.text}${t.priority ? ` (${t.priority})` : ''}${t.owner ? ` - Owner: ${t.owner}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(`### 📋 Action Items - ${roomName}\n\n${taskText}`);
    setCopiedType('tasks');
    toast.success('Action items copied to clipboard');
    setTimeout(() => setCopiedType(null), 2200);
  }, [actionItemsList, completedTasks, roomName]);

  // Download debrief as markdown file
  const handleDownloadMarkdown = useCallback(() => {
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `studix-debrief-${sanitizedRoom}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded debrief as Markdown file');
  }, [summary, roomName]);

  // Filter sections based on active tab
  const visibleSections = useMemo(() => {
    if (activeTab === 'all') {
      return sections.filter(s => !s.title.toLowerCase().includes('key focus topics'));
    }
    return sections.filter(s => s.key === activeTab);
  }, [sections, activeTab]);

  const completedCount = useMemo(() => {
    return actionItemsList.filter(t => completedTasks.has(t.id)).length;
  }, [actionItemsList, completedTasks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-3xl h-[88vh] max-h-[840px] flex flex-col p-0 gap-0 overflow-hidden bg-[#0c0d14]/98 border border-white/10 text-white shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl rounded-2xl">
        {/* Top Gradient Banner */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 z-30" />

        {/* Modal Header */}
        <div className="relative px-6 pt-5 pb-3.5 border-b border-white/[0.08] bg-gradient-to-b from-purple-950/25 to-transparent shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/25 to-indigo-500/25 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    Executive AI Debrief
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-xs text-white/50 pt-0.5">
                    <span>Room: <strong className="text-white/80 font-semibold">{roomName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-white/60" />
                      {messageCount} messages analyzed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Engine Status Pill */}
            <div className="shrink-0 flex items-center gap-2">
              {groqActive ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-[0_0_15px_rgba(16,185,129,0.18)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Groq LPU • Llama 3.3 70B</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-semibold">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Smart Offline Engine</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics & Tags Row */}
          <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Participants & Tasks counter */}
            <div className="flex flex-wrap items-center gap-2">
              {participants.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/70">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-semibold text-white/90">{participants.length} Active:</span>
                  <div className="flex items-center -space-x-1.5">
                    {participants.map((p, idx) => (
                      <span
                        key={idx}
                        title={p}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-900 border border-white/20 text-[10px] font-black text-white"
                      >
                        {p.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {actionItemsList.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    <strong className="text-white">{completedCount}/{actionItemsList.length}</strong> tasks done
                  </span>
                </div>
              )}
            </div>

            {/* Key Topic Chips */}
            {topicTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {topicTags.slice(0, 4).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section Navigation Tabs */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 pt-1">
            <TabButton
              active={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="All Sections"
            />
            {sections.map(sec => {
              if (sec.key === 'topics') return null;
              return (
                <TabButton
                  key={sec.key}
                  active={activeTab === sec.key}
                  onClick={() => setActiveTab(sec.key)}
                  icon={getSectionTabIcon(sec.key)}
                  label={getSectionShortLabel(sec.key, sec.title)}
                  badge={sec.key === 'actions' && actionItemsList.length > 0 ? `${actionItemsList.length}` : null}
                />
              );
            })}
          </div>
        </div>

        {/* Modal Body: Smooth Scroll Container with Zero Cutoff */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 custom-scrollbar pb-10 space-y-4">
          {isSummarizing ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center animate-spin shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-2xl blur-2xl bg-purple-500/20" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-white tracking-tight">Synthesizing Executive Debrief...</h4>
                <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
                  {groqActive
                    ? "Groq Llama 3.3 70B is analyzing conversations, technical arguments, decisions, and action items in real-time."
                    : "Structuring peer discussion, milestones, and deliverables from your chat history."}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-purple-300 font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Extracting insights, decisions & ownership assignments...</span>
              </div>
            </div>
          ) : visibleSections.length === 0 ? (
            <div className="p-8 text-center text-white/60 space-y-2">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto opacity-50" />
              <p className="text-sm font-semibold">No summary data found for this section.</p>
              <Button size="sm" variant="outline" onClick={onRegenerate} className="border-white/10 text-xs">
                Generate Live Debrief
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleSections.map((section, idx) => (
                <DebriefSectionCard
                  key={section.key || idx}
                  section={section}
                  actionItemsList={actionItemsList}
                  completedTasks={completedTasks}
                  onToggleTask={toggleTask}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#090a10]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isSummarizing}
              className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5 text-xs font-semibold h-8 rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin text-purple-400' : ''}`} />
              Regenerate
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadMarkdown}
              disabled={isSummarizing || !summary}
              className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5 text-xs font-semibold h-8 rounded-xl"
              title="Save as .md file"
            >
              <Download className="w-3.5 h-3.5" />
              Save .md
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {actionItemsList.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyTasks}
                disabled={isSummarizing}
                className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-white gap-1.5 text-xs font-semibold h-8 rounded-xl"
              >
                {copiedType === 'tasks' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ListTodo className="w-3.5 h-3.5" />}
                {copiedType === 'tasks' ? 'Tasks Copied' : 'Copy Tasks'}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyFull}
              disabled={isSummarizing || !summary}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white gap-1.5 text-xs font-semibold h-8 rounded-xl"
            >
              {copiedType === 'full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedType === 'full' ? 'All Copied' : 'Copy All'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => onPostToChat?.(summary)}
              disabled={isSummarizing || !summary}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold gap-1.5 text-xs h-8 px-3.5 rounded-xl shadow-[0_4px_18px_rgba(113,72,235,0.35)] transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Post to Room Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Filter Tab Button
 */
function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
        active
          ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
          : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.05]'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
          active ? 'bg-black/30 text-white' : 'bg-purple-500/20 text-purple-300'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Debrief Section Card with Rich Styling & Interactive Tasks
 */
function DebriefSectionCard({ section, actionItemsList, completedTasks, onToggleTask }) {
  const [copiedSec, setCopiedSec] = useState(false);
  const { title, body, key } = section;

  const handleCopySection = useCallback(() => {
    navigator.clipboard.writeText(`### ${title}\n\n${body}`);
    setCopiedSec(true);
    toast.success(`Copied "${title}" section`);
    setTimeout(() => setCopiedSec(false), 2000);
  }, [title, body]);

  const styleConfig = getCardTheme(key, title);

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-200 ${styleConfig.cardClass} shadow-lg backdrop-blur-md`}>
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${styleConfig.iconBox}`}>
            {styleConfig.icon}
          </div>
          <h4 className="text-[14px] font-black text-white tracking-tight">
            {title}
          </h4>
        </div>

        <button
          type="button"
          onClick={handleCopySection}
          className="text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          title="Copy this section"
        >
          {copiedSec ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Card Body */}
      {key === 'actions' && actionItemsList.length > 0 ? (
        <div className="space-y-2">
          {actionItemsList.map((item) => {
            const isDone = completedTasks.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => onToggleTask(item.id)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/25 opacity-75'
                    : 'bg-white/[0.03] border-white/10 hover:border-indigo-500/40 hover:bg-indigo-950/15'
                }`}
              >
                <div className="mt-0.5 shrink-0 text-indigo-400">
                  {isDone ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-white/40 group-hover:text-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {item.priority && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        item.priority.toLowerCase().includes('high')
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                    {item.owner && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                        Owner: {item.owner}
                      </span>
                    )}
                  </div>
                  <p className={`text-[13px] leading-relaxed ${isDone ? 'line-through text-white/50' : 'text-white/90 font-medium'}`}>
                    {renderInlineMarkdown(item.text)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[13px] leading-relaxed text-white/90 space-y-2.5">
          {renderFormattedLines(body)}
        </div>
      )}
    </div>
  );
}

/**
 * Format markdown lines into styled elements
 */
function renderFormattedLines(body) {
  if (!body) return null;
  const lines = body.split('\n');

  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Bullet point (- or • or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const cleanLine = trimmed.replace(/^[-*•]\s*/, '');
      return (
        <div key={lIdx} className="flex items-start gap-2.5 my-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
          <div className="flex-1 leading-relaxed text-white/90 text-[13px]">
            {renderInlineMarkdown(cleanLine)}
          </div>
        </div>
      );
    }

    // Numbered item (1. Item)
    const numMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    if (numMatch) {
      return (
        <div key={lIdx} className="flex items-start gap-2.5 my-1.5">
          <span className="text-[11px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30 shrink-0">
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed text-white/90 text-[13px]">
            {renderInlineMarkdown(numMatch[2])}
          </div>
        </div>
      );
    }

    // Normal paragraph
    return (
      <p key={lIdx} className="my-1.5 text-white/85 text-[13px] leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

/**
 * Inline markdown parser (bold, code, quotes, italic)
 */
function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-extrabold tracking-tight">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded-md bg-purple-950/60 text-purple-300 font-mono text-[12px] border border-purple-500/30">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-white/80 italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function getSectionKey(title) {
  const lower = title.toLowerCase();
  if (lower.includes('overview') || lower.includes('session') || lower.includes('briefing')) return 'overview';
  if (lower.includes('technical') || lower.includes('insight') || lower.includes('topic') || lower.includes('concept')) return 'insights';
  if (lower.includes('decision') || lower.includes('answer') || lower.includes('consensus') || lower.includes('resolution')) return 'decisions';
  if (lower.includes('action') || lower.includes('next step') || lower.includes('todo') || lower.includes('deliverable')) return 'actions';
  if (lower.includes('recommendation') || lower.includes('study note') || lower.includes('tip') || lower.includes('takeaway')) return 'recommendations';
  if (lower.includes('topic') || lower.includes('tag')) return 'topics';
  return 'general';
}

function getSectionTabIcon(key) {
  switch (key) {
    case 'overview': return <Target className="w-3.5 h-3.5 text-purple-400" />;
    case 'insights': return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
    case 'decisions': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case 'actions': return <ListTodo className="w-3.5 h-3.5 text-indigo-400" />;
    case 'recommendations': return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
    default: return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
  }
}

function getSectionShortLabel(key, rawTitle) {
  switch (key) {
    case 'overview': return 'Overview';
    case 'insights': return 'Insights';
    case 'decisions': return 'Decisions';
    case 'actions': return 'Action Items';
    case 'recommendations': return 'Study Tips';
    default: return rawTitle.replace(/^[^\w\s]+\s*/, '').slice(0, 14);
  }
}

function getCardTheme(key, title) {
  switch (key) {
    case 'overview':
      return {
        cardClass: 'border-purple-500/30 bg-purple-950/20 shadow-[0_0_25px_rgba(168,85,247,0.08)]',
        iconBox: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        icon: <Target className="w-4 h-4 text-purple-400" />
      };
    case 'insights':
      return {
        cardClass: 'border-amber-500/30 bg-amber-950/15 shadow-[0_0_25px_rgba(245,158,11,0.08)]',
        iconBox: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        icon: <Lightbulb className="w-4 h-4 text-amber-400" />
      };
    case 'decisions':
      return {
        cardClass: 'border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.08)]',
        iconBox: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      };
    case 'actions':
      return {
        cardClass: 'border-indigo-500/30 bg-indigo-950/20 shadow-[0_0_25px_rgba(99,102,241,0.08)]',
        iconBox: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        icon: <ListTodo className="w-4 h-4 text-indigo-400" />
      };
    case 'recommendations':
      return {
        cardClass: 'border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.08)]',
        iconBox: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
        icon: <BookOpen className="w-4 h-4 text-cyan-400" />
      };
    default:
      return {
        cardClass: 'border-white/10 bg-white/[0.03]',
        iconBox: 'bg-white/10 text-white border border-white/20',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />
      };
  }
}
