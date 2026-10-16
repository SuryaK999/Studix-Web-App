import React from 'react';

/**
 * StudixLogo - Realistic, Apple-Grade Minimalist Open Book + Angled Stylus
 * Clean, tactile, properly proportioned with layered pages and a sleek resting pen.
 */
export function StudixLogo({ 
  size = 36, 
  className = '', 
  idPrefix = 'studix-book-pen' 
}) {
  const coverLeftId = `${idPrefix}-cover-left`;
  const coverRightId = `${idPrefix}-cover-right`;
  const pageLeftId = `${idPrefix}-page-left`;
  const pageRightId = `${idPrefix}-page-right`;
  const penBodyId = `${idPrefix}-pen-body`;
  const penTipId = `${idPrefix}-pen-tip`;
  const pageShadowId = `${idPrefix}-page-shadow`;
  const penShadowId = `${idPrefix}-pen-shadow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-300 select-none ${className}`}
      aria-label="Studix Logo"
    >
      <defs>
        {/* Deep Indigo Hardcover Gradients */}
        <linearGradient id={coverLeftId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>

        <linearGradient id={coverRightId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>

        {/* Tactile Page Gradients */}
        <linearGradient id={pageLeftId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id={pageRightId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* Sleek Pen Gradients */}
        <linearGradient id={penBodyId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        <linearGradient id={penTipId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        {/* Shadows for Realism & Separation */}
        <filter id={pageShadowId} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0F172A" floodOpacity="0.3" />
        </filter>

        <filter id={penShadowId} x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="-3" dy="8" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Book Hardcover & Pages */}
      <g filter={`url(#${pageShadowId})`}>
        {/* Hardcover Backplate */}
        <path
          d="M 256 395 
             C 200 375, 120 370, 72 388 
             C 62 392, 52 384, 52 372 
             L 52 175 
             C 52 165, 60 157, 70 154 
             C 120 138, 200 144, 256 168 
             Z"
          fill={`url(#${coverLeftId})`}
        />
        <path
          d="M 256 395 
             C 312 375, 392 370, 440 388 
             C 450 392, 460 384, 460 372 
             L 460 175 
             C 460 165, 452 157, 442 154 
             C 392 138, 312 144, 256 168 
             Z"
          fill={`url(#${coverRightId})`}
        />

        {/* Spine Crease */}
        <path d="M 256 165 L 256 398" stroke="#1E1B4B" strokeWidth="4" strokeLinecap="round" />

        {/* Left Open Pages */}
        <path
          d="M 254 382 
             C 205 362, 130 358, 82 374 
             C 74 377, 66 371, 66 362 
             L 66 182 
             C 66 174, 73 167, 81 165 
             C 130 149, 205 155, 254 176 
             Z"
          fill={`url(#${pageLeftId})`}
        />

        {/* Right Open Pages */}
        <path
          d="M 258 382 
             C 307 362, 382 358, 430 374 
             C 438 377, 446 371, 446 362 
             L 446 182 
             C 446 174, 439 167, 431 165 
             C 382 149, 307 155, 258 176 
             Z"
          fill={`url(#${pageRightId})`}
        />

        {/* Subtle Text Page Guidelines */}
        <g opacity="0.25" stroke="#475569" strokeWidth="3" strokeLinecap="round">
          <line x1="105" y1="210" x2="225" y2="218" />
          <line x1="105" y1="245" x2="225" y2="253" />
          <line x1="105" y1="280" x2="200" y2="288" />
          <line x1="105" y1="315" x2="185" y2="322" />

          <line x1="287" y1="218" x2="407" y2="210" />
          <line x1="287" y1="253" x2="407" y2="245" />
          <line x1="287" y1="288" x2="385" y2="280" />
          <line x1="287" y1="322" x2="365" y2="315" />
        </g>

        {/* Spine Valley Depth */}
        <path
          d="M 252 176 C 255 250, 255 320, 252 382 C 258 382, 260 382, 260 382 C 257 320, 257 250, 260 176 Z"
          fill="#64748B"
          opacity="0.38"
        />
      </g>

      {/* Realistic Stylus Resting at 38-degree Natural Angle */}
      <g filter={`url(#${penShadowId})`} transform="rotate(-38, 256, 256)">
        {/* Pen Barrel */}
        <rect x="246" y="80" width="20" height="230" rx="10" fill={`url(#${penBodyId})`} />

        {/* Metallic Grip Ring */}
        <rect x="246" y="270" width="20" height="15" fill="#E2E8F0" opacity="0.95" />
        <rect x="246" y="290" width="20" height="8" fill="#38BDF8" />

        {/* Stylus Precision Cone Tip */}
        <path d="M 246 310 L 266 310 L 256 348 Z" fill={`url(#${penTipId})`} />
        <circle cx="256" cy="349" r="2.5" fill="#0284C7" />

        {/* Cap Dome */}
        <path d="M 246 92 C 246 84, 250 78, 256 78 C 262 78, 266 84, 266 92 Z" fill="#F8FAFC" />
      </g>
    </svg>
  );
}

export default StudixLogo;
