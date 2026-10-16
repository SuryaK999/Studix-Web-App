import { useEffect, useRef } from "react";

export function useInvisibleScroll(containerRef) {
  const ticking = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        // lightweight — no layout trashing
        ticking.current = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [containerRef]);
}
