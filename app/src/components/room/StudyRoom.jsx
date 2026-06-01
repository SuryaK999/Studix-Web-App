import { useState, useEffect, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { TaskChecklist } from '@/components/tasks/TaskChecklist';
import { MembersList } from '@/components/presence/MembersList';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserSettings } from '@/components/settings/UserSettings';
import {
  Settings, Plus, Bot, 
  BookOpen, Mic, Hash, LogOut,
  PanelLeftClose, PanelRightClose, PanelLeft, PanelRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase/config';
import { doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { StudyRoomThemeProvider, useStudyRoomTheme } from '@/hooks/useStudyRoomTheme';
import { cn } from '@/lib/utils';
import { fetchUserRooms, fetchRoomData } from '@/services/api';
import { useInvisibleScroll } from '@/hooks/useInvisibleScroll';
import { useRef } from 'react';
import { addRecentRoom } from '@/utils/recentRooms';

const NotesEditor = lazy(() => import('@/components/notes/NotesEditor').then(m => ({ default: m.NotesEditor })));
const VoiceChat = lazy(() => import('@/components/voice/VoiceChat').then(m => ({ default: m.VoiceChat })));
const AiStudyBuddy = lazy(() => import('@/components/ai/AiStudyBuddy').then(m => ({ default: m.AiStudyBuddy })));

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full bg-[#12131B] p-5 gap-4">
      {}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="space-y-2">
          <div className="h-3.5 w-28 rounded skeleton" />
          <div className="h-2 w-16 rounded skeleton" />
        </div>
      </div>
      {}
      {[0.7, 0.5, 0.85, 0.4, 0.6].map((w, i) => (
        <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "" : "flex-row-reverse")}>
          <div className="w-8 h-8 rounded-full skeleton shrink-0" />
          <div className="space-y-1.5 max-w-[60%]" style={{ width: `${w * 100}%` }}>
            <div className="h-2.5 w-20 rounded skeleton" />
            <div className="h-12 rounded-xl skeleton" />
          </div>
        </div>
      ))}
      {}
      <div className="mt-auto">
        <div className="h-12 rounded-xl skeleton" />
      </div>
    </div>
  );
}

export function StudyRoom({ roomId, onLeave }) {
  return (
    <StudyRoomThemeProvider roomId={roomId}>
      <StudyRoomContent roomId={roomId} onLeave={onLeave} />
    </StudyRoomThemeProvider>
  );
}

function StudyRoomContent({ roomId, onLeave }) {
  const { user } = useAuth();
  usePresence(roomId);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const { activeTheme } = useStudyRoomTheme();

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingSwitchRoomId, setPendingSwitchRoomId] = useState(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [customChannels, setCustomChannels] = useState([]);

  const handleRoomSwitchClick = (targetRoomId, isActive) => {
    if (isActive) return;
    setPendingSwitchRoomId(targetRoomId);
    setShowSwitchModal(true);
  };

  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(320);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const roomRailRef = useRef(null);
  const leftSidebarScrollRef = useRef(null);
  const rightSidebarScrollRef = useRef(null);

  useInvisibleScroll(roomRailRef);
  useInvisibleScroll(leftSidebarScrollRef);
  useInvisibleScroll(rightSidebarScrollRef);

  const startResizingLeft = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    
    const onMouseMove = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth > 180 && newWidth < 400) setLeftWidth(newWidth);
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizingRight = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightWidth;
    
    const onMouseMove = (moveEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth > 240 && newWidth < 500) setRightWidth(newWidth);
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadRooms = async () => {
      try {
        const roomsData = await fetchUserRooms();
        if (isMounted) setRooms(roomsData);
      } catch (err) {
        if (isMounted) console.error("Error loading StudyRoom rail rooms:", err);
      }
    };

    loadRooms();
    window.addEventListener('roomsUpdated', loadRooms);

    return () => { 
      isMounted = false; 
      window.removeEventListener('roomsUpdated', loadRooms);
    };
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      
      if (window.innerWidth < 1200) setIsRightSidebarCollapsed(true);
      
      if (window.innerWidth < 900) setIsLeftSidebarCollapsed(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!roomId || !user) return;
    let isMounted = true;
    
    const fetchCurrentRoom = async () => {
      try {
        const data = await fetchRoomData(roomId);
        if (isMounted) {
          setCurrentRoom(data);
          if (data) addRecentRoom(data);
        }
      } catch (err) {
        if (isMounted) console.error(err);
      }
    };
    fetchCurrentRoom();

    return () => { isMounted = false; };
  }, [roomId, user]);

  useEffect(() => {
    if (!roomId) return;
    const channelsQuery = query(collection(db, 'rooms', roomId, 'channels'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(channelsQuery, (snapshot) => {
      const parsed = [];
      snapshot.forEach(d => parsed.push({ id: d.id, ...d.data() }));
      setCustomChannels(parsed);
    });
    return () => unsub();
  }, [roomId]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      await addDoc(collection(db, 'rooms', roomId, 'channels'), {
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      setShowChannelModal(false);
      setNewChannelName('');
      setActiveTab(`custom-${newChannelName.trim().toLowerCase().replace(/\s+/g, '-')}`);
    } catch (err) {
      console.error(err);
    }
  };

  const CHANNELS = [
    { id: 'chat', label: 'chat-channel', icon: Hash },
    { id: 'notes', label: 'collaborative-notes', icon: BookOpen },
    { id: 'voice', label: 'voice-lounge', icon: Mic },
    { id: 'ai', label: 'ai-tutor-bot', icon: Bot },
  ];

  return (
    <div className={`flex h-screen w-full font-sans text-white overflow-hidden bg-[#0A0B10] selection:bg-primary/30 transition-colors duration-500`}
         style={{ colorScheme: activeTheme === 'light' ? 'light' : 'dark' }}>
      
      {}
      <nav className="w-[72px] bg-[#0C0D12] flex flex-col items-center py-3 shrink-0 z-30 border-r border-white/[0.04]">
        <div className="w-12 h-12 rounded-[16px] bg-primary flex items-center justify-center shrink-0 mb-3 cursor-pointer shadow-[0_4px_20px_rgba(113,72,235,0.35)] hover:rounded-[12px] transition-all duration-200">
          <Bot className="w-7 h-7 text-white" />
        </div>
        
        <div className="w-8 h-[2px] bg-white/[0.06] rounded-full mb-3" />

        <div ref={roomRailRef} className="flex-1 overflow-y-auto w-full flex flex-col items-center space-y-2 custom-scrollbar no-scrollbar">
          {rooms.map((room) => {
            const isActive = room.id === roomId;
            return (
              <RailRoomIcon key={room.id} room={room} isActive={isActive} onSwitch={() => handleRoomSwitchClick(room.id, isActive)} />
            );
          })}
        </div>

        <div className="mt-auto px-4 pb-2">
           <button 
             onClick={() => setShowLeaveModal(true)}
             className="w-12 h-12 rounded-[24px] bg-[#16171F] flex items-center justify-center text-[#F43F5E] hover:rounded-[16px] hover:bg-[#F43F5E]/10 transition-all duration-200 group"
             title="Leave Room"
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </nav>

      {}
      <aside 
        style={{ width: isLeftSidebarCollapsed ? 0 : leftWidth }}
        className={cn(
          "bg-[#0F1015] flex flex-col shrink-0 z-20 transition-[width] duration-300 relative overflow-hidden",
          isLeftSidebarCollapsed ? "border-none" : "border-r border-white/[0.04]"
        )}
      >
        <header className="h-[52px] px-4 flex items-center border-b border-white/[0.04] shrink-0">
          <h2 className="text-[15px] font-extrabold text-white truncate max-w-[160px] tracking-tight">
            {currentRoom?.name || 'Study Room'}
          </h2>
          <button 
            onClick={() => setIsLeftSidebarCollapsed(true)}
            className="ml-auto p-1.5 rounded-lg hover:bg-white/[0.04] text-[#4A4D57] hover:text-white/70 transition-all duration-200"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </header>

        <div ref={leftSidebarScrollRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 custom-scrollbar">
          {CHANNELS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md transition-all duration-150 group",
                  isActive 
                    ? "bg-white/[0.06] text-white" 
                    : "text-[#5D5F69] hover:bg-white/[0.03] hover:text-[#A1A3AB]"
                )}
              >
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-[#A1A3AB]" : "text-[#4A4D57] group-hover:text-[#6F7483]")} />
                <span className="text-[13.5px] font-semibold tracking-tight truncate">
                  {item.label}
                </span>
                {item.id === 'chat' && isActive && (
                   <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </button>
            );
          })}

          <div className="pt-4 pb-1 group/header flex items-center justify-between px-3">
             <span className="text-[10px] font-black tracking-[0.2em] text-[#4A4D57] group-hover/header:text-[#6F7483] uppercase transition-colors">
               Channels
             </span>
             <button
               onClick={() => setShowChannelModal(true)}
               className="p-1 rounded-md hover:bg-white/[0.04] text-[#4A4D57] hover:text-primary transition-all duration-200"
               title="Create Channel"
             >
               <Plus className="w-3.5 h-3.5" />
             </button>
          </div>

          {customChannels.map((chan) => {
            const chanId = `custom-${chan.name}`;
            const isActive = activeTab === chanId;
            return (
              <button
                key={chan.id}
                onClick={() => setActiveTab(chanId)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md transition-all duration-150 group",
                  isActive 
                    ? "bg-white/[0.06] text-white" 
                    : "text-[#5D5F69] hover:bg-white/[0.03] hover:text-[#A1A3AB]"
                )}
              >
                <Hash className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-[#A1A3AB]" : "text-[#4A4D57] group-hover:text-[#6F7483]")} />
                <span className="text-[13.5px] font-semibold tracking-tight truncate">
                  {chan.name}
                </span>
                {isActive && (
                   <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </button>
            );
          })}
        </div>

        {}
        <div className="mt-auto px-3 py-2.5 border-t border-white/[0.04] bg-[#0C0D12]">
          <div 
            className="group flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 hover:bg-white/[0.03] active:scale-[0.98] cursor-pointer"
            onClick={() => setShowSettings(true)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8 rounded-full ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {user?.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0C0D12] rounded-full" />
              </div>
              
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[12px] font-bold text-white truncate tracking-tight">
                  {user?.displayName || 'Anonymous'}
                </span>
                <span className="text-[10px] text-[#4A4D57] font-medium truncate">
                  Online
                </span>
              </div>
            </div>

            <button 
              className="w-7 h-7 rounded-md flex items-center justify-center text-[#4A4D57] group-hover:text-primary/70 transition-all duration-200 hover:bg-primary/10"
              title="User Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {}
      {!isLeftSidebarCollapsed && (
        <div
          onMouseDown={startResizingLeft}
          className="w-[3px] hover:w-1.5 transition-all cursor-col-resize bg-transparent hover:bg-primary/30 z-50 h-full shrink-0"
        />
      )}

      {}
      <main className="flex-1 flex flex-col min-w-0 bg-[#12131B] z-10 relative">
        {}
        <header className="h-[52px] px-4 flex items-center justify-between shrink-0 border-b border-white/[0.04] bg-[#13141B]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            {isLeftSidebarCollapsed && (
              <button 
                onClick={() => setIsLeftSidebarCollapsed(false)}
                className="p-1.5 rounded-md bg-white/[0.04] hover:bg-primary/15 text-[#4A4D57] hover:text-primary transition-all duration-200"
                title="Expand Sidebars"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <Hash className="w-5 h-5 text-[#4A4D57]" />
            <h1 className="text-[14px] font-extrabold text-white leading-none tracking-tight">
              {activeTab === 'chat' ? 'chat-channel' : activeTab === 'notes' ? 'notes' : activeTab === 'voice' ? 'voice' : 'ai-buddy'}
            </h1>
            <div className="h-4 w-px bg-white/[0.06] mx-1" />
            <p className="text-[12px] text-[#4A4D57] font-medium hidden md:block max-w-[300px] truncate">
              {currentRoom?.description || 'Everything starts here.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             {isRightSidebarCollapsed && (
               <button 
                 onClick={() => setIsRightSidebarCollapsed(false)}
                 className="p-1.5 rounded-md bg-white/[0.04] hover:bg-primary/15 text-[#4A4D57] hover:text-primary transition-all duration-200"
                 title="Toggle Sidebar"
               >
                 <PanelRight className="w-4 h-4" />
               </button>
             )}
          </div>
        </header>

        {}
        <div className="flex-1 overflow-hidden relative">
          <Suspense fallback={<ChatSkeleton />}>
             <AnimatePresence mode="wait">
               <motion.div 
                 key={activeTab} 
                 initial={{opacity:0}} 
                 animate={{opacity:1}} 
                 exit={{opacity:0}} 
                 transition={{duration:0.1}} 
                 className="h-full"
               >
                  {activeTab === 'chat' && <ChatPanel roomId={roomId} roomData={currentRoom} />}
                  {activeTab.startsWith('custom-') && <ChatPanel roomId={`${roomId}_${activeTab}`} roomData={{...currentRoom, name: activeTab.replace('custom-', '')}} />}
                  {activeTab === 'notes' && <NotesEditor roomId={roomId} />}
                  {activeTab === 'voice' && <VoiceChat roomId={roomId} />}
                  {activeTab === 'ai' && <AiStudyBuddy roomId={roomId} />}
               </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>

      {}
      {!isRightSidebarCollapsed && (
        <div
          onMouseDown={startResizingRight}
          className="w-[3px] hover:w-1.5 transition-all cursor-col-resize bg-transparent hover:bg-primary/30 z-50 h-full shrink-0"
        />
      )}

      {}
      <aside 
        style={{ width: isRightSidebarCollapsed ? 0 : rightWidth }}
        className={cn(
          "bg-[#0F1015] flex flex-col shrink-0 transition-[width] duration-300 relative overflow-hidden",
          isRightSidebarCollapsed ? "border-none" : "border-l border-white/[0.04]"
        )}
      >
        <header className="h-[52px] px-4 flex items-center border-b border-white/[0.04] shrink-0">
           <button 
             onClick={() => setIsRightSidebarCollapsed(true)}
             className="p-1.5 rounded-md hover:bg-white/[0.04] text-[#4A4D57] hover:text-white/70 transition-all duration-200 mr-2"
             title="Collapse Sidebar"
           >
             <PanelRightClose className="w-4 h-4" />
           </button>
           <h3 className="text-[11px] font-black text-[#4A4D57] uppercase tracking-[0.15em]">Room Intelligence</h3>
        </header>

        <div ref={rightSidebarScrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 space-y-6">
          {}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-black text-[#4A4D57] uppercase tracking-[0.12em]">Members</h4>
              <button className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors duration-200 px-2 py-0.5 rounded hover:bg-primary/10">
                Set Status
              </button>
            </div>
            <MembersList roomId={roomId} />
          </section>

          {}
          <section className="pt-5 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-3">
               <h4 className="text-[11px] font-black text-[#4A4D57] uppercase tracking-[0.12em]">Tasks & Shared Files</h4>
            </div>
            <TaskChecklist roomId={roomId} />
          </section>
        </div>
      </aside>

      <UserSettings 
        open={showSettings} 
        onOpenChange={setShowSettings} 
        roomId={roomId}
      />

      {}
      <Dialog open={showLeaveModal} onOpenChange={setShowLeaveModal}>
        <DialogContent className="bg-[#0e0f14] border-white/5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Leave Study Room?</DialogTitle>
            <DialogDescription className="text-[#A1A3AB]">
              Are you sure you want to leave {currentRoom?.name}? You will return to the lobby.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowLeaveModal(false)} className="text-[#A1A3AB] hover:text-white hover:bg-white/5">Cancel</Button>
            <Button variant="destructive" onClick={onLeave} className="bg-[#F43F5E] hover:bg-[#E11D48] text-white">Leave Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="bg-[#0e0f14] border-white/5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Switch Room?</DialogTitle>
            <DialogDescription className="text-[#A1A3AB]">
              You are about to navigate away from {currentRoom?.name}. To join another room, you will first return to the lobby. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowSwitchModal(false)} className="text-[#A1A3AB] hover:text-white hover:bg-white/5">Cancel</Button>
            <Button 
               className="bg-primary hover:bg-primary/90 text-white"
               onClick={() => {
                 setShowSwitchModal(false);
                 onLeave();
               }}
            >
              Switch Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
        <DialogContent className="bg-[#0e0f14] border-white/5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Create Channel</DialogTitle>
            <DialogDescription className="text-[#A1A3AB]">
              Create a new text channel for focused discussions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChannel}>
            <div className="my-6">
              <Input 
                autoFocus
                placeholder="e.g. general-chat, project-ideas"
                className="bg-white/[0.03] border-white/10 text-white focus-visible:ring-primary/50"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <DialogFooter className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowChannelModal(false)} className="text-[#A1A3AB] hover:text-white hover:bg-white/5">Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white" disabled={!newChannelName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RailRoomIcon({ room, isActive, onSwitch }) {
  const [avatarUrl, setAvatarUrl] = useState(room.avatarUrl);

  useEffect(() => {
    
    const unsub = onSnapshot(doc(db, 'rooms', room.id), (docSnap) => {
      if (docSnap.exists() && docSnap.data().avatarUrl) {
        setAvatarUrl(docSnap.data().avatarUrl);
      }
    });
    return () => unsub();
  }, [room.id]);

  return (
    <div className="relative group flex items-center">
      <div className={cn(
        "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200",
        isActive ? "h-8" : "h-2 scale-0 group-hover:scale-100 group-hover:h-5"
      )} />
      <button 
        onClick={onSwitch}
        className={cn(
          "w-12 h-12 rounded-[24px] flex items-center justify-center transition-all duration-200 overflow-hidden font-bold text-sm border border-transparent",
          isActive ? "rounded-[16px] bg-primary text-white shadow-[0_2px_12px_rgba(113,72,235,0.3)] border-white/10" : "bg-[#16171F] text-[#6F7483] hover:rounded-[16px] hover:bg-primary hover:text-white hover:border-white/10"
        )}
        title={room.name}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          room.name ? room.name[0].toUpperCase() : <Hash className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
