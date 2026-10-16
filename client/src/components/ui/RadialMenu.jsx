import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ─────────────────────────────────────────────────────────── */





/* ─── Geometry constants ────────────────────────────────────────────── */
const OUTER_R = 110;
const INNER_R = 46;
const CENTER_R = 38;
const GAP = 0.045;
const PADDING = 10;
const SVG_SIZE = (OUTER_R + PADDING) * 2;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const ICON_R = (OUTER_R + INNER_R) / 2;
const ICON_SIZE = 20;

/* ─── SVG arc path builder ──────────────────────────────────────────── */
function wedgePath(
  cx, cy,
  outerR, innerR,
  startAngle, endAngle
) {
  const x1o = cx + outerR * Math.cos(startAngle);
  const y1o = cy + outerR * Math.sin(startAngle);
  const x2o = cx + outerR * Math.cos(endAngle);
  const y2o = cy + outerR * Math.sin(endAngle);
  const x1i = cx + innerR * Math.cos(endAngle);
  const y1i = cy + innerR * Math.sin(endAngle);
  const x2i = cx + innerR * Math.cos(startAngle);
  const y2i = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x2i} ${y2i}`,
    `Z`,
  ].join(' ');
}

/* ─── Viewport clamp ────────────────────────────────────────────────── */
function clampPos(x, y) {
  const half = SVG_SIZE / 2;
  return {
    x: Math.max(half, Math.min(x, window.innerWidth - half)),
    y: Math.max(half, Math.min(y, window.innerHeight - half)),
  };
}

/* ─── Component ─────────────────────────────────────────────────────── */
export const RadialMenu = memo(function RadialMenu({
  menuItems,
  resolveItems,
  onSelect,
  children,
}) {
  const [state, setState] = useState({ open: false, x: 0, y: 0, items: [] });

  const [hoveredIdx, setHoveredIdx] = useState(null);
  const containerRef = useRef(null);
  const longPressRef = useRef(null);

  /* ── Context menu handler ─────────────────────────────────────────── */
  const trigger = useCallback(
    (clientX, clientY, target) => {
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      let items = menuItems || [];
      let ctx;

      if (resolveItems) {
        const resolved = resolveItems(target);
        if (!resolved) return;
        items = resolved.items;
        ctx = resolved.context;
      }

      if (items.length === 0) return;

      const pos = clampPos(clientX, clientY);
      setState({ open: true, x: pos.x, y: pos.y, items, context: ctx });
    },
    [menuItems, resolveItems]
  );

  const handleContextMenu = useCallback(
    (e) => {
      const target = e.target;
      const tag = target?.tagName?.toLowerCase();
      
      // Never block browser menu for inputs/textareas
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      // Resolve items for this target
      let resolvedItems = menuItems || [];
      if (resolveItems) {
        const resolved = resolveItems(target);
        if (resolved) {
          resolvedItems = resolved.items;
        }
      }

      // ONLY suppress browser menu if we actually have something to show
      if (resolvedItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        trigger(e.clientX, e.clientY, target);
      }
    },
    [menuItems, resolveItems, trigger]
  );

  const handleTouchStart = useCallback(
    (e) => {
      const touch = e.touches[0];
      const target = e.target;
      longPressRef.current = setTimeout(() => {
        trigger(touch.clientX, touch.clientY, target);
      }, 450);
    },
    [trigger]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    setHoveredIdx(null);
  }, []);

  const handleSelect = useCallback(
    (item) => {
      onSelect(item, state.context);
      close();
    },
    [onSelect, close, state.context]
  );

  /* ── Auto-close listeners ─────────────────────────────────────────── */
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const onClick = (e) => {
      // Ignore right-clicks (button 2) to prevent flicker when re-opening at a new position
      if (e.button === 2) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) close();
    };
    const onScroll = () => close();

    const tid = setTimeout(() => {
      window.addEventListener('mousedown', onClick, true); // Use capture to intercept before other listeners
    }, 0);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [state.open, close]);

  /* ── Geometry ──────────────────────────────────────────────────────── */
  const activeItems = state.items;
  const n = activeItems.length;
  const angleStep = n > 0 ? (2 * Math.PI) / n : 0;
  const startOffset = -Math.PI / 2;

  return (
    <>
      <div 
        onContextMenu={handleContextMenu} 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        style={{ display: 'contents' }}
      >
        {children}
      </div>

      <AnimatePresence>
        {state.open && n > 0 && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[200]"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={e => { 
                if (e.button === 2) return; // Ignore right-clicks on overlay
                if (e.target === e.currentTarget) close(); 
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.7 }}
              className="absolute"
              style={{
                left: state.x - SVG_SIZE / 2,
                top: state.y - SVG_SIZE / 2,
                width: SVG_SIZE,
                height: SVG_SIZE,
                filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.55))',
              }}
            >
              <svg
                width={SVG_SIZE}
                height={SVG_SIZE}
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                className="overflow-visible"
              >
                <circle cx={CX} cy={CY} r={OUTER_R + 2} fill="none" stroke="#32363f" strokeWidth="1.5" />

                {activeItems.map((item, i) => {
                  const a0 = startOffset + angleStep * i + GAP / 2;
                  const a1 = startOffset + angleStep * (i + 1) - GAP / 2;
                  const d = wedgePath(CX, CY, OUTER_R, INNER_R, a0, a1);
                  const isHov = hoveredIdx === i;

                  return (
                    <path
                      key={String(item.id)}
                      d={d}
                      fill={isHov ? (item.danger ? '#3a2028' : '#2d3140') : '#22252e'}
                      stroke="#32363f"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors duration-100"
                      style={{ willChange: 'fill' }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={e => { e.stopPropagation(); handleSelect(item); }}
                    />
                  );
                })}

                {activeItems.map((item, i) => {
                  const midAngle = startOffset + angleStep * (i + 0.5);
                  const ix = CX + Math.cos(midAngle) * ICON_R - ICON_SIZE / 2;
                  const iy = CY + Math.sin(midAngle) * ICON_R - ICON_SIZE / 2;
                  const isHov = hoveredIdx === i;
                  const Icon = item.icon;

                  return (
                    <foreignObject
                      key={`icon-${item.id}`}
                      x={ix} y={iy}
                      width={ICON_SIZE} height={ICON_SIZE}
                      className="pointer-events-none"
                    >
                      <div
                        className="w-full h-full flex items-center justify-center transition-all duration-100"
                        style={{
                          color: isHov
                            ? item.danger ? '#f87171' : 'rgba(255,255,255,0.92)'
                            : 'rgba(255,255,255,0.55)',
                          transform: isHov ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <Icon size={ICON_SIZE - 2} strokeWidth={1.6} />
                      </div>
                    </foreignObject>
                  );
                })}

                <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#32363f" strokeWidth="1" />
                <circle cx={CX} cy={CY} r={CENTER_R} fill="#181a22" stroke="#32363f" strokeWidth="1.2" />
                <circle cx={CX} cy={CY} r={2.5} fill="#666" />
              </svg>

              <AnimatePresence>
                {hoveredIdx !== null && (
                  <motion.div
                    key={hoveredIdx}
                    initial={{ opacity: 0, y: 4, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.92 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-lg pointer-events-none"
                    style={{
                      bottom: -8,
                      color: activeItems[hoveredIdx].danger ? '#f87171' : 'rgba(255,255,255,0.85)',
                      background: '#1a1d25',
                      border: '1px solid #32363f',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                  >
                    {activeItems[hoveredIdx].label}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
