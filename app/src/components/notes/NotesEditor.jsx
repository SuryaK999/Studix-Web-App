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
  Undo, Redo, Users, MessageSquare, X, Send, Download, Loader2, BookOpen
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
        
        try { currentEditor.commands.setTextSelection({ from, to }); } catch (e) {}
        
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
    content: '<p>Start collaborating on notes...</p>',
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
      .then(({ content }) => {
        if (cancelled || !editor) return;
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
        
        try { editor.commands.setTextSelection({ from, to }); } catch (_) {}
        
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
  const exportToPDF = async () => {
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
  };

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
      className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans"
    >
      {/* Subtle radial glow of deep purple in the center */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_60%)] opacity-80" />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a]/30 bg-[#09090b]/40 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tip label="Bold (Ctrl+B)" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()}      className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('bold') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Bold  className="h-4.5 w-4.5" /></Button></Tip>
          <Tip label="Italic (Ctrl+I)" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()}    className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('italic') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Italic  className="h-4.5 w-4.5" /></Button></Tip>
          <div className="w-px h-6 bg-[#1e1f2b] mx-2" />
          <Tip label="Heading 1" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('heading', { level: 1 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Heading1 className="h-4.5 w-4.5" /></Button></Tip>
          <Tip label="Heading 2" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('heading', { level: 2 }) ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Heading2 className="h-4.5 w-4.5" /></Button></Tip>
          <div className="w-px h-6 bg-[#1e1f2b] mx-2" />
          <Tip label="Bullet list" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()}  className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('bulletList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><List  className="h-4.5 w-4.5" /></Button></Tip>
          <Tip label="Numbered list" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('orderedList') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><ListOrdered  className="h-4.5 w-4.5" /></Button></Tip>
          <div className="w-px h-6 bg-[#1e1f2b] mx-2" />
          <Tip label="Blockquote" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('blockquote') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Quote className="h-4.5 w-4.5" /></Button></Tip>
          <Tip label="Inline code" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleCode().run()}       className={cn("h-9 w-9 rounded-lg transition-all", editor.isActive('code') ? 'bg-indigo-500/20 text-indigo-400' : 'text-[#8E9297] hover:bg-[#1C1D24]')}><Code  className="h-4.5 w-4.5" /></Button></Tip>
          <div className="w-px h-6 bg-[#1e1f2b] mx-2" />
          <Tip label="Undo (Ctrl+Z)" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="text-[#8E9297] hover:text-white disabled:opacity-20 transition-colors"><Undo className="h-4.5 w-4.5" /></Button></Tip>
          <Tip label="Redo (Ctrl+Y)" side="bottom"><Button variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="text-[#8E9297] hover:text-white disabled:opacity-20 transition-colors"><Redo className="h-4.5 w-4.5" /></Button></Tip>
          
          <div className="w-px h-6 bg-[#1e1f2b] mx-2" />
          <Tip label="Export to PDF" side="bottom">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={exportToPDF} 
              disabled={exportLoading}
              className="text-[#8E9297] hover:text-[#7e56f0] hover:bg-[#7e56f0]/10 transition-colors duration-200"
            >
              {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4.5 w-4.5" />}
            </Button>
          </Tip>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)} className={showComments ? 'bg-accent text-accent-foreground' : ''}>
            <MessageSquare className="h-4 w-4 mr-1" />
            {comments.filter(c => !c.resolved).length}
          </Button>
          <Badge variant="secondary" className="flex items-center gap-1 bg-green-500/10 text-green-500 border-green-500/20">
            <Users className="h-3 w-3" />
            Live Sync
          </Badge>
          {isSaving ? (
            <span className="text-xs font-medium text-amber-500 animate-pulse w-24 text-right">Saving...</span>
          ) : lastSaved ? (
            <span className="text-xs text-muted-foreground w-24 text-right">
              {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="w-24" />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-8 relative scrollbar-hide notes-scroll-area">
          <EditorContent editor={editor} className="tiptap-editor ProseMirror h-full focus:outline-none min-h-[500px]" />
          
          {/* Welcome Empty State - Premium Minimalist */}
          {(editor.getHTML() === '<p>Start collaborating on notes...</p>' || editor.getHTML() === '<p></p>') && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl shadow-indigo-500/10">
                  <BookOpen className="w-10 h-10 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Collaborative Notes</h2>
                  <p className="text-muted-foreground text-sm max-w-[320px] leading-relaxed">
                    Build knowledge together in real-time. Document ideas, drafts, and project goals with your team.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                    Syncing Live
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Comments Sidebar */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-background/80 backdrop-blur-sm overflow-hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="font-semibold text-sm">Comments</h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowComments(false)}><X className="h-4 w-4" /></Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Select text to add a comment.</p>
                    ) : (
                      comments.filter(c => !c.resolved).map((comment) => (
                        <motion.div key={comment.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-3 bg-card text-card-foreground rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{comment.authorName}</span>
                            <Button variant="ghost" size="sm" className="h-5 text-xs text-muted-foreground hover:text-foreground" onClick={() => resolveComment(comment.id)}>Resolve</Button>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {selectedText && (
                  <div className="p-3 border-t border-border bg-card/50">
                    <p className="text-xs text-muted-foreground mb-2 italic">"{selectedText.slice(0, 30)}..."</p>
                    <div className="flex gap-2">
                      <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add comment..." className="flex-1 text-sm h-8" />
                      <Button size="icon" className="h-8 w-8" onClick={addComment} disabled={!newComment.trim()}><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
