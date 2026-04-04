'use client';

export default function BrandMark({ size = 'md', compact = false }) {
  const sizeClasses = {
    sm: 'h-16 w-16 rounded-[24px]',
    md: 'h-20 w-20 rounded-[28px]',
    lg: 'h-24 w-24 rounded-[32px]',
  };

  return (
    <div className={`relative isolate overflow-hidden border border-cyan-400/20 bg-slate-950/80 shadow-glow ${sizeClasses[size] ?? sizeClasses.md}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(34,211,238,0.18),transparent_46%),linear-gradient(180deg,rgba(8,15,33,0.96),rgba(5,8,22,0.92))]" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="catStrokePro" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="55%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path d="M26 42 40 18l18 24m22 0 18-24 12 24" fill="none" stroke="url(#catStrokePro)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 49c0-9 7-16 16-16h40c9 0 16 7 16 16v25c0 13-10 23-23 23H47C34 97 24 87 24 74Z" fill="rgba(6,11,25,0.72)" stroke="url(#catStrokePro)" strokeWidth="4" />
        <path d="M38 55h44" stroke="rgba(103,232,249,0.24)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 50h14l-8 12H33Zm47 0H73l8 12h14Z" fill="#fbbf24" opacity="0.95" />
        <path d="M45 64h12m18 0h-12" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 77c5 5 15 5 20 0" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <path d="M29 88h62" stroke="rgba(52,211,153,0.55)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact ? (
        <>
          <div className="absolute inset-x-4 bottom-3 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 h-[2px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent opacity-70" />
        </>
      ) : null}
    </div>
  );
}
