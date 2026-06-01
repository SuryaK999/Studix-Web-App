import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { Sidebar } from '@/components/Sidebar';
import { CreateRoom } from '@/components/room/CreateRoom';
import { JoinRoom } from '@/components/room/JoinRoom';
import { RoomList } from '@/components/room/RoomList';
import { useResizable } from '@/hooks/useResizable';
import { ThemeTogglerButton } from '@/components/animate-ui/components/buttons/theme-toggler';
import { useInvisibleScroll } from '@/hooks/useInvisibleScroll';
import { Sparkles } from '@/components/ui/Sparkles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Dashboard({ onEnterRoom, children }) {
  const { user, logout } = useAuth();
  const { theme } = useGlobalTheme();
  const scrollRef = useRef(null);
  
  useEffect(() => {
    const handler = (e) => {
      const action = (e).detail?.action;
      
    };
    window.addEventListener('studix:action', handler);
    return () => window.removeEventListener('studix:action', handler);
  }, []);

  const { width: sidebarWidth, isDragging, startDragging } = useResizable({
    initialWidth: 260,
    minWidth: 200,
    maxWidth: 450
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans select-none transition-colors duration-300">
      
      {}
      <div 
        className="flex-shrink-0 flex relative z-20 bg-sidebar border-r border-border transition-colors duration-300" 
        style={{ width: `${sidebarWidth}px`, transition: isDragging ? 'none' : 'width 0.1s ease-out, background-color 0.3s, border-color 0.3s' }}
      >
        <Sidebar onSelectRoom={onEnterRoom} />
        
        {}
        <div 
           className={`absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize flex flex-col justify-center items-center z-50 group hover:bg-brand-light/10 transition-colors ${isDragging ? 'bg-brand-light/10' : ''}`}
           onMouseDown={startDragging}
           style={{ transform: 'translateX(50%)' }} 
        >
          {}
          <div className={`w-[2px] h-full transition-colors ${isDragging ? 'bg-brand-light' : 'bg-transparent group-hover:bg-brand-light/50'}`} />
        </div>
      </div>

      {}
      <main className={`flex-1 flex flex-col relative overflow-hidden transition-colors duration-300 ${theme === 'brand' ? 'bg-brand-gradient' : 'bg-background'}`}>
        <div className="absolute w-full h-full inset-0 z-0 overflow-hidden pointer-events-none">
          {}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500/10 blur-[130px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3 transition-opacity duration-300" />
          <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none translate-y-1/3 transition-opacity duration-300" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 transition-opacity duration-300" />
        </div>

        {}
        <header className="h-20 flex items-center justify-between px-8 z-10 sticky top-0 bg-background/40 backdrop-blur-2xl border-b border-border transition-colors duration-300">
          
          {}
          <div className="flex-1 flex items-center">
            {}
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <ThemeTogglerButton 
              variant="outline"
              size="sm"
              className="w-12 h-12 flex-shrink-0 rounded-full border border-border bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors duration-300 [&_svg]:w-[22px] [&_svg]:h-[22px]"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 border border-border rounded-full pl-5 pr-2 h-12 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors group">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold leading-none">{user?.displayName || 'User'}</p>
                  </div>
                  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-[2px] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-shadow">
                    <img 
                      src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName}`} 
                      alt="Profile" 
                      className="w-full h-full rounded-full bg-background object-cover"
                    />
                  </div>
                  <LogOut className="w-[18px] h-[18px] text-gray-500 group-hover:text-red-400 ml-1 mr-1 transition-colors hidden sm:block" />
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background/95 backdrop-blur-xl border border-white/10 dark:border-white/10 shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl">Are you sure you want to log out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-sm">
                    You will need to sign back in to access your study rooms and collaborate with peers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                  <AlertDialogCancel className="border-border hover:bg-secondary/50">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={logout} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all border-0">
                    Yes, log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        {}
        {children ? children : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-10 pb-10 z-10 hide-scrollbar pt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto relative z-20">

            {}
            <div className="mb-12 relative z-30 pointer-events-auto">
              <div className={`relative w-full overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 ${
                theme === 'light' 
                  ? 'border-indigo-900/40 bg-gradient-to-b from-[#1b1238] to-[#0a0515] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.25)]' 
                  : 'border-[#7876c566]/30 bg-zinc-950/80'
              }`}>
                {}
                <div className="relative z-10 mx-auto w-full max-w-2xl pt-14 pb-4 px-6">
                  <div className="text-center text-3xl font-semibold">
                    <span className={theme === 'light' ? 'text-indigo-300/90' : 'text-indigo-300'}>Collaborate with peers.</span>
                    <br />
                    <span className="text-white">Study smarter together.</span>
                  </div>

                  {}
                  <div className="mt-10 flex items-center justify-center gap-5">
                    <JoinRoom onRoomJoined={onEnterRoom} />
                    <CreateRoom onRoomCreated={onEnterRoom} />
                  </div>
                </div>

                {}
                <div className={`relative -mt-16 h-72 w-full overflow-hidden [mask-image:radial-gradient(ellipse_at_center,white,transparent)] before:absolute before:inset-0 before:opacity-40 after:absolute after:-left-1/2 after:top-1/2 after:aspect-[1/0.7] after:w-[200%] after:rounded-[100%] after:border-t transition-colors duration-500 ${
                  theme === 'light' 
                    ? 'before:bg-[radial-gradient(circle_at_bottom_center,#7c3aed,transparent_70%)] after:border-[#7c3aed]/30 after:bg-[#06030c]' 
                    : 'before:bg-[radial-gradient(circle_at_bottom_center,#8350e8,transparent_70%)] after:border-[#7876c566] after:bg-zinc-900'
                }`}>
                  <Sparkles
                    density={1200}
                    className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)]"
                    speed={0.8}
                    size={1.2}
                    color="#FFFFFF"
                  />
                </div>
              </div>
            </div>
            
            {}
            <div className="mb-12 relative z-30 pointer-events-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full bg-primary inline-block"></span>
                  Your Study Rooms
                </h2>
              </div>
              <RoomList onSelectRoom={onEnterRoom} />
            </div>
          </motion.div>
        </div>
        )}
      </main>
    </div>
  );
}
