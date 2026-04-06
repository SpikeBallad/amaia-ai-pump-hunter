import BrandMark from '@/src/components/BrandMark';

function StepCard({ step, title, text }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{step}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
    </div>
  );
}

function VideoTrainingPanel({ videoUrl }) {
  return (
    <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
      <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Visual Onboarding</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Clip guiado para activar al cliente</h2>
      <p className="mt-4 text-sm leading-7 text-slate-400">
        El onboarding funciona mejor con un video educativo corto. Aquí conviene explicar filtros, lectura del chart, execution plan,
        Telegram y flujo operativo recomendado.
      </p>
      <div className="relative mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_38%),linear-gradient(180deg,rgba(6,10,22,0.96),rgba(3,7,18,0.98))]">
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
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.18),transparent_18%),radial-gradient(circle_at_80%_24%,rgba(34,211,238,0.14),transparent_16%),linear-gradient(180deg,rgba(4,8,22,0.48),rgba(3,7,18,0.92))]" />
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  Sora onboarding slot
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  30-45s guide
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Step 1</p>
                  <p className="mt-2 text-sm font-medium text-white">Filter market intentionally</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Step 2</p>
                  <p className="mt-2 text-sm font-medium text-white">Read chart and status phase</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Step 3</p>
                  <p className="mt-2 text-sm font-medium text-white">Execute with discipline</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const onboardingVideoUrl = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL ?? '';

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-6">
        <section className="glass-panel rounded-[40px] p-8 sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <BrandMark size="lg" />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-200">
                      Welcome Onboard
                    </span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      AMAIA AI PUMP HUNTER PRO
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.42em] text-slate-500">Client Activation Guide</p>
                    <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      Ya estás dentro del sistema. Ahora toca usarlo con inteligencia operativa.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
                      Esta guía está pensada para que un usuario nuevo pase de pagar a operar con criterio: filtrar bien, leer
                      setups, usar el execution plan y no perseguir ruido de mercado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Best Use</p>
                  <p className="mt-3 text-lg font-semibold text-white">Pre-breakout hunting</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Busca compresión estructural, no velas ya extendidas.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mindset</p>
                  <p className="mt-3 text-lg font-semibold text-white">Patience over FOMO</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Usa entries escalonadas y deja que el mercado te llame.</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Core Rule</p>
                  <p className="mt-3 text-lg font-semibold text-white">Risk first</p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">Nunca operes sin stop, sizing y contexto estructural.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Quick Start</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Ruta recomendada de activación</h2>
              <div className="mt-6 space-y-4">
                <StepCard
                  step="Paso 1"
                  title="Entra al terminal"
                  text="Accede al login y abre el terminal privado para ver el scanner multi-market completo."
                />
                <StepCard
                  step="Paso 2"
                  title="Configura Telegram"
                  text="Guarda tu bot y tu chat ID para recibir setups, pruebas y mensajes operativos."
                />
                <StepCard
                  step="Paso 3"
                  title="Filtra con intención"
                  text="Empieza con score alto, luego separa Spot/Futures y finalmente usa narrativa o exchange."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <VideoTrainingPanel videoUrl={onboardingVideoUrl} />
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Onboarding Script</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Guion del video educativo</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">0-8s</p>
                <p className="mt-2">Explica que la plataforma no persigue pumps: busca acumulación antes del breakout.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">8-18s</p>
                <p className="mt-2">Muestra All Setups, Spot, Futures y Watchlist con filtros correctos.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">18-30s</p>
                <p className="mt-2">Abre un chart, explica acumulación, EMA20, EMA50, liquidity trap y status label.</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">30-45s</p>
                <p className="mt-2">Cierra con execution plan, Telegram y disciplina de riesgo: “Operate with structure, not emotion.”</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="glass-panel rounded-[34px] p-6 xl:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">How To Use It Smartly</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Cómo usar la plataforma de la forma más eficaz</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StepCard
                step="Filtro"
                title="Empieza por All Setups"
                text="Observa primero el estado general del radar. Luego baja a Spot o Futures según tu estilo operativo."
              />
              <StepCard
                step="Lectura"
                title="Revisa el chart y la fase"
                text="Usa Dump %, Range %, ATR y status label para decidir si es acumulación, pre-breakout o ruptura inicial."
              />
              <StepCard
                step="Acción"
                title="Usa el Execution Plan"
                text="No improvises. Copia el trade plan, revisa sizing y guarda los setups que quieras seguir."
              />
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Links</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Accesos rápidos</h2>
            <div className="mt-6 grid gap-3">
              <a href="/login" className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15">
                Ir a Login
              </a>
              <a href="/terminal" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                Abrir Terminal
              </a>
              <a href="/" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">
                Volver a Landing
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
