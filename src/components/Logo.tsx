interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Logo({ size = "md", className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-lg", re: "text-lg", rest: "text-lg" },
    md: { icon: "w-8 h-8", text: "text-xl", re: "text-xl", rest: "text-xl" },
    lg: { icon: "w-10 h-10", text: "text-2xl", re: "text-2xl", rest: "text-2xl" },
  };
  const s = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Background with modern rounded square */}
          <rect width="36" height="36" rx="10" fill="url(#logoGrad2)" />
          {/* House silhouette */}
          <path
            d="M18 7L6 17h3v10h6v-7h6v7h6V17h3L18 7z"
            fill="rgba(255,255,255,0.15)"
          />
          {/* Dollar sign inside house */}
          <path
            d="M18 13v1.5m0 7v1.5m-2.5-7.5c0-1.1.9-2 2.5-2s2.5.7 2.5 1.8c0 1.3-1.2 1.7-2.5 2.2-1.3.5-2.5.9-2.5 2.2 0 1.1 1 1.8 2.5 1.8s2.5-.9 2.5-2"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="logoGrad2" x1="0" y1="0" x2="36" y2="36">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className={`${s.text} font-bold tracking-tight`}>
        <span className="text-emerald-400">RE</span>
        <span className="bg-gradient-to-r from-slate-200 to-slate-300 bg-clip-text text-transparent">taxly</span>
      </span>
    </div>
  );
}
