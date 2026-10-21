import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
  Download,
  Loader2,
  X,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { isGroqConfigured } from '@/services/aiService';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { cn } from '@/lib/utils';

export function ChatSummaryModal({
  open,
  onOpenChange,
  summary,
  isSummarizing,
  onRegenerate,
  onPostToChat,
  roomName = 'Study Room',
  messageCount = 0,
}) {
  const [copied, setCopied] = useState(false);
  const groqActive = useMemo(() => isGroqConfigured(), [open]);

  // Copy full summary markdown to clipboard
  const handleCopyFull = useCallback(async () => {
    if (!summary) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summary);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = summary;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy summary');
    }
  }, [summary]);

  // Download summary as markdown file
  const handleDownloadMarkdown = useCallback(() => {
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedRoom = roomName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `studix-summary-${sanitizedRoom}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded summary as .md file');
  }, [summary, roomName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-full sm:max-w-2xl h-[82vh] max-h-[720px] flex flex-col p-0 gap-0 overflow-hidden bg-[#111218] border border-white/10 text-zinc-100 shadow-2xl rounded-2xl">
        {/* Sleek, Clean Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#0c0d12]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100 tracking-tight leading-none mb-1">
                Room Discussion Summary
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">{roomName}</span>
                <span>•</span>
                <span>{messageCount} message{messageCount === 1 ? '' : 's'} analyzed</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimal Engine Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-zinc-300">
              <span className={cn("w-1.5 h-1.5 rounded-full", groqActive ? "bg-emerald-400" : "bg-zinc-400")} />
              <span>{groqActive ? 'Groq Llama 3.3' : 'Local AI'}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Clean Document Canvas */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 custom-scrollbar">
          {isSummarizing ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-200">Summarizing room discussion...</p>
                <p className="text-xs text-zinc-400">Synthesizing real points and takeaways into a clean brief</p>
              </div>
            </div>
          ) : !summary ? (
            <div className="py-20 text-center text-zinc-400 space-y-3">
              <Bot className="w-8 h-8 text-zinc-500 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">No summary available yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={onRegenerate}
                className="border-white/10 text-xs text-zinc-300 hover:text-white"
              >
                Generate Summary
              </Button>
            </div>
          ) : (
            <div className="max-w-none prose prose-invert prose-sm">
              <MarkdownRenderer content={summary} />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0c0d12]/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              disabled={isSummarizing}
              className="text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 text-xs h-8 px-2.5 rounded-lg"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSummarizing && "animate-spin text-indigo-400")} />
              Regenerate
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadMarkdown}
              disabled={isSummarizing || !summary}
              className="text-zinc-400 hover:text-white hover:bg-white/5 gap-1.5 text-xs h-8 px-2.5 rounded-lg"
              title="Save as markdown"
            >
              <Download className="w-3.5 h-3.5" />
              Download .md
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyFull}
              disabled={isSummarizing || !summary}
              className="border-white/10 bg-white/[0.03] text-zinc-200 hover:text-white hover:bg-white/[0.08] gap-1.5 text-xs font-medium h-8 px-3 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Summary'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onPostToChat?.(summary);
                onOpenChange?.(false);
              }}
              disabled={isSummarizing || !summary}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5 text-xs h-8 px-3.5 rounded-lg shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Post to Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
