"use client";

import { cn } from "@/lib/utils";


/**
 * @name Shine Border
 * @description An animated background border effect component with easy to use and configurable props.
 */
export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#000000",
  shineColor,
  className,
  children,
}) {
  const finalColor = shineColor || color;
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        }
      }
      className={cn(
        "relative rounded-[--border-radius]",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${finalColor instanceof Array ? finalColor.join(",") : finalColor},transparent,transparent)`,
          }
        }
        className={cn(
          "before:bg-shine-size pointer-events-none absolute inset-0 rounded-[--border-radius] [mask-clip:padding-box,border-box]",
          "before:absolute before:inset-0 before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position]",
          "before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:var(--background-radial-gradient)] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] motion-safe:before:animate-shine",
        )}
      ></div>
      {children}
    </div>
  );
}
