import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
  Bot,
  Target,
  Lightbulb,
  CheckCircle2,
  ListTodo,
  HelpCircle,
  Clock,
  Users
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
  messageCount = 0
}) {
  const [copied, setCopied] = useState(false);
  const groqActive = useMemo(() => isGroqConfigured(), [open]);

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#0c0d14]/95 border-white/10 text-white shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl rounded-2xl">
        {/* Header with Luxury Gradient & Groq Badge */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.08] bg-gradient-to-b from-purple-950/20 to-transparent">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />
          
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 text-purple-400">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Executive AI Debrief
                </DialogTitle>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/50 pt-1">
                <span>Room: <strong className="text-white/80 font-semibold">{roomName}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {messageCount} messages analyzed
                </span>
              </div>
            </div>

            {/* Provider Pill */}
            <div className="shrink-0">
              {groqActive ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Groq LPU • Llama 3.3 70B</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-medium">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Offline Smart Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 max-h-[60vh] custom-scrollbar">
          {isSummarizing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center animate-spin">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full blur-xl bg-purple-500/20" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Synthesizing Discussion...</h4>
                <p className="text-xs text-[#8E9297] max-w-sm">
                  {groqActive 
                    ? "Running Llama 3.3 70B via Groq LPU engine for deep academic breakdown..." 
                    : "Structuring key concepts, highlights, and decisions from your study chat..."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {!groqActive && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3 text-xs text-purple-300">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Want live AI reasoning? Add your free Groq API key in <code className="bg-purple-950/60 px-1 py-0.5 rounded text-white">client/.env</code>.</span>
                  </div>
                </div>
              )}

              {/* Formatted Markdown Display */}
              <ParsedSummaryView content={summary} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#090a10] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={isSummarizing}
            className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isSummarizing || !summary}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => onPostToChat?.(summary)}
              disabled={isSummarizing || !summary}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold gap-1.5 text-xs shadow-[0_4px_16px_rgba(113,72,235,0.3)] transition-all"
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
 * Parses markdown summary sections into styled card blocks
 */
function ParsedSummaryView({ content }) {
  if (!content) return null;

  // Split by section headers #, ##, ### or bold titles
  const sections = useMemo(() => {
    if (!content) return [];
    // Split by markdown headers #, ##, ###, ####
    const rawSections = content.split(/^(?=#{1,4}\s+)/m).filter(Boolean);
    if (rawSections.length > 0 && rawSections.some(s => /^#{1,4}\s+/.test(s))) {
      return rawSections.map((sec) => {
        const firstLineEnd = sec.indexOf('\n');
        const headerLine = firstLineEnd === -1 ? sec : sec.slice(0, firstLineEnd);
        const title = headerLine.replace(/^#{1,4}\s+/, '').trim();
        const body = firstLineEnd === -1 ? '' : sec.slice(firstLineEnd).trim();
        return { title, body };
      }).filter(s => s.title || s.body);
    }

    // Fallback: split by double newlines or bold headers if no # headers found
    const fallbackSections = content.split(/\n\n(?=\*\*)/g).filter(Boolean);
    if (fallbackSections.length > 1) {
      return fallbackSections.map(sec => {
        const match = sec.match(/^\*\*(.+?)\*\*:?\s*([\s\S]*)$/);
        if (match) {
          return { title: match[1].trim(), body: match[2].trim() };
        }
        return { title: 'Debrief Note', body: sec.trim() };
      });
    }

    return [{ title: 'Executive Summary', body: content.trim() }];
  }, [content]);

  const getSectionIcon = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('overview') || lower.includes('session')) return <Target className="w-4 h-4 text-purple-400" />;
    if (lower.includes('technical') || lower.includes('topic') || lower.includes('insight') || lower.includes('highlight')) return <Lightbulb className="w-4 h-4 text-amber-400" />;
    if (lower.includes('decision') || lower.includes('answer') || lower.includes('conclusion')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (lower.includes('action') || lower.includes('next') || lower.includes('step') || lower.includes('todo')) return <ListTodo className="w-4 h-4 text-indigo-400" />;
    if (lower.includes('question') || lower.includes('inquir')) return <HelpCircle className="w-4 h-4 text-cyan-400" />;
    return <Sparkles className="w-4 h-4 text-purple-400" />;
  };

  const getSectionColor = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('overview') || lower.includes('session')) return 'border-purple-500/30 bg-purple-950/20';
    if (lower.includes('technical') || lower.includes('topic') || lower.includes('insight') || lower.includes('highlight')) return 'border-amber-500/30 bg-amber-950/15';
    if (lower.includes('decision') || lower.includes('answer') || lower.includes('conclusion')) return 'border-emerald-500/30 bg-emerald-950/20';
    if (lower.includes('action') || lower.includes('next') || lower.includes('step') || lower.includes('todo')) return 'border-indigo-500/30 bg-indigo-950/20';
    return 'border-white/10 bg-white/[0.02]';
  };

  if (sections.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const icon = getSectionIcon(section.title);
        const cardStyle = getSectionColor(section.title);

        return (
          <div
            key={idx}
            className={`rounded-xl border p-4.5 transition-all duration-200 ${cardStyle}`}
          >
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/[0.06]">
              {icon}
              <h4 className="text-[13.5px] font-extrabold text-white tracking-tight">
                {section.title}
              </h4>
            </div>

            <div className="text-[13px] leading-relaxed text-white/90 space-y-2">
              {renderFormattedBody(section.body)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderFormattedBody(body) {
  const lines = body.split('\n');

  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const cleanLine = trimmed.replace(/^[-*•]\s*/, '');
      return (
        <div key={lIdx} className="flex items-start gap-2.5 my-1">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
          <div className="flex-1 leading-relaxed">
            {renderInlineMarkdown(cleanLine)}
          </div>
        </div>
      );
    }

    // Numbered item: 1. Item
    const numMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    if (numMatch) {
      return (
        <div key={lIdx} className="flex items-start gap-2.5 my-1">
          <span className="text-[11px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed">
            {renderInlineMarkdown(numMatch[2])}
          </div>
        </div>
      );
    }

    return (
      <p key={lIdx} className="my-1 text-white/80">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

function renderInlineMarkdown(text) {
  // Bold **word**, code `code`, italic *word*
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
        <code key={i} className="px-1.5 py-0.5 rounded bg-black/40 text-purple-300 font-mono text-xs border border-purple-500/20">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="text-white/80 italic font-normal">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
