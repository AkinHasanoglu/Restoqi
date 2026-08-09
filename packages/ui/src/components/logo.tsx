interface LogoProps {
  compact?: boolean
  width?: number | string
  height?: number | string
  className?: string
}

export function Logo({ compact = false, width, height, className }: LogoProps) {
  if (compact) {
    return (
      <svg
        viewBox="0 0 40 40"
        width={width ?? 32}
        height={height ?? 32}
        className={className}
        aria-label="Lavanchor"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* Ring */}
        <circle cx="20" cy="10" r="7" stroke="#F97316" strokeWidth="3.2" />

        {/* Shaft */}
        <line x1="20" y1="17" x2="20" y2="36" stroke="#F97316" strokeWidth="3.2" strokeLinecap="round" />

        {/* Crossbar */}
        <line x1="7" y1="22" x2="33" y2="22" stroke="#8B5CF6" strokeWidth="2.8" strokeLinecap="round" />

        {/* Crossbar accent dots */}
        <circle cx="7" cy="22" r="2.4" fill="#D946EF" />
        <circle cx="33" cy="22" r="2.4" fill="#8B5CF6" />

        {/* Flukes */}
        <path d="M 20 36 Q 12 36 7 29" stroke="#F97316" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M 20 36 Q 28 36 33 29" stroke="#F97316" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 120 155"
      width={width}
      height={height}
      className={className}
      aria-label="Lavanchor"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="lav-full-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="lav-full-purple" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>

      {/* Ring */}
      <circle cx="60" cy="24" r="14" stroke="url(#lav-full-orange)" strokeWidth="6.5" />

      {/* Shaft */}
      <line x1="60" y1="38" x2="60" y2="118" stroke="url(#lav-full-orange)" strokeWidth="6.5" strokeLinecap="round" />

      {/* Crossbar */}
      <line x1="22" y1="62" x2="98" y2="62" stroke="url(#lav-full-purple)" strokeWidth="5.5" strokeLinecap="round" />

      {/* Crossbar accent dots */}
      <circle cx="22" cy="62" r="4.5" fill="#8B5CF6" />
      <circle cx="98" cy="62" r="4.5" fill="#D946EF" />

      {/* Flukes */}
      <path d="M 60 118 Q 38 118 28 100" stroke="url(#lav-full-orange)" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M 60 118 Q 82 118 92 100" stroke="url(#lav-full-orange)" strokeWidth="6.5" strokeLinecap="round" />

      {/* Lavanchor wordmark */}
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
