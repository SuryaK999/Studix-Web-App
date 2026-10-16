import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useVoice } from '@/hooks/useVoice';
import { useSpatialAudio } from '@/hooks/useSpatialAudio';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tip';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageSquare,
  Settings,
  MoreVertical,
  Volume2,
  VolumeX,
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  Radio,
  Waves
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Clamp helper ────────────────────────────────────────────────────────────
function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }

// ── Speaking ring ───────────────────────────────────────────────────────────
function SpeakingRing({ speaking }) {
  return (
    <AnimatePresence>
      {speaking && (
        <motion.span
          key="ring"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [1, 0.6, 1], scale: [1, 1.08, 1] }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-1.5 rounded-full border-2 border-green-400 shadow-[0_0_12px_rgba(74,222,128,0.7)] pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}

// ── Spatial avatar (draggable) ───────────────────────────────────────────────

function SpatialAvatar({
  label, initials, photoURL, isMuted, isSpeaking, position,
  isMe = false, onDrag, containerRef,
}) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    if (!onDrag) return;
    e.preventDefault();
    dragging.current = true;

    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clamp((ev.clientX - rect.left) / rect.width);
      const y = clamp((ev.clientY - rect.top)  / rect.height);
      onDrag(x, y);
    };
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onDrag, containerRef]);

  // Touch support
  const handleTouchMove = useCallback((e) => {
    if (!onDrag || !containerRef.current) return;
    const touch = e.touches[0];
    const rect  = containerRef.current.getBoundingClientRect();
    const x = clamp((touch.clientX - rect.left) / rect.width);
    const y = clamp((touch.clientY - rect.top)  / rect.height);
    onDrag(x, y);
  }, [onDrag, containerRef]);

  return (
    <div
      className={cn(
        'absolute flex flex-col items-center gap-1 select-none',
        onDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      )}
      style={{
        left: `${position.x * 100}%`,
        top:  `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={handleMouseDown}
      onTouchMove={handleTouchMove}
    >
      <div className="relative">
        <SpeakingRing speaking={isSpeaking && !isMuted} />
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-[#0d0d1a] transition-all',
          isMuted       ? 'ring-red-500/60'
            : isSpeaking  ? 'ring-green-400'
            : isMe        ? 'ring-indigo-500/60'
            :               'ring-white/10'
        )}>
          <Avatar className="w-12 h-12">
            {photoURL && <AvatarImage src={photoURL} />}
            <AvatarFallback className={cn(
              'text-white font-semibold text-sm',
              isMe ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Status dot */}
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d0d1a] flex items-center justify-center',
          isMuted ? 'bg-red-500' : isSpeaking ? 'bg-green-400' : 'bg-slate-600'
        )}>
          {isMuted && <MicOff className="h-1.5 w-1.5 text-white" />}
        </span>
      </div>
      <span className={cn(
        'text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm',
        isMe ? 'text-indigo-300 bg-indigo-500/10' : 'text-white/70 bg-black/30'
      )}>
        {label}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function VoiceChat({ roomId }) {
  const { user } = useAuth();
  const { socket } = useSocket(roomId);

  const {
    localStream, isMuted, isSpeaking, isConnecting,
    error, peers, startStream, stopStream, toggleMute,
  } = useVoice(roomId);

  const spatial = useSpatialAudio();

  // My position on the canvas, default centre
  const [myPos, setMyPos] = useState({ x: 0.5, y: 0.5 });
  // Remote positions keyed by socketId
  const [remotePositions, setRemotePositions] = useState({});

  const canvasRef    = useRef(null);
  const posThrottle  = useRef(0);
  // Stable fallback positions: generated once per peer, never re-randomised on re-render
  const defaultPositionsRef = useRef({});

  // ── Emit my position (throttled 100ms) ──────────────────────────
  const broadcastPos = useCallback((x, y) => {
    const now = Date.now();
    if (now - posThrottle.current < 100) return;
    posThrottle.current = now;
    socket?.emit('voice:position', { roomId, x, y });
  }, [socket, roomId]);

  const handleMyDrag = useCallback((x, y) => {
    setMyPos({ x, y });
    broadcastPos(x, y);
    // Update all remote peers' spatial position relative to new my pos
    Object.entries(remotePositions).forEach(([sid, pos]) => {
      spatial.updatePosition(sid, pos.x, pos.y, x, y);
    });
  }, [broadcastPos, remotePositions, spatial]);

  // ── Socket: receive remote positions ───────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onPos = ({ socketId, x, y }) => {
      setRemotePositions(p => ({ ...p, [socketId]: { x, y } }));
      spatial.updatePosition(socketId, x, y, myPos.x, myPos.y);
    };
    socket.on('voice:user-position', onPos);
    return () => { socket.off('voice:user-position', onPos); };
  }, [socket, spatial, myPos]);

  // ── When a peer leaves, remove their position ──────────────────
  useEffect(() => {
    const peerIds = new Set(peers.map(p => p.socketId));
    setRemotePositions(p => {
      const next = { ...p };
      Object.keys(next).forEach(id => { if (!peerIds.has(id)) { spatial.removeUser(id); delete next[id]; } });
      return next;
    });
  }, [peers, spatial]);

  // ── Cleanup spatial audio on leave ─────────────────────────────
  const handleStop = useCallback(() => {
    spatial.cleanup();
    stopStream();
  }, [spatial, stopStream]);

  // ── Join screen / Intro ─────────────────────────────────────────
  if (!localStream) {
    return (
      <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center z-10 w-full max-w-sm px-4">
          <h3 className="text-xl font-bold text-white/90 tracking-tight">Voice Lounge</h3>
          <p className="text-[#8E9297] text-sm">
            {peers.length} {peers.length === 1 ? 'peer' : 'peers'} connected.
          </p>
          <button 
            onClick={startStream}
            disabled={isConnecting}
            className="mt-2 w-full px-6 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-white rounded-lg transition-colors text-sm font-medium border border-indigo-500/30 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isConnecting ? 'Connecting...' : 'Join Audio'}
          </button>
          
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mt-4 w-full"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Active spatial canvas ────────────────────────────────────────
  const totalCount = 1 + peers.length;

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#27272a]/30 bg-[#09090b]/40 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Radio className={cn('h-3.5 w-3.5', isSpeaking ? 'text-green-400' : 'text-muted-foreground/40')} />
          <span className="text-xs font-medium text-foreground">
            Spatial Voice <span className="text-muted-foreground">· {totalCount} connected</span>
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-1">drag to move</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Tip label={isMuted ? 'Unmute microphone' : 'Mute microphone'} side="bottom">
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="sm" onClick={toggleMute}
              className="h-7 px-2.5 gap-1.5 text-xs"
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {isMuted ? 'Muted' : 'Mute'}
            </Button>
          </Tip>
          <Tip label="Leave voice channel" side="bottom">
            <Button variant="destructive" size="sm" onClick={handleStop} className="h-7 px-2.5 gap-1.5 text-xs">
              <PhoneOff className="h-3.5 w-3.5" /> Leave
            </Button>
          </Tip>
        </div>
      </div>

      {/* Spatial canvas */}
      <div className="flex-1 relative overflow-hidden p-2">
        {/* Grid background */}
        <div
          ref={canvasRef}
          className="relative w-full h-full rounded-xl overflow-hidden"
          style={{
            background: 'radial-gradient(circle at center, #1e1b4b 0%, transparent 70%)',
            backgroundImage: `
              radial-gradient(circle at center, #1e1b4b 0%, transparent 70%),
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          }}
        >
          {/* Centre pulse */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full border border-indigo-500/10 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-64 h-64 rounded-full border border-indigo-500/5" />
          </div>

          {/* My draggable avatar */}
          <SpatialAvatar
            label={user?.displayName?.split(' ')[0] || 'You'}
            initials={getInitials(user?.displayName)}
            photoURL={user?.photoURL}
            isMuted={isMuted}
            isSpeaking={isSpeaking}
            position={myPos}
            isMe
            onDrag={handleMyDrag}
            containerRef={canvasRef}
          />

          {/* Remote peers */}
          <AnimatePresence>
            {peers.map((peer) => {
              // Use broadcasted position if available, else a stable random default (computed once)
              if (!defaultPositionsRef.current[peer.socketId]) {
                defaultPositionsRef.current[peer.socketId] = {
                  x: Math.random() * 0.6 + 0.2,
                  y: Math.random() * 0.6 + 0.2,
                };
              }
              const pos = remotePositions[peer.socketId] ?? defaultPositionsRef.current[peer.socketId];
              return (
                <motion.div key={peer.socketId} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}>
                  <SpatialAvatar
                    label={peer.name?.split(' ')[0] || 'User'}
                    initials={getInitials(peer.name)}
                    photoURL={peer.avatar}
                    isMuted={peer.isMuted}
                    isSpeaking={peer.isSpeaking}
                    position={pos}
                    containerRef={canvasRef}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {peers.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 gap-2 pointer-events-none">
              <Users className="h-7 w-7" />
              <p className="text-xs">Waiting for others… drag your avatar to move</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
