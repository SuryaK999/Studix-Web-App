import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * StudyBuddyIcon
 * Modern, bespoke vector SVG intelligence glyph inspired by premier AI tools (Claude, Gemini, Copilot).
 * Styled with Studix's signature violet / purple / indigo gradient palette.
 * Crisp and legible at 12px, 14px, 16px, 20px, 24px, 32px, 48px.
 *
 * @param {'gradient' | 'monochrome' | 'glow'} [variant='gradient']
 * @param {number | string} [size=20]
 * @param {boolean} [animate=false]
 */
export function StudyBuddyIcon({
  size = 20,
  variant = 'gradient',
  className = '',
  animate = false,
  ...props
}) {
  const rawId = useId();
  // Sanitize id for SVG attribute selectors
  const id = rawId.replace(/[^a-zA-Z0-9-_]/g, '');

  const gradPrimary = `sb-pri-${id}`;
  const gradSecondary = `sb-sec-${id}`;
  const gradCore = `sb-core-${id}`;
  const gradGlow = `sb-glow-${id}`;
  const gradSatellite = `sb-sat-${id}`;

  const dimension = typeof size === 'number' ? `${size}px` : size;

  if (variant === 'monochrome') {
    return (
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "inline-block shrink-0 align-middle transition-transform duration-200 select-none",
          animate && "animate-pulse",
          className
        )}
        aria-hidden="true"
        {...props}
      >
        {/* Subtle filled background silhouette */}
        <path
          d="M12 2C12.8 7.3 16.7 11.2 22 12C16.7 12.8 12.8 16.7 12 22C11.2 16.7 7.3 12.8 2 12C7.3 11.2 11.2 7.3 12 2Z"
          fill="currentColor"
          fillOpacity="0.18"
        />
        {/* Sharp vector outline */}
        <path
          d="M12 2C12.8 7.3 16.7 11.2 22 12C16.7 12.8 12.8 16.7 12 22C11.2 16.7 7.3 12.8 2 12C7.3 11.2 11.2 7.3 12 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Inner neural spark */}
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        {/* Companion satellite spark */}
        <path
          d="M19.5 2.5C19.7 3.6 20.4 4.3 21.5 4.5C20.4 4.7 19.7 5.4 19.5 6.5C19.3 5.4 18.6 4.7 17.5 4.5C18.6 4.3 19.3 3.6 19.5 2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "inline-block shrink-0 align-middle select-none transition-transform duration-300",
        animate && "animate-pulse",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Primary Studix Violet / Electric Purple / Indigo Gradient */}
        <linearGradient id={gradPrimary} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="80%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Secondary Radiant Diagonal Wings (Magenta to Cyan Accent) */}
        <linearGradient id={gradSecondary} x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Core Luminous Specular Node */}
        <radialGradient id={gradCore} cx="12" cy="12" r="3" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#E9D5FF" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
        </radialGradient>

        {/* Satellite Spark Gradient */}
        <linearGradient id={gradSatellite} x1="17.5" y1="2" x2="21.5" y2="6.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* Ambient Soft Glow */}
        <radialGradient id={gradGlow} cx="12" cy="12" r="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Radial Aura for 'glow' variant */}
      {variant === 'glow' && (
        <circle cx="12" cy="12" r="9.5" fill={`url(#${gradGlow})`} />
      )}

      {/* Secondary Layer: Rotated 45° faceted sub-petals (Claude / Copilot multi-lobe depth) */}
      <path
        d="M12 4.2C12.6 8 16 11.4 19.8 12C16 12.6 12.6 16 12 19.8C11.4 16 8 12.6 4.2 12C8 11.4 11.4 8 12 4.2Z"
        fill={`url(#${gradSecondary})`}
        fillOpacity="0.55"
        transform="rotate(45 12 12)"
      />

      {/* Primary Layer: 4-pointed Curved Intelligence Nexus (Gemini / Claude sleek geometry) */}
      <path
        d="M12 2C12.8 7.3 16.7 11.2 22 12C16.7 12.8 12.8 16.7 12 22C11.2 16.7 7.3 12.8 2 12C7.3 11.2 11.2 7.3 12 2Z"
        fill={`url(#${gradPrimary})`}
      />

      {/* Subtle Inner Glass Prism Facet Refraction */}
      <path
        d="M12 6.5C12.5 9.2 14.8 11.5 17.5 12C14.8 12.5 12.5 14.8 12 17.5C11.5 14.8 9.2 12.5 6.5 12C9.2 11.5 11.5 9.2 12 6.5Z"
        fill="#FFFFFF"
        fillOpacity="0.22"
      />

      {/* Brilliant Neural Core */}
      <circle cx="12" cy="12" r="2.2" fill={`url(#${gradCore})`} />
      <circle cx="12" cy="12" r="0.9" fill="#FFFFFF" />

      {/* Satellite Dynamic Energy Spark (Top Right) */}
      <path
        d="M19.5 2C19.75 3.3 20.7 4.25 22 4.5C20.7 4.75 19.75 5.7 19.5 7C19.25 5.7 18.3 4.75 17 4.5C18.3 4.25 19.25 3.3 19.5 2Z"
        fill={`url(#${gradSatellite})`}
      />

      {/* Micro Energy Spark (Bottom Left) */}
      <circle cx="4.5" cy="19.5" r="1.1" fill={`url(#${gradSecondary})`} fillOpacity="0.85" />
    </svg>
  );
}

/**
 * StudyBuddyAvatar
 * Glassmorphic container with custom size, squircle / circle geometry, and subtle purple aura.
 */
export function StudyBuddyAvatar({
  size = 'md', // 'xs' (20px) | 'sm' (24px) | 'md' (32px) | 'lg' (40px) | 'xl' (48px)
  shape = 'squircle', // 'squircle' | 'circle'
  className = '',
  glow = false,
  pulse = false,
  ...props
}) {
  const sizeMap = {
    xs: { container: 'w-5 h-5', icon: 13, rounded: shape === 'circle' ? 'rounded-full' : 'rounded-md' },
    sm: { container: 'w-6 h-6', icon: 15, rounded: shape === 'circle' ? 'rounded-full' : 'rounded-lg' },
    md: { container: 'w-8 h-8', icon: 18, rounded: shape === 'circle' ? 'rounded-full' : 'rounded-xl' },
    lg: { container: 'w-10 h-10', icon: 22, rounded: shape === 'circle' ? 'rounded-full' : 'rounded-2xl' },
    xl: { container: 'w-12 h-12', icon: 26, rounded: shape === 'circle' ? 'rounded-full' : 'rounded-2xl' },
  };

  const config = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 select-none overflow-hidden",
        config.container,
        config.rounded,
        "bg-gradient-to-br from-[#1d1635] via-[#141524] to-[#0c0d15]",
        "border border-purple-500/30",
        "shadow-[0_2px_12px_rgba(113,72,235,0.2)]",
        glow && "shadow-[0_0_20px_rgba(168,85,247,0.32)] ring-1 ring-purple-400/40",
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {/* Sleek top glass reflection highlight */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.12] via-transparent to-transparent pointer-events-none rounded-[inherit]" />
      <StudyBuddyIcon size={config.icon} variant="gradient" />
    </div>
  );
}

/**
 * StudyBuddyMentionBadge
 * Formats inline mentions (@ai, @studybuddy) inside chat bubbles.
 */
export function StudyBuddyMentionBadge({ text = '@ai', className = '' }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md",
        "bg-gradient-to-r from-purple-500/20 to-indigo-500/20",
        "border border-purple-500/35 text-purple-200",
        "text-[12px] font-semibold leading-none align-baseline shadow-xs",
        "hover:bg-purple-500/30 transition-colors cursor-pointer select-text",
        className
      )}
    >
      <StudyBuddyIcon size={11} variant="gradient" className="shrink-0" />
      <span>{text}</span>
    </span>
  );
}

/**
 * StudyBuddyNavIcon
 * Monochrome channel icon wrapper for sidebar navigation items.
 */
export function StudyBuddyNavIcon({ className = '', size = 18 }) {
  return <StudyBuddyIcon size={size} variant="monochrome" className={className} />;
}

