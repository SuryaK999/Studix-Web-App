import { useState, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import GradientBlinds from '@/components/ui/GradientBlinds';
import Lightning from '@/components/ui/Lightning';
import { 
  BookOpen, Copy, ClipboardPaste, Trash2, 
  Edit2, SmilePlus, PhoneCall, Settings, Search, FilePlus, ChevronDown, CheckCheck,
  Bold, Italic, List, Table, Image, HelpCircle, Bot, Zap, LogIn, Reply, RefreshCw
} from 'lucide-react';
import { StudixLogo } from '@/components/StudixLogo';
import { Toaster, toast } from 'sonner';
import { GlobalThemeProvider } from '@/hooks/useGlobalTheme';
import { RadialMenu } from '@/components/ui/RadialMenu';
import VoiceFloatingPanel from '@/components/voice/VoiceFloatingPanel';
import ExploreDialog from '@/components/explore/ExploreDialog';
import { useUsersStore } from '@/store/usersStore';
import { startGlobalRoomsListener } from '@/realtime/globalRoomsListener';
import { useEffect } from 'react';
const Dashboard = lazy(() => import('@/components/Dashboard').then(module => ({ default: module.Dashboard })));
const StudyRoom = lazy(() => import('@/components/room/StudyRoom').then(module => ({ default: module.StudyRoom })));
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import RecentRooms from '@/pages/RecentRooms';
import AllRooms from '@/pages/AllRooms';

function RoomRouteWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StudyRoom roomId={id} onLeave={() => navigate('/')} />
    </Suspense>
  );
}

const MESSAGE_MENU_ITEMS = [
  { id: 'msg-reply', label: 'Reply', icon: Reply },
  { id: 'msg-copy', label: 'Copy', icon: Copy },
  { id: 'msg-edit', label: 'Edit', icon: Edit2 },
  { id: 'msg-react', label: 'React', icon: SmilePlus },
  { id: 'msg-delete', label: 'Delete', icon: Trash2, danger: true },
];

const CHAT_MENU_ITEMS = [
  { id: 'chat-paste', label: 'Paste', icon: ClipboardPaste },
  { id: 'chat-scroll', label: 'Scroll Top', icon: ChevronDown },
  { id: 'chat-read', label: 'Mark Read', icon: CheckCheck },
  { id: 'chat-settings', label: 'Settings', icon: Settings },
];

const NOTES_MENU_ITEMS = [
  { id: 'note-bold', label: 'Bold', icon: Bold },
  { id: 'note-italic', label: 'Italic', icon: Italic },
  { id: 'note-list', label: 'List', icon: List },
  { id: 'note-table', label: 'Table', icon: Table },
  { id: 'note-image', label: 'Image', icon: Image },
  { id: 'note-export', label: 'Export PDF', icon: Zap },
];

const TUTOR_MENU_ITEMS = [
  { id: 'tutor-ask', label: 'Ask AI', icon: Bot },
  { id: 'tutor-clear', label: 'Clear Chat', icon: Trash2, danger: true },
  { id: 'tutor-help', label: 'Help', icon: HelpCircle },
  { id: 'tutor-settings', label: 'AI Settings', icon: Settings },
];

const GLOBAL_MENU_ITEMS = [
  { id: 'glob-refresh', label: 'Refresh', icon: RefreshCw },
  { id: 'glob-voice', label: 'Voice', icon: PhoneCall },
  { id: 'glob-settings', label: 'Settings', icon: Settings },
  { id: 'glob-search', label: 'Search', icon: Search },
  { id: 'glob-create', label: 'Create', icon: FilePlus },
  { id: 'glob-join', label: 'Join', icon: LogIn },
  { id: 'glob-copy', label: 'Copy', icon: Copy },
  { id: 'glob-paste', label: 'Paste', icon: ClipboardPaste },
];

function AppContent() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const initUsersStore = useUsersStore(state => state.initStore);
  useEffect(() => {
    const unsub = initUsersStore();
    return () => { if (typeof unsub === 'function') unsub(); }
  }, [initUsersStore]);

  useEffect(() => {
    const unsubRooms = startGlobalRoomsListener();
    return () => { if (typeof unsubRooms === 'function') unsubRooms(); };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#0a071c] text-white relative flex overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        {}
        <motion.div 
          className="absolute inset-0 flex flex-col lg:flex-row w-full h-full z-10"
          initial={false}
          animate={{
            flexDirection: isLogin ? 'row' : 'row-reverse'
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {}
          <motion.div 
            layout
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex w-full lg:w-1/2 relative flex-col justify-between p-12 lg:p-20 overflow-hidden bg-[#070514] z-20 flex-shrink-0"
            style={{ 
              borderRight: isLogin ? '1px solid var(--border)' : 'none',
              borderLeft: !isLogin ? '1px solid var(--border)' : 'none'
            }}
          >
            <div className="absolute inset-0 z-0 opacity-80 mix-blend-screen transition-all duration-1000">
              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div 
                    key="blinds"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                    <GradientBlinds
                      gradientColors={['#A855F7', '#6366F1', '#281154']}
                      angle={40}
                      noise={0.3}
                      blindCount={12}
                      blindMinWidth={50}
                      spotlightRadius={0.7}
                      spotlightSoftness={1}
                      spotlightOpacity={1}
                      mouseDampening={0.15}
                      distortAmount={0.5}
                      shineDirection="left"
                    />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="lightning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0"
                  >
                     <Lightning hue={250} xOffset={0} speed={1.2} intensity={1.5} size={1.2} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <motion.div layout className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center gap-3.5">
                <StudixLogo size={42} idPrefix="auth-left-logo" />
                <span className="text-2xl font-bold tracking-tight text-white">Studix</span>
              </div>
            
              <div className="max-w-xl pb-10">
                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.div
                      key="loginText"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5 leading-[1.15]">
                        Empower your<br/>
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 text-transparent bg-clip-text">
                          collaborative learning.
                        </span>
                      </h1>
                      <p className="text-base sm:text-lg text-gray-300/90 leading-relaxed max-w-lg font-normal">
                        Join the real-time collaborative study platform designed for the modern team. Chat, share notes, and manage tasks seamlessly in one beautiful premium workspace.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signupText"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5 leading-[1.15]">
                        Spark your<br/>
                        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-300 text-transparent bg-clip-text">
                          creative potential.
                        </span>
                      </h1>
                      <p className="text-base sm:text-lg text-gray-300/90 leading-relaxed max-w-lg font-normal">
                        Create an account to unlock lightning-fast study sessions, high-performance tools, and secure cloud syncing.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Section / Auth Form */}
          <motion.div 
            layout
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-24 relative z-10 bg-transparent flex flex-col flex-shrink-0 overflow-y-auto"
          >
            {/* Ambient Background Gradient for Mobile */}
            <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none -z-10 bg-brand-gradient">
              <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-500/15 blur-[120px]" />
              <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[30%] rounded-full bg-purple-500/15 blur-[120px]" />
            </div>

            <div className="w-full max-w-[480px] m-auto z-10 flex flex-col justify-center min-h-[500px]">
              <div className="text-center mb-8 lg:hidden flex flex-col items-center">
                <div className="mb-4 flex items-center justify-center">
                  <StudixLogo size={52} idPrefix="auth-mob-logo" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  Studix
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Real-Time Collaborative Study Room
                </p>
              </div>

              <AnimatePresence mode="wait">
                {isLogin ? (
                  <motion.div
                    key="form-login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LoginForm onToggle={() => setIsLogin(false)} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="form-signup"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SignUpForm onToggle={() => setIsLogin(true)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Dashboard onEnterRoom={(id) => navigate(`/room/${id}`)} />} />
        <Route path="/recent" element={<Dashboard onEnterRoom={(id) => navigate(`/room/${id}`)}><RecentRooms /></Dashboard>} />
        <Route path="/rooms" element={<Dashboard onEnterRoom={(id) => navigate(`/room/${id}`)}><AllRooms /></Dashboard>} />
        <Route path="/room/:id" element={<RoomRouteWrapper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a071c] text-white relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/10 dark:bg-indigo-600/10 blur-[120px]" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex flex-col items-center max-w-sm w-full mx-auto"
        >
          {/* Logo with gentle pulse and drop-shadow, no bounding box */}
          <motion.div
            animate={{ 
              scale: [1, 1.06, 1],
              filter: [
                "drop-shadow(0 0 15px rgba(99, 102, 241, 0.25))",
                "drop-shadow(0 0 35px rgba(99, 102, 241, 0.6))",
                "drop-shadow(0 0 15px rgba(99, 102, 241, 0.25))"
              ]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8 z-10 relative flex items-center justify-center"
          >
            <StudixLogo size={80} idPrefix="loading-screen-logo" />
          </motion.div>

          {/* App Title */}
          <div className="text-center">
            <motion.h1 
              className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white relative inline-block mb-4"
              style={{ backgroundSize: "200% auto" }}
              animate={{ backgroundPosition: ["0% center", "200% center"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              Studix
            </motion.h1>
            
            {/* Loading Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} className="h-1.5 w-1.5 bg-purple-500 rounded-full" />
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function App() {

  const getRadialSourceText = (context, selection) => {
    if (selection) return selection;
    if (!context?.element) return '';

    const dataText = context.element.getAttribute('data-radial-text');
    if (dataText) return dataText;

    const p = context.element.querySelector('p');
    if (p) return p.innerText;

    const span = context.element.querySelector('span');
    if (span) return span.innerText;

    return context.element.innerText || '';
  };

  const resolveRadialItems = useCallback((target) => {
    
    let el = target;
    
    while (el && el !== document.body) {
      if (el.hasAttribute('data-radial-context')) {
        const ctx = el.getAttribute('data-radial-context');
        
        if (ctx === 'message') {
          const isOwn = el.getAttribute('data-message-own') === '1';
          return {
            items: MESSAGE_MENU_ITEMS.filter(item => (item.id === 'msg-edit' || item.id === 'msg-delete') ? isOwn : true),
            context: { 
              type: 'message', 
              element: el, 
              isOwn, 
              messageId: el.getAttribute('data-message-id'),
              text: el.getAttribute('data-radial-text')
            }
          };
        }
        
        if (ctx === 'chat') {
          return { items: CHAT_MENU_ITEMS, context: { type: 'chat', element: el } };
        }
        
        if (ctx === 'notes') {
          return { items: NOTES_MENU_ITEMS, context: { type: 'notes', element: el } };
        }
        
        if (ctx === 'tutor') {
          return { items: TUTOR_MENU_ITEMS, context: { type: 'tutor', element: el } };
        }
      }

      el = el.parentElement || (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);
    }

    return {
      items: GLOBAL_MENU_ITEMS,
      context: { type: 'global', element: document.body }
    };
  }, []);

  const handleRadialAction = useCallback(async (item, context) => {
    
    const selection = window.getSelection()?.toString();

    if (context?.type === 'message' && String(item.id).startsWith('msg-')) {
      context?.element?.dispatchEvent(new CustomEvent('radial-action', { 
        detail: { action: item.id },
        bubbles: true,
        composed: true
      }));

      if (item.id !== 'msg-copy') return;
    }

    switch (item.id) {
      case 'glob-copy':
      case 'chat-copy':
      case 'msg-copy': {
        const textToCopy = getRadialSourceText(context, selection);
        if (textToCopy) {
          try {
            await navigator.clipboard.writeText(textToCopy);
            toast.success('Copied to clipboard');
          } catch {

            const textArea = document.createElement("textarea");
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try { document.execCommand('copy'); toast.success('Copied'); } catch { toast.error('Copy failed'); }
            document.body.removeChild(textArea);
          }
        } else {
          toast.info('Nothing to copy');
        }
        break;
      }
      case 'glob-paste':
      case 'chat-paste': {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            document.execCommand('insertText', false, text);
          }
        } catch {
          toast.info('Use Ctrl+V to paste here');
        }
        break;
      }
      case 'glob-create':
      case 'glob-join':
      case 'glob-search':
      case 'glob-voice':
      case 'glob-settings':
      case 'chat-settings':
      case 'tutor-settings': {
        
        window.dispatchEvent(new CustomEvent('studix:action', { 
          detail: { action: item.id } 
        }));
        break;
      }
      case 'chat-scroll': {
        const scrollContainer = context?.element?.querySelector('[data-radix-scroll-area-viewport]') || context?.element;
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      }
      case 'glob-refresh':
        window.location.reload();
        break;
      default:
        
        if (
          String(item.id).startsWith('note-') || 
          String(item.id).startsWith('tutor-') || 
          item.id === 'msg-reply' || 
          item.id === 'msg-react' ||
          item.id === 'chat-read'
        ) {
          context?.element?.dispatchEvent(new CustomEvent('radial-action', { 
            detail: { action: item.id },
            bubbles: true,
            composed: true
          }));
          return;
        }
        toast.info(`Action: ${item.label}`);
    }
  }, []);

  return (
    <AuthProvider>
      <GlobalThemeProvider>
        <ExploreDialog />
        <VoiceFloatingPanel />
        <RadialMenu resolveItems={resolveRadialItems} onSelect={handleRadialAction}>
          <AppContent />
        </RadialMenu>
        <Toaster position="top-center" richColors />
      </GlobalThemeProvider>
    </AuthProvider>
  );
}

export default App;

