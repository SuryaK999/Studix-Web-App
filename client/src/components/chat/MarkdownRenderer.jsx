import React, { memo, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';
import { toast } from 'sonner';

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
          code({ node, inline, className: codeClass, children, ...props }) {
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
          table({ node, ...props }) {
            return (
              <div className="overflow-x-auto my-3 rounded-xl border border-white/10 bg-black/40 shadow-inner custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse" {...props} />
              </div>
            );
          },
          thead({ node, ...props }) {
            return <thead className="bg-white/[0.05] border-b border-white/10 text-zinc-200" {...props} />;
          },
          th({ node, ...props }) {
            return (
              <th
                className="px-3.5 py-2.5 font-semibold text-zinc-200 tracking-wide uppercase text-[11px] whitespace-nowrap"
                {...props}
              />
            );
          },
          tbody({ node, ...props }) {
            return <tbody className="divide-y divide-white/5" {...props} />;
          },
          tr({ node, ...props }) {
            return <tr className="hover:bg-white/[0.02] transition-colors" {...props} />;
          },
          td({ node, ...props }) {
            return <td className="px-3.5 py-2 text-zinc-300 text-xs leading-relaxed align-top" {...props} />;
          },

          // Headings
          h1({ node, ...props }) {
            return <h1 className="text-base md:text-lg font-bold text-zinc-100 mt-4 mb-2 flex items-center gap-2" {...props} />;
          },
          h2({ node, ...props }) {
            return <h2 className="text-[15px] md:text-base font-semibold text-zinc-100 mt-3.5 mb-1.5 flex items-center gap-1.5" {...props} />;
          },
          h3({ node, ...props }) {
            return <h3 className="text-[14px] md:text-[14.5px] font-medium text-zinc-200 mt-3 mb-1 flex items-center gap-1.5" {...props} />;
          },
          h4({ node, ...props }) {
            return <h4 className="text-[13px] md:text-[13.5px] font-medium text-zinc-300 mt-2.5 mb-0.5" {...props} />;
          },

          // Paragraphs
          p({ node, ...props }) {
            return <p className="text-[13.5px] md:text-[14px] leading-relaxed my-2 last:mb-0 text-zinc-300" {...props} />;
          },

          // Lists
          ul({ node, ...props }) {
            return <ul className="list-disc list-outside ml-4 my-2.5 space-y-1.5 text-zinc-300 marker:text-indigo-400 text-xs md:text-[13.5px]" {...props} />;
          },
          ol({ node, ...props }) {
            return <ol className="list-decimal list-outside ml-4 my-2.5 space-y-1.5 text-zinc-300 marker:text-indigo-400 text-xs md:text-[13.5px]" {...props} />;
          },
          li({ node, ...props }) {
            return <li className="leading-relaxed" {...props} />;
          },

          // Blockquote
          blockquote({ node, ...props }) {
            return (
              <blockquote
                className="border-l-2 border-indigo-400 pl-3.5 py-1.5 my-3 bg-indigo-500/[0.06] rounded-r-lg text-zinc-300 italic text-xs md:text-sm"
                {...props}
              />
            );
          },

          // Divider
          hr({ node, ...props }) {
            return <hr className="border-t border-white/10 my-4" {...props} />;
          },

          // Links
          a({ node, ...props }) {
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
          strong({ node, ...props }) {
            return <strong className="font-semibold text-zinc-100" {...props} />;
          },
          em({ node, ...props }) {
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
