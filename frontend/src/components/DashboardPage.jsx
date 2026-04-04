'use client';

import { useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import AmaiaCopilotPanel from '@/src/components/AmaiaCopilotPanel';
import BrandMark from '@/src/components/BrandMark';
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

const moduleOptions = [
  { value: 'all', label: 'All Setups' },
  { value: 'spot', label: 'Spot Opportunities' },
  { value: 'futures', label: 'Futures Setups' },
  { value: 'watchlist', label: 'Pre-Pump Watchlist' },
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
  const key = marketType?.endsWith?.('FUTURES') || marketType === 'futures' ? 'futures' : 'spot';
  return marketPillStyles[key] ?? 'border-white/10 bg-white/[0.04] text-slate-300';
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
    moduleFilter,
    setModuleFilter,
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
    watchlistRows,
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
  const marketModeLabel =
    moduleFilter === 'watchlist'
      ? 'Pre-Pump Watchlist'
      : moduleFilter === 'futures'
        ? 'Futures Radar'
        : moduleFilter === 'spot'
          ? 'Spot Radar'
          : 'Cross Market';

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
                  <BrandMark size="md" />
                  <div className="space-y-4">
                    <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      AMAIA AI PUMP HUNTER PRO
                    </span>
                    <div>
                      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Robotic hunter dashboard for cross-exchange pre-pump intelligence.
                      </h1>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                        Detecta acumulacion, trampas de liquidez y estructuras de explosion en spot y futures con una interfaz
                        premium inspirada en terminales de trading de alta gama.
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
                            {(strongestRow.marketType ?? strongestRow.market_type ?? '--').toUpperCase()}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                            {strongestRow.exchange.toUpperCase()}
                          </span>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {strongestRow.signalLabel ?? strongestRow.signal_label}
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
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Dump %</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow ? formatPercent(strongestRow.dumpPct ?? strongestRow.dump_pct) : '--'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Range %</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow ? formatPercent(strongestRow.rangePct ?? strongestRow.range_pct) : '--'}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-400">
                    {strongestRow?.explanation ?? strongestRow?.summary ?? strongestRow?.setup ?? 'El scanner destacara aqui el mejor setup disponible segun score y narrativa.'}
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
                    <div className="grid gap-2">
                      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Modules</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {moduleOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setModuleFilter(option.value)}
                            className={`rounded-2xl border px-4 py-3 text-sm text-left transition ${
                              moduleFilter === option.value
                                ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-100'
                                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
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
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                          {row.status_label}
                        </span>
                        <span className="text-sm text-slate-400">{row.exchange.toUpperCase()} · {row.narrative_label ?? row.narrative}</span>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>{row.estado}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Score</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{row.score}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Dump</p>
                      <p className="mt-2 text-sm text-slate-200">{formatPercent(row.dump_pct)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Range</p>
                      <p className="mt-2 text-sm text-slate-200">{formatPercent(row.range_pct)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">ATR Ratio</p>
                      <p className="mt-2 text-sm text-slate-200">{typeof row.atr_ratio === 'number' ? row.atr_ratio.toFixed(4) : '--'}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-400">{row.setup}</p>
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
                      <th className="px-5 py-4 font-medium">Market</th>
                      <th className="px-5 py-4 font-medium">Score</th>
                      <th className="px-5 py-4 font-medium">Dump</th>
                      <th className="px-5 py-4 font-medium">Range</th>
                      <th className="px-5 py-4 font-medium">ATR Ratio</th>
                      <th className="px-5 py-4 font-medium">Volume Pattern</th>
                      <th className="px-5 py-4 font-medium">Status</th>
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
                        <td className="px-5 py-4 text-sm text-slate-200">
                          <div className="flex flex-col gap-1">
                            <span>{row.instrumentType}</span>
                            <span className="text-xs text-slate-500">{formatPrice(row.price)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-lg text-white">{row.score}</td>
                        <td className="px-5 py-4 text-sm text-slate-200">{formatPercent(row.dumpPct)}</td>
                        <td className="px-5 py-4 text-sm text-slate-200">{formatPercent(row.rangePct)}</td>
                        <td className="px-5 py-4 text-sm text-slate-200">{typeof row.atrRatio === 'number' ? row.atrRatio.toFixed(4) : '--'}</td>
                        <td className="px-5 py-4 text-sm text-slate-200">{row.volumePattern}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>{row.estado}</span>
                            <span className="text-xs text-slate-500">{row.statusLabel}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-5 py-8 text-center text-sm text-slate-400">
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
            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Watchlist Module</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Pre-Pump Candidates</h2>
              </div>
              <div className="mt-5 space-y-3">
                {watchlistRows.slice(0, 4).map((row, index) => (
                  <div key={`${row.market_type}-${row.exchange}-${row.symbol}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {row.exchange} · {row.market_type}
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        Score {row.score}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{row.setup}</p>
                  </div>
                ))}
                {watchlistRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    No hay activos en pre-pump watchlist ahora mismo.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <AmaiaCopilotPanel />

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
