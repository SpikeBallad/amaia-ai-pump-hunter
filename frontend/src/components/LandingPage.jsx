'use client';

import { trackEvent } from '@/src/lib/analytics';
import BrandMark from '@/src/components/BrandMark';
import PricingCard from '@/src/components/PricingCard';

function PaymentButton({ href, label, tone = 'primary', analyticsName, analyticsPayload }) {
  const className =
    tone === 'primary'
      ? 'border-amber-400/30 bg-amber-400/12 text-amber-100 hover:bg-amber-400/18'
      : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]';

  return (
    <a
      href={href}
      onClick={() => trackEvent(analyticsName ?? 'cta_clicked', analyticsPayload ?? { label })}
      className={`inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition ${className}`}
    >
      {label}
    </a>
  );
}

function VideoFeature({ eyebrow, title, description, videoUrl, posterTone = 'cyan', ctaLabel, ctaHref }) {
  const toneClass =
    posterTone === 'amber'
      ? 'from-amber-400/18 via-amber-300/8 to-transparent'
      : 'from-cyan-400/18 via-emerald-300/8 to-transparent';

  return (
    <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
      <h3 className="mt-3 text-3xl font-semibold text-white">{title}</h3>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{description}</p>
      <div className={`relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_38%),linear-gradient(180deg,rgba(6,10,22,0.96),rgba(3,7,18,0.98))]`}>
        {videoUrl ? (
          <video
            className="aspect-[16/9] w-full object-cover"
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
          />
        ) : (
          <div className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${toneClass}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(34,211,238,0.22),transparent_18%),radial-gradient(circle_at_82%_28%,rgba(16,185,129,0.16),transparent_14%),linear-gradient(180deg,rgba(4,8,22,0.42),rgba(3,7,18,0.88))]" />
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/80">Sora Campaign Slot</p>
                  <p className="mt-3 max-w-md text-2xl font-semibold text-white">Video placeholder listo para reemplazar por el render final.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  16:9 / autoplay
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Hook</p>
                  <p className="mt-2 text-sm font-medium text-white">Find pumps before they trend</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Visual</p>
                  <p className="mt-2 text-sm font-medium text-white">Robotic cat desk + market radar</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">CTA</p>
                  <p className="mt-2 text-sm font-medium text-white">Enter the hunter terminal</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {ctaLabel && ctaHref ? (
        <a
          href={ctaHref}
          className="mt-5 inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
        >
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}

function FaqItem({ question, answer }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm font-semibold text-white">{question}</p>
      <p className="mt-3 text-sm leading-7 text-slate-400">{answer}</p>
    </div>
  );
}

function ObjectionCard({ title, concern, response }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-3 text-base font-semibold text-amber-100">{concern}</p>
      <p className="mt-3 text-sm leading-7 text-slate-400">{response}</p>
    </div>
  );
}

function ProofCard({ quote, name, role }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm leading-7 text-slate-300">{quote}</p>
      <div className="mt-5">
        <p className="text-sm font-semibold text-white">{name}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function ComparisonRow({ label, amaia, generic }) {
  return (
    <div className="grid gap-3 rounded-[20px] border border-white/8 bg-white/[0.02] p-4 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
      <div className="text-sm font-medium text-white">{label}</div>
      <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-100">{amaia}</div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">{generic}</div>
    </div>
  );
}

export default function LandingPage() {
  const stripeUrl = process.env.NEXT_PUBLIC_STRIPE_EARLY_ACCESS_URL ?? process.env.NEXT_PUBLIC_STRIPE_PAYMENT_URL ?? '/login';
  const paypalUrl = process.env.NEXT_PUBLIC_PAYPAL_EARLY_ACCESS_URL ?? process.env.NEXT_PUBLIC_PAYPAL_PAYMENT_URL ?? '/login';
  const marketingVideoUrl = process.env.NEXT_PUBLIC_MARKETING_VIDEO_URL ?? '';
  const onboardingVideoUrl = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL ?? '';

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[40px] p-8 sm:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-amber-400/15 bg-[linear-gradient(90deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04),transparent)] px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200/80">Founding Operator Pricing</p>
              <p className="mt-2 text-sm font-semibold text-white sm:text-base">
                Acceso inicial a €79/mes mientras la admisión privada sigue limitada para mantener onboarding y soporte de alto nivel.
              </p>
            </div>
            <a
              href={stripeUrl}
              onClick={() => trackEvent('founding_banner_clicked', { destination: 'stripe', plan: 'pro_monthly_79' })}
              className="inline-flex items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/12 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18"
            >
              Claim founding access
            </a>
          </div>
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <BrandMark size="lg" />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      AMAIA AI PUMP HUNTER PRO
                    </span>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200">
                      Cross-Exchange Intelligence
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.42em] text-slate-500">Robotic Hunter Market Desk</p>
                    <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                      Deja de reaccionar tarde. Encuentra estructura antes de que la multitud vea el movimiento.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
                      AMAIA AI PUMP HUNTER PRO es una mesa privada de inteligencia para traders que quieren menos ruido, mejor
                      contexto y una ruta más rápida desde descubrimiento hasta decisión. Escanea Spot y Futures en Binance y MEXC
                      para encontrar acumulación ignorada, compresión real y actividad previa a expansión, antes de que el flujo
                      retail se amontone.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <PaymentButton
                        href={stripeUrl}
                        label="Start Private Access"
                        analyticsName="hero_primary_cta_clicked"
                        analyticsPayload={{ provider: 'stripe', placement: 'hero_primary', plan: 'pro_monthly_79' }}
                      />
                      <PaymentButton
                        href="/onboarding"
                        label="See How It Works"
                        tone="secondary"
                        analyticsName="hero_secondary_cta_clicked"
                        analyticsPayload={{ destination: 'onboarding', placement: 'hero_secondary' }}
                      />
                      <PaymentButton
                        href={process.env.NEXT_PUBLIC_SALES_DEMO_URL ?? '/onboarding'}
                        label="Book a Precision Demo"
                        tone="secondary"
                        analyticsName="hero_demo_cta_clicked"
                        analyticsPayload={{ destination: 'demo', placement: 'hero_demo' }}
                      />
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                        Not for hype chasing
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                        Built for pre-breakout structure
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                        Scanner + execution + AI guidance
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Why It Is Special</p>
                  <p className="mt-3 text-lg font-semibold text-white">No persigue hype</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Excluye activos ya bombeados y prioriza estructuras invisibles.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Operational Edge</p>
                  <p className="mt-3 text-lg font-semibold text-white">Scanner + execution desk</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">No solo detecta: propone entries, stop, TP y sizing.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Guided Decisions</p>
                  <p className="mt-3 text-lg font-semibold text-white">Amaia AI copilot</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Explica qué ves, por qué importa y cómo operar mejor.</p>
                </div>
              </div>
            </div>

            <PricingCard stripeUrl={stripeUrl} paypalUrl={paypalUrl} demoUrl={process.env.NEXT_PUBLIC_SALES_DEMO_URL ?? '/onboarding'} />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <VideoFeature
            eyebrow="Hero Video"
            title="Video de conversión para captar atención y mover a compra"
            description="Este bloque está diseñado para alojar el clip principal de marketing: corto, elegante, oscuro, con ritmo premium y mensaje directo. Debe vender el edge del sistema en menos de 15 segundos."
            videoUrl={marketingVideoUrl}
            posterTone="cyan"
            ctaLabel="Ir a onboarding visual"
            ctaHref="/onboarding"
          />
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Sora Script</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Guion premium para el video de venta</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">0-3s Hook</p>
                <p className="mt-2">“Most traders chase pumps. Amaia finds them before they move.”</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">3-8s Mechanism</p>
                <p className="mt-2">Radar multi-exchange, score, liquidity traps, accumulation box y execution desk.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">8-12s Authority</p>
                <p className="mt-2">Spot + Futures, Binance + MEXC, AI copilot, alert center y robotic hunter branding.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">12-15s CTA</p>
                <p className="mt-2">“Enter the hunter terminal. Trade with structure, not noise.”</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="glass-panel rounded-[34px] p-6 xl:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Marketing Strategy</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Estrategia de mercadeo para venderlo como sistema premium</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Positioning</p>
                <p className="mt-3 text-lg font-semibold text-white">No es un screener más</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">Se vende como sistema de acumulación cross-exchange y mesa operativa AI.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Acquisition</p>
                <p className="mt-3 text-lg font-semibold text-white">Contenido + prueba visual</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">Usar clips cortos del dashboard, scans reales y casos de detección temprana.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Conversion</p>
                <p className="mt-3 text-lg font-semibold text-white">CTA simple</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">Landing clara, pricing directo, Stripe/PayPal y acceso inmediato a login privado.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Traffic</p>
                <p className="mt-2 text-sm font-medium text-white">Short-form clips + screenshots + “before the crowd” messaging</p>
              </div>
              <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Lead Angle</p>
                <p className="mt-2 text-sm font-medium text-white">Ignored assets, low attention, pre-explosion setups</p>
              </div>
              <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Offer</p>
                <p className="mt-2 text-sm font-medium text-white">Scanner + execution desk + AI copilot + alerts</p>
              </div>
              <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Post Purchase</p>
                <p className="mt-2 text-sm font-medium text-white">Thank-you page → onboarding → login → terminal</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Fast Access</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Entrar al terminal</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Si ya pagaste o ya tienes acceso privado, entra al command center y usa la terminal completa.
            </p>
            <div className="mt-6 grid gap-3">
              <a
                href="/login"
                onClick={() => trackEvent('terminal_access_clicked', { destination: 'login' })}
                className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Ir a Login
              </a>
              <a
                href="/terminal"
                onClick={() => trackEvent('terminal_access_clicked', { destination: 'terminal' })}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Abrir Terminal
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Creative Direction</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Prompt base para Sora</h2>
            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/60 p-5 text-sm leading-7 text-slate-300">
              <p>
                Create a premium cinematic fintech advertisement for “AMAIA AI PUMP HUNTER PRO”, a futuristic crypto intelligence
                desk. Show a dark luxury trading environment with cyan and emerald highlights, a robotic hunter cat logo, multi-exchange
                radar panels, accumulation boxes, EMA overlays, liquidity trap markers, and elegant motion graphics. The mood is
                exclusive, sharp, institutional and high-conviction. Camera movement is smooth and controlled, with high contrast,
                glass interfaces, terminal typography, polished reflections, and short conversion-focused pacing. End with a powerful
                product lockup and CTA: “Enter the hunter terminal.”
              </p>
            </div>
          </div>
          <VideoFeature
            eyebrow="Onboarding Preview"
            title="Segundo video para explicar uso inteligente"
            description="Este segundo clip debe vivir en onboarding. Aquí no vende tanto: enseña a filtrar, leer setups, revisar chart, usar execution plan y conectar alertas."
            videoUrl={onboardingVideoUrl}
            posterTone="amber"
          />
        </section>

        <section className="glass-panel rounded-[34px] p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-300">Why people buy</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">They are not buying hype. They are buying earlier context.</h2>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-400">
                The strongest conversion angle is simple: if your process is already serious, the bottleneck is usually discovery,
                noise filtering, and execution discipline. AMAIA compresses that path into one operator-grade workflow.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Before AMAIA</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">Too many charts, late focus, fragmented tools, noisy discovery.</p>
              </div>
              <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/[0.05] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">With AMAIA</p>
                <p className="mt-2 text-sm leading-7 text-white">Narrower universe, stronger structure, clearer execution, faster operator decisions.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <PaymentButton
              href={stripeUrl}
              label="Claim Founding Access"
              analyticsName="mid_page_primary_cta_clicked"
              analyticsPayload={{ provider: 'stripe', placement: 'mid_page_primary', plan: 'pro_monthly_79' }}
            />
            <PaymentButton
              href={process.env.NEXT_PUBLIC_SALES_DEMO_URL ?? '/onboarding'}
              label="Book Demo First"
              tone="secondary"
              analyticsName="mid_page_demo_cta_clicked"
              analyticsPayload={{ destination: 'demo', placement: 'mid_page_demo' }}
            />
          </div>
        </section>

        <section className="glass-panel rounded-[34px] p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">User Guide</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Guía de uso para el usuario que paga</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">1. Filtra</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Elige Spot o Futures, exchange y score mínimo según tu enfoque.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">2. Evalúa</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Abre el chart, revisa acumulación, drawdown, ATR ratio y estado estructural.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">3. Ejecuta</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Usa el Execution Plan para entries, stop, take profits, tamaño y riesgo.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">4. Automatiza</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">Conecta Telegram para recibir setups y guardar un flujo de operación profesional.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Objection Handling</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Objeciones comunes antes de comprar</h2>
            <div className="mt-6 grid gap-4">
              <ObjectionCard
                title="Objeción 1"
                concern="“Ya hay muchos scanners y bots.”"
                response="Correcto. El mercado ya está lleno de scanners. Esa no es la categoría en la que Amaia quiere ganar. Amaia existe para reducir el tiempo entre detectar estructura relevante y convertirla en una decisión operativa con contexto, execution plan y prioridad real."
              />
              <ObjectionCard
                title="Objeción 2"
                concern="“No quiero entrar tarde en monedas hype.”"
                response="Ese es precisamente el filtro. La lógica prioriza compresión, drawdown y atención baja, y excluye lo que ya viene demasiado extendido. La idea no es perseguir velas grandes; es detectar la estructura antes de que se vuelva obvia."
              />
              <ObjectionCard
                title="Objeción 3"
                concern="“¿Y si no sé usar una plataforma compleja?”"
                response="La interfaz está pensada para dos niveles: lectura rápida y mesa pro. Además ya incluye onboarding, guía visual, AI copilot y un flujo claro desde scanner hasta execution plan. No hace falta improvisar el proceso."
              />
              <ObjectionCard
                title="Objeción 4"
                concern="“€79 al mes, ¿vale la pena?”"
                response="La pregunta correcta no es si el software cuesta €79, sino cuánto cuesta seguir tomando decisiones con una cobertura más lenta, más ruidosa y menos estructurada. Si tu flujo actual ya es serio, esto se comporta más como infraestructura que como gasto accesorio."
              />
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Preguntas frecuentes que ayudan a convertir</h2>
            <div className="mt-6 grid gap-4">
              <FaqItem
                question="¿Esto da señales de compra automáticas?"
                answer="Da setups estructurados, alertas, chart, entries, stop, take profits y sizing. La decisión final sigue siendo del operador, pero con muchísimo más contexto."
              />
              <FaqItem
                question="¿Sirve para Spot y Futures?"
                answer="Sí. La propuesta central es precisamente cruzar Spot y Futures entre Binance y MEXC para encontrar oportunidades antes del consenso del mercado."
              />
              <FaqItem
                question="¿Necesito experiencia avanzada para usarlo?"
                answer="No para empezar. Sí ayuda tener disciplina. La plataforma está diseñada para acompañar al usuario con filtros claros, visuales, onboarding y Amaia AI copilot."
              />
              <FaqItem
                question="¿Cómo recibo oportunidades?"
                answer="Dentro del terminal puedes usar el Alert Center, reglas filtradas por market, exchange y score, y conectar Telegram para recibir mensajes operativos."
              />
              <FaqItem
                question="¿Qué pasa después de pagar?"
                answer="La ruta recomendada es simple: thank-you page, onboarding, login, terminal. Así reduces fricción y empiezas a usar el sistema con una metodología correcta."
              />
              <FaqItem
                question="¿Qué hace diferente a Amaia frente a mirar TradingView manualmente?"
                answer="TradingView te ayuda a analizar. Amaia te ayuda a descubrir qué merece ser analizado primero, con prioridad operativa, estructura y flujo multi-exchange."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Operator Fit</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Quién extrae más valor del sistema</h2>
            <div className="mt-6 grid gap-4">
              <ProofCard
                quote="Best for traders who already understand execution and want earlier context, cleaner discovery, and fewer low-value charts."
                name="Advanced Retail"
                role="Spot and swing operators"
              />
              <ProofCard
                quote="Best for operators who already use TradingView but want the upstream intelligence layer that tells them what deserves attention first."
                name="Workflow Upgrade"
                role="Chart-first discretionary traders"
              />
              <ProofCard
                quote="Best for futures users who want one desk to unify discovery, alerts, structure review, execution planning, and paper validation."
                name="Futures Desk"
                role="Higher-frequency and operator-style workflows"
              />
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Comparison</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Amaia vs scanners genéricos</h2>
            <div className="mt-6 space-y-3">
              <div className="grid gap-3 px-1 text-[11px] uppercase tracking-[0.22em] text-slate-500 md:grid-cols-[1.2fr_0.9fr_0.9fr]">
                <span>Capability</span>
                <span>Amaia</span>
                <span>Generic Scanner</span>
              </div>
              <ComparisonRow
                label="Descubrir activos antes del consenso"
                amaia="Prioriza estructuras ignoradas y excluye pumps extendidos"
                generic="Suele listar lo que ya está moviéndose"
              />
              <ComparisonRow
                label="Contexto operativo"
                amaia="Chart, plan, sizing, AI guidance y alerts"
                generic="Normalmente solo lista símbolos o señales"
              />
              <ComparisonRow
                label="Uso real en execution"
                amaia="Pensado como desk: entries, stop, TP y Telegram"
                generic="Requiere montar el resto manualmente"
              />
              <ComparisonRow
                label="Cross-exchange edge"
                amaia="Binance + MEXC, Spot + Futures"
                generic="Cobertura parcial o enfoque aislado"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-[22px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(7,12,24,0.92),rgba(4,8,18,0.9))] px-4 py-3 shadow-[0_24px_90px_rgba(2,8,24,0.45)] backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Private Access Window</p>
            <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">Enter AMAIA now at founding pricing while private intake is still controlled</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={stripeUrl}
              onClick={() => trackEvent('sticky_cta_clicked', { destination: 'stripe', plan: 'pro_monthly_79' })}
              className="inline-flex items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/12 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18"
            >
              Start access
            </a>
            <a
              href={process.env.NEXT_PUBLIC_SALES_DEMO_URL ?? '/onboarding'}
              onClick={() => trackEvent('sticky_cta_clicked', { destination: 'demo' })}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              Book demo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
