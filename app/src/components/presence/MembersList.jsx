import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Moon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useRoomPresence } from '@/hooks/usePresence';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';

function MemberSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="w-8 h-8 rounded-full skeleton" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="h-2.5 w-12 skeleton rounded" />
      </div>
    </div>
  );
}

export function MembersList({ roomId }) {
  const { user } = useAuth();
  const presence = useRoomPresence(roomId);
  const [loading, setLoading] = useState(true);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [customStatus, setCustomStatus] = useState('');
  const [speakingUsers, setSpeakingUsers] = useState(new Set()); // userId set
  const socketToUserRef = useRef({}); // socketId -> userId

  // Stop skeleton after first presence update
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Object.keys(presence).length > 0) setLoading(false);
  }, [presence]);

  const getInitials = useCallback((name) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
  []);

  // Build sorted member list from socket presence events
  const members = Object.values(presence).sort((a, b) => {
    if (a.isOnline === b.isOnline) return a.displayName.localeCompare(b.displayName);
    return a.isOnline ? -1 : 1;
  });

  // Removed unused onlineCount

  const saveStatus = useCallback(async () => {
    try {
      const socket = await socketService.connect();
      socket.emit('presence:status', { roomId, status: customStatus || null });
    } catch (_) {}
    setShowStatusDialog(false);
  }, [roomId, customStatus]);

  // Handle Voice Speaking Events
  useEffect(() => {
    let socket = null;
    
    const setupVoiceListeners = async () => {
      try {
        socket = await socketService.connect();
        
        socket.on('voice:user-joined', ({ userId, socketId }) => {
          socketToUserRef.current[socketId] = userId;
        });

        socket.on('voice:existing-members', ({ members }) => {
          members.forEach(m => {
            socketToUserRef.current[m.socketId] = m.userId;
          });
        });

        socket.on('voice:user-left', ({ socketId }) => {
          const userId = socketToUserRef.current[socketId];
          if (userId) {
            setSpeakingUsers(prev => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            delete socketToUserRef.current[socketId];
          }
        });

        socket.on('voice:user-speaking', ({ socketId, speaking }) => {
          const userId = socketToUserRef.current[socketId];
          if (!userId) return;

          setSpeakingUsers(prev => {
            const next = new Set(prev);
            if (speaking) next.add(userId);
            else next.delete(userId);
            return next;
          });
        });

        // The 'presence' object comes from useRoomPresence, which now centrally handles 'presence:profile_sync'
      } catch (err) {
        console.error("Voice listener setup failed:", err);
      }
    };

    setupVoiceListeners();

    return () => {
      if (socket) {
        socket.off('voice:user-joined');
        socket.off('voice:user-left');
        socket.off('voice:user-speaking');
      }
    };
  }, [roomId]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Set Status Button (Optional, can be moved to Profile section later) */}
      <div className="mb-3 px-1">
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-xs font-medium bg-[#1A1A22] hover:bg-[#252735] text-[#A1A3AB] hover:text-white border-0"
          onClick={() => setShowStatusDialog(true)}
        >
          Set Status
        </Button>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1 w-full -mr-4 pr-4 custom-scrollbar">
        <div className="space-y-1">
          {loading ? (
            <>
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
            </>
          ) : members.length === 0 ? (
            <div className="text-center py-6 text-[#6F7483]">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-[13px] font-medium">No members here</p>
            </div>
          ) : (
            members.map((member, index) => (
              <motion.div
                key={member.userId}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1A1A22] transition-colors cursor-pointer group"
              >
                <div className="relative">
                  <div className={cn(
                    "absolute -inset-1 rounded-[14px] transition-all duration-300",
                    speakingUsers.has(member.userId) ? "bg-[#10B981] opacity-40 blur-[2px] scale-110" : "opacity-0 scale-100"
                  )} />
                  <Avatar className={cn(
                    "h-[36px] w-[36px] rounded-[12px] transition-all relative z-10",
                    speakingUsers.has(member.userId) ? "ring-2 ring-[#10B981] ring-offset-2 ring-offset-[#111218]" : ""
                  )}>
                    <AvatarImage src={member.photoURL || undefined} />
                    <AvatarFallback className="bg-[#2A2B36] text-white text-[11px] font-bold">
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#10B981] border-[2.5px] border-[#161720] rounded-full z-20" />
                  )}
                  {!member.isOnline && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#F59E0B] border-[2.5px] border-[#161720] rounded-full flex items-center justify-center z-20">
                      <Moon className="h-2 w-2 text-[#161720]" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[14px] font-semibold truncate leading-tight",
                    member.isOnline ? "text-white" : "text-[#A1A3AB]"
                  )}>
                    {member.displayName}
                    {user?.uid && member.userId === user.uid && ' (You)'}
                  </p>
                  {(member).status && (
                    <p className="text-[11px] text-[#A1A3AB] truncate leading-tight mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {(member).status}
                    </p>
                  )}
                  <p className="text-[12px] text-[#6F7483] truncate leading-tight mt-0.5 font-medium">
                    {member.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g., Studying DSA, On a break..."
              maxLength={50}
            />
            <div className="flex gap-2">
              <Button onClick={saveStatus} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
