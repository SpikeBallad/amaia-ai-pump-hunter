'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function HunterCatMark() {
  return (
    <div className="relative isolate h-24 w-24 overflow-hidden rounded-[32px] border border-cyan-400/20 bg-slate-950/80 shadow-glow">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(34,211,238,0.18),transparent_46%),linear-gradient(180deg,rgba(8,15,33,0.96),rgba(5,8,22,0.92))]" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="catStrokeLogin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path d="M28 42 40 22l16 20m24 0 16-20 12 20" fill="none" stroke="url(#catStrokeLogin)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 49c0-8 7-15 15-15h40c8 0 15 7 15 15v24c0 12-10 22-22 22H47C35 95 25 85 25 73Z" fill="rgba(6,11,25,0.65)" stroke="url(#catStrokeLogin)" strokeWidth="4" />
        <path d="M45 63h12m18 0h-12" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 75c5 5 15 5 20 0" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 51h12l-7 10H34Zm46 0h-12l7 10h11Z" fill="#fbbf24" opacity="0.95" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('amaia-admin');
  const [password, setPassword] = useState('AmaiaHunter2026!');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ message: 'No se pudo iniciar sesion.' }));
          setError(payload.message ?? 'No se pudo iniciar sesion.');
          return;
        }

        router.push('/');
        router.refresh();
      } catch {
        setError('La autenticacion local fallo. Revisa que Next.js este corriendo correctamente.');
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel relative overflow-hidden rounded-[36px] p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_80%_15%,rgba(52,211,153,0.1),transparent_20%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex items-start gap-4">
              <HunterCatMark />
              <div>
                <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Secure Trading Intelligence
                </span>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Amaia AI Pump Hunter
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Dashboard premium para vigilancia de compresiones, narrativas y oportunidades de ruptura con una identidad
                  visual de alta calidad estilo terminal de trading futurista.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Realtime</p>
                <p className="mt-3 text-lg font-semibold text-white">REST + WebSocket</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Market Lens</p>
                <p className="mt-3 text-lg font-semibold text-white">Smart Money</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Deployment</p>
                <p className="mt-3 text-lg font-semibold text-white">Next.js + Vercel</p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[36px] p-8">
          <div className="max-w-md">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Access Control</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Log in to the command center</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              He dejado credenciales iniciales para demo privada. En producción puedes cambiarlas con variables de entorno
              sin tocar el código.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
              />
            </label>

            {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Connecting...' : 'Enter dashboard'}
            </button>
          </form>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-400">
            <p className="font-medium text-white">Credenciales iniciales</p>
            <p className="mt-2">Usuario: amaia-admin</p>
            <p className="mt-1">Password: AmaiaHunter2026!</p>
          </div>
        </section>
      </div>
    </main>
  );
}
