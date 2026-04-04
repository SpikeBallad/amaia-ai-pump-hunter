'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useMarket } from '@/src/context/MarketContext';

const stateStyles = {
  HIGH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  WATCHLIST: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  IGNORE: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const exchangeOptions = [
  { value: 'all', label: 'All Venues' },
  { value: 'binance', label: 'Binance' },
  { value: 'mexc', label: 'MEXC' },
];

const marketTypeOptions = [
  { value: 'all', label: 'All Markets' },
  { value: 'spot', label: 'Spot' },
  { value: 'futures', label: 'Futures' },
];

const narrativeOptions = [
  { value: 'All Market', label: 'All Market' },
  { value: 'Smart Money', label: 'Smart Money' },
  { value: 'Core Narratives', label: 'Core Narratives' },
  { value: 'Microcaps (MEXC)', label: 'Microcaps MEXC' },
];

const marketPillStyles = {
  spot: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  futures: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
};

function formatPrice(value) {
  if (typeof value !== 'number') return '--';
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

function formatVolume(value) {
  if (typeof value !== 'number') return '--';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatPercent(value) {
  if (typeof value !== 'number') return '--';
  return `${value.toFixed(2)}%`;
}

function formatTime(dateValue) {
  if (!dateValue) return '--';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateValue);
}

function getStateClass(state) {
  return stateStyles[state] ?? stateStyles.IGNORE;
}

function getMarketTypeClass(marketType) {
  return marketPillStyles[marketType] ?? 'border-white/10 bg-white/[0.04] text-slate-300';
}

function getSocketClass(status) {
  if (status === 'disabled') return 'border-white/10 bg-white/[0.04] text-slate-300';
  if (status === 'live') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'reconnecting') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (status === 'error') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300';
}

function getHitRateClass(rate) {
  if (typeof rate !== 'number') return 'border-white/10 bg-white/[0.04] text-slate-300';
  if (rate >= 70) return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (rate >= 40) return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
}

function HunterCatMark() {
  return (
    <div className="relative isolate h-20 w-20 overflow-hidden rounded-[28px] border border-cyan-400/20 bg-slate-950/80 shadow-glow">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(34,211,238,0.18),transparent_46%),linear-gradient(180deg,rgba(8,15,33,0.96),rgba(5,8,22,0.92))]" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="catStrokeDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <path d="M28 42 40 22l16 20m24 0 16-20 12 20" fill="none" stroke="url(#catStrokeDashboard)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 49c0-8 7-15 15-15h40c8 0 15 7 15 15v24c0 12-10 22-22 22H47C35 95 25 85 25 73Z" fill="rgba(6,11,25,0.65)" stroke="url(#catStrokeDashboard)" strokeWidth="4" />
        <path d="M45 63h12m18 0h-12" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 75c5 5 15 5 20 0" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 51h12l-7 10H34Zm46 0h-12l7 10h11Z" fill="#fbbf24" opacity="0.95" />
      </svg>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value, detail, tone }) {
  return (
    <div className="glass-panel rounded-[28px] p-5">
      <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{label}</p>
      <p className={`mt-4 text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    backendStatus,
    exchangeFilter,
    setExchangeFilter,
    marketTypeFilter,
    setMarketTypeFilter,
    narrativeFilter,
    setNarrativeFilter,
    scoreFilter,
    setScoreFilter,
    soundEnabled,
    setSoundEnabled,
    cacheStats,
    invalidateMarketCache,
    filteredRows,
    topPanelRows,
    scoreChanges,
    alertLog,
    activeAlert,
    dismissActiveAlert,
    loading,
    refreshing,
    error,
    lastUpdated,
    socketStatus,
    summary,
    refreshMarketData,
  } = useMarket();

  const socketLabel = useMemo(() => {
    if (socketStatus === 'disabled') return 'REST only';
    if (socketStatus === 'live') return 'Live feed';
    if (socketStatus === 'reconnecting') return 'Re-syncing';
    if (socketStatus === 'error') return 'Stream degraded';
    return 'Connecting';
  }, [socketStatus]);

  const strongestRow = filteredRows[0] ?? topPanelRows[0] ?? null;
  const averageScore = summary.averageScore ? summary.averageScore.toFixed(1) : '0.0';
  const marketModeLabel = marketTypeFilter === 'all' ? 'Cross Market' : marketTypeFilter === 'futures' ? 'Futures Radar' : 'Spot Radar';

  function handleLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1520px] flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="glass-panel relative overflow-hidden rounded-[36px] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(52,211,153,0.12),transparent_24%)]" />
            <div className="relative flex flex-col gap-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <HunterCatMark />
                  <div className="space-y-4">
                    <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      Amaia AI Pump Hunter
                    </span>
                    <div>
                      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Tactical crypto scanner with hunter-grade execution visuals.
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                        Detecta compresiones, narrativas calientes y posibles breakouts con una experiencia moderna inspirada
                        en terminales de trading premium y vigilancia cuantitativa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${getSocketClass(socketStatus)}`}>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-current/70">Socket</p>
                    <p className="mt-2 font-medium">{socketLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isPending}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/20 hover:text-white disabled:opacity-60"
                  >
                    {isPending ? 'Closing...' : 'Log out'}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="High Conviction" value={summary.highCount} tone="text-emerald-300" detail="Setups listos para vigilancia activa." />
                <MetricCard label="Watchlist" value={summary.watchlistCount} tone="text-amber-300" detail="Compresiones con estructura interesante." />
                <MetricCard label="Average Score" value={averageScore} tone="text-cyan-300" detail="Promedio del universo filtrado actual." />
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mode</p>
                  <p className="mt-3 text-lg font-semibold text-white">{marketModeLabel}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Visible Universe</p>
                  <p className="mt-3 text-lg font-semibold text-white">{summary.visibleCount}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Spot</p>
                  <p className="mt-3 text-lg font-semibold text-cyan-300">{summary.spotCount}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Futures</p>
                  <p className="mt-3 text-lg font-semibold text-fuchsia-300">{summary.futuresCount}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[30px] border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Hunter Focus</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{strongestRow ? strongestRow.symbol : 'Waiting for signal'}</h2>
                      {strongestRow ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMarketTypeClass(strongestRow.marketType)}`}>
                            {strongestRow.marketType.toUpperCase()}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                            {strongestRow.exchange.toUpperCase()}
                          </span>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {strongestRow.signalLabel}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    {strongestRow ? (
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(strongestRow.estado)}`}>
                        {strongestRow.estado}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Price</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow ? formatPrice(strongestRow.price) : '--'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Volume</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow ? formatVolume(strongestRow.volume) : '--'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Volatility</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow ? formatPercent(strongestRow.volatility) : '--'}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-400">
                    {strongestRow?.summary ?? 'El scanner destacara aqui el mejor setup disponible segun score y narrativa.'}
                  </p>
                </div>

                <div className="rounded-[30px] border border-white/10 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Controls</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">Mission Filters</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => refreshMarketData()}
                      className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
                    >
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <FilterSelect label="Exchange" value={exchangeFilter} onChange={(event) => setExchangeFilter(event.target.value)} options={exchangeOptions} />
                    <FilterSelect label="Market Type" value={marketTypeFilter} onChange={(event) => setMarketTypeFilter(event.target.value)} options={marketTypeOptions} />
                    <FilterSelect label="Narrative" value={narrativeFilter} onChange={(event) => setNarrativeFilter(event.target.value)} options={narrativeOptions} />
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Minimum Score</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={scoreFilter}
                        onChange={(event) => setScoreFilter(Number(event.target.value))}
                        className="accent-cyan-400"
                      />
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <span>0</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{scoreFilter}</span>
                        <span>10</span>
                      </div>
                    </label>

                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Alert sound</p>
                        <p className="text-xs text-slate-500">Audio when score reaches 7 or more.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSoundEnabled((current) => !current)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          soundEnabled
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                            : 'border-white/10 bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        {soundEnabled ? 'On' : 'Off'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="glass-panel rounded-[36px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Top 10</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Hot Opportunities</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                {formatTime(lastUpdated)}
              </div>
            </div>

              <div className="mt-5 space-y-3">
              {topPanelRows.slice(0, 10).map((row, index) => (
                <div key={`${row.market_type}-${row.exchange}-${row.symbol}`} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/20 hover:bg-white/[0.05]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-[0.26em] text-slate-500">#{String(index + 1).padStart(2, '0')}</span>
                        <h3 className="text-lg font-semibold text-white">{row.symbol}</h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMarketTypeClass(row.market_type)}`}>
                          {row.market_type.toUpperCase()}
                        </span>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          {row.signal_label}
                        </span>
                        <span className="text-sm text-slate-400">{row.exchange.toUpperCase()} · {row.narrative_label ?? row.narrative}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>{row.estado}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Score</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{row.score}</p>
                    </div>
                    <p className="max-w-[14rem] text-right text-sm leading-6 text-slate-400">{row.setup}</p>
                  </div>
                </div>
              ))}
              {!loading && topPanelRows.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                  No hay oportunidades con los filtros actuales.
                </div>
              ) : null}
            </div>
          </aside>
        </section>

        {socketStatus === 'disabled' ? (
          <div className="glass-panel rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            El dashboard esta corriendo en modo REST only. En `spot` usamos WebSocket; en `all` y `futures` se refresca por REST cada 30 segundos.
          </div>
        ) : (
          <div className="glass-panel rounded-[28px] border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            Fuente activa: spot market con sincronizacion por REST y WebSocket desde FastAPI.
          </div>
        )}

        {error ? <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div> : null}

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="glass-panel rounded-[36px] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Scanner Grid</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Market Surveillance Table</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                  Backend: <span className="text-white">{backendStatus}</span>
                </div>
                <div className={`rounded-full border px-4 py-2 text-sm ${getSocketClass(socketStatus)}`}>{socketLabel}</div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-[30px] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left">
                  <thead className="bg-slate-950/80">
                    <tr className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      <th className="px-5 py-4 font-medium">Pair</th>
                      <th className="px-5 py-4 font-medium">Price</th>
                      <th className="px-5 py-4 font-medium">Score</th>
                      <th className="px-5 py-4 font-medium">State</th>
                      <th className="px-5 py-4 font-medium">Volume</th>
                      <th className="px-5 py-4 font-medium">Volatility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6 bg-[rgba(4,8,22,0.62)]">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-white/[0.035]">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{row.symbol}</span>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMarketTypeClass(row.marketType)}`}>
                                {row.marketType.toUpperCase()}
                              </span>
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                {row.signalLabel}
                              </span>
                              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                {row.exchange} · {row.narrativeLabel ?? row.narrative}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-200">{formatPrice(row.price)}</td>
                        <td className="px-5 py-4 font-mono text-lg text-white">{row.score}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>{row.estado}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-200">{formatVolume(row.volume)}</td>
                        <td className="px-5 py-4 text-sm text-slate-200">{formatPercent(row.volatility)}</td>
                      </tr>
                    ))}
                    {!loading && filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-8 text-center text-sm text-slate-400">
                          No hay filas con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="glass-panel rounded-[36px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Cache Monitor</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Performance Layer</h2>
                </div>
                <button
                  type="button"
                  onClick={invalidateMarketCache}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400/20 hover:text-white"
                >
                  Flush Cache
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Entries</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {(cacheStats?.scan_cache_entries ?? 0) + (cacheStats?.overview_cache_entries ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Redis</p>
                  <p className="mt-3 text-sm font-medium text-slate-200">Placeholder ready</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getHitRateClass(cacheStats?.scan_cache_hit_rate)}`}>
                  Scan {typeof cacheStats?.scan_cache_hit_rate === 'number' ? `${cacheStats.scan_cache_hit_rate.toFixed(0)}%` : '--'}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getHitRateClass(cacheStats?.overview_cache_hit_rate)}`}>
                  Overview {typeof cacheStats?.overview_cache_hit_rate === 'number' ? `${cacheStats.overview_cache_hit_rate.toFixed(0)}%` : '--'}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-400">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <span>Scan hits / misses</span>
                  <span className="font-mono text-slate-200">
                    {cacheStats?.scan_cache_hits ?? 0} / {cacheStats?.scan_cache_misses ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <span>Overview hits / misses</span>
                  <span className="font-mono text-slate-200">
                    {cacheStats?.overview_cache_hits ?? 0} / {cacheStats?.overview_cache_misses ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Alert Log</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Critical Signals</h2>
              </div>
              <div className="mt-5 space-y-3">
                {alertLog.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {item.exchange} · {item.narrativeLabel ?? item.narrative}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(item.estado)}`}>{item.estado}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                      <span>Score {item.score}</span>
                      <span>{formatTime(new Date(item.createdAt))}</span>
                    </div>
                  </div>
                ))}
                {alertLog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    No hay alertas disparadas todavia.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Score Changes</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Realtime Delta</h2>
              </div>
              <div className="mt-5 space-y-3">
                {scoreChanges.slice(0, 5).map((change) => (
                  <div key={`${change.market_type}-${change.exchange}-${change.symbol}-${change.current_score}-${change.previous_score}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{change.symbol}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMarketTypeClass(change.market_type)}`}>
                          {change.market_type.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono text-cyan-300">
                        {change.previous_score} → {change.current_score}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {change.previous_estado} to {change.current_estado}
                    </p>
                  </div>
                ))}
                {scoreChanges.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    Sin cambios de score recientes en el stream.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {activeAlert ? (
          <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-[28px] border border-emerald-400/20 bg-slate-950/92 p-5 shadow-[0_24px_90px_rgba(16,185,129,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-400">Hunter Alert</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{activeAlert.symbol}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Score {activeAlert.score} detectado en {activeAlert.exchange.toUpperCase()} bajo narrativa{' '}
                  {activeAlert.narrativeLabel ?? activeAlert.narrative}.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissActiveAlert}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
