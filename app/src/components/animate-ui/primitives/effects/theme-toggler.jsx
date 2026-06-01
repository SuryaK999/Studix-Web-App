'use client';

import * as React from "react";
import { flushSync } from 'react-dom';

// omitted type

function getClipKeyframes(direction) {
  switch (direction) {
    case 'ltr':
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

function ThemeToggler({
  theme,
  setTheme,
  onImmediateChange,
  direction = 'ltr',
  children,
  ...props
}) {
  const [preview, setPreview] = React.useState(null);
  const [current, setCurrent] = React.useState({
    effective: theme,
  });

  React.useEffect(() => {
    if (
      preview &&
      theme === preview.effective
    ) {
      setPreview(null);
    }
  }, [theme, preview]);

  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = React.useCallback(
    async (theme) => {
      setCurrent({ effective: theme });
      onImmediateChange?.(theme);

      if (!document.startViewTransition) {
        flushSync(() => {
          setPreview({ effective: theme });
        });
        setTheme(theme);
        return;
      }

      await document.startViewTransition(() => {
        flushSync(() => {
          setPreview({ effective: theme });
          const root = document.documentElement;
          root.classList.remove('light', 'dark', 'brand');
          if (theme !== 'light') root.classList.add(theme);
          root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
        });
      }).ready;

      document.documentElement
        .animate(
          { clipPath: [fromClip, toClip] },
          {
            duration: 700,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        )
        .finished.finally(() => {
          setTheme(theme);
        });
    },
    [onImmediateChange, fromClip, toClip, setTheme],
  );

  return (
    <React.Fragment {...props}>
      {typeof children === 'function'
        ? children({
            effective: current.effective,
            toggleTheme,
          })
        : children}
      <style>{`::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>
    </React.Fragment>
  );
}

export {
  ThemeToggler
};
