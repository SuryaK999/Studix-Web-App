import React, { memo, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Terminal,
  FileText,
  Lightbulb,
  CheckCircle2,
  Target,
  Code as CodeIcon,
  Brain,
  BookOpen,
  Scale,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StudyBuddyIcon } from '@/components/ui/StudyBuddyIcon';

/**
 * Enhanced CodeBlock component with language badge and one-click copy button
 */
const CodeBlock = memo(function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  }, [code]);

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0c0d12] shadow-md group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/[0.08] text-xs">
        <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px] font-medium tracking-wider uppercase">
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed custom-scrollbar m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
});

function getHeadingDecor(rawText) {
  if (!rawText || typeof rawText !== 'string') return { icon: null, cleanText: rawText };

  // Remove leading raw emojis or bullets: e.g. 📌, 💡, 📋, 🎯, 💻, 🧠, 📝, 🧒, 🤖, 👋, ⚖️, 🔍, 🚀, 🌟, ✨, etc.
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D|\s)+\s*/u;
  const strippedText = rawText.replace(emojiRegex, '').trim();
  const lower = strippedText.toLowerCase();

  if (lower.includes('summary') || lower.startsWith('recap')) {
    return {
      icon: <FileText className="w-3.5 h-3.5 text-indigo-400" />,
      badgeClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('discussion point') || lower.includes('key point') || lower.includes('insight') || lower.includes('tips') || lower.includes('blueprint')) {
    return {
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
      badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('action item') || lower.includes('task') || lower.includes('todo') || lower.includes('next step') || lower.includes('answer')) {
    return {
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('focus') || lower.includes('goal') || lower.includes('objective') || lower.includes('takeaway')) {
    return {
      icon: <Target className="w-3.5 h-3.5 text-purple-400" />,
      badgeClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('code') || lower.includes('debug') || lower.includes('syntax') || lower.includes('implementation')) {
    return {
      icon: <CodeIcon className="w-3.5 h-3.5 text-blue-400" />,
      badgeClass: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('quiz') || lower.includes('recall') || lower.includes('question') || lower.includes('knowledge check')) {
    return {
      icon: <Brain className="w-3.5 h-3.5 text-pink-400" />,
      badgeClass: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('concept') || lower.includes('overview') || lower.includes('deep dive') || lower.includes('explanation')) {
    return {
      icon: <BookOpen className="w-3.5 h-3.5 text-cyan-400" />,
      badgeClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('compare') || lower.includes('difference') || lower.includes(' vs ')) {
    return {
      icon: <Scale className="w-3.5 h-3.5 text-orange-400" />,
      badgeClass: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
      cleanText: strippedText,
    };
  }
  if (lower.includes('welcome') || lower.includes('hello') || lower.includes('hey') || lower.includes('studybuddy')) {
    return {
      icon: <StudyBuddyIcon size={14} variant="gradient" />,
      badgeClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      cleanText: strippedText,
    };
  }

  return { icon: null, badgeClass: '', cleanText: strippedText };
}

function HeadingNode({ level, children, className, ...props }) {
  const rawText = React.Children.toArray(children)
    .map(c => (typeof c === 'string' ? c : (c?.props?.children || '')))
    .join('');
  const { icon, badgeClass, cleanText } = getHeadingDecor(rawText);

  const Comp = level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
  const sizeClasses = {
    1: 'text-base md:text-lg font-bold text-zinc-100 mt-4 mb-2',
    2: 'text-[15px] md:text-base font-semibold text-zinc-100 mt-3.5 mb-1.5',
    3: 'text-[14px] md:text-[14.5px] font-medium text-zinc-200 mt-3 mb-1',
    4: 'text-[13px] md:text-[13.5px] font-medium text-zinc-300 mt-2.5 mb-0.5'
  };

  return (
    <Comp className={cn(sizeClasses[level], 'flex items-center gap-2 group tracking-tight', className)} {...props}>
      {icon && (
        <span className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 border shadow-xs', badgeClass)}>
          {icon}
        </span>
      )}
      <span>{icon ? cleanText : children}</span>
    </Comp>
  );
}

class MarkdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('[MarkdownRenderer] Parse fallback triggered:', err);
  }
  render() {
    if (this.state.hasError) {
      return <p className="whitespace-pre-wrap text-white/90 text-sm leading-relaxed">{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}

/**
 * Premium GitHub-flavored Markdown renderer for Studix AI Tutor & StudyBuddy
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ content, className = '' }) {
  // Pre-process raw text: strip reasoning tags, clean literal HTML line breaks
  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    let text = String(content);
    // Strip reasoning thoughts
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Replace raw <br>, <br/>, <br > tags with real markdown newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Clean up unnecessary leading dividers
    text = text.replace(/^---\s*\n+/g, '');
    return text;
  }, [content]);

  if (!sanitizedContent) return null;

  return (
    <div className={`studix-markdown leading-relaxed ${className}`}>
      <MarkdownErrorBoundary fallback={sanitizedContent}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Code & Syntax Highlighting
            code({ _node, inline, className: codeClass, children, ...props }) {
              const match = /language-(\w+)/.exec(codeClass || '');
              const rawCode = String(children).replace(/\n$/, '');

              if (!inline && (match || String(children).includes('\n'))) {
                return <CodeBlock language={match ? match[1] : ''} code={rawCode} />;
              }

              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-indigo-300 font-mono text-[12px] break-words"
                  {...props}
                >
                  {children}
                </code>
              );
            },

            // Prevent double <pre> nesting with CodeBlock
            pre({ children }) {
              return <>{children}</>;
            },

            // Tables
            table({ _node, ...props }) {
              return (
                <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/40 shadow-inner custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse" {...props} />
                </div>
              );
            },
            thead({ _node, ...props }) {
              return <thead className="bg-white/[0.05] border-b border-white/10 text-zinc-200" {...props} />;
            },
            th({ _node, ...props }) {
              return (
                <th
                  className="px-3.5 py-2.5 font-semibold text-zinc-200 tracking-wide uppercase text-[11px] whitespace-nowrap"
                  {...props}
                />
              );
            },
            tbody({ _node, ...props }) {
              return <tbody className="divide-y divide-white/5" {...props} />;
            },
            tr({ _node, ...props }) {
              return <tr className="hover:bg-white/[0.02] transition-colors" {...props} />;
            },
            td({ _node, ...props }) {
              return <td className="px-3.5 py-2 text-zinc-300 text-xs leading-relaxed align-top" {...props} />;
            },

            // Headings with polished design system badges
            h1({ _node, children, ...props }) {
              return <HeadingNode level={1} {...props}>{children}</HeadingNode>;
            },
            h2({ _node, children, ...props }) {
              return <HeadingNode level={2} {...props}>{children}</HeadingNode>;
            },
            h3({ _node, children, ...props }) {
              return <HeadingNode level={3} {...props}>{children}</HeadingNode>;
            },
            h4({ _node, children, ...props }) {
              return <HeadingNode level={4} {...props}>{children}</HeadingNode>;
            },

            // Paragraphs
            p({ _node, ...props }) {
              return <p className="text-[13.5px] md:text-[14px] leading-relaxed my-2 last:mb-0 text-zinc-300" {...props} />;
            },

            // Lists
            ul({ _node, ...props }) {
              return <ul className="list-disc list-outside ml-4 my-2.5 space-y-1.5 text-zinc-300 marker:text-indigo-400 text-xs md:text-[13.5px]" {...props} />;
            },
            ol({ _node, ...props }) {
              return <ol className="list-decimal list-outside ml-4 my-2.5 space-y-1.5 text-zinc-300 marker:text-indigo-400 text-xs md:text-[13.5px]" {...props} />;
            },
            li({ _node, ...props }) {
              return <li className="leading-relaxed" {...props} />;
            },

            // Blockquote
            blockquote({ _node, ...props }) {
              return (
                <blockquote
                  className="border-l-2 border-indigo-400 pl-3.5 py-1.5 my-3 bg-indigo-500/[0.06] rounded-r-lg text-zinc-300 italic text-xs md:text-sm"
                  {...props}
                />
              );
            },

            // Divider
            hr({ _node, ...props }) {
              return <hr className="border-t border-white/10 my-4" {...props} />;
            },

            // Links
            a({ _node, ...props }) {
              return (
                <a
                  className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              );
            },

            // Emphasis
            strong({ _node, ...props }) {
              return <strong className="font-semibold text-zinc-100" {...props} />;
            },
            em({ _node, ...props }) {
              return <em className="italic text-zinc-300" {...props} />;
            }
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </MarkdownErrorBoundary>
    </div>
  );
});
