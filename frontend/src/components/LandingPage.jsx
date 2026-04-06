import BrandMark from '@/src/components/BrandMark';

function PaymentButton({ href, label, tone = 'primary' }) {
  const className =
    tone === 'primary'
      ? 'border-amber-400/30 bg-amber-400/12 text-amber-100 hover:bg-amber-400/18'
      : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]';

  return (
    <a
      href={href}
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

export default function LandingPage() {
  const stripeUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_URL ?? '/login';
  const paypalUrl = process.env.NEXT_PUBLIC_PAYPAL_PAYMENT_URL ?? '/login';
  const marketingVideoUrl = process.env.NEXT_PUBLIC_MARKETING_VIDEO_URL ?? '';
  const onboardingVideoUrl = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL ?? '';

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[40px] p-8 sm:p-10">
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
                      El sistema que detecta acumulación ignorada antes de que el mercado la vea.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
                      AMAIA AI PUMP HUNTER PRO escanea Spot y Futures en Binance y MEXC para encontrar estructuras previas a
                      explosión: compresión real, trampas de liquidez, drawdowns profundos y setups todavía sin atención
                      masiva.
                    </p>
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

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Pricing</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Precio razonable para una mesa de inteligencia real</h2>
              <div className="mt-6 rounded-[28px] border border-amber-400/18 bg-amber-400/[0.07] p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200/80">Plan Pro</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-5xl font-semibold text-white">€79</span>
                  <span className="pb-2 text-sm text-slate-400">/ mes</span>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  Acceso al scanner multi-market, execution desk, copilot Amaia AI, alertas y módulos premium.
                </p>
                <div className="mt-5 grid gap-3">
                  <PaymentButton href={stripeUrl} label="Pagar con Stripe" />
                  <PaymentButton href={paypalUrl} label="Pagar con PayPal" tone="secondary" />
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500">
                  Recomendado: configura Stripe o PayPal para redirigir después del pago a <span className="text-slate-300">/thank-you</span>.
                </p>
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Ideal For</p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <li>Traders que quieren llegar antes que el flujo retail.</li>
                  <li>Usuarios que prefieren setups estructurados y no monedas en tendencia tardía.</li>
                  <li>Operadores que valoran scanner, guía y ejecución en una sola interfaz.</li>
                </ul>
                <a
                  href="/onboarding"
                  className="mt-5 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Ver onboarding del cliente
                </a>
              </div>
            </div>
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
              <a href="/login" className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15">
                Ir a Login
              </a>
              <a href="/terminal" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">
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
      </div>
    </main>
  );
}
