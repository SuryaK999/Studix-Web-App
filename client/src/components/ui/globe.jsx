import { useEffect, useRef } from "react"
import createGlobe from "cobe"

import { useMotionValue, useSpring } from "framer-motion"

import { useGlobalTheme } from "@/hooks/useGlobalTheme"
import { cn } from "@/lib/utils"

// Used for Dark and Brand themes
const DARK_CONFIG = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0, // 0 = white globe
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  baseColor: [1, 1, 1], // Pure white base
  markerColor: [0.6, 0.2, 1], // Purple markers
  glowColor: [1, 1, 1], // White glow
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
}

// Used for Light theme — purple/black globe on white dialog
const LIGHT_CONFIG = {
  ...DARK_CONFIG,
  dark: 1,                         // dark rendering mode
  baseColor: [0.08, 0.04, 0.16],   // deep purple-black base
  markerColor: [0.49, 0.34, 0.94], // #7e56f0 purple markers
  glowColor: [0.35, 0.15, 0.75],   // purple glow
}

export function Globe({
  className,
}) {
  const { theme } = useGlobalTheme();
  const config = theme === 'light' ? LIGHT_CONFIG : DARK_CONFIG;
  let phi = 0
  let width = 0
  const canvasRef = useRef(null)
  const pointerInteracting = useRef(null)
  const pointerInteractionMovement = useRef(0)

  const r = useMotionValue(0)
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  })

  const updatePointerInteraction = (value) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta;
      r.set(r.get() + delta / 800); // More responsive dragging
    }
  };

  useEffect(() => {
    let globe = null;
    let frameId;

    const initGlobe = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.offsetWidth;
      
      // Prevent crash if canvas has 0 width (e.g., during Dialog mount animations)
      if (width <= 0) return;

      if (!globe) {
        globe = createGlobe(canvasRef.current, {
          ...config,
          width: width * 2,
          height: width * 2,
          onRender: (state) => {
            if (!pointerInteracting.current) phi += 0.01; // Sped up auto-rotation
            state.phi = phi + rs.get();
            state.width = width * 2;
            state.height = width * 2;
          },
        });
        
        // Gentle fade-in
        setTimeout(() => {
          if (canvasRef.current) canvasRef.current.style.opacity = "1";
        }, 50);
      }
    };

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
        if (width > 0 && !globe) {
          initGlobe();
        }
      }
    };

    window.addEventListener("resize", onResize);
    
    // Use ResizeObserver to catch exactly when the Dialog layout is complete
    const observer = new ResizeObserver(() => {
      if (canvasRef.current && canvasRef.current.offsetWidth > 0 && !globe) {
        // Debounce slightly to allow the dialog animation to settle
        frameId = requestAnimationFrame(initGlobe);
      }
    });

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }
    
    // Initial attempt
    initGlobe();

    return () => {
      if (globe) {
        (globe).destroy();
      }
      window.removeEventListener("resize", onResize);
      observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [rs, config]);

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX
          updatePointerInteraction(e.clientX)
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  )
}
