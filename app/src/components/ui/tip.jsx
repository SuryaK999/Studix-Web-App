/**
 * Tip — one-liner tooltip wrapper around the custom Tooltip component.
 *
 * Usage:
 *   <Tip label="Save note" side="bottom">
 *     <Button ...>...</Button>
 *   </Tip>
 */
import { Tooltip, TooltipTrigger, TooltipPanel } from '@/components/ui/tooltip';


export function Tip({ label, side = 'bottom', children, delay = 400 }) {
  return (
    <Tooltip delay={delay}>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipPanel side={side}>{label}</TooltipPanel>
    </Tooltip>
  );
}
