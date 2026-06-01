import { useMemo, memo } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from '@/components/ui/button';

import { ROOM_INTRO_CONFIGS } from './roomIntroConfig';
import './roomIntro.css';


export const RoomIntro = memo(({ roomType, onStart }) => {
  const config = useMemo(() => ROOM_INTRO_CONFIGS[roomType], [roomType]);

  // Handle accessibility: Reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (!config) return null;

  return (
    <div className="room-intro-container animate-intro-mount">
      <div className="room-intro-card">
        <div className="room-intro-lottie">
          <DotLottieReact
            src={config.lottiePath}
            autoplay={!prefersReducedMotion}
            loop={!prefersReducedMotion}
          />
        </div>

        <h2 className="room-intro-title">{config.title}</h2>
        <p className="room-intro-description">{config.description}</p>

        <Button 
          onClick={onStart}
          className="room-intro-button bg-primary hover:bg-primary/90 text-white shadow-lg"
        >
          {config.buttonLabel}
        </Button>
      </div>
    </div>
  );
});

RoomIntro.displayName = 'RoomIntro';
