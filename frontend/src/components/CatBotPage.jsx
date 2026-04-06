'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import BrandMark from '@/src/components/BrandMark';
import { useMarket } from '@/src/context/MarketContext';

const STORAGE_KEY = 'amaia-cat-bot-paper-engine';
const INSIGHTS_KEY = 'amaia-cat-bot-insights';
const SPOT_START_CAPITAL = 10_000;
const FUTURES_START_CAPITAL = 10_000;
const FUTURES_LEVERAGE = 3;
const SPOT_RISK_FRACTION = 0.12;
const FUTURES_MARGIN_FRACTION = 0.12;

function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  if (value >= 1000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })}`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `${value.toFixed(2)}%`;
}

function getMarketBucket(row) {
  return row.marketBucket ?? (row.marketType?.endsWith?.('FUTURES') ? 'futures' : 'spot');
}

function createInitialEngineState() {
  return {
    processedAlertIds: [],
    spot: {
      capital: SPOT_START_CAPITAL,
      availableCapital: SPOT_START_CAPITAL,
      autoTrade: true,
      openPositions: [],
      history: [],
    },
    futures: {
      capital: FUTURES_START_CAPITAL,
      availableCapital: FUTURES_START_CAPITAL,
      autoTrade: true,
      leverage: FUTURES_LEVERAGE,
      marginMode: 'Cross',
      openPositions: [],
      history: [],
    },
  };
}

function buildTradeTemplate(row) {
  if (!row?.price) return null;

  const atrRatio = typeof row.atrRatio === 'number' ? row.atrRatio : 0.01;
  const rangePct = typeof row.rangePct === 'number' ? row.rangePct : 12;
  const candles = row.candles ?? [];
  const accumulationLow = candles.length ? Math.min(...candles.map((candle) => candle.low)) : row.price * 0.92;
  const stopBufferPct = Math.max(atrRatio * 100 * 1.1, Math.min(rangePct * 0.35, 8));
  const stopFromRange = row.price * (1 - stopBufferPct / 100);
  const structuralStop = accumulationLow * (1 - Math.max(atrRatio * 0.8, 0.008));
  const stopPrice = Math.min(stopFromRange, structuralStop);
  const riskPerUnit = Math.max(row.price - stopPrice, row.price * 0.005);
  const targetPrice = row.price + riskPerUnit * 2.6;

  return {
    entryPrice: row.price,
    stopPrice,
    targetPrice,
    riskPct: ((row.price - stopPrice) / row.price) * 100,
  };
}

function computeStats(history) {
  const closedTrades = history.length;
  const wins = history.filter((trade) => trade.pnlUsd > 0).length;
  const losses = history.filter((trade) => trade.pnlUsd <= 0).length;
  const winRate = closedTrades ? (wins / closedTrades) * 100 : 0;
  const totalPnl = history.reduce((sum, trade) => sum + trade.pnlUsd, 0);
  return { closedTrades, wins, losses, winRate, totalPnl };
}

function AccountSummaryCard({ eyebrow, title, bucket, account, stats }) {
  const accent = bucket === 'futures' ? 'text-fuchsia-200 border-fuchsia-500/20 bg-fuchsia-500/10' : 'text-cyan-200 border-cyan-500/20 bg-cyan-500/10';

  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${accent}`}>
          {bucket === 'futures' ? `Cross x${account.leverage}` : 'Spot Demo'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Capital</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatPrice(account.capital)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Available</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatPrice(account.availableCapital)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Win Rate</p>
          <p className="mt-2 text-xl font-semibold text-emerald-300">{formatPercent(stats.winRate)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">PnL</p>
          <p className={`mt-2 text-xl font-semibold ${stats.totalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatPrice(stats.totalPnl)}</p>
        </div>
      </div>
    </div>
  );
}

export default function CatBotPage() {
  const { rows, alertLog, summary, lastUpdated } = useMarket();
  const [engineState, setEngineState] = useState(createInitialEngineState);
  const [minScoreFilter, setMinScoreFilter] = useState(7);
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEngineState(JSON.parse(raw));
      }
    } catch {
      setEngineState(createInitialEngineState());
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(engineState));
    } catch {
      // Ignore storage limits.
    }
  }, [engineState]);

  const liveRowsByKey = useMemo(() => {
    return new Map(rows.map((row) => [`${row.exchange}-${row.symbol}-${getMarketBucket(row)}`, row]));
  }, [rows]);

  useEffect(() => {
    if (!hydratedRef.current || !alertLog.length) return;

    const latestAlert = alertLog[0];
    if (!latestAlert || latestAlert.score < minScoreFilter) return;
    if (exchangeFilter !== 'all' && latestAlert.exchange !== exchangeFilter) return;
    if (marketFilter !== 'all' && latestAlert.marketBucket !== marketFilter) return;
    if (engineState.processedAlertIds.includes(latestAlert.id)) return;

    const matchingRow = rows.find(
      (row) =>
        row.symbol === latestAlert.symbol &&
        row.exchange === latestAlert.exchange &&
        getMarketBucket(row) === latestAlert.marketBucket
    );

    if (!matchingRow) return;
    const template = buildTradeTemplate(matchingRow);
    if (!template) return;

    setEngineState((current) => {
      const next = {
        ...current,
        processedAlertIds: [latestAlert.id, ...current.processedAlertIds].slice(0, 120),
      };

      const bucket = getMarketBucket(matchingRow);
      const accountKey = bucket === 'futures' ? 'futures' : 'spot';
      const account = next[accountKey];

      if (!account.autoTrade) return next;
      if (account.openPositions.some((position) => position.symbol === matchingRow.symbol && position.exchange === matchingRow.exchange)) {
        return next;
      }

      const marginUsd = account.availableCapital * (accountKey === 'futures' ? FUTURES_MARGIN_FRACTION : SPOT_RISK_FRACTION);
      if (marginUsd <= 0) return next;

      const notionalUsd = accountKey === 'futures' ? marginUsd * account.leverage : marginUsd;
      const quantity = notionalUsd / matchingRow.price;

      const position = {
        id: `${accountKey}-${matchingRow.exchange}-${matchingRow.symbol}-${Date.now()}`,
        symbol: matchingRow.symbol,
        exchange: matchingRow.exchange,
        marketBucket: bucket,
        openedAt: new Date().toISOString(),
        entryPrice: template.entryPrice,
        stopPrice: template.stopPrice,
        targetPrice: template.targetPrice,
        quantity,
        marginUsd,
        notionalUsd,
        leverage: accountKey === 'futures' ? account.leverage : 1,
        riskPct: template.riskPct,
        score: matchingRow.score,
      };

      return {
        ...next,
        [accountKey]: {
          ...account,
          availableCapital: Math.max(account.availableCapital - marginUsd, 0),
          openPositions: [position, ...account.openPositions],
        },
      };
    });
  }, [alertLog, engineState.processedAlertIds, exchangeFilter, marketFilter, minScoreFilter, rows]);

  useEffect(() => {
    if (!hydratedRef.current || !rows.length) return;

    setEngineState((current) => {
      let changed = false;

      function settleAccount(accountKey) {
        const account = current[accountKey];
        const nextOpenPositions = [];
        const closedPositions = [];

        account.openPositions.forEach((position) => {
          const row = liveRowsByKey.get(`${position.exchange}-${position.symbol}-${position.marketBucket}`);
          if (!row?.price) {
            nextOpenPositions.push(position);
            return;
          }

          const stopHit = row.price <= position.stopPrice;
          const targetHit = row.price >= position.targetPrice;

          if (!stopHit && !targetHit) {
            nextOpenPositions.push(position);
            return;
          }

          changed = true;
          const exitPrice = targetHit ? position.targetPrice : position.stopPrice;
          const pnlUsd = (exitPrice - position.entryPrice) * position.quantity;
          closedPositions.push({
            ...position,
            closedAt: new Date().toISOString(),
            exitPrice,
            pnlUsd,
            result: pnlUsd > 0 ? 'WIN' : 'LOSS',
          });
        });

        if (!changed) return account;

        const releasedCapital = closedPositions.reduce((sum, trade) => sum + trade.marginUsd + trade.pnlUsd, 0);

        return {
          ...account,
          availableCapital: account.availableCapital + releasedCapital,
          openPositions: nextOpenPositions,
          history: [...closedPositions, ...account.history].slice(0, 120),
        };
      }

      const nextSpot = settleAccount('spot');
      const nextFutures = settleAccount('futures');

      if (!changed) return current;
      return {
        ...current,
        spot: nextSpot,
        futures: nextFutures,
      };
    });
  }, [liveRowsByKey, rows.length]);

  const spotStats = useMemo(() => computeStats(engineState.spot.history), [engineState.spot.history]);
  const futuresStats = useMemo(() => computeStats(engineState.futures.history), [engineState.futures.history]);
  const comparisonInsight = useMemo(() => {
    if (spotStats.closedTrades === 0 && futuresStats.closedTrades === 0) {
      return 'Todavía no hay suficientes trades cerrados para comparar el edge entre Spot y Futures.';
    }

    if (spotStats.winRate > futuresStats.winRate) {
      return 'Por ahora Spot tiene mejor win rate que Futures en este estilo de pump hunt.';
    }

    if (futuresStats.winRate > spotStats.winRate) {
      return 'Por ahora Futures tiene mejor win rate que Spot en este estilo de pump hunt.';
    }

    return 'Spot y Futures están empatados por ahora; conviene acumular más muestras.';
  }, [futuresStats.closedTrades, futuresStats.winRate, spotStats.closedTrades, spotStats.winRate]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      window.localStorage.setItem(
        INSIGHTS_KEY,
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          spotStats,
          futuresStats,
          comparisonInsight,
        })
      );
    } catch {
      // Ignore storage limits.
    }
  }, [comparisonInsight, futuresStats, spotStats]);

  function resetEngine() {
    setEngineState(createInitialEngineState());
  }

  function exportHistory() {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      filters: {
        minScoreFilter,
        exchangeFilter,
        marketFilter,
      },
      comparisonInsight,
      spot: engineState.spot.history,
      futures: engineState.futures.history,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'amaia-cat-bot-history.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleAutoTrade(accountKey) {
    setEngineState((current) => ({
      ...current,
      [accountKey]: {
        ...current[accountKey],
        autoTrade: !current[accountKey].autoTrade,
      },
    }));
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <section className="glass-panel overflow-hidden rounded-[40px] p-8 sm:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="flex items-start gap-5">
                <BrandMark size="lg" />
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-fuchsia-200">
                      Cat Bot Pump Hunter
                    </span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                      Separate Validation Window
                    </span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.42em] text-slate-500">Paper Live Win Rate Engine</p>
                    <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                      Measure if Amaia performs better in Spot or Futures for pump hunt structures.
                    </h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
                      Esta ventana no opera dinero real. Ejecuta compras demo automáticas cuando entra una alerta HIGH y deja
                      registro del win rate, PnL y comportamiento por mercado.
                    </p>
                    <div className="mt-5 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                      Powered by real market prices from the live scanner
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Visible Universe</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{summary.visibleCount}</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Spot Open Trades</p>
                  <p className="mt-3 text-2xl font-semibold text-cyan-300">{engineState.spot.openPositions.length}</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Futures Open Trades</p>
                  <p className="mt-3 text-2xl font-semibold text-fuchsia-300">{engineState.futures.openPositions.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Control Room</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Demo execution settings</h2>
              <div className="mt-6 grid gap-4">
                <label className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Min Score</span>
                  <input
                    type="number"
                    min="7"
                    max="10"
                    step="1"
                    value={minScoreFilter}
                    onChange={(event) => setMinScoreFilter(Number(event.target.value))}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  />
                </label>
                <label className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Exchange Filter</span>
                  <select
                    value={exchangeFilter}
                    onChange={(event) => setExchangeFilter(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="all">All Venues</option>
                    <option value="binance">Binance</option>
                    <option value="mexc">MEXC</option>
                  </select>
                </label>
                <label className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Market Filter</span>
                  <select
                    value={marketFilter}
                    onChange={(event) => setMarketFilter(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="all">All Markets</option>
                    <option value="spot">Spot</option>
                    <option value="futures">Futures</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => toggleAutoTrade('spot')}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Spot auto-buy: <span className="font-semibold text-white">{engineState.spot.autoTrade ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleAutoTrade('futures')}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/[0.08]"
                >
                  Futures auto-buy: <span className="font-semibold text-white">{engineState.futures.autoTrade ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetEngine}
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15"
                >
                  Reset demo accounts
                </button>
                <button
                  type="button"
                  onClick={exportHistory}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
                >
                  Export bot history
                </button>
              </div>
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300">
                <p>Spot capital: {formatPrice(engineState.spot.capital)}</p>
                <p>Futures capital: {formatPrice(engineState.futures.capital)} · Cross Margin x{engineState.futures.leverage}</p>
                <p>Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleString('es-ES') : '--'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <AccountSummaryCard eyebrow="Spot Demo" title="Paper Spot Account" bucket="spot" account={engineState.spot} stats={spotStats} />
          <AccountSummaryCard eyebrow="Futures Demo" title="Paper Futures Account" bucket="futures" account={engineState.futures} stats={futuresStats} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Primary Goal</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Spot vs Futures win rate comparison</h2>
            <div className="mt-6 rounded-[28px] border border-cyan-500/15 bg-cyan-500/[0.06] p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Current Insight</p>
              <p className="mt-3 text-lg font-semibold text-white">{comparisonInsight}</p>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Este resumen se guarda para poder alimentar futuras sugerencias de Amaia AI sobre qué setups priorizar o qué
                mercado parece tener mejor edge ahora mismo.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Spot Trades</p>
                <p className="mt-2 text-2xl font-semibold text-white">{spotStats.closedTrades}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Futures Trades</p>
                <p className="mt-2 text-2xl font-semibold text-white">{futuresStats.closedTrades}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Best Right Now</p>
                <p className="mt-2 text-lg font-semibold text-emerald-300">
                  {spotStats.winRate > futuresStats.winRate ? 'Spot' : futuresStats.winRate > spotStats.winRate ? 'Futures' : 'Tie'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Open Positions</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Live paper exposure</h2>
            <div className="mt-6 grid gap-3">
              {[...engineState.spot.openPositions, ...engineState.futures.openPositions].slice(0, 10).map((position) => (
                <div key={position.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  {(() => {
                    const liveRow = liveRowsByKey.get(`${position.exchange}-${position.symbol}-${position.marketBucket}`);
                    const livePrice = liveRow?.price ?? null;
                    const livePnl = typeof livePrice === 'number' ? (livePrice - position.entryPrice) * position.quantity : null;

                    return (
                      <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{position.symbol}</p>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                      OPEN
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-5 text-sm">
                    <div>
                      <p className="text-slate-500">Entry</p>
                      <p className="mt-1 text-white">{formatPrice(position.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Live Price</p>
                      <p className="mt-1 text-white">{formatPrice(livePrice)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Stop</p>
                      <p className="mt-1 text-white">{formatPrice(position.stopPrice)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Target</p>
                      <p className="mt-1 text-white">{formatPrice(position.targetPrice)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Live PnL</p>
                      <p className={`mt-1 ${typeof livePnl === 'number' && livePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {formatPrice(livePnl)}
                      </p>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
              {engineState.spot.openPositions.length + engineState.futures.openPositions.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                  El bot aún no ha abierto posiciones. Espera una alerta HIGH nueva con auto-buy activado.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Spot Record</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Closed spot trades</h2>
            <div className="mt-6 grid gap-3">
              {engineState.spot.history.slice(0, 8).map((trade) => (
                <div key={trade.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{trade.symbol}</p>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${trade.pnlUsd > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                      {trade.result}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Entry {formatPrice(trade.entryPrice)} → Exit {formatPrice(trade.exitPrice)} · PnL {formatPrice(trade.pnlUsd)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Futures Record</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Closed futures trades</h2>
            <div className="mt-6 grid gap-3">
              {engineState.futures.history.slice(0, 8).map((trade) => (
                <div key={trade.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{trade.symbol}</p>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${trade.pnlUsd > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                      {trade.result}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Entry {formatPrice(trade.entryPrice)} → Exit {formatPrice(trade.exitPrice)} · PnL {formatPrice(trade.pnlUsd)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
