import { useMemo } from 'react';

import { useMarket } from './context/MarketContext';

const stateStyles = {
  HIGH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  WATCHLIST: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  IGNORE: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const exchangeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'binance', label: 'Binance' },
  { value: 'mexc', label: 'MEXC' },
];

const marketTypeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'spot', label: 'Spot' },
  { value: 'futures', label: 'Futures' },
];

const narrativeOptions = [
  { value: 'All Market', label: 'All Market' },
  { value: 'Smart Money', label: 'Smart Money' },
  { value: 'Core Narratives', label: 'Core Narratives' },
  { value: 'Microcaps (MEXC)', label: 'Microcaps (MEXC)' },
];

function formatPrice(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  if (value >= 1000) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }

  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

function formatVolume(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toFixed(2);
}

function formatPercent(value) {
  if (typeof value !== 'number') {
    return '--';
  }

  return `${value.toFixed(2)}%`;
}

function getStateClass(state) {
  return stateStyles[state] ?? stateStyles.IGNORE;
}

function getHitRateClass(rate) {
  if (typeof rate !== 'number') {
    return 'border-white/10 bg-white/[0.04] text-slate-300';
  }
  if (rate >= 70) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }
  if (rate >= 40) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  }
  return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
}

function App() {
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

  async function handleManualRefresh() {
    await refreshMarketData();
  }

  const socketBadge = useMemo(() => {
    if (socketStatus === 'live') {
      return {
        label: 'WS live',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
      };
    }
    if (socketStatus === 'reconnecting') {
      return {
        label: 'WS reconnecting',
        className: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
      };
    }
    if (socketStatus === 'error') {
      return {
        label: 'WS error',
        className: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
      };
    }
    return {
      label: 'WS connecting',
      className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    };
  }, [socketStatus]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,_#050816_0%,_#020617_44%,_#040814_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-white/8 bg-slate-950/75 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Amaia AI Pump Hunter
                </span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Real-time Pump Compression Dashboard
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
                    Monitoriza setups de compresion, score de ruptura y condiciones de volumen en una interfaz estilo trading.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="inline-flex items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
              >
                {refreshing ? 'Actualizando...' : 'Refrescar'}
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Backend</p>
                <p className="mt-3 text-lg font-semibold text-emerald-300">{backendStatus}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">High Conviction</p>
                <p className="mt-3 text-3xl font-semibold text-white">{summary.highCount}</p>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Watchlist</p>
                <p className="mt-3 text-3xl font-semibold text-white">{summary.watchlistCount}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Alertas</p>
                <p className="mt-1 text-sm text-slate-300">Popup cuando score sea mayor o igual a 7</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                <span>Sonido</span>
                <button
                  type="button"
                  aria-pressed={soundEnabled}
                  onClick={() => setSoundEnabled((previous) => !previous)}
                  className={`relative h-7 w-14 rounded-full border transition ${
                    soundEnabled
                      ? 'border-emerald-400/40 bg-emerald-400/20'
                      : 'border-white/10 bg-slate-900/80'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      soundEnabled ? 'left-8' : 'left-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/8 bg-slate-950/75 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Top 10 Panel</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Radar rapido</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${socketBadge.className}`}>
                {socketBadge.label}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {topPanelRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
                  No hay oportunidades para los filtros actuales.
                </div>
              ) : (
                topPanelRows.map((row) => (
                  <div
                    key={`${row.exchange}-${row.symbol}`}
                    className="rounded-2xl border border-white/6 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{row.exchange}</p>
                        <p className="mt-2 text-xs text-slate-400">{row.narrative}</p>
                        {row.narrativeLabel !== row.narrative ? (
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                            {row.narrativeLabel}
                          </p>
                        ) : null}
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>
                        {row.estado}
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Score</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{row.score}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Signal</p>
                        <p className="mt-1 text-sm font-medium text-cyan-300">{row.opportunity_score.toFixed(0)} / 100</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </header>

        <section className="rounded-3xl border border-white/8 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Filters</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Trading Screener</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[820px]">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Exchange</span>
                <select
                  value={exchangeFilter}
                  onChange={(event) => setExchangeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                >
                  {exchangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Spot / Futures</span>
                <select
                  value={marketTypeFilter}
                  onChange={(event) => setMarketTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                >
                  {marketTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Narrativa</span>
                <select
                  value={narrativeFilter}
                  onChange={(event) => setNarrativeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                >
                  {narrativeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Score minimo</span>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span className="text-cyan-300">{scoreFilter}</span>
                    <span>9</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="9"
                    step="1"
                    value={scoreFilter}
                    onChange={(event) => setScoreFilter(Number(event.target.value))}
                    className="mt-3 w-full accent-cyan-400"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              HIGH
            </span>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-300">
              WATCHLIST
            </span>
            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-300">
              IGNORE
            </span>
            <span className="ml-auto text-xs uppercase tracking-[0.24em] text-slate-500">
              {lastUpdated ? `Ultima actualizacion ${lastUpdated.toLocaleTimeString()}` : 'Esperando datos'}
            </span>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {marketTypeFilter === 'futures' ? (
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              El backend actualmente solo expone datos de mercado spot. El filtro `Futures` queda preparado para una futura integracion.
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              Fuente actual: datos spot en tiempo real desde backend REST + WebSocket.
            </div>
          )}

          {scoreChanges.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cambios de score</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {scoreChanges.map((change) => (
                  <span
                    key={`${change.symbol}-${change.current_score}-${change.current_estado}`}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
                  >
                    {change.symbol}: {change.previous_score} → {change.current_score} ({change.current_estado})
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cache Monitor</p>
                <p className="mt-1 text-sm text-slate-400">Observabilidad e invalidacion manual</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getHitRateClass(cacheStats?.scan_cache_hit_rate)}`}>
                  Scan {cacheStats?.scan_cache_hit_rate ?? '--'}%
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getHitRateClass(cacheStats?.overview_cache_hit_rate)}`}>
                  Overview {cacheStats?.overview_cache_hit_rate ?? '--'}%
                </span>
                <button
                  type="button"
                  onClick={invalidateMarketCache}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/15"
                >
                  Flush Cache
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scan Cache</p>
                <p className="mt-2 text-2xl font-semibold text-white">{cacheStats?.scan_cache_entries ?? '--'}</p>
                <p className="mt-1 text-xs text-slate-400">
                  hits {cacheStats?.scan_cache_hits ?? '--'} · misses {cacheStats?.scan_cache_misses ?? '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Overview Cache</p>
                <p className="mt-2 text-2xl font-semibold text-white">{cacheStats?.overview_cache_entries ?? '--'}</p>
                <p className="mt-1 text-xs text-slate-400">
                  hits {cacheStats?.overview_cache_hits ?? '--'} · misses {cacheStats?.overview_cache_misses ?? '--'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Redis</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {cacheStats?.redis_enabled ? 'Ready' : 'Placeholder'}
                </p>
                <p className="mt-1 text-xs text-slate-400">Preparado para cache distribuida futura</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Log de alertas</p>
                <p className="mt-1 text-sm text-slate-400">Historial local de oportunidades HIGH detectadas</p>
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                {alertLog.length} eventos
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {alertLog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-500">
                  Aun no se han disparado alertas.
                </div>
              ) : (
                alertLog.slice(0, 6).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.symbol}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {alert.narrative}
                        {alert.narrativeLabel !== alert.narrative ? ` · ${alert.narrativeLabel}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-300">Score {alert.score}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {new Date(alert.createdAt).toLocaleTimeString()} · {alert.source}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-white/8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/8">
                <thead className="bg-white/[0.03]">
                  <tr className="text-left text-xs uppercase tracking-[0.24em] text-slate-500">
                    <th className="px-4 py-4 font-medium">Par</th>
                    <th className="px-4 py-4 font-medium">Precio</th>
                    <th className="px-4 py-4 font-medium">Score</th>
                    <th className="px-4 py-4 font-medium">Estado</th>
                    <th className="px-4 py-4 font-medium">Volumen</th>
                    <th className="px-4 py-4 font-medium">Volatilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6 bg-slate-950/60">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                        Cargando dashboard...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                        No hay pares para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="transition hover:bg-white/[0.025]">
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{row.symbol}</span>
                            <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                              {row.exchange} · {row.marketType}
                            </span>
                            <span className="mt-1 text-xs text-slate-400">
                              {row.narrative}
                              {row.narrativeLabel !== row.narrative ? ` · ${row.narrativeLabel}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-200">{formatPrice(row.price)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-white">{row.score}</span>
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-white/8">
                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{ width: `${(row.score / 9) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-200">{formatVolume(row.volume)}</td>
                        <td className="px-4 py-4 text-sm text-slate-200">{formatPercent(row.volatility)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {activeAlert ? (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-950/95 p-4 shadow-[0_24px_80px_rgba(16,185,129,0.18)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">High Score Alert</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{activeAlert.symbol}</h3>
                <p className="mt-2 text-sm text-slate-300">
                  {activeAlert.narrative}
                  {activeAlert.narrativeLabel !== activeAlert.narrative ? ` · ${activeAlert.narrativeLabel}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Score {activeAlert.score} detectado en {activeAlert.exchange}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissActiveAlert}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.08]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
