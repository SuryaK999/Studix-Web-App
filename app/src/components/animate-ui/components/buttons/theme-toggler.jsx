'use client';

import * as React from "react";
import { useGlobalTheme } from '@/hooks/useGlobalTheme';
import { Moon, Sun, Star } from 'lucide-react';

import { ThemeToggler } from '@/components/animate-ui/primitives/effects/theme-toggler';
import { buttonVariants } from '@/components/animate-ui/components/buttons/icon';
import { cn } from '@/lib/utils';

const getIcon = (
  effective,
) => {
  return effective === 'brand' ? (
    <Star />
  ) : effective === 'dark' ? (
    <Moon />
  ) : (
    <Sun />
  );
};

const getNextTheme = (
  effective,
  modes,
) => {
  const i = modes.indexOf(effective);
  if (i === -1) return modes[0];
  return modes[(i + 1) % modes.length];
};


function ThemeTogglerButton({
  variant = 'default',
  size = 'default',
  modes = ['light', 'dark', 'brand'],
  direction = 'ltr',
  onImmediateChange,
  onClick,
  className,
  ...props
}) {
  const { theme, setTheme } = useGlobalTheme();

  return (
    <ThemeToggler
      theme={theme}
      setTheme={setTheme}
      direction={direction}
      onImmediateChange={onImmediateChange}
    >
      {({ effective, toggleTheme }) => (
        <button
          data-slot="theme-toggler-button"
          className={cn(buttonVariants({ variant, size, className }))}
          onClick={(e) => {
            onClick?.(e);
            toggleTheme(getNextTheme(effective, modes));
          }}
          {...props}
        >
          {getIcon(effective)}
        </button>
      )}
    </ThemeToggler>
  );
}

export { ThemeTogglerButton };
