import React, { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { joinRoom } from '@/services/api';
import { Globe } from '@/components/ui/globe';
import { StarBorder } from '@/components/ui/star-border';
import { ShineBorder } from '@/components/magicui/shine-border';

export function JoinRoom({ onRoomJoined }) {
  const [roomId, setRoomId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  // Listen for global radial action
  useEffect(() => {
    const handler = (e) => {
      const action = (e).detail?.action;
      if (action === 'glob-join') {
        setIsOpen(true);
      }
    };
    window.addEventListener('studix:action', handler);
    return () => window.removeEventListener('studix:action', handler);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!user?.uid) {
      toast.error("Authentication required. Please log in.");
      return;
    }

    const trimmedId = roomId.trim().toUpperCase();
    if (!trimmedId) {
      toast.error("Please enter a Room ID or Invite Code.");
      return;
    }

    // Logic: Room IDs are typically longer than 6 chars, Invite codes are exactly 6.
    // Just a basic check for now.
    if (trimmedId.length < 4) {
      toast.error("Invalid Room ID or Code. Too short.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Join request timed out. Please try again.")), 10000)
      );

      const response = await Promise.race([
        joinRoom(trimmedId),
        timeout
      ]);

      if (!response || !response.success) {
        throw new Error(response?.message || "Could not join room. Is the ID correct?");
      }

      const joinedId = response.roomId || response.id || response._id || trimmedId;

      setIsOpen(false);
      setRoomId('');
      toast.success('Successfully joined the room 👋');
      
      // Refresh room lists across the app
      window.dispatchEvent(new Event('roomsUpdated'));
      
      // Navigate to the newly joined room
      onRoomJoined(joinedId);
    } catch (err) {
      console.error('Error joining room:', err);
      const msg = err.message || "Failed to join room.";
      
      if (msg.includes('404')) {
        setError("Room not found. double-check your code.");
      } else if (msg.includes('401') || msg.includes('403')) {
        setError("You don't have permission to join this room.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && setIsOpen(open)}>
      <DialogTrigger asChild>
        <StarBorder
          as="button"
          className=""
          color="white"
          speed="3s"
        >
          <span className="flex items-center font-bold text-white tracking-wide">
            <LogIn className="h-[18px] w-[18px] mr-2" />
            Join Room
          </span>
        </StarBorder>
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
          <DialogHeader className="mb-8 flex flex-col items-center">
            <DialogTitle className="text-3xl font-extrabold text-foreground text-center px-4 tracking-tight drop-shadow-md">
              Join Room
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2 font-medium text-center">
              Enter a 6-digit Invite Code or Room ID
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="w-full space-y-6 px-8 pb-2">
            <div className="space-y-3">
              <Label htmlFor="roomId" className="text-foreground/90 font-semibold ml-1 text-sm tracking-wide">Invite Code / Room ID</Label>
              <div className="relative group">
                <Input
                  id="roomId"
                  placeholder="e.g. A7K9P2"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="bg-card/40 border-border/40 hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/20 text-foreground transition-all duration-300 backdrop-blur-md h-12 px-5 rounded-xl text-md placeholder:text-muted-foreground/50 uppercase"
                  required
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </div>
            
            {error && (
              <div
                className="p-3 text-sm text-red-300 bg-red-950/50 rounded-lg backdrop-blur-md border border-red-500/30 animate-in fade-in slide-in-from-top-2 text-center"
              >
                {error}
              </div>
            )}

            <div className="pt-2 flex justify-center w-full">
              <StarBorder
                as="button"
                type="submit"
                className="w-full"
                color="white"
                speed="3s"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white flex-shrink-0" />
                ) : (
                  <span className="font-bold text-white tracking-wide">Join Room</span>
                )}
              </StarBorder>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
