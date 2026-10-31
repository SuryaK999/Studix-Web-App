import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef(
  ({ className, side = 'bottom', sideOffset = 6, align = 'center', hidden = false, children, ...props }, ref) => {
    if (hidden) return null;
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            'z-[9999] overflow-hidden rounded-lg border border-white/10 bg-[#12131e]/95 backdrop-blur-xl px-2.5 py-1 text-xs font-medium text-zinc-100 shadow-2xl select-none pointer-events-none',
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  }
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export const TooltipPanel = TooltipContent;
