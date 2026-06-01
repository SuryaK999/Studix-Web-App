import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { cn, getServerUrl } from '@/lib/utils';

export function VoiceMessage({ audioUrl, duration: initialDuration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [isReady, setIsReady] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const audioRef = useRef(null);

  // Normalize relative paths to absolute using API URL
  const getFullUrl = (url) => {
    if (url.startsWith('http')) return url;
    const baseUrl = getServerUrl();
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullAudioUrl = getFullUrl(audioUrl);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsReady(false);
    setIsError(false);
    
    // Quick load check trick for Chrome caching WebM duration
    const testAudio = new Audio();
    testAudio.src = fullAudioUrl;
    testAudio.onloadedmetadata = () => {
      if (testAudio.duration !== Infinity && !isNaN(testAudio.duration)) {
        setDuration(testAudio.duration);
      }
    };
  }, [fullAudioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      // Browsers return a promise for play()
      audioRef.current.play().catch(e => {
        console.error("[VoiceMessage] Playback error:", e);
        if (e.name !== 'AbortError') setIsError(true);
      });
    } else {
      audioRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      if (audioRef.current.duration !== Infinity && !isNaN(audioRef.current.duration)) {
         setDuration(audioRef.current.duration);
      }
      setIsReady(true);
      setIsError(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleError = () => {
    console.error(`[VoiceMessage] Failed to load audio from ${fullAudioUrl}`);
    setIsError(true);
    setIsReady(true); // Stop loading indicator
    setIsPlaying(false);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 bg-white/5 dark:bg-black/20 rounded-xl p-2.5 min-w-[220px] border border-white/5 relative overflow-hidden group">
      <audio
        ref={audioRef}
        src={fullAudioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
        onCanPlay={() => setIsReady(true)}
        className="hidden"
        controls={false}
      />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePlay}
        disabled={!isReady || isError}
        className={cn(
          "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white transition-colors shadow-sm",
          isError ? "bg-red-500/80 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 shadow-lg",
          !isReady && !isError && "bg-indigo-600/50"
        )}
      >
        {!isReady && !isError ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isError ? (
          <AlertCircle className="h-5 w-5" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-1" />
        )}
      </motion.button>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2.5">
          <Volume2 className={cn("h-4 w-4 shrink-0 transition-colors", isError ? "text-red-400" : "text-[#8E9297] group-hover:text-indigo-400")} />
          <div className="flex-1 h-1.5 bg-white/10 dark:bg-gray-700 rounded-full overflow-hidden relative cursor-pointer" onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = clickPos * duration;
          }}>
            <motion.div
              className={cn("h-full", isError ? "bg-red-500" : "bg-indigo-500")}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>
        <div className="flex justify-between items-end mt-1.5 px-0.5">
          {isError ? (
            <span className="text-[10px] uppercase font-bold tracking-wider text-red-500 mt-0.5">Failed to load</span>
          ) : (
            <>
              <span className="text-[11px] font-mono font-medium text-[#8E9297]">{formatTime(currentTime)}</span>
              <span className="text-[11px] font-mono font-medium text-[#8E9297]">{formatTime(duration)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
