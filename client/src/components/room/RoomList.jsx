import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { fetchUserRooms } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { User, X, Box, Copy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// RoomData imported from api

export function RoomList({ onSelectRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Controlled expansion: Only one expanded at a time
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const toggleRoom = (roomId) => {
    setExpandedRoomId(prev => (prev === roomId ? null : roomId));
  };

  const handleCopy = async (e, roomId) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard');
    } catch (err) {
      console.error('Clipboard failed');
    }
  };

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function loadRooms() {
      try {
        const roomsData = await fetchUserRooms();
        if (isMounted) {
          setRooms(roomsData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load rooms:', err);
          toast.error('Failed to load your study rooms');
          setLoading(false);
        }
      }
    }

    loadRooms();
    window.addEventListener('roomsUpdated', loadRooms);

    return () => { 
      isMounted = false; 
      window.removeEventListener('roomsUpdated', loadRooms);
    };
  }, [user]);

  if (loading) {
     return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full h-[180px] p-5 rounded-2xl bg-card border border-border/50 animate-pulse flex flex-col justify-between" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="flex justify-between items-start w-full">
                <div className="h-5 w-3/5 bg-muted rounded-md" />
                <div className="h-6 w-12 bg-muted rounded-full" />
              </div>
              <div className="flex -space-x-3 mt-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="w-10 h-10 rounded-full border-2 border-card bg-muted" />
                ))}
              </div>
              <div className="flex items-center justify-between w-full mt-auto">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted rounded-full" />
                  <div className="h-4 w-20 bg-muted rounded-md" />
                </div>
                <div className="h-8 w-[72px] bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      );
  }

  if (rooms.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center text-center py-20 px-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl premium-shadow"
      >
        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
          <Box className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">It's quiet in here...</h3>
        <p className="text-muted-foreground max-w-sm mb-8 text-sm leading-relaxed">
          You haven't joined or created any study rooms yet. Start a new one to collaborate seamlessly with your team
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      <AnimatePresence initial={false}>
        {rooms.map((room, index) => {
          const isExpanded = expandedRoomId === room.id;
          const totalRegistered = room.members?.length || 0;
          const activeOnline = room.members?.filter(m => m.status === "online").length || 0;
          
          const MAX_VISIBLE = 5;
          const visibleMembers = room.members.slice(0, MAX_VISIBLE);
          const overflowCount = totalRegistered - MAX_VISIBLE;

          return (
            <motion.div
              layout
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                layout: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                y: { delay: index * 0.05 }
              }}
              onClick={() => toggleRoom(room.id)}
              className={cn(
                "group cursor-pointer w-full rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 flex flex-col overflow-hidden",
                isExpanded 
                  ? "ring-2 ring-indigo-500/30 border-indigo-500/30 shadow-2xl z-10 scale-[1.02]" 
                  : "hover:shadow-lg h-[180px] p-5 justify-between"
              )}
            >
              {isExpanded ? (
                <div className="p-6 flex flex-col gap-6">
                  {/* Header Section */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <h3 className="font-bold text-2xl tracking-tight text-indigo-500 dark:text-indigo-400 truncate">
                        {room.name}
                      </h3>
                      <div 
                        onClick={(e) => handleCopy(e, room.inviteCode || room.id)}
                        className="inline-flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-muted/50 dark:bg-black/40 px-3 py-1.5 rounded-lg w-fit border border-border/50 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all active:scale-95 group/copy"
                      >
                        <span className="text-indigo-500 dark:text-indigo-400 font-bold">INVITE CODE:</span> 
                        <span>{room.inviteCode || room.id.slice(0, 8)}</span>
                        <Copy className="w-3 h-3 ml-1 group-hover/copy:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                        Online: {activeOnline}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                        Total: {totalRegistered}
                      </span>
                    </div>
                  </div>

                  {/* Member Stack */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Team Overview</p>
                    <div className="flex items-center">
                      <div className="flex -space-x-3">
                        {visibleMembers.map((member, i) => (
                          <div 
                            key={member.id || i} 
                            className="w-11 h-11 rounded-xl border-2 border-card bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden relative shadow-lg ring-1 ring-black/5"
                            title={member.name}
                          >
                            <img 
                              src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.id}-${i}`} 
                              alt="member" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                        {overflowCount > 0 && (
                          <div className="w-11 h-11 rounded-xl border-2 border-card bg-muted flex items-center justify-center text-xs text-foreground font-black shadow-lg ring-1 ring-black/5">
                            +{overflowCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }} 
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/20 h-14 text-base font-bold rounded-2xl border-none transition-all active:scale-[0.98]"
                  >
                    Enter Live Session
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start w-full">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {room.name}
                    </h3>
                    <div className="bg-foreground/5 dark:bg-foreground/10 px-2.5 py-1 rounded-full text-xs text-foreground font-medium border border-border/50 flex-shrink-0">
                      +{totalRegistered}
                    </div>
                  </div>

                  <div className="flex -space-x-2.5 mt-4 relative z-10 w-fit">
                    {visibleMembers.slice(0, 4).map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-card bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden relative shadow-sm pointer-events-none">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.id}-${i}`} alt="member" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {totalRegistered > 4 && (
                      <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] text-foreground font-bold pointer-events-none">
                        +{totalRegistered - 4}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full mt-auto">
                    <div className="flex items-center gap-2 pointer-events-none text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{totalRegistered} {totalRegistered === 1 ? 'member' : 'members'}</span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectRoom(room.id); }} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-2 group/btn"
                      >
                        Enter Live Session
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                      <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-widest pr-1">
                        Start your session now
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
