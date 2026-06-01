import React from "react"
import { cn } from "@/lib/utils"

export const StarBorder = React.forwardRef(
  (
    {
      as,
      className = "",
      color = "white",
      speed = "6s",
      thickness = 1,
      children,
      ...rest
    },
    ref
  ) => {
    const Component = as || "button"

    return (
      <Component
        ref={ref}
        className={cn("relative inline-block overflow-hidden rounded-[20px]", className)}
        {...rest}
        style={{
          padding: `${thickness}px 0`,
          ...rest.style,
        }}
      >
        <div
          className="absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-0"
          style={{
            background: `radial-gradient(circle, ${color}, transparent 10%)`,
            animationDuration: speed,
          }}
        ></div>
        <div
          className="absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-0"
          style={{
            background: `radial-gradient(circle, ${color}, transparent 10%)`,
            animationDuration: speed,
          }}
        ></div>
        <div className="relative z-1 flex items-center justify-center w-full h-full bg-gradient-to-b from-black to-gray-900 border border-gray-800 text-white text-center text-[16px] py-[16px] px-[26px] rounded-[20px]">
          {children}
        </div>
      </Component>
    )
  }
)

StarBorder.displayName = "StarBorder"
