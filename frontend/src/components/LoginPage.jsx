'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import BrandMark from '@/src/components/BrandMark';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
              <BrandMark size="lg" />
              <div>
                <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Robotic Hunter Intelligence
                </span>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  AMAIA AI PUMP HUNTER PRO
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Plataforma premium para detectar acumulacion, pre-breakout y setups de explosion en spot y futures con un
                  gato hunter robotico como identidad central.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Realtime</p>
                <p className="mt-3 text-lg font-semibold text-white">REST + Realtime</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Market Lens</p>
                <p className="mt-3 text-lg font-semibold text-white">Spot + Futures</p>
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
            <h2 className="mt-3 text-3xl font-semibold text-white">Log in to the hunter command center</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Acceso privado para la consola principal de AMAIA AI PUMP HUNTER PRO. Gestiona las credenciales desde variables
              de entorno sin tocar el codigo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="amaia-admin"
                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your secure password"
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
            <p className="font-medium text-white">Acceso protegido por entorno</p>
            <p className="mt-2">
              Usa las credenciales configuradas en variables de entorno. Evita mostrar usuarios o passwords en producción.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
