import * as React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Tip — high-performance, collision-aware tooltip wrapper built on Radix UI Tooltip.
 * Portaled to body so it is never clipped by overflow-x-auto, overflow-hidden, or sticky parents.
 *
 * Usage:
 *   <Tip label="Bold (Ctrl+B)" side="bottom">
 *     <Button ...>...</Button>
 *   </Tip>
 */
export function Tip({ label, side = 'bottom', children, delay = 250, align = 'center', className }) {
  if (!label) return children;
  const isSingleElement = React.isValidElement(children);

  return (
    <Tooltip delayDuration={delay}>
      {isSingleElement ? (
        <TooltipTrigger asChild>{children}</TooltipTrigger>
      ) : (
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center cursor-default">{children}</span>
        </TooltipTrigger>
      )}
      <TooltipContent side={side} align={align} className={className}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
