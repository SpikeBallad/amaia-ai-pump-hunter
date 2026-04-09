'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

function normalizePosition(position) {
  const baseEntryPrice = typeof position?.entryPrice === 'number' ? position.entryPrice : 0;
  const dcaEntries =
    Array.isArray(position?.dcaEntries) && position.dcaEntries.length
      ? position.dcaEntries.map((entry, index) => ({
          label: entry.label ?? `E${index + 1}`,
          price: typeof entry.price === 'number' ? entry.price : baseEntryPrice,
          allocation: typeof entry.allocation === 'number' ? entry.allocation : index === 0 ? 1 : 0,
          filled: typeof entry.filled === 'boolean' ? entry.filled : index === 0,
          filledAt: entry.filledAt ?? null,
        }))
      : [
          {
            label: 'E1',
            price: baseEntryPrice,
            allocation: 1,
            filled: true,
            filledAt: position?.openedAt ?? null,
          },
        ];

  return {
    ...position,
    plannedAverageEntry: typeof position?.plannedAverageEntry === 'number' ? position.plannedAverageEntry : baseEntryPrice,
    strategyLabel: position?.strategyLabel ?? 'Single entry + structural stop + 2.6R target',
    targetRMultiple: typeof position?.targetRMultiple === 'number' ? position.targetRMultiple : 2.6,
    dcaEntries,
    deployedNotionalUsd:
      typeof position?.deployedNotionalUsd === 'number'
        ? position.deployedNotionalUsd
        : typeof position?.notionalUsd === 'number'
          ? position.notionalUsd
          : 0,
    exitReason: position?.exitReason ?? null,
  };
}

function normalizeAccountState(account, fallbackCapital, extras = {}) {
  return {
    capital: typeof account?.capital === 'number' ? account.capital : fallbackCapital,
    availableCapital: typeof account?.availableCapital === 'number' ? account.availableCapital : fallbackCapital,
    autoTrade: typeof account?.autoTrade === 'boolean' ? account.autoTrade : true,
    openPositions: Array.isArray(account?.openPositions) ? account.openPositions.map(normalizePosition) : [],
    history: Array.isArray(account?.history) ? account.history.map(normalizePosition) : [],
    ...extras,
  };
}

function normalizeEngineState(state) {
  if (!state || typeof state !== 'object') {
    return createInitialEngineState();
  }

  return {
    processedAlertIds: Array.isArray(state.processedAlertIds) ? state.processedAlertIds : [],
    spot: normalizeAccountState(state.spot, SPOT_START_CAPITAL),
    futures: normalizeAccountState(state.futures, FUTURES_START_CAPITAL, {
      leverage: typeof state?.futures?.leverage === 'number' ? state.futures.leverage : FUTURES_LEVERAGE,
      marginMode: state?.futures?.marginMode ?? 'Cross',
    }),
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
  const dcaStep1Pct = Math.min(Math.max(rangePct * 0.12, 1.2), 3.8);
  const dcaStep2Pct = Math.min(Math.max(rangePct * 0.24, 2.4), 7.2);
  const entries = [
    { label: 'E1', price: row.price, allocation: 0.5 },
    { label: 'E2', price: row.price * (1 - dcaStep1Pct / 100), allocation: 0.3 },
    { label: 'E3', price: row.price * (1 - dcaStep2Pct / 100), allocation: 0.2 },
  ];
  const averageEntry = entries.reduce((sum, entry) => sum + entry.price * entry.allocation, 0);
  const riskPerUnit = Math.max(averageEntry - stopPrice, averageEntry * 0.005);
  const targetPrice = averageEntry + riskPerUnit * 2.6;

  return {
    entryPrice: averageEntry,
    stopPrice,
    targetPrice,
    riskPct: ((averageEntry - stopPrice) / averageEntry) * 100,
    entries,
    strategyLabel: '3-step DCA + structural stop + 2.6R target',
  };
}

function openPositionInState(current, row, triggerId, options = {}) {
  if (!row || !triggerId) return current;
  if (current.processedAlertIds.includes(triggerId)) return current;

  const template = buildTradeTemplate(row);
  if (!template) return current;

  const force = options.force ?? false;
  const next = {
    ...current,
    processedAlertIds: [triggerId, ...current.processedAlertIds].slice(0, 160),
  };

  const bucket = getMarketBucket(row);
  const accountKey = bucket === 'futures' ? 'futures' : 'spot';
  const account = next[accountKey];

  if (!force && !account.autoTrade) return next;
  if (
    account.openPositions.some(
      (position) =>
        position.symbol === row.symbol &&
        position.exchange === row.exchange &&
        position.marketBucket === bucket
    )
  ) {
    return next;
  }

  const marginUsd =
    account.availableCapital *
    (accountKey === 'futures' ? FUTURES_MARGIN_FRACTION : SPOT_RISK_FRACTION);
  if (marginUsd <= 0) return next;

  const notionalUsd = accountKey === 'futures' ? marginUsd * account.leverage : marginUsd;
  const initialEntry = template.entries[0];
  const initialNotionalUsd = notionalUsd * initialEntry.allocation;
  const quantity = initialNotionalUsd / initialEntry.price;

  const position = {
    id: `${accountKey}-${row.exchange}-${row.symbol}-${Date.now()}`,
    symbol: row.symbol,
    exchange: row.exchange,
    marketBucket: bucket,
    openedAt: new Date().toISOString(),
    entryPrice: initialEntry.price,
    plannedAverageEntry: template.entryPrice,
    stopPrice: template.stopPrice,
    targetPrice: template.targetPrice,
    quantity,
    marginUsd,
    notionalUsd,
    deployedNotionalUsd: initialNotionalUsd,
    leverage: accountKey === 'futures' ? account.leverage : 1,
    riskPct: template.riskPct,
    score: row.score,
    strategyLabel: template.strategyLabel,
    dcaEntries: template.entries.map((entry, index) => ({
      ...entry,
      filled: index === 0,
      filledAt: index === 0 ? new Date().toISOString() : null,
    })),
    targetRMultiple: 2.6,
  };

  return {
    ...next,
    [accountKey]: {
      ...account,
      availableCapital: Math.max(account.availableCapital - marginUsd, 0),
      openPositions: [position, ...account.openPositions],
    },
  };
}

function computeStats(history) {
  const closedTrades = history.length;
  const wins = history.filter((trade) => trade.pnlUsd > 0).length;
  const losses = history.filter((trade) => trade.pnlUsd <= 0).length;
  const winRate = closedTrades ? (wins / closedTrades) * 100 : 0;
  const totalPnl = history.reduce((sum, trade) => sum + trade.pnlUsd, 0);
  const grossProfit = history.filter((trade) => trade.pnlUsd > 0).reduce((sum, trade) => sum + trade.pnlUsd, 0);
  const grossLoss = Math.abs(history.filter((trade) => trade.pnlUsd < 0).reduce((sum, trade) => sum + trade.pnlUsd, 0));
  const averageWin = wins ? grossProfit / wins : 0;
  const averageLoss = losses ? grossLoss / losses : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const expectancy = closedTrades ? totalPnl / closedTrades : 0;
  const maxDrawdown = history.reduce(
    (state, trade) => {
      const nextEquity = state.equity + (trade.pnlUsd ?? 0);
      const nextPeak = Math.max(state.peak, nextEquity);
      const drawdownPct = nextPeak > 0 ? ((nextPeak - nextEquity) / nextPeak) * 100 : 0;
      return {
        equity: nextEquity,
        peak: nextPeak,
        maxDrawdown: Math.max(state.maxDrawdown, drawdownPct),
      };
    },
    { equity: 0, peak: 0, maxDrawdown: 0 }
  ).maxDrawdown;
  return { closedTrades, wins, losses, winRate, totalPnl, maxDrawdown, averageWin, averageLoss, profitFactor, expectancy };
}

function buildEquitySeries(history) {
  const orderedHistory = [...history].reverse();
  let equity = 0;
  return orderedHistory.map((trade, index) => {
    equity += trade.pnlUsd ?? 0;
    return { x: index, y: equity };
  });
}

function buildEquityPath(series) {
  if (!series.length) return '';
  const min = Math.min(...series.map((point) => point.y));
  const max = Math.max(...series.map((point) => point.y));
  const range = Math.max(max - min, 1);
  return series
    .map((point, index) => {
      const x = series.length === 1 ? 50 : (point.x / Math.max(series.length - 1, 1)) * 100;
      const y = 100 - (((point.y - min) / range) * 100);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Profit Factor</p>
          <p className="mt-2 text-lg font-semibold text-white">{stats.profitFactor ? stats.profitFactor.toFixed(2) : '--'}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Avg Win</p>
          <p className="mt-2 text-lg font-semibold text-emerald-300">{formatPrice(stats.averageWin)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Avg Loss</p>
          <p className="mt-2 text-lg font-semibold text-rose-300">{formatPrice(stats.averageLoss)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Expectancy</p>
          <p className={`mt-2 text-lg font-semibold ${stats.expectancy >= 0 ? 'text-cyan-300' : 'text-rose-300'}`}>{formatPrice(stats.expectancy)}</p>
        </div>
      </div>
    </div>
  );
}

function PositionStrategyCard({ position, livePrice, livePnl }) {
  const filledEntries = position.dcaEntries?.filter((entry) => entry.filled) ?? [];
  const pendingEntries = position.dcaEntries?.filter((entry) => !entry.filled) ?? [];

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Strategy</p>
        <p className="mt-2 text-sm font-medium text-white">{position.strategyLabel}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Avg Entry</p>
            <p className="mt-2 text-white">{formatPrice(position.entryPrice)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Stop Loss</p>
            <p className="mt-2 text-white">{formatPrice(position.stopPrice)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</p>
            <p className="mt-2 text-white">{formatPrice(position.targetPrice)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">DCA Ladder</p>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            {filledEntries.length}/{position.dcaEntries?.length ?? 0} filled
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(position.dcaEntries ?? []).map((entry) => (
            <div key={entry.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{entry.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${entry.filled ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>
                  {entry.filled ? 'Filled' : 'Pending'}
                </span>
              </div>
              <p className="mt-2 text-white">{formatPrice(entry.price)}</p>
              <p className="mt-1 text-xs text-slate-500">{Math.round(entry.allocation * 100)}% size</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Live Price</p>
            <p className="mt-2 text-white">{formatPrice(livePrice)}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Live PnL</p>
            <p className={`mt-2 font-semibold ${typeof livePnl === 'number' && livePnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatPrice(livePnl)}</p>
          </div>
        </div>
        {pendingEntries.length === 0 ? (
          <p className="mt-3 text-xs text-emerald-300">Todas las entradas DCA ya fueron ejecutadas.</p>
        ) : (
          <p className="mt-3 text-xs text-slate-400">Las patas pendientes se activan cuando el precio toca esos niveles reales del mercado.</p>
        )}
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
  const [botNotice, setBotNotice] = useState('');
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEngineState(normalizeEngineState(JSON.parse(raw)));
      } else {
        setEngineState(createInitialEngineState());
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

  const eligibleRows = useMemo(() => {
    return rows
      .filter((row) => {
        const exchangeMatches = exchangeFilter === 'all' || row.exchange === exchangeFilter;
        const marketMatches = marketFilter === 'all' || getMarketBucket(row) === marketFilter;
        const scoreMatches = row.score >= minScoreFilter;
        const highConviction = row.estado === 'HIGH';
        const hasPrice = typeof row.price === 'number' && row.price > 0;
        return exchangeMatches && marketMatches && scoreMatches && highConviction && hasPrice;
      })
      .sort((a, b) => b.score - a.score);
  }, [rows, exchangeFilter, marketFilter, minScoreFilter]);

  const botHealth = useMemo(() => {
    const totalOpen = engineState.spot.openPositions.length + engineState.futures.openPositions.length;
    const totalClosed = engineState.spot.history.length + engineState.futures.history.length;
    return {
      totalOpen,
      totalClosed,
      feedRows: rows.length,
      eligibleRows: eligibleRows.length,
      recentAlerts: alertLog.length,
      processedIds: engineState.processedAlertIds.length,
    };
  }, [
    engineState.spot.openPositions.length,
    engineState.futures.openPositions.length,
    engineState.spot.history.length,
    engineState.futures.history.length,
    rows.length,
    eligibleRows.length,
    alertLog.length,
    engineState.processedAlertIds.length,
  ]);

  const noDataReason = useMemo(() => {
    if (!rows.length) {
      return 'Cat Bot no recibe filas de mercado todavia. Revisa si el scanner principal esta cargando datos.';
    }
    if (!eligibleRows.length) {
      return 'Hay datos de mercado, pero no hay setups HIGH que cumplan tus filtros actuales.';
    }
    if (!alertLog.length) {
      return 'No han entrado alertas HIGH nuevas en esta sesion. Puedes lanzar un trade demo manual para validar el motor.';
    }
    return '';
  }, [rows.length, eligibleRows.length, alertLog.length]);

  const runManualTestTrade = useCallback(() => {
    const candidate = eligibleRows[0];
    if (!candidate) {
      setBotNotice('No hay setups elegibles para abrir un trade demo manual.');
      return;
    }

    const bucket = getMarketBucket(candidate);
    const accountKey = bucket === 'futures' ? 'futures' : 'spot';
    const account = engineState[accountKey];
    const duplicate = account.openPositions.some(
      (position) =>
        position.symbol === candidate.symbol &&
        position.exchange === candidate.exchange &&
        position.marketBucket === bucket
    );
    if (duplicate) {
      setBotNotice(`Ya existe una posicion abierta para ${candidate.symbol} en ${candidate.exchange.toUpperCase()}.`);
      return;
    }
    if (account.availableCapital <= 0) {
      setBotNotice(`Sin capital disponible en ${accountKey.toUpperCase()} para abrir un trade demo.`);
      return;
    }

    const triggerId = `manual-${candidate.id}-${Date.now()}`;
    setEngineState((current) => openPositionInState(current, candidate, triggerId, { force: true }));
    setBotNotice(
      `Trade demo manual abierto en ${candidate.symbol} (${candidate.exchange.toUpperCase()} ${bucket.toUpperCase()}).`
    );
  }, [eligibleRows, engineState]);

  useEffect(() => {
    if (!botNotice) return undefined;
    const timeout = window.setTimeout(() => setBotNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [botNotice]);

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
    setEngineState((current) => openPositionInState(current, matchingRow, latestAlert.id));
  }, [alertLog, engineState.processedAlertIds, exchangeFilter, marketFilter, minScoreFilter, rows]);

  useEffect(() => {
    if (!hydratedRef.current || !eligibleRows.length || alertLog.length) return;

    const totalOpen = engineState.spot.openPositions.length + engineState.futures.openPositions.length;
    const totalClosed = engineState.spot.history.length + engineState.futures.history.length;
    if (totalOpen > 0 || totalClosed > 0) return;

    const seedRow = eligibleRows[0];
    const seedId = `bootstrap-${seedRow.id}`;
    if (engineState.processedAlertIds.includes(seedId)) return;

    setEngineState((current) => openPositionInState(current, seedRow, seedId));
    setBotNotice(
      `Se abrio una posicion demo inicial con ${seedRow.symbol} para validar datos y flujo del Cat Bot.`
    );
  }, [
    eligibleRows,
    alertLog.length,
    engineState.spot.openPositions.length,
    engineState.futures.openPositions.length,
    engineState.spot.history.length,
    engineState.futures.history.length,
    engineState.processedAlertIds,
  ]);

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

          const nextEntries = (position.dcaEntries ?? []).map((entry) => ({ ...entry }));
          let nextQuantity = position.quantity;
          let nextEntryPrice = position.entryPrice;
          let nextDeployedNotionalUsd = position.deployedNotionalUsd;
          let dcaFilledThisTick = false;

          nextEntries.forEach((entry) => {
            if (entry.filled || row.price > entry.price) return;
            const legNotionalUsd = position.notionalUsd * entry.allocation;
            const legQuantity = legNotionalUsd / entry.price;
            const blendedQuantity = nextQuantity + legQuantity;
            nextEntryPrice = ((nextEntryPrice * nextQuantity) + (entry.price * legQuantity)) / blendedQuantity;
            nextQuantity = blendedQuantity;
            nextDeployedNotionalUsd += legNotionalUsd;
            entry.filled = true;
            entry.filledAt = new Date().toISOString();
            dcaFilledThisTick = true;
          });

          const riskPerUnit = Math.max(nextEntryPrice - position.stopPrice, nextEntryPrice * 0.005);
          const refreshedTargetPrice = nextEntryPrice + riskPerUnit * position.targetRMultiple;

          const stopHit = row.price <= position.stopPrice;
          const targetHit = row.price >= refreshedTargetPrice;

          if (!stopHit && !targetHit) {
            nextOpenPositions.push(
              dcaFilledThisTick
                ? {
                    ...position,
                    quantity: nextQuantity,
                    entryPrice: nextEntryPrice,
                    deployedNotionalUsd: nextDeployedNotionalUsd,
                    targetPrice: refreshedTargetPrice,
                    dcaEntries: nextEntries,
                  }
                : position
            );
            return;
          }

          changed = true;
          const exitPrice = targetHit ? refreshedTargetPrice : position.stopPrice;
          const pnlUsd = (exitPrice - nextEntryPrice) * nextQuantity;
          closedPositions.push({
            ...position,
            closedAt: new Date().toISOString(),
            exitPrice,
            pnlUsd,
            quantity: nextQuantity,
            entryPrice: nextEntryPrice,
            deployedNotionalUsd: nextDeployedNotionalUsd,
            targetPrice: refreshedTargetPrice,
            dcaEntries: nextEntries,
            result: pnlUsd > 0 ? 'WIN' : 'LOSS',
            exitReason: targetHit ? 'TARGET_HIT' : 'STOP_HIT',
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
  const spotEquitySeries = useMemo(() => buildEquitySeries(engineState.spot.history), [engineState.spot.history]);
  const futuresEquitySeries = useMemo(() => buildEquitySeries(engineState.futures.history), [engineState.futures.history]);
  const spotEquityPath = useMemo(() => buildEquityPath(spotEquitySeries), [spotEquitySeries]);
  const futuresEquityPath = useMemo(() => buildEquityPath(futuresEquitySeries), [futuresEquitySeries]);
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Engine Health</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Feed Rows</p>
                      <p className="mt-2 text-lg font-semibold text-white">{botHealth.feedRows}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Eligible HIGH</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-300">{botHealth.eligibleRows}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Alerts Seen</p>
                      <p className="mt-2 text-lg font-semibold text-cyan-300">{botHealth.recentAlerts}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Closed Trades</p>
                      <p className="mt-2 text-lg font-semibold text-white">{botHealth.totalClosed}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-amber-400/20 bg-amber-400/[0.08] p-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-amber-100/80">Operational Note</p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">
                    {noDataReason || 'Cat Bot operativo. Hay datos elegibles y el motor de ejecucion demo esta activo.'}
                  </p>
                  {botNotice ? (
                    <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                      {botNotice}
                    </p>
                  ) : null}
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
                <button
                  type="button"
                  onClick={runManualTestTrade}
                  className="rounded-2xl border border-amber-400/25 bg-amber-400/12 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/18"
                >
                  Launch one demo trade
                </button>
              </div>
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-slate-300">
                <p>Spot capital: {formatPrice(engineState.spot.capital)}</p>
                <p>Futures capital: {formatPrice(engineState.futures.capital)} · Cross Margin x{engineState.futures.leverage}</p>
                <p>Eligible setups now: {eligibleRows.length}</p>
                <p>Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleString('es-ES') : '--'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <AccountSummaryCard eyebrow="Spot Demo" title="Paper Spot Account" bucket="spot" account={engineState.spot} stats={spotStats} />
          <AccountSummaryCard eyebrow="Futures Demo" title="Paper Futures Account" bucket="futures" account={engineState.futures} stats={futuresStats} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="glass-panel rounded-[34px] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Equity Curve</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Spot performance path</h2>
              </div>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                Max DD {formatPercent(spotStats.maxDrawdown)}
              </span>
            </div>
            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              {spotEquityPath ? (
                <svg viewBox="0 0 100 100" className="h-44 w-full">
                  <defs>
                    <linearGradient id="spotEquityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#67e8f9" />
                    </linearGradient>
                  </defs>
                  <path d={spotEquityPath} fill="none" stroke="url(#spotEquityGradient)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-slate-400">Aún no hay trades cerrados para trazar la curva.</div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[34px] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Equity Curve</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Futures performance path</h2>
              </div>
              <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold text-fuchsia-200">
                Max DD {formatPercent(futuresStats.maxDrawdown)}
              </span>
            </div>
            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              {futuresEquityPath ? (
                <svg viewBox="0 0 100 100" className="h-44 w-full">
                  <defs>
                    <linearGradient id="futuresEquityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d946ef" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <path d={futuresEquityPath} fill="none" stroke="url(#futuresEquityGradient)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-slate-400">Aún no hay trades cerrados para trazar la curva.</div>
              )}
            </div>
          </div>
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
                          <div>
                            <p className="font-semibold text-white">{position.symbol}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                              {position.exchange.toUpperCase()} · {position.marketBucket.toUpperCase()} · x{position.leverage}
                            </p>
                          </div>
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                            OPEN
                          </span>
                        </div>
                        <PositionStrategyCard position={position} livePrice={livePrice} livePnl={livePnl} />
                      </>
                    );
                  })()}
                </div>
              ))}
              {engineState.spot.openPositions.length + engineState.futures.openPositions.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                  El bot aun no ha abierto posiciones. {noDataReason}
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
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {trade.exitReason === 'TARGET_HIT' ? 'Closed by target' : trade.exitReason === 'STOP_HIT' ? 'Closed by stop' : 'Closed'}
                    {' · '}
                    {(trade.dcaEntries?.filter((entry) => entry.filled).length ?? 1)}/{trade.dcaEntries?.length ?? 1} DCA legs filled
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
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {trade.exitReason === 'TARGET_HIT' ? 'Closed by target' : trade.exitReason === 'STOP_HIT' ? 'Closed by stop' : 'Closed'}
                    {' · '}
                    {(trade.dcaEntries?.filter((entry) => entry.filled).length ?? 1)}/{trade.dcaEntries?.length ?? 1} DCA legs filled
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
