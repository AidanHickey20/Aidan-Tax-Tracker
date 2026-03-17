interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-lg", subtitle: "text-[10px]" },
    md: { icon: "w-7 h-7", text: "text-xl", subtitle: "text-xs" },
    lg: { icon: "w-9 h-9", text: "text-2xl", subtitle: "text-sm" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background rounded square */}
          <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
          {/* Chart bars */}
          <rect x="6" y="20" width="4" height="6" rx="1" fill="rgba(255,255,255,0.4)" />
          <rect x="12" y="15" width="4" height="11" rx="1" fill="rgba(255,255,255,0.6)" />
          <rect x="18" y="10" width="4" height="16" rx="1" fill="rgba(255,255,255,0.8)" />
          {/* Upward trend line */}
          <path d="M6 22 L12 17 L18 12 L26 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Arrow tip */}
          <path d="M23 5.5 L26.5 5.5 L26.5 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className={`${s.text} font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent`}>
        Taxora
      </span>
    </div>
  );
}
