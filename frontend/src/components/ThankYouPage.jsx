'use client';

import { useEffect } from 'react';

import { trackEvent } from '@/src/lib/analytics';
import BrandMark from '@/src/components/BrandMark';

function ActionCard({ eyebrow, title, text, href, label, tone = 'primary' }) {
  const className =
    tone === 'primary'
      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15'
      : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]';

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-400">{text}</p>
      <a
        href={href}
        className={`mt-5 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition ${className}`}
      >
        {label}
      </a>
    </div>
  );
}

export default function ThankYouPage() {
  useEffect(() => {
    trackEvent('purchase_completed', { source: 'thank_you_page', plan: 'pro_monthly_79' });
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[40px] p-8 sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <BrandMark size="lg" />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200">
                      Payment Received
                    </span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      AMAIA AI PUMP HUNTER PRO
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.42em] text-slate-500">Welcome To The Hunter Desk</p>
                    <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      Ya estás dentro. Ahora toca convertir acceso en ventaja operativa.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
                      El siguiente objetivo no es entrar rápido: es activar bien el sistema, entender el flujo y usar el terminal con
                      disciplina. En dos pasos lo dejas listo para operar mejor que la mayoría.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Step 1</p>
                  <p className="mt-3 text-lg font-semibold text-white">Activa tu cuenta</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Entra al login y accede al terminal privado del hunter desk.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Step 2</p>
                  <p className="mt-3 text-lg font-semibold text-white">Sigue el onboarding</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Aprende el flujo correcto para filtros, chart, plan y alertas.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Step 3</p>
                  <p className="mt-3 text-lg font-semibold text-white">Configura Telegram</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Deja listas tus alertas y el envío del setup operativo.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Recommended Route</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Haz esto ahora</h2>
              <div className="mt-6 grid gap-4">
                <ActionCard
                  eyebrow="First"
                  title="Ver onboarding"
                  text="Mira el flujo recomendado y evita usar el scanner como si fuera un simple screener."
                  href="/onboarding"
                  label="Open onboarding"
                />
                <ActionCard
                  eyebrow="Then"
                  title="Entrar al login"
                  text="Accede a la terminal, revisa filtros, conecta Telegram y empieza por All Setups."
                  href="/login"
                  label="Go to login"
                  tone="secondary"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
