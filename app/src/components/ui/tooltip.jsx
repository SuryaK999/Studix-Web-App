import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const TooltipContext = React.createContext(null);

function useTooltip() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be wrapped in <Tooltip>");
  }
  return context;
}

export function Tooltip({ children, delay = 200 }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, delay }}>
      <div
        className="relative inline-flex"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  children,
  className,
  asChild,
}) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp className={cn("inline-flex items-center justify-center", className)}>
      {children}
    </Comp>
  );
}

export function TooltipPanel({
  children,
  className,
  side = "top",
  align = "center",
  hidden = false,
  ...props
}) {
  const { isOpen, delay } = useTooltip();

  if (hidden) return null;

  const getVariant = () => {
    switch (side) {
      case "top":
        return { initial: { opacity: 0, y: 10, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 5, scale: 0.95 } };
      case "bottom":
        return { initial: { opacity: 0, y: -10, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -5, scale: 0.95 } };
      case "left":
        return { initial: { opacity: 0, x: 10, scale: 0.95 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 5, scale: 0.95 } };
      case "right":
        return { initial: { opacity: 0, x: -10, scale: 0.95 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 5, scale: 0.95 } };
    }
  };

  const positioning = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={getVariant().initial}
          animate={getVariant().animate}
          exit={getVariant().exit}
          transition={{ duration: 0.15, ease: "easeOut", delay: delay / 1000 }}
          className={cn(
            "absolute z-50 whitespace-nowrap px-3 py-1.5 text-sm font-medium",
            "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-lg shadow-xl",
            "border border-zinc-800 dark:border-zinc-200 pointer-events-none",
            positioning[side] || positioning.top,
            className
          )}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
// ─── Radix-compat aliases required by ui/sidebar.tsx ────────────────────────
// The sidebar component imports { TooltipProvider, TooltipContent } from here.
// We re-export compatible wrappers so the rest of the app keeps working.

export function TooltipProvider({
  children,
  delayDuration: _delay,
}) {
  return <>{children}</>;
}

export const TooltipContent = TooltipPanel;
