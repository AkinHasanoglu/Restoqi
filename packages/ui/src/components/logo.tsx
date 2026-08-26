interface LogoProps {
  compact?: boolean
  width?: number | string
  height?: number | string
  className?: string
}

// Redrawn to match the brand mark in docs/StockAlert - Logo.png: an orange
// bell (the "alert") with two small lavender sprigs hanging from its mouth
// (the "Lavanchor" heritage). The PNG embeds the "StockAlert" wordmark
// inside the mark itself, which turns to mush below ~40px and disappears
// on the dashboard's dark theme (the source art uses a fixed black ring
// stroke) — this version uses `currentColor` for every outline so it stays
// legible at 26-32px navbar/sidebar sizes and inherits dark-mode text color
// automatically. The full (non-compact) variant adds the wordmark back as
// real, theme-aware text below the mark, same as before.
export function Logo({ compact = false, width, height, className }: LogoProps) {
  if (compact) {
    return (
      <svg
        viewBox="0 0 40 40"
        width={width ?? 32}
        height={height ?? 32}
        className={className}
        aria-label="StockAlert"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id="sa-bell-compact" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        {/* Top knob */}
        <circle cx="20" cy="7.2" r="1.9" fill="url(#sa-bell-compact)" stroke="currentColor" strokeWidth="1.2" />

        {/* Bell body */}
        <path
          d="M20 9c-4.4 0-7.3 3.5-7.3 9.3 0 4.6-1.1 6.4-2.5 7.6-.5.4-.2 1.2.4 1.2h18.8c.6 0 .9-.8.4-1.2-1.4-1.2-2.5-3-2.5-7.6C27.3 12.5 24.4 9 20 9z"
          fill="url(#sa-bell-compact)"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Bell mouth rim */}
        <path d="M9.3 27.1h21.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />

        {/* Hanger ring */}
        <circle cx="20" cy="30.4" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />

        {/* Lavender sprigs */}
        <g opacity="0.95">
          <ellipse cx="12.2" cy="29.3" rx="1.3" ry="2" fill="#C4B5FD" transform="rotate(-18 12.2 29.3)" />
          <ellipse cx="10.6" cy="32.4" rx="1.1" ry="1.6" fill="#A78BFA" transform="rotate(-12 10.6 32.4)" />
          <ellipse cx="27.8" cy="29.3" rx="1.3" ry="2" fill="#C4B5FD" transform="rotate(18 27.8 29.3)" />
          <ellipse cx="29.4" cy="32.4" rx="1.1" ry="1.6" fill="#A78BFA" transform="rotate(12 29.4 32.4)" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 120 155"
      width={width}
      height={height}
      className={className}
      aria-label="StockAlert"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="sa-bell-full" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Top knob */}
      <circle cx="60" cy="20" r="6" fill="url(#sa-bell-full)" stroke="currentColor" strokeWidth="3.2" />

      {/* Bell body */}
      <path
        d="M60 26c-15 0-25 12-25 32 0 16-4 22-8.5 26-1.7 1.5-.6 4.2 1.5 4.2h64c2.1 0 3.2-2.7 1.5-4.2-4.5-4-8.5-10-8.5-26C85 38 75 26 60 26z"
        fill="url(#sa-bell-full)"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Bell mouth rim */}
      <path d="M26 92h68" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.35" />

      {/* Hanger ring */}
      <circle cx="60" cy="102" r="8" fill="none" stroke="currentColor" strokeWidth="3.6" />

      {/* Lavender sprigs */}
      <g opacity="0.95">
        <ellipse cx="35" cy="99" rx="4.2" ry="6.5" fill="#C4B5FD" transform="rotate(-18 35 99)" />
        <ellipse cx="30" cy="109" rx="3.6" ry="5.4" fill="#A78BFA" transform="rotate(-12 30 109)" />
        <ellipse cx="85" cy="99" rx="4.2" ry="6.5" fill="#C4B5FD" transform="rotate(18 85 99)" />
        <ellipse cx="90" cy="109" rx="3.6" ry="5.4" fill="#A78BFA" transform="rotate(12 90 109)" />
      </g>

      {/* StockAlert wordmark */}
      <text
        x="60"
        y="148"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="0.4"
        fill="currentColor"
      >
        StockAlert
      </text>
    </svg>
  )
}
