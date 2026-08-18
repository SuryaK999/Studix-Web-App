import React, { useState, useEffect, useRef, memo } from 'react';
import { Home, Clock, Grid, Folder, Flame, BookOpen, Plus, Compass, ChevronDown, Settings, Hash } from 'lucide-react';
import { StudixLogo } from './StudixLogo';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { fetchUserRooms } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { UserSettings } from './settings/UserSettings';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useInvisibleScroll } from '@/hooks/useInvisibleScroll';
import { useNavigate } from 'react-router-dom';
import { useExploreDialog } from '@/store/exploreDialogStore';

export function Sidebar({ onSelectRoom }) {
  const [activeTab, setActiveTab] = useState('home');
  const [isStudyGroupsOpen, setIsStudyGroupsOpen] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const openDialog = useExploreDialog(state => state.openDialog);
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useInvisibleScroll(scrollRef);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadRooms() {
      try {
        const roomsData = await fetchUserRooms();
        if (isMounted) {
          setRooms(roomsData);
        }
      } catch (error) {
        if (isMounted) console.error("Error loading sidebar rooms:", error);
      }
    }

    loadRooms();
    window.addEventListener('roomsUpdated', loadRooms);

    return () => { 
      isMounted = false; 
      window.removeEventListener('roomsUpdated', loadRooms);
    };
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      const action = (e).detail?.action;
      if (action === 'glob-settings' || action === 'chat-settings' || action === 'tutor-settings') {
        setShowSettings(true);
      }
    };
    window.addEventListener('studix:action', handler);
    return () => window.removeEventListener('studix:action', handler);
  }, []);

  return (
    <div className="w-full h-full bg-sidebar flex flex-col pt-6 pb-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-64 bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Brand Header */}
      <div className="px-6 mb-8 flex items-center gap-3 relative z-10">
        <div 
          className="cursor-pointer flex items-center justify-center transition-transform hover:scale-105 duration-200" 
          onClick={() => { setActiveTab('home'); onSelectRoom?.(''); }}
          title="Studix Home"
        >
          <StudixLogo size={36} className="shrink-0" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-[-0.03em] text-foreground leading-tight">Studix</span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase opacity-70">Study Rooms</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 hide-scrollbar relative z-10 w-full channels-list">

        {}
        <div className="space-y-1.5 mb-8">
          <SidebarItem 
            icon={<Home className="w-[18px] h-[18px]" />} 
            label="Home" 
            isActive={activeTab === 'home'} 
            onClick={() => { setActiveTab('home'); onSelectRoom?.(''); }} 
          />
          <SidebarItem 
            icon={<Clock className="w-[18px] h-[18px]" />} 
            label="Recent" 
            rightIcon={<Flame className="w-4 h-4 text-orange-500" />} 
            isActive={activeTab === 'recent'} 
            onClick={() => { setActiveTab('recent'); navigate('/recent'); }} 
          />
          <SidebarItem 
            icon={<Grid className="w-[18px] h-[18px]" />} 
            label="All Rooms" 
            isActive={activeTab === 'all'} 
            onClick={() => { setActiveTab('all'); navigate('/rooms'); }} 
          />
        </div>

        {}
        {rooms.length > 0 && (
           <div className="mb-6 w-full">
            <div className="px-3 mb-2 w-full flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
               <span className="truncate">Your Spaces</span>
            </div>
            
            <button 
              onClick={() => setIsStudyGroupsOpen(!isStudyGroupsOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-sidebar-foreground/90 bg-sidebar-foreground/5 rounded-lg border-l-2 border-primary hover:bg-sidebar-foreground/10 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <Grid className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="truncate">Study Rooms</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                <span className="bg-primary/20 text-primary text-xs py-0.5 px-2 rounded-full">{rooms.length}</span>
                <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground/50 transition-transform duration-200", isStudyGroupsOpen ? "rotate-180" : "")} />
              </div>
            </button>
            
            <div className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out w-full",
              isStudyGroupsOpen ? "max-h-[400px] opacity-100 mt-1" : "max-h-0 opacity-0"
            )}>
              <div className="pl-9 pr-3 py-1 space-y-1 overflow-y-auto max-h-[380px] hide-scrollbar">
                {rooms.length > 0 ? (
                  rooms.map(room => (
                    <SidebarSubItem 
                      key={room.id} 
                      label={room.name} 
                      onClick={() => onSelectRoom?.(room.id)}
                    />
                  ))
                ) : (
                  <div className="py-2 text-center text-xs text-sidebar-foreground/50 font-medium px-2 bg-sidebar-foreground/5 rounded-md border border-sidebar-border/50 mx-1 mt-1 mb-2">
                    No active spaces<br/>Create one below
                  </div>
                )}
              </div>
            </div>
           </div>
        )}

        {}
        <div className="space-y-1 w-full">
          <button 
            onClick={openDialog}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <Compass className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="truncate">Explore</span>
            </div>
          </button>
        </div>
      </div>

      <div className="px-4 my-6 relative z-10 w-full flex-shrink-0">
        <Button className="w-full bg-sidebar-foreground-[0.03] hover:bg-sidebar-foreground/10 text-sidebar-foreground/80 hover:text-sidebar-foreground border-transparent rounded-xl h-10 transition-all shadow-none flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          <span className="font-bold tracking-tight text-[13px] uppercase">NEW ROOM</span>
        </Button>
      </div>

      {}
      <div className="mt-auto px-2 py-3 border-t border-sidebar-border bg-sidebar relative z-20 shrink-0">
        <div 
          className="group flex items-center justify-between p-2 rounded-xl transition-all duration-200 hover:bg-sidebar-foreground/5 active:scale-[0.98] border border-transparent hover:border-sidebar-border relative cursor-pointer"
          onClick={() => setShowSettings(true)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="w-9 h-9 rounded-xl ring-1 ring-sidebar-border group-hover:ring-primary/50 transition-all duration-300">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback className="bg-secondary text-primary text-[10px] font-bold uppercase">
                  {user?.displayName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-[2.5px] border-sidebar rounded-full z-10 shadow-sm" />
            </div>
            
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[13px] font-bold text-sidebar-foreground tracking-tight truncate">
                {user?.displayName || 'Anonymous'}
              </span>
              <div className="text-[11px] font-medium tracking-wide text-sidebar-foreground/60 truncate">
                Online
              </div>
            </div>
          </div>

          <button 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sidebar-foreground/40 group-hover:text-primary transition-all duration-300 hover:bg-primary/10 group-hover:rotate-45"
            title="User Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <UserSettings open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

const SidebarItem = memo(function SidebarItem({ icon, label, rightIcon, isActive, onClick }) {
  const enhancedIcon = React.cloneElement(icon, {
    strokeWidth: 2.5,
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-bold transition-colors duration-200 group relative",
        isActive 
          ? "bg-sidebar-foreground/10 text-sidebar-foreground" 
          : "text-sidebar-foreground/50 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground/90"
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
        <div className={cn("transition-colors flex-shrink-0", 
          isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/90")}>
          {enhancedIcon}
        </div>
        <span className="truncate text-left tracking-tight">{label}</span>
      </div>
      {rightIcon && <div className="flex-shrink-0 pl-1">{rightIcon}</div>}
    </button>
  );
});

const SidebarSubItem = memo(function SidebarSubItem({ label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-1.5 text-[12.5px] font-semibold text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-foreground/5 rounded-xl transition-colors group"
    >
      <Hash className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors flex-shrink-0" strokeWidth={2} />
      <span className="truncate text-left flex-1" title={label}>{label}</span>
      
      {}
      <div className="w-1.5 h-1.5 rounded-full bg-sidebar-foreground/20 group-hover:bg-sidebar-foreground/40 transition-colors flex-shrink-0 ml-1" />
    </button>
  );
});
