import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import debounce from 'lodash/debounce';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import {
  Bold, Italic, List, ListOrdered, Quote, Code, Heading1, Heading2,
  Undo, Redo, Users, MessageSquare, X, Send, Download, Loader2, BookOpen,
  Copy, Check, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { fetchNote } from '@/services/api';

export function NotesEditor({ roomId, roomName }) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState(null);
  const [copiedNote, setCopiedNote] = useState(false);

  const { user } = useAuth();
  const { socket } = useSocket(roomId);

  // Prevent remote patches from overwriting while user is actively typing
  const isLocalUpdateRef = useRef(false);
  const initialLoadDone = useRef(false);
  const patchQueueRef = useRef(null);
  const isExporting = useRef(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ─── Debounced socket emit (700ms) ────────────────────────────
  const emitNoteUpdate = useMemo(
    () =>
      debounce((content, sock) => {
        if (!sock) return;
        setIsSaving(true);
        sock.emit('notes:update', { roomId, content });
      }, 700),
    [roomId]
  );

  // ─── Typing Pause Detector ────────────────────────────────────
  const setLocalTypingFalse = useMemo(() => debounce((currentEditor) => {
    isLocalUpdateRef.current = false;
    
    // Check if we missed any patches while typing
    if (patchQueueRef.current && currentEditor) {
      const activeContent = currentEditor.getHTML();
      if (activeContent !== patchQueueRef.current) {
        // We merge: save cursor, apply patch, restore cursor
        const { from, to } = currentEditor.state.selection;
        const scrollContainer = document.querySelector('.notes-scroll-area');
        const scrollPos = scrollContainer?.scrollTop || 0;
        
        currentEditor.commands.setContent(patchQueueRef.current, false);
        
        try { currentEditor.commands.setTextSelection({ from, to }); } catch {}
        
        // Restore scroll gracefully
        requestAnimationFrame(() => {
          if (scrollContainer) scrollContainer.scrollTop = scrollPos;
        });
      }
      patchQueueRef.current = null;
    }
  }, 600), []);

  // ─── Editor ───────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      isLocalUpdateRef.current = true;
      setLocalTypingFalse(editor);
      emitNoteUpdate(editor.getHTML(), socket);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      setSelectionPosition(from);
      setSelectedText(editor.state.doc.textBetween(from, to));
    },
  });

  // Cancel pending debounce on unmount
  useEffect(() => () => { 
    emitNoteUpdate.cancel(); 
    setLocalTypingFalse.cancel();
  }, [emitNoteUpdate, setLocalTypingFalse]);

  // ─── Initial load from MongoDB REST API ───────────────────────
  useEffect(() => {
    if (!roomId || !editor) return;
    let cancelled = false;

    fetchNote(roomId)
      .then((data) => {
        if (cancelled || !editor) return;
        const content = data?.content;
        if (content && editor.getHTML() !== content) {
          editor.commands.setContent(content, false);
        }
        initialLoadDone.current = true;
      })
      .catch(() => {
        if (!cancelled) initialLoadDone.current = true;
      });

    return () => { cancelled = true; };
  }, [roomId, editor]);

  // ─── Socket: receive realtime patches from others ─────────────
  useEffect(() => {
    if (!socket || !editor) return;

    const handlePatch = ({ content, senderId }) => {
      // Ignore patches from ourselves
      if (senderId === user?.uid) return;
      
      // If we are actively typing, queue the patch to apply seamlessly right after typing stops
      if (isLocalUpdateRef.current) {
        patchQueueRef.current = content;
        return;
      }

      if (editor.getHTML() !== content) {
        const { from, to } = editor.state.selection;
        const scrollContainer = document.querySelector('.notes-scroll-area');
        const scrollPos = scrollContainer?.scrollTop || 0;

        editor.commands.setContent(content, false);
        
        try { editor.commands.setTextSelection({ from, to }); } catch {}
        
        requestAnimationFrame(() => {
          if (scrollContainer) scrollContainer.scrollTop = scrollPos;
        });
      }
    };

    const handleSaved = ({ at }) => {
      setIsSaving(false);
      setLastSaved(new Date(at));
    };

    const handleSaveError = () => {
      setIsSaving(false);
    };

    socket.on('notes:patch',      handlePatch);
    socket.on('notes:saved',      handleSaved);
    socket.on('notes:save_error', handleSaveError);

    // Request current content when socket connects to room
    if (initialLoadDone.current === false) {
      socket.emit('notes:load', { roomId });
    }

    return () => {
      socket.off('notes:patch',      handlePatch);
      socket.off('notes:saved',      handleSaved);
      socket.off('notes:save_error', handleSaveError);
    };
  }, [socket, editor, user?.uid, roomId]);

  // ─── Comments (stored locally + emitted via socket as part of note) ────
  const addComment = useCallback(() => {
    if (!newComment.trim() || !user || selectionPosition === null) return;

    const comment = {
      id:         Date.now().toString(),
      text:       newComment,
      authorId:   user.uid,
      authorName: user.displayName || 'Anonymous',
      createdAt:  Date.now(),
      position:   selectionPosition,
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  }, [newComment, user, selectionPosition]);

  const resolveComment = useCallback((commentId) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: true } : c));
  }, []);

  // ─── PDF Export Logic ──────────────────────────────────────────────────
  const exportToPDF = useCallback(async () => {
    if (!editor || isExporting.current) return;
    try {
      isExporting.current = true;
      setExportLoading(true);
      toast.info('Preparing PDF export...');

      // 1. Ensure any previous print root is cleared
      let printRoot = document.getElementById('notes-print-root');
      if (!printRoot) {
        printRoot = document.createElement('div');
        printRoot.id = 'notes-print-root';
        document.body.appendChild(printRoot);
      }
      printRoot.innerHTML = '';

      // 2. Add header
      const header = document.createElement('h1');
      header.innerText = roomName ? `${roomName} Notes` : 'Study Notes';
      header.style.fontSize = '24px';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '2px solid #eee';
      header.style.paddingBottom = '10px';
      printRoot.appendChild(header);

      // 3. Clone editor content
      const editorElement = editor.view.dom;
      const clone = editorElement.cloneNode(true);
      
      // Strip editor chrome if needed
      clone.removeAttribute('contenteditable');
      clone.querySelectorAll('[contenteditable]').forEach(el => 
        el.removeAttribute('contenteditable')
      );
      
      // Clean up prosemirror specific classes that might mess up print
      clone.classList.remove('ProseMirror', 'focus:outline-none');
      clone.className = ''; 

      printRoot.appendChild(clone);

      // 4. Force Light Mode & Setup Print Environment
      document.documentElement.classList.add('print-mode');
      document.body.classList.add('print-mode');
      
      // Allow DOM to update and elements to render fully
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 5. Print
      window.print();
      
      toast.success('PDF export ready 🎉');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to export PDF.');
    } finally {
      // 6. Cleanup
      document.documentElement.classList.remove('print-mode');
      document.body.classList.remove('print-mode');

      const printRoot = document.getElementById('notes-print-root');
      if (printRoot) printRoot.remove();
      
      isExporting.current = false;
      setExportLoading(false);
      
      // Restore focus to editor without causing page shifting glitches
      requestAnimationFrame(() => editor?.commands.focus());
    }
  }, [editor, roomName]);

  const editorStats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0 };
    const text = editor.state.doc.textContent || '';
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = text.length;
    return { words, characters };
  }, [editor]);

  const copyNoteText = useCallback(async () => {
    if (!editor) return;
    try {
      const text = editor.state.doc.textContent || '';
      await navigator.clipboard.writeText(text);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
      toast.success('Notes copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [editor]);

  // ─── Listen for Radial Menu Actions ───────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handler = (e) => {
      const action = (e).detail?.action;
      if (!action || !action.startsWith('note-')) return;

      switch (action) {
        case 'note-bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'note-italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'note-list':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'note-table':
          toast.info('Table feature: Try typing /table in the editor');
          break;
        case 'note-image':
          toast.info('Image upload: Drag and drop into the editor');
          break;
        case 'note-export':
          exportToPDF();
          break;
        default:
          break;
      }
    };

    const el = document.getElementById(`notes-editor-${roomId}`);
    if (el) {
      el.addEventListener('radial-action', handler);
      return () => el.removeEventListener('radial-action', handler);
    }
  }, [editor, roomId, exportToPDF]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div 
      id={`notes-editor-${roomId}`}
      data-radial-context="notes"
      className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans select-text"
    >
      {/* Subtle radial glow of deep purple in the center */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />

      {/* ── 1. Responsive & Polished Toolbar ── */}
      <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 border-b border-white/[0.06] bg-[#09090b]/90 backdrop-blur-xl shrink-0 z-20 gap-2 sm:gap-3 overflow-x-auto scrollbar-none no-scrollbar [&::-webkit-scrollbar]:hidden">
        {/* Left Formatting Tools Group */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Text Style Pill */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 rounded-lg sm:rounded-xl p-0.5">
            <Tip label="Bold (Ctrl+B)" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('bold') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Bold className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Italic (Ctrl+I)" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('italic') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Italic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Inline code" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('code') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Blockquote" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('blockquote') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Quote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
          </div>

          <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

          {/* Headings Pill */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 rounded-lg sm:rounded-xl p-0.5">
            <Tip label="Heading 1" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('heading', { level: 1 }) ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Heading1 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Heading 2" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('heading', { level: 2 }) ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <Heading2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
          </div>

          <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

          {/* Lists Pill */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 rounded-lg sm:rounded-xl p-0.5">
            <Tip label="Bullet list" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('bulletList') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Numbered list" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-all", editor.isActive('orderedList') ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-[#8E9297] hover:text-white hover:bg-white/5')}
              >
                <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
          </div>

          <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

          {/* History Pill */}
          <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/5 rounded-lg sm:rounded-xl p-0.5">
            <Tip label="Undo (Ctrl+Z)" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg text-[#8E9297] hover:text-white disabled:opacity-20 transition-colors"
              >
                <Undo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
            <Tip label="Redo (Ctrl+Y)" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg text-[#8E9297] hover:text-white disabled:opacity-20 transition-colors"
              >
                <Redo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Tip>
          </div>

          <div className="w-px h-4 sm:h-5 bg-white/10 mx-0.5 sm:mx-1 shrink-0" />

          {/* Quick Actions (Export PDF & Copy Text) */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Tip label="Export to PDF" side="bottom">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={exportToPDF} 
                disabled={exportLoading}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg text-[#8E9297] hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
              >
                {exportLoading ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
            </Tip>

            <Tip label="Copy All Notes" side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={copyNoteText}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg text-[#8E9297] hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
              >
                {copiedNote ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>
            </Tip>
          </div>
        </div>

        {/* Right Info & Live Collaboration Group */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {/* Word Count Indicator */}
          <span className="hidden sm:inline-block text-[10.5px] sm:text-[11px] font-medium text-zinc-400 bg-white/[0.03] border border-white/5 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            {editorStats.words} words
          </span>

          {/* Comments Toggle Button */}
          <Tip label="Toggle room comments panel" side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all border shrink-0",
                showComments
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/30'
                  : 'bg-white/[0.03] text-zinc-300 border-white/5 hover:text-white hover:bg-white/5'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden sm:inline">Comments</span>
              {comments.filter(c => !c.resolved).length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                  {comments.filter(c => !c.resolved).length}
                </span>
              )}
            </Button>
          </Tip>

          {/* Live Sync Badge */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap shadow-[0_0_10px_rgba(16,185,129,0.15)] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Live Sync</span>
          </div>

          {/* Saving Status Indicator */}
          <div className="text-[10px] sm:text-[11px] text-right min-w-[50px] sm:min-w-[65px] shrink-0">
            {isSaving ? (
              <span className="font-semibold text-amber-400 animate-pulse">Saving...</span>
            ) : lastSaved ? (
              <span className="text-zinc-500 font-medium">
                {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 2. Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-10 lg:px-14 py-4 sm:py-6 md:py-8 relative custom-scrollbar notes-scroll-area">
          <div className="max-w-4xl mx-auto min-h-[500px]">
            <EditorContent editor={editor} className="tiptap-editor ProseMirror h-full focus:outline-none" />
          </div>
          
          {/* Welcome Empty State */}
          {editor.isEmpty && (
            <div
              onClick={() => editor.chain().focus().run()}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 sm:p-8 text-center cursor-text"
            >
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center gap-3 sm:gap-4 pointer-events-none"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center shadow-2xl shadow-purple-500/15">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300" />
                </div>
                <div className="space-y-1.5 px-4">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Collaborative Study Notes</h2>
                  <p className="text-zinc-400 text-xs sm:text-sm max-w-sm leading-relaxed">
                    Capture lecture highlights, synthesize takeaways, or ask StudyBuddy AI to append explanations directly here.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-widest leading-none">
                    Click anywhere to start typing
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* ── 3. Comments Sidebar / Mobile Drawer ── */}
        <AnimatePresence>
          {showComments && (
            <>
              {/* Mobile backdrop overlay for tap-outside to close */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowComments(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30"
              />

              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute inset-y-0 right-0 z-40 w-[88vw] sm:w-80 md:w-96 max-w-[400px] border-l border-white/10 bg-[#0c0d14]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col"
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <h4 className="font-bold text-sm text-white">Discussion Comments</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg"
                    onClick={() => setShowComments(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center py-8 px-4 text-zinc-500 text-xs leading-relaxed">
                        No comments yet. Select any text in the note to start a contextual discussion.
                      </div>
                    ) : (
                      comments.filter(c => !c.resolved).map((comment) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-[#131422]/90 text-white rounded-xl border border-purple-500/20 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-purple-200">{comment.authorName}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-[10px] text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded"
                              onClick={() => resolveComment(comment.id)}
                            >
                              Resolve
                            </Button>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed">{comment.text}</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {selectedText && (
                  <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-white/[0.06] bg-[#121320]/60">
                    <p className="text-[11px] text-zinc-400 mb-2 italic line-clamp-1 border-l-2 border-purple-500/50 pl-2">
                      "{selectedText.slice(0, 40)}..."
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Comment on selection..."
                        className="flex-1 text-xs h-8 bg-black/40 border-white/10 text-white focus:ring-purple-500/40"
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                        onClick={addComment}
                        disabled={!newComment.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
