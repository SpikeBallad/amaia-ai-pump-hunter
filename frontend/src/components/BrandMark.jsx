'use client';

export default function BrandMark({ size = 'md', compact = false }) {
  const sizeClasses = {
    sm: 'h-16 w-16 rounded-[24px]',
    md: 'h-20 w-20 rounded-[28px]',
    lg: 'h-24 w-24 rounded-[32px]',
  };

  return (
    <div className={`relative isolate overflow-hidden border border-cyan-400/20 bg-slate-950/80 shadow-glow ${sizeClasses[size] ?? sizeClasses.md}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(251,191,36,0.12),transparent_20%),linear-gradient(180deg,rgba(8,15,33,0.98),rgba(5,8,22,0.94))]" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="catStrokePro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="48%" stopColor="#22d3ee" />
            <stop offset="78%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="visorGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path d="M26 40 42 18l16 20m20 0 18-20 14 22" fill="none" stroke="url(#catStrokePro)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 50c0-10 8-18 18-18h40c10 0 18 8 18 18v24c0 15-11 26-26 26H48c-15 0-26-11-26-26Z" fill="rgba(7,11,27,0.78)" stroke="url(#catStrokePro)" strokeWidth="4" />
        <path d="M36 48h48" stroke="rgba(103,232,249,0.18)" strokeWidth="2" strokeLinecap="round" />
        <rect x="33" y="53" width="54" height="18" rx="9" fill="rgba(8,15,35,0.9)" stroke="url(#visorGlow)" strokeWidth="2.6" />
        <path d="M44 61h10m12 0h10" stroke="#e2fdf8" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M39 79h12l4 6h10l4-6h12" fill="none" stroke="url(#catStrokePro)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 87h52" stroke="rgba(52,211,153,0.34)" strokeWidth="2" strokeLinecap="round" />
        <path d="M28 94h64" stroke="rgba(34,211,238,0.2)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="60" cy="43" r="2.2" fill="#22d3ee" opacity="0.85" />
      </svg>
      {!compact ? (
        <>
          <div className="absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 h-[2px] bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent opacity-80" />
        </>
      ) : null}
    </div>
  );
}
