import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, Check, Copy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { createRoom } from '@/services/api';
import { Globe } from '@/components/ui/globe';
import { ShineBorder } from '@/components/magicui/shine-border';

const ROOM_NAME_MIN = 2;
const ROOM_NAME_MAX = 50;

export function CreateRoom({ onRoomCreated }) {
  const [roomName, setRoomName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Global trigger from radial menu
  React.useEffect(() => {
    const handler = (e) => {
      const action = (e).detail?.action;
      if (action === 'glob-create') setIsOpen(true);
    };
    window.addEventListener('studix:action', handler);
    return () => window.removeEventListener('studix:action', handler);
  }, []);

  const [createdRoom, setCreatedRoom] = useState(null);
  const { user } = useAuth();

  const trimmedName = roomName.trim();
  const isValidName = trimmedName.length >= ROOM_NAME_MIN && trimmedName.length <= ROOM_NAME_MAX;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!user?.uid) {
      toast.error("Authentication required. Please log in.");
      return;
    }

    const trimmed = roomName.trim();
    if (trimmed.length < ROOM_NAME_MIN) {
      toast.error(`Room name must be at least ${ROOM_NAME_MIN} characters.`);
      return;
    }

    try {
      setIsLoading(true);
      
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
      );

      const room = await Promise.race([
        createRoom({ name: trimmed }),
        timeout
      ]);

      if (!room || (!room.id && !(room)._id)) {
        throw new Error("Received an invalid response from the server.");
      }

      setCreatedRoom(room);
      setRoomName('');
      toast.success('Room created successfully 🚀');
      
      // Refresh room lists across the app
      window.dispatchEvent(new Event('roomsUpdated'));
    } catch (err) {
      console.error('Create room failed:', err);
      toast.error(err.message || "Failed to create room. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading) {
        setIsOpen(open);
        if (!open) setCreatedRoom(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button
          className="font-bold tracking-widest uppercase h-[52px] px-8 rounded-full transition-all duration-300 active:scale-[0.98] bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md border border-white/10 dark:bg-black/50 dark:backdrop-blur-xl dark:border-2 dark:border-purple-500/50 dark:text-purple-400 dark:shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:hover:bg-purple-500/20 dark:hover:border-purple-400 dark:hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] dark:hover:text-purple-200"
        >
          <Plus className="h-[18px] w-[18px] mr-2" />
          CREATE ROOM
        </Button>
      </DialogTrigger>
      <DialogContent 
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-[540px] border-border/40 shadow-2xl shadow-black/20 bg-background/95 backdrop-blur-3xl transition-colors duration-300 overflow-hidden min-h-[520px] flex flex-col justify-start pt-8 pb-12 rounded-2xl"
      >
        <ShineBorder 
          className="absolute inset-0 pointer-events-none"
          shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          borderRadius={16}
          borderWidth={1.5}
          duration={8}
        />
        {/* Magicui Globe Background component */}
        <div className="absolute inset-0 z-0 h-full w-full pointer-events-auto">
          <Globe className="translate-y-[80px] scale-[1.1] opacity-50 transition-opacity duration-500 hover:opacity-80 cursor-grab active:cursor-grabbing" />
          {/* Intense Top-Down Masking that adapts to semantics */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/60 to-transparent" />
          {/* Vignette Edge Masking */}
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_100%)] opacity-60" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {createdRoom ? (
            <div className="w-full flex flex-col items-center py-8 animate-in zoom-in-95 fade-in duration-300">
               <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                 <Check className="w-8 h-8 text-green-500" />
               </div>
               <h2 className="text-2xl font-bold mb-2">Room Created!</h2>
               <p className="text-muted-foreground text-center mb-8 px-4">
                 Your room "{createdRoom.name}" is ready. Share this code with others to join.
               </p>
               
               <div className="w-full px-8 space-y-4">
                 <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl p-6 flex flex-col items-center gap-2">
                       <span className="text-xs font-bold text-primary tracking-widest uppercase">Invite Code</span>
                       <span className="text-4xl font-mono font-black tracking-[0.2em] text-foreground select-all">{createdRoom.inviteCode}</span>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="mt-2 text-xs gap-2 hover:bg-primary/10"
                         onClick={() => {
                           navigator.clipboard.writeText(createdRoom.inviteCode);
                           toast.success('Code copied to clipboard!');
                         }}
                       >
                         <Copy className="w-3 h-3" />
                         Copy Code
                       </Button>
                    </div>
                 </div>

                 <Button 
                   className="w-full h-12 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 active:scale-[0.98] bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md border border-white/10 dark:bg-black/50 dark:backdrop-blur-xl dark:border-2 dark:border-purple-500/50 dark:text-purple-400 dark:shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:hover:bg-purple-500/20 dark:hover:border-purple-400 dark:hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] dark:hover:text-purple-200"
                   onClick={() => {
                     const id = createdRoom.id || createdRoom._id;
                     setIsOpen(false);
                     setCreatedRoom(null);
                     onRoomCreated(id);
                   }}
                 >
                   Enter Room
                 </Button>
               </div>
            </div>
          ) : (
            <>
              <DialogHeader className="mb-8 flex flex-col items-center">
                <DialogTitle className="text-3xl font-extrabold text-foreground text-center px-4 tracking-tight drop-shadow-md">
                  Create Room
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2 font-medium text-center">
                  Launch a new study environment
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="w-full space-y-6 px-8 pb-2">
                <div className="space-y-3">
                  <Label htmlFor="roomName" className="text-foreground/90 font-semibold ml-1 text-sm tracking-wide">Room Name</Label>
                  <div className="relative group">
                    <Input
                      id="roomName"
                      placeholder="e.g., Math Study Group"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value.slice(0, ROOM_NAME_MAX))}
                      className="bg-card/40 border-border/40 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 text-foreground transition-all duration-300 backdrop-blur-md h-12 px-5 rounded-xl text-md placeholder:text-muted-foreground/50"
                      required
                      minLength={ROOM_NAME_MIN}
                      maxLength={ROOM_NAME_MAX}
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                  {trimmedName.length > 0 && trimmedName.length < ROOM_NAME_MIN && (
                    <p className="text-xs text-red-400 ml-1">Room name must be at least {ROOM_NAME_MIN} characters</p>
                  )}
                </div>
                
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 active:scale-[0.98] bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-md border border-white/10 dark:bg-black/50 dark:backdrop-blur-xl dark:border-2 dark:border-purple-500/50 dark:text-purple-400 dark:shadow-[0_0_15px_rgba(168,85,247,0.2)] dark:hover:bg-purple-500/20 dark:hover:border-purple-400 dark:hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] dark:hover:text-purple-200"
                    disabled={isLoading || !isValidName}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'CREATE ROOM'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
