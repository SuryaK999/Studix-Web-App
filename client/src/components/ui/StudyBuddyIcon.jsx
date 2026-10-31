import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * StudyBuddyIcon
 * Bespoke, modern AI assistant vector glyph inspired by premier modern AI tools
 * (Anthropic Claude's radiant intelligence core, Google Gemini's precision diamond nexus,
 * and Copilot's continuous neural gradient ribbons).
 *
 * Meticulously crafted for Studix's signature violet / electric purple / deep indigo palette.
 * Crisp, legible, and balanced at 12px, 14px, 16px, 18px, 20px, 24px, 32px, 48px, and 64px.
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
  // Sanitize id for SVG gradient definitions
  const id = rawId.replace(/[^a-zA-Z0-9-_]/g, '');

  const gradPrimary = `sb-pri-${id}`;
  const gradSecondary = `sb-sec-${id}`;
  const gradCore = `sb-core-${id}`;
  const gradGlow = `sb-glow-${id}`;
  const gradSatellite = `sb-sat-${id}`;
  const gradOrbit = `sb-orb-${id}`;

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
        {/* Harmonic 45° faceted intelligence rays */}
        <path
          d="M12 4.2C12.6 7.8 15.8 11 19.5 11.6C15.8 12.2 12.6 15.4 12 19C11.4 15.4 8.2 12.2 4.5 11.6C8.2 11 11.4 7.8 12 4.2Z"
          fill="currentColor"
          fillOpacity="0.4"
          transform="rotate(45 12 12)"
        />
        {/* Primary 4-pointed precision intelligence nexus */}
        <path
          d="M12 1.8C12.7 7 16.8 11.1 22 11.8C16.8 12.5 12.7 16.6 12 21.8C11.3 16.6 7.2 12.5 2 11.8C7.2 11.1 11.3 7 12 1.8Z"
          fill="currentColor"
        />
        {/* Core neural aperture */}
        <circle cx="12" cy="11.8" r="2.2" fill="currentColor" fillOpacity="0.2" />
        <circle cx="12" cy="11.8" r="1.1" fill="currentColor" />
        {/* Companion satellite spark */}
        <path
          d="M19.8 2.2C20 3.2 20.7 3.9 21.8 4.1C20.7 4.3 20 5 19.8 6C19.6 5 18.9 4.3 17.8 4.1C18.9 3.9 19.6 3.2 19.8 2.2Z"
          fill="currentColor"
          fillOpacity="0.9"
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
        {/* Studix signature electric violet to indigo gradient */}
        <linearGradient id={gradPrimary} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E879F9" />
          <stop offset="35%" stopColor="#C084FC" />
          <stop offset="70%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Secondary radiant diagonal rays (sky cyan to magenta) */}
        <linearGradient id={gradSecondary} x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Core luminous specular node */}
        <radialGradient id={gradCore} cx="12" cy="11.8" r="3.2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F3E8FF" />
          <stop offset="85%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.9" />
        </radialGradient>

        {/* Ambient soft glow aura */}
        <radialGradient id={gradGlow} cx="12" cy="12" r="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.5" />
          <stop offset="65%" stopColor="#6366F1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>

        {/* Neural orbital ribbon gradient */}
        <linearGradient id={gradOrbit} x1="5" y1="6" x2="19" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#C084FC" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.75" />
        </linearGradient>

        {/* Satellite spark gradient */}
        <linearGradient id={gradSatellite} x1="17.8" y1="2.2" x2="21.8" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Aura for 'glow' variant */}
      {variant === 'glow' && (
        <circle cx="12" cy="12" r="10.5" fill={`url(#${gradGlow})`} />
      )}

      {/* Layer 1: 45° Faceted Intelligence Wings (Claude / Gemini multi-lobe harmonic depth) */}
      <path
        d="M12 4.2C12.6 7.8 15.8 11 19.5 11.6C15.8 12.2 12.6 15.4 12 19C11.4 15.4 8.2 12.2 4.5 11.6C8.2 11 11.4 7.8 12 4.2Z"
        fill={`url(#${gradSecondary})`}
        fillOpacity="0.58"
        transform="rotate(45 12 12)"
      />

      {/* Layer 2: Primary 4-pointed Precision Intelligence Nexus (Gemini / Claude sleek geometry) */}
      <path
        d="M12 1.8C12.7 7 16.8 11.1 22 11.8C16.8 12.5 12.7 16.6 12 21.8C11.3 16.6 7.2 12.5 2 11.8C7.2 11.1 11.3 7 12 1.8Z"
        fill={`url(#${gradPrimary})`}
      />

      {/* Layer 3: Glass Prism Facet Refraction Highlight */}
      <path
        d="M12 6.2C12.4 8.8 14.8 11.1 17.5 11.6C14.8 12.1 12.4 14.4 12 17C11.6 14.4 9.2 12.1 6.5 11.6C9.2 11.1 11.6 8.8 12 6.2Z"
        fill="#FFFFFF"
        fillOpacity="0.24"
      />

      {/* Layer 4: Continuous Neural Orbital Ring (Copilot / OpenAI ribbon loop aesthetic) */}
      <ellipse
        cx="12"
        cy="11.8"
        rx="7.5"
        ry="2.8"
        transform="rotate(-28 12 11.8)"
        stroke={`url(#${gradOrbit})`}
        strokeWidth="1.1"
        strokeDasharray="2.5 1.5"
        strokeOpacity="0.7"
      />

      {/* Layer 5: Brilliant Neural Core Node */}
      <circle cx="12" cy="11.8" r="2.2" fill={`url(#${gradCore})`} />
      <circle cx="12" cy="11.8" r="0.9" fill="#FFFFFF" />

      {/* Layer 6: Satellite Intelligence Spark (Top Right) */}
      <path
        d="M19.8 2.2C20 3.2 20.7 3.9 21.8 4.1C20.7 4.3 20 5 19.8 6C19.6 5 18.9 4.3 17.8 4.1C18.9 3.9 19.6 3.2 19.8 2.2Z"
        fill={`url(#${gradSatellite})`}
      />

      {/* Layer 7: Micro Energy Spark (Bottom Left) */}
      <circle cx="4.2" cy="19.2" r="1" fill="#38BDF8" fillOpacity="0.8" />
    </svg>
  );
}

/**
 * StudyBuddyAvatar
 * Modern squircle / circular glassmorphic avatar with ambient aura,
 * inner glass reflection, and Studix's signature violet gradient.
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
        "bg-gradient-to-br from-[#1e1438] via-[#141525] to-[#0c0d15]",
        "border border-purple-500/35",
        "shadow-[0_2px_12px_rgba(113,72,235,0.22)]",
        glow && "shadow-[0_0_22px_rgba(168,85,247,0.36)] ring-1 ring-purple-400/40",
        pulse && "animate-pulse",
        className
      )}
      {...props}
    >
      {/* Top glass reflection highlight */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.14] via-transparent to-transparent pointer-events-none rounded-[inherit]" />
      <StudyBuddyIcon size={config.icon} variant="gradient" />
    </div>
  );
}

/**
 * StudyBuddyMentionBadge
 * Formats inline mentions (@ai, @studybuddy, /ai) inside chat messages.
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
 * Adaptive channel icon wrapper for sidebar navigation items.
 */
export function StudyBuddyNavIcon({ className = '', size = 18, isActive = false }) {
  return (
    <StudyBuddyIcon
      size={size}
      variant={isActive ? 'gradient' : 'monochrome'}
      className={className}
    />
  );
}
