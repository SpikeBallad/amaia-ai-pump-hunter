'use client';

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import AmaiaCopilotPanel from '@/src/components/AmaiaCopilotPanel';
import BrandMark from '@/src/components/BrandMark';
import { useMarket } from '@/src/context/MarketContext';
import { fetchScan } from '@/src/lib/api';
import { loadTelegramSettings, saveTelegramSettings, sendTelegramAlert } from '@/src/lib/alerts';

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
  { value: 'watchlist', label: 'Pre-Move Watchlist' },
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

const directionStyles = {
  pump: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  dump: 'border-rose-500/25 bg-rose-500/12 text-rose-200',
};

const chartRangeOptions = ['1D', '1W', '1M'];

function normalizeAssetQuery(rawValue) {
  const cleaned = (rawValue ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\//g, '')
    .replace(/-/g, '');

  if (!cleaned) return '';
  if (cleaned.endsWith('USDT')) return cleaned;
  return `${cleaned}USDT`;
}

function getLookupTimeframe(chartRange) {
  return chartRange === '1D' ? '4H' : '1D';
}

function mapScanResultToRow(scan) {
  return {
    id: `${scan.market_type}-${scan.exchange}-${scan.symbol}`,
    symbol: scan.symbol,
    exchange: scan.exchange,
    marketType: scan.market_type,
    marketBucket: scan.market_type?.endsWith?.('FUTURES') ? 'futures' : 'spot',
    instrumentType: scan.instrument_type,
    narrative: scan.narrative,
    narrativeLabel: scan.narrative_label,
    price: scan.price ?? scan.indicators?.last_close ?? null,
    score: scan.score,
    estado: scan.estado,
    setupDirection: scan.setup_direction ?? 'pump',
    statusLabel: scan.status_label,
    volume: scan.volume ?? scan.indicators?.avg_volume_20 ?? null,
    volatility: scan.indicators?.atr_pct ?? null,
    atrRatio: scan.atr_ratio,
    dumpPct: scan.dump_pct,
    rangePct: scan.range_pct,
    volumePattern: scan.volume_pattern,
    explanation: scan.explanation,
    change24h: scan.change_24h,
    lowCap: scan.low_cap,
    silentMarket: scan.silent_market,
    isBreakingOut: scan.is_breaking_out,
    summary: scan.summary,
    signalLabel: scan.signal_label,
    signalStrength: scan.signal_strength,
    scoreBreakdown: scan.score_breakdown,
    candles: scan.ohlcv?.candles ?? [],
  };
}

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

function getSetupDirection(row) {
  return row?.setupDirection ?? row?.setup_direction ?? 'pump';
}

function getDirectionClass(direction) {
  return directionStyles[direction] ?? directionStyles.pump;
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

function TradeDeskModal({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_24%),rgba(3,6,18,0.82)] px-4 py-8 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,35,0.98),rgba(5,8,22,0.96))] shadow-[0_32px_120px_rgba(2,8,24,0.72)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(16,185,129,0.08),transparent_24%)]" />
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Quantum Workspace</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                ESC to close
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="border-b border-white/6 bg-white/[0.02] px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Desk Terminal</span>
            <span className="rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-cyan-200">Quant View</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Focused Module</span>
          </div>
        </div>
        <div className="max-h-[calc(88vh-148px)] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function buildSparklinePath(candles) {
  if (!candles?.length) return '';
  const values = candles.map((candle) => candle.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.000001);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function calculateEmaSeries(values, period) {
  if (!values.length) return [];
  const multiplier = 2 / (period + 1);
  let ema = values[0];
  return values.map((value, index) => {
    if (index === 0) return value;
    ema = (value - ema) * multiplier + ema;
    return ema;
  });
}

function buildLinePath(values) {
  if (!values?.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.000001);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildCandleGeometry(candles) {
  if (!candles?.length) return { candles: [], min: 0, max: 0 };
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = Math.max(max - min, 0.000001);
  const step = 100 / Math.max(candles.length, 1);
  const bodyWidth = Math.max(step * 0.56, 1.2);

  const chartCandles = candles.map((candle, index) => {
    const x = index * step + step / 2;
    const openY = 100 - ((candle.open - min) / range) * 100;
    const closeY = 100 - ((candle.close - min) / range) * 100;
    const highY = 100 - ((candle.high - min) / range) * 100;
    const lowY = 100 - ((candle.low - min) / range) * 100;
    const isBullish = candle.close >= candle.open;
    return {
      x,
      openY,
      closeY,
      highY,
      lowY,
      bodyY: Math.min(openY, closeY),
      bodyHeight: Math.max(Math.abs(closeY - openY), 1.4),
      bodyWidth,
      isBullish,
    };
  });

  return { candles: chartCandles, min, max };
}

function getTradingViewLink(row) {
  if (!row?.symbol) return 'https://www.tradingview.com/';
  if (row.exchange === 'binance') {
    return `https://www.tradingview.com/chart/?symbol=BINANCE:${row.marketBucket === 'futures' ? `${row.symbol}.P` : row.symbol}`;
  }
  return `https://www.tradingview.com/chart/?symbol=MEXC:${row.symbol}`;
}

function detectSession(dateValue) {
  const hour = dateValue.getHours();
  if (hour >= 1 && hour < 9) return 'Asia Session';
  if (hour >= 9 && hour < 14) return 'London Session';
  if (hour >= 14 && hour < 22) return 'New York Session';
  return 'After Hours';
}

function sliceCandlesForRange(candles, range) {
  if (!candles?.length) return [];
  if (range === '1D') return candles.slice(-6);
  if (range === '1W') return candles.slice(-42);
  return candles.slice(-120);
}

function buildSuggestedEntries(row, range) {
  if (!row?.price) return [];
  const lastPrice = row.price;
  const setupDirection = getSetupDirection(row);
  const rangePct = typeof row.rangePct === 'number' ? row.rangePct : typeof row.range_pct === 'number' ? row.range_pct : 0;
  const atrRatio = typeof row.atrRatio === 'number' ? row.atrRatio : typeof row.atr_ratio === 'number' ? row.atr_ratio : 0.01;
  const priceFloor = Math.max(lastPrice * 0.05, 0.00000001);

  const depthMultiplier = range === '1D' ? 0.45 : range === '1W' ? 0.75 : 1.1;
  const basePullback = Math.max(atrRatio * 100 * depthMultiplier, Math.min(rangePct * 0.2, 6));
  const ladder =
    setupDirection === 'dump'
      ? [
          lastPrice * (1 + (basePullback / 100)),
          lastPrice * (1 + ((basePullback * 1.75) / 100)),
          lastPrice * (1 + ((basePullback * 2.45) / 100)),
        ]
      : [
          Math.max(priceFloor, lastPrice * (1 - (basePullback / 100))),
          Math.max(priceFloor, lastPrice * (1 - ((basePullback * 1.75) / 100))),
          Math.max(priceFloor, lastPrice * (1 - ((basePullback * 2.45) / 100))),
        ];

  return ladder.map((price, index) => ({
    label: `Entry ${index + 1}`,
    price,
    offsetPct: ((Math.abs(lastPrice - price)) / lastPrice) * 100,
  }));
}

function buildTradePlan(row, range, entries) {
  if (!row?.price || !entries?.length) return null;

  const setupDirection = getSetupDirection(row);
  const isShort = setupDirection === 'dump';
  const atrRatio = typeof row.atrRatio === 'number' ? row.atrRatio : typeof row.atr_ratio === 'number' ? row.atr_ratio : 0.01;
  const rangePct = typeof row.rangePct === 'number' ? row.rangePct : typeof row.range_pct === 'number' ? row.range_pct : 12;
  const accumulationHigh = row?.candles?.length ? Math.max(...row.candles.map((candle) => candle.high)) : row.price * 1.1;
  const accumulationLow = row?.candles?.length ? Math.min(...row.candles.map((candle) => candle.low)) : row.price * 0.9;
  const avgEntry = entries.reduce((total, entry) => total + entry.price, 0) / entries.length;
  const stopBufferPct = Math.max(atrRatio * 100 * 1.1, Math.min(rangePct * 0.35, range === '1M' ? 11 : range === '1W' ? 8 : 5));
  const structuralStop = isShort
    ? accumulationHigh * (1 + Math.max(atrRatio * 0.8, 0.008))
    : accumulationLow * (1 - Math.max(atrRatio * 0.8, 0.008));
  const percentStop = isShort
    ? avgEntry * (1 + stopBufferPct / 100)
    : avgEntry * (1 - stopBufferPct / 100);
  const stopPrice = isShort ? Math.max(percentStop, structuralStop) : Math.min(percentStop, structuralStop);
  const riskPerUnit = Math.max(Math.abs(avgEntry - stopPrice), avgEntry * 0.005);
  const rewardMultiplier = range === '1D' ? [1.6, 2.4, 3.2] : range === '1W' ? [2.2, 3.4, 4.8] : [3.2, 4.8, 6.5];
  const takeProfits = rewardMultiplier.map((multiple, index) => ({
    label: `TP${index + 1}`,
    price: isShort ? avgEntry - riskPerUnit * multiple : avgEntry + riskPerUnit * multiple,
    rewardMultiple: multiple,
  }));
  const maxRiskPct = (Math.abs(avgEntry - stopPrice) / avgEntry) * 100;
  const allocationPct = range === '1D' ? 18 : range === '1W' ? 26 : 34;
  const decision =
    row.estado === 'HIGH'
      ? row.isBreakingOut
        ? 'Monitor'
        : 'Entry'
      : row.estado === 'WATCHLIST'
        ? 'Monitor'
        : 'Skip';
  const decisionReason =
    decision === 'Entry'
      ? isShort
        ? 'Distribucion valida y estructura lista para construir posicion short en escalones.'
        : 'Compresion valida y estructura lista para construir posicion long en escalones.'
      : decision === 'Monitor'
        ? 'La estructura es interesante, pero conviene esperar mejor timing o confirmacion.'
        : 'La ventaja estadistica no es suficiente para comprometer capital ahora.';

  return {
    side: isShort ? 'short' : 'long',
    avgEntry,
    stopPrice,
    takeProfits,
    maxRiskPct,
    allocationPct,
    decision,
    decisionReason,
    riskRewardAtTp3: takeProfits[2]
      ? (Math.abs(takeProfits[2].price - avgEntry) / Math.max(Math.abs(avgEntry - stopPrice), 0.000001)).toFixed(2)
      : '--',
  };
}

function buildPositionSizing(tradePlan, capital, riskPercent) {
  if (!tradePlan || typeof capital !== 'number' || typeof riskPercent !== 'number') return null;
  if (capital <= 0 || riskPercent <= 0) return null;
  const riskBudgetUsd = capital * (riskPercent / 100);
  const riskPerUnit = Math.max(Math.abs(tradePlan.avgEntry - tradePlan.stopPrice), 0.000001);
  const quantity = riskBudgetUsd / riskPerUnit;
  const positionSizeUsd = quantity * tradePlan.avgEntry;
  return {
    capital,
    riskPercent,
    riskBudgetUsd,
    quantity,
    positionSizeUsd,
  };
}

function isMacroBottomBuy(row) {
  if (!row) return false;
  if (getSetupDirection(row) !== 'pump') return false;
  const dumpPct = typeof row.dumpPct === 'number' ? row.dumpPct : typeof row.dump_pct === 'number' ? row.dump_pct : 0;
  const rangePct = typeof row.rangePct === 'number' ? row.rangePct : typeof row.range_pct === 'number' ? row.range_pct : 100;
  const atrRatio = typeof row.atrRatio === 'number' ? row.atrRatio : typeof row.atr_ratio === 'number' ? row.atr_ratio : 1;
  return row.estado === 'HIGH' && dumpPct >= 82 && rangePct <= 10 && atrRatio <= 0.018;
}

function isMacroTopSell(row) {
  if (!row) return false;
  if (getSetupDirection(row) !== 'dump') return false;
  const rangePct = typeof row.rangePct === 'number' ? row.rangePct : typeof row.range_pct === 'number' ? row.range_pct : 100;
  const atrRatio = typeof row.atrRatio === 'number' ? row.atrRatio : typeof row.atr_ratio === 'number' ? row.atr_ratio : 1;
  const change24h = typeof row.change24h === 'number' ? row.change24h : typeof row.change_24h === 'number' ? row.change_24h : 0;
  return row.estado === 'HIGH' && change24h >= 8 && rangePct <= 12 && atrRatio >= 0.014;
}

function buildTradePlanText(row, tradePlan, positionSizing, suggestedEntries, chartRange) {
  if (!row || !tradePlan) return '';
  const setupDirection = getSetupDirection(row);
  const sideLabel = setupDirection === 'dump' ? 'SELL / SHORT' : 'BUY / LONG';

  return [
    `AMAIA AI PUMP HUNTER PRO · ${row.symbol}`,
    `Range: ${chartRange}`,
    `Exchange: ${row.exchange?.toUpperCase() ?? '--'}`,
    `Market: ${row.marketType ?? '--'}`,
    `Direction: ${sideLabel}`,
    `Decision: ${tradePlan.decision}`,
    `Avg Entry: ${formatPrice(tradePlan.avgEntry)}`,
    `Stop Loss: ${formatPrice(tradePlan.stopPrice)}`,
    `TP1: ${formatPrice(tradePlan.takeProfits[0]?.price)}`,
    `TP2: ${formatPrice(tradePlan.takeProfits[1]?.price)}`,
    `TP3: ${formatPrice(tradePlan.takeProfits[2]?.price)}`,
    ...suggestedEntries.map((entry) => `${entry.label}: ${formatPrice(entry.price)}`),
    positionSizing ? `Risk Budget: ${formatPrice(positionSizing.riskBudgetUsd)}` : null,
    positionSizing ? `Position Size: ${formatPrice(positionSizing.positionSizeUsd)}` : null,
    positionSizing ? `Quantity: ${positionSizing.quantity.toFixed(4)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function DashboardPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [locale, setLocale] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState('basic');
  const [showCompactRadar, setShowCompactRadar] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [activeTradeModal, setActiveTradeModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [chartRange, setChartRange] = useState('1W');
  const [assetLookupRow, setAssetLookupRow] = useState(null);
  const [assetLookupLoading, setAssetLookupLoading] = useState(false);
  const [assetLookupError, setAssetLookupError] = useState('');
  const [sessionNow, setSessionNow] = useState(() => new Date());
  const [alertMarketFilter, setAlertMarketFilter] = useState('all');
  const [alertExchangeFilter, setAlertExchangeFilter] = useState('all');
  const [alertScoreThreshold, setAlertScoreThreshold] = useState(7);
  const [accountCapital, setAccountCapital] = useState(1000);
  const [riskPercentPerTrade, setRiskPercentPerTrade] = useState(1);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState('');
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [telegramChatPreview, setTelegramChatPreview] = useState('');
  const [savedSetups, setSavedSetups] = useState([]);
  const [savedAlertRules, setSavedAlertRules] = useState([]);
  const autoTriggeredRulesRef = useRef(new Set());
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
    rows,
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
    coverage,
    refreshMarketData,
  } = useMarket();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSessionNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function hydrateTelegramSettings() {
      const settings = await loadTelegramSettings();
      setTelegramEnabled(settings.enabled);
      setTelegramConfigured(settings.configured);
      setTelegramChatPreview(settings.chatIdPreview ?? '');
      if (settings.chatIdPreview) {
        setTelegramChatId(settings.chatIdPreview);
      }
    }

    hydrateTelegramSettings();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('amaia-saved-setups');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setSavedSetups(parsed);
      }
    } catch {
      // Ignore local history parse issues.
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('amaia-alert-rules');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setSavedAlertRules(parsed);
      }
    } catch {
      // Ignore local alert rules parse issues.
    }
  }, []);

  useEffect(() => {
    if (selectedSymbol && !rows.some((row) => row.symbol === selectedSymbol) && assetLookupRow?.symbol !== selectedSymbol) {
      setSelectedSymbol('');
    }
  }, [assetLookupRow, rows, selectedSymbol]);

  const t = locale === 'es'
    ? {
        search: 'Buscar activo',
        searchPlaceholder: 'BTC, ETH, SOL, XRP...',
        assetView: 'Vista de Activo',
        loadAsset: 'Cargar activo',
        loadingAsset: 'Cargando...',
        viewingAsset: 'Asset en chart',
        viewMode: 'Vista',
        basic: 'Básica',
        pro: 'Pro',
        chartRange: 'Rango',
        openTv: 'Abrir TradingView',
        language: 'Idioma',
        theme: 'Tema',
        light: 'Claro',
        dark: 'Oscuro',
        activeClock: 'Sesión Activa',
        date: 'Fecha',
        day: 'Día',
        time: 'Hora',
      }
    : {
        search: 'Search Asset',
        searchPlaceholder: 'BTC, ETH, SOL, XRP...',
        assetView: 'Asset View',
        loadAsset: 'Load asset',
        loadingAsset: 'Loading...',
        viewingAsset: 'Chart asset',
        viewMode: 'View',
        basic: 'Basic',
        pro: 'Pro',
        chartRange: 'Range',
        openTv: 'Open TradingView',
        language: 'Language',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
        activeClock: 'Active Session',
        date: 'Date',
        day: 'Day',
        time: 'Time',
      };

  const socketLabel = useMemo(() => {
    if (socketStatus === 'disabled') return 'REST only';
    if (socketStatus === 'live') return 'Live feed';
    if (socketStatus === 'reconnecting') return 'Re-syncing';
    if (socketStatus === 'error') return 'Stream degraded';
    return 'Connecting';
  }, [socketStatus]);

  const searchableRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => row.symbol.toLowerCase().includes(query) || row.narrativeLabel?.toLowerCase().includes(query));
  }, [rows, searchTerm]);

  const assetOptions = useMemo(() => {
    const uniqueRows = new Map();
    if (assetLookupRow) {
      uniqueRows.set(assetLookupRow.symbol, assetLookupRow);
    }
    searchableRows.slice(0, 20).forEach((row) => {
      uniqueRows.set(row.symbol, row);
    });
    return Array.from(uniqueRows.values());
  }, [assetLookupRow, searchableRows]);

  const selectedRow = useMemo(() => {
    if (selectedSymbol) {
      return rows.find((row) => row.symbol === selectedSymbol) ?? (assetLookupRow?.symbol === selectedSymbol ? assetLookupRow : null);
    }
    return assetLookupRow ?? searchableRows[0] ?? topPanelRows[0] ?? null;
  }, [assetLookupRow, rows, searchableRows, selectedSymbol, topPanelRows]);

  const strongestRow = selectedRow;
  const averageScore = summary.averageScore ? summary.averageScore.toFixed(1) : '0.0';
  const chartCandles = useMemo(() => sliceCandlesForRange(strongestRow?.candles ?? [], chartRange), [chartRange, strongestRow]);
  const candleGeometry = useMemo(() => buildCandleGeometry(chartCandles), [chartCandles]);
  const sparklinePath = useMemo(() => buildSparklinePath(chartCandles), [chartCandles]);
  const chartCloseValues = useMemo(() => chartCandles.map((candle) => candle.close), [chartCandles]);
  const ema20Path = useMemo(() => buildLinePath(calculateEmaSeries(chartCloseValues, 20)), [chartCloseValues]);
  const ema50Path = useMemo(() => buildLinePath(calculateEmaSeries(chartCloseValues, 50)), [chartCloseValues]);
  const suggestedEntries = useMemo(() => buildSuggestedEntries(strongestRow, chartRange), [chartRange, strongestRow]);
  const tradePlan = useMemo(() => buildTradePlan(strongestRow, chartRange, suggestedEntries), [chartRange, strongestRow, suggestedEntries]);
  const positionSizing = useMemo(
    () => buildPositionSizing(tradePlan, Number(accountCapital), Number(riskPercentPerTrade)),
    [accountCapital, riskPercentPerTrade, tradePlan]
  );
  const macroBottomBuy = useMemo(() => isMacroBottomBuy(strongestRow), [strongestRow]);
  const macroTopSell = useMemo(() => isMacroTopSell(strongestRow), [strongestRow]);
  const liquidityTrapMarkers = useMemo(() => {
    if (!chartCandles.length || !strongestRow) return [];
    const highs = chartCandles.map((c) => c.high);
    const lows = chartCandles.map((c) => c.low);
    const closes = chartCandles.map((c) => c.close);
    const accumulationHigh = Math.max(...highs);
    const accumulationLow = Math.min(...lows);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = Math.max(max - min, 0.000001);
    return chartCandles
      .map((candle, index) => {
        const upperTrap = candle.high > accumulationHigh * 0.995 && candle.close < accumulationHigh;
        const lowerTrap = candle.low < accumulationLow * 1.005 && candle.close > accumulationLow;
        if (!upperTrap && !lowerTrap) return null;
        const x = (index / Math.max(chartCandles.length - 1, 1)) * 100;
        const y = 100 - (((upperTrap ? candle.high : candle.low) - min) / range) * 100;
        return { x, y, type: upperTrap ? 'upper' : 'lower' };
      })
      .filter(Boolean);
  }, [chartCandles, strongestRow]);
  const silentRows = useMemo(() => filteredRows.filter((row) => row.silentMarket).slice(0, 5), [filteredRows]);
  const spikeRows = useMemo(
    () => filteredRows.filter((row) => (row.volumePattern ?? '').toLowerCase().includes('spike')).slice(0, 5),
    [filteredRows]
  );
  const filteredAlerts = useMemo(
    () =>
      alertLog.filter((item) => {
        const marketMatch = alertMarketFilter === 'all' || item.marketBucket === alertMarketFilter;
        const exchangeMatch = alertExchangeFilter === 'all' || item.exchange === alertExchangeFilter;
        const scoreMatch = item.score >= alertScoreThreshold;
        return marketMatch && exchangeMatch && scoreMatch;
      }),
    [alertExchangeFilter, alertLog, alertMarketFilter, alertScoreThreshold]
  );
  const marketModeLabel =
    moduleFilter === 'watchlist'
      ? 'Pre-Move Watchlist'
      : moduleFilter === 'futures'
        ? 'Futures Radar'
        : moduleFilter === 'spot'
          ? 'Spot Radar'
          : 'Cross Market';
  const coveragePctLabel = typeof coverage?.coverage_pct === 'number' ? `${coverage.coverage_pct.toFixed(1)}%` : '--';
  const isBasicView = viewMode === 'basic';
  const isProView = viewMode === 'pro';

  async function handleLookupAsset() {
    const normalizedSymbol = normalizeAssetQuery(selectedSymbol || searchTerm);
    if (!normalizedSymbol) {
      setAssetLookupError(locale === 'es' ? 'Escribe un simbolo para cargarlo en el chart.' : 'Enter a symbol to load it into the chart.');
      return;
    }

    const lookupMarketType = marketTypeFilter === 'all' ? 'spot' : marketTypeFilter;
    const lookupExchange = exchangeFilter === 'all' ? 'auto' : exchangeFilter;

    try {
      setAssetLookupLoading(true);
      setAssetLookupError('');
      const scan = await fetchScan({
        symbol: normalizedSymbol,
        exchange: lookupExchange,
        marketType: lookupMarketType,
        timeframe: getLookupTimeframe(chartRange),
      });
      const nextRow = mapScanResultToRow(scan);
      setAssetLookupRow(nextRow);
      setSelectedSymbol(nextRow.symbol);
      setSearchTerm(nextRow.symbol);
    } catch (error) {
      setAssetLookupRow(null);
      setAssetLookupError(
        error?.response?.data?.detail ||
          error?.message ||
          (locale === 'es' ? 'No se pudo cargar el activo solicitado.' : 'Could not load the requested asset.')
      );
    } finally {
      setAssetLookupLoading(false);
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleLookupAsset();
    }
  }

  async function handleSendCurrentSetupToTelegram() {
    if (!strongestRow || !tradePlan) {
      setTelegramStatus('No hay setup activo para enviar.');
      return;
    }

    try {
      setTelegramStatus('Enviando setup a Telegram...');
      await sendTelegramAlert({
        ...strongestRow,
        marketType: strongestRow.marketType,
        narrative: strongestRow.narrative,
        narrativeLabel: strongestRow.narrativeLabel,
        tradePlan,
        positionSizing,
      });
      setTelegramStatus('Setup enviado correctamente.');
    } catch (error) {
      setTelegramStatus(error?.message ? `Telegram error: ${error.message}` : 'No se pudo enviar a Telegram. Revisa token y chat ID.');
    }
  }

  async function handleSendTelegramTest() {
    try {
      setTelegramStatus('Enviando mensaje de prueba...');
      await sendTelegramAlert({
        symbol: strongestRow?.symbol ?? 'AMAIA_TEST',
        estado: 'WATCHLIST',
        setupDirection: strongestRow?.setupDirection ?? 'pump',
        marketType: strongestRow?.marketType ?? 'BINANCE_SPOT',
        exchange: strongestRow?.exchange ?? 'binance',
        score: strongestRow?.score ?? 8,
        narrative: strongestRow?.narrative ?? 'System Test',
        narrativeLabel: strongestRow?.narrativeLabel ?? 'System Test',
        tradePlan,
        positionSizing,
      });
      setTelegramStatus('Mensaje de prueba enviado correctamente.');
    } catch (error) {
      setTelegramStatus(error?.message ? `Telegram error: ${error.message}` : 'No se pudo enviar el mensaje de prueba.');
    }
  }

  async function handleCopyTradePlan() {
    const text = buildTradePlanText(strongestRow, tradePlan, positionSizing, suggestedEntries, chartRange);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setTelegramStatus('Trade plan copiado al portapapeles.');
    } catch {
      setTelegramStatus('No se pudo copiar el trade plan.');
    }
  }

  function handleSaveSetupSnapshot() {
    if (!strongestRow || !tradePlan) return;

    const snapshot = {
      id: `${strongestRow.id}-${Date.now()}`,
      symbol: strongestRow.symbol,
      marketType: strongestRow.marketType,
      exchange: strongestRow.exchange,
      setupDirection: strongestRow.setupDirection ?? 'pump',
      decision: tradePlan.decision,
      score: strongestRow.score,
      avgEntry: tradePlan.avgEntry,
      stopLoss: tradePlan.stopPrice,
      tp1: tradePlan.takeProfits[0]?.price ?? null,
      createdAt: new Date().toISOString(),
    };

    const nextSaved = [snapshot, ...savedSetups].slice(0, 8);
    setSavedSetups(nextSaved);
    try {
      window.localStorage.setItem('amaia-saved-setups', JSON.stringify(nextSaved));
    } catch {
      // Ignore local storage limits.
    }
  }

  function handleSaveAlertRule() {
    const nextRule = {
      id: `rule-${Date.now()}`,
      market: alertMarketFilter,
      exchange: alertExchangeFilter,
      score: alertScoreThreshold,
      enabled: true,
      priority: alertScoreThreshold >= 9 ? 'high' : alertScoreThreshold >= 7 ? 'medium' : 'normal',
    };
    const nextRules = [nextRule, ...savedAlertRules].slice(0, 8);
    setSavedAlertRules(nextRules);
    try {
      window.localStorage.setItem('amaia-alert-rules', JSON.stringify(nextRules));
    } catch {
      // Ignore local storage limits.
    }
  }

  function handleRemoveAlertRule(ruleId) {
    const nextRules = savedAlertRules.filter((rule) => rule.id !== ruleId);
    setSavedAlertRules(nextRules);
    try {
      window.localStorage.setItem('amaia-alert-rules', JSON.stringify(nextRules));
    } catch {
      // Ignore local storage limits.
    }
  }

  function handleToggleAlertRule(ruleId) {
    const nextRules = savedAlertRules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    setSavedAlertRules(nextRules);
    try {
      window.localStorage.setItem('amaia-alert-rules', JSON.stringify(nextRules));
    } catch {
      // Ignore local storage limits.
    }
  }

  async function handleSaveTelegramSettings() {
    try {
      setTelegramStatus('Guardando configuracion segura...');
      const response = await saveTelegramSettings({
        enabled: telegramEnabled,
        botToken: telegramBotToken,
        chatId: telegramChatId,
      });
      if (!response.ok) {
        throw new Error('Save failed');
      }
      const payload = await response.json();
      setTelegramConfigured(payload.settings?.configured ?? false);
      setTelegramChatPreview(payload.settings?.chatIdPreview ?? '');
      setTelegramBotToken('');
      setTelegramStatus('Telegram conectado de forma segura.');
    } catch {
      setTelegramStatus('No se pudo guardar la configuracion de Telegram.');
    }
  }

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(sessionNow),
    [locale, sessionNow]
  );
  const formattedDay = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        weekday: 'long',
      }).format(sessionNow),
    [locale, sessionNow]
  );
  const formattedClock = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(sessionNow),
    [locale, sessionNow]
  );

  useEffect(() => {
    if (!activeAlert || !telegramEnabled || !telegramConfigured) return;

    const matchingRules = savedAlertRules.filter((rule) => {
      if (!rule.enabled) return false;
      const marketMatch = rule.market === 'all' || activeAlert.marketBucket === rule.market;
      const exchangeMatch = rule.exchange === 'all' || activeAlert.exchange === rule.exchange;
      const scoreMatch = activeAlert.score >= rule.score;
      return marketMatch && exchangeMatch && scoreMatch;
    });

    if (!matchingRules.length) return;

    const highestPriorityRule = [...matchingRules].sort((left, right) => {
      const rank = { high: 3, medium: 2, normal: 1 };
      return (rank[right.priority] ?? 1) - (rank[left.priority] ?? 1);
    })[0];

    const dedupeKey = `${highestPriorityRule.id}:${activeAlert.id}`;
    if (autoTriggeredRulesRef.current.has(dedupeKey)) return;
    autoTriggeredRulesRef.current.add(dedupeKey);

    sendTelegramAlert({
      ...activeAlert,
      symbol: `${activeAlert.symbol} [${highestPriorityRule.priority?.toUpperCase?.() ?? 'RULE'}]`,
    })
      .then(() => {
        setTelegramStatus(`Regla ${highestPriorityRule.priority} enviada a Telegram.`);
      })
      .catch((error) => {
        setTelegramStatus(error?.message ? `Telegram error: ${error.message}` : 'No se pudo enviar la regla automatica.');
      });
  }, [activeAlert, savedAlertRules, telegramConfigured, telegramEnabled]);

  function handleLogout() {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <main className={`min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8 ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      <div className="mx-auto flex max-w-[1520px] flex-col gap-6">
        <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-5 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">System Online</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Quant Desk</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Cross Exchange Radar</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Session {detectSession(sessionNow)}</span>
            <span className="rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-cyan-200">{socketLabel}</span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-panel h-fit rounded-[32px] p-5 xl:sticky xl:top-6">
            <div className="flex items-center gap-3">
              <BrandMark size="md" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Hunter Navigation</p>
                <p className="mt-1 text-lg font-semibold text-white">Command Sidebar</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {moduleOptions.map((option) => (
                <button
                  key={`sidebar-${option.value}`}
                  type="button"
                  onClick={() => setModuleFilter(option.value)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    moduleFilter === option.value
                      ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-xs uppercase tracking-[0.22em] text-current/60">{moduleFilter === option.value ? 'Live' : 'Open'}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Quick Stats</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div>
                    <p className="text-xs text-slate-500">Visible</p>
                    <p className="mt-1 text-lg font-semibold text-white">{summary.visibleCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">High</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">{summary.highCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Watchlist</p>
                    <p className="mt-1 text-lg font-semibold text-amber-300">{summary.watchlistCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <div className="mt-3 space-y-2">
                  <a
                    href="/cat-bot"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/15"
                  >
                    <span>Open Cat Bot</span>
                    <span className="text-xs uppercase tracking-[0.22em] text-current/60">New</span>
                  </a>
                  <a
                    href="/onboarding"
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:text-white"
                  >
                    <span>User Guide</span>
                    <span className="text-xs uppercase tracking-[0.22em] text-current/60">Read</span>
                  </a>
                </div>
              </div>

              <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Mode</p>
                <p className="mt-2 text-sm font-semibold text-white">{isBasicView ? 'Friendly focus mode active' : 'Full pro desk active'}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {isBasicView
                    ? 'Vista limpia para leer setups, chart y oportunidades sin sobrecarga.'
                    : 'Vista completa con radar, alert center, cache, delta y modulos cuantitativos.'}
                </p>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="glass-panel relative overflow-hidden rounded-[36px] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(52,211,153,0.12),transparent_24%)]" />
            <div className="relative flex flex-col gap-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <BrandMark size="lg" />
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                        AMAIA AI PUMP HUNTER PRO
                      </span>
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
                        Hunter Engine
                      </span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.42em] text-slate-500">Robotic Cat Intelligence Desk</p>
                      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Cross-exchange accumulation intelligence with a robotic hunter identity.
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                        Detecta acumulacion, trampas de liquidez y estructuras de explosion en spot y futures con una interfaz
                        premium, mas limpia y pensada como una mesa operativa real.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Brand Signal</p>
                        <p className="mt-2 text-sm font-medium text-white">Hunter-grade market radar</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Visual System</p>
                        <p className="mt-2 text-sm font-medium text-white">Robot cat mark + premium desk UX</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-current/70">{t.language}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setLocale('en')} className={`rounded-full px-3 py-1 text-xs ${locale === 'en' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>EN</button>
                      <button type="button" onClick={() => setLocale('es')} className={`rounded-full px-3 py-1 text-xs ${locale === 'es' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>ES</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-current/70">{t.theme}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setTheme('dark')} className={`rounded-full px-3 py-1 text-xs ${theme === 'dark' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>{t.dark}</button>
                      <button type="button" onClick={() => setTheme('light')} className={`rounded-full px-3 py-1 text-xs ${theme === 'light' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>{t.light}</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-current/70">{t.viewMode}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setViewMode('basic')} className={`rounded-full px-3 py-1 text-xs ${viewMode === 'basic' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>{t.basic}</button>
                      <button type="button" onClick={() => setViewMode('pro')} className={`rounded-full px-3 py-1 text-xs ${viewMode === 'pro' ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/[0.05] text-slate-300'}`}>{t.pro}</button>
                    </div>
                  </div>
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
                  <a
                    href="/cat-bot"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/15"
                  >
                    Open Cat Bot
                  </a>
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

              {isBasicView ? (
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Coverage</p>
                    <p className="mt-3 text-2xl font-semibold text-cyan-200">{coveragePctLabel}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {coverage ? `${coverage.cached_pairs + coverage.refreshed_in_cycle} de ${coverage.eligible_pairs} elegibles ya analizados.` : 'Esperando metricas del scanner.'}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Pairs Discovered</p>
                      <p className="mt-3 text-lg font-semibold text-white">{coverage?.total_pairs_discovered ?? '--'}</p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Excluded Pumped</p>
                      <p className="mt-3 text-lg font-semibold text-rose-300">{coverage?.excluded_pumped_pairs ?? '--'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_0.9fr]">
                  <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Coverage</p>
                    <p className="mt-3 text-2xl font-semibold text-cyan-200">{coveragePctLabel}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {coverage ? `${coverage.cached_pairs + coverage.refreshed_in_cycle} de ${coverage.eligible_pairs} elegibles ya analizados.` : 'Esperando metricas del scanner.'}
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Pairs Discovered</p>
                    <p className="mt-3 text-lg font-semibold text-white">{coverage?.total_pairs_discovered ?? '--'}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Eligible</p>
                    <p className="mt-3 text-lg font-semibold text-emerald-300">{coverage?.eligible_pairs ?? '--'}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Refreshed Cycle</p>
                    <p className="mt-3 text-lg font-semibold text-cyan-300">{coverage?.refreshed_in_cycle ?? '--'}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Excluded Pumped</p>
                    <p className="mt-3 text-lg font-semibold text-rose-300">{coverage?.excluded_pumped_pairs ?? '--'}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.8fr_0.8fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.search}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Escribe un símbolo y cárgalo en el chart aunque no aparezca en la tabla actual.
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-transparent text-sm text-slate-100 outline-none"
                      />
                    </div>
                    <select
                      value={selectedSymbol}
                      onChange={(event) => {
                        setSelectedSymbol(event.target.value);
                        setSearchTerm(event.target.value);
                      }}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none"
                    >
                      <option value="">{t.assetView}</option>
                      {assetOptions.map((row) => (
                        <option key={row.id} value={row.symbol}>
                          {row.symbol}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleLookupAsset()}
                      disabled={assetLookupLoading}
                      className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assetLookupLoading ? t.loadingAsset : t.loadAsset}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-slate-300">
                      {t.viewingAsset}: {strongestRow?.symbol ?? '--'}
                    </span>
                    {assetLookupRow ? (
                      <span className="rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-cyan-200">
                        {assetLookupRow.symbol} loaded via scanner
                      </span>
                    ) : null}
                    {assetLookupError ? <span className="text-rose-300">{assetLookupError}</span> : null}
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.activeClock}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">{t.date}</p>
                      <p className="mt-1 text-sm text-white">{formattedDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.day}</p>
                      <p className="mt-1 text-sm text-white">{formattedDay}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.time}</p>
                      <p className="mt-1 text-sm text-white">{formattedClock}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Session</p>
                      <p className="mt-1 text-sm text-cyan-300">{detectSession(sessionNow)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-cyan-500/15 bg-cyan-500/[0.05] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Quick Flow</p>
                  <div className="mt-3 space-y-3 text-sm leading-7 text-slate-200">
                    <p>1. Empieza en <span className="text-white">All Setups</span> para ver el radar completo.</p>
                    <p>2. Usa la lupa para cargar un activo concreto en el chart.</p>
                    <p>3. Si quieres validar edge, abre <span className="text-white">Cat Bot</span> en ventana aparte y compara win rate Spot vs Futures.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href="/cat-bot"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/15"
                    >
                      Open Cat Bot Window
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-4">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,23,45,0.9),rgba(6,12,28,0.9))] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Overview Cockpit</p>
                  <p className="mt-3 text-lg font-semibold text-white">{marketModeLabel}</p>
                  <p className="mt-2 text-sm text-slate-400">Vista principal de la mision activa.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Exchange Lens</p>
                  <p className="mt-3 text-lg font-semibold text-white">{exchangeFilter === 'all' ? 'All Venues' : exchangeFilter.toUpperCase()}</p>
                  <p className="mt-2 text-sm text-slate-400">{marketTypeFilter === 'all' ? 'Cross-market' : marketTypeFilter}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Filter Floor</p>
                  <p className="mt-3 text-lg font-semibold text-cyan-300">Score {scoreFilter}</p>
                  <p className="mt-2 text-sm text-slate-400">{filteredRows.length} activos visibles listos para lectura.</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Desk Tempo</p>
                  <p className="mt-3 text-lg font-semibold text-white">{detectSession(sessionNow)}</p>
                  <p className="mt-2 text-sm text-slate-400">{formatTime(lastUpdated)} · radar sincronizado.</p>
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
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              getSetupDirection(strongestRow) === 'dump'
                                ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {strongestRow.signalLabel ?? strongestRow.signal_label}
                          </span>
                          {macroBottomBuy ? (
                            <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/12 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                              MACRO BOTTOM BUY
                            </span>
                          ) : null}
                          {macroTopSell ? (
                            <span className="rounded-full border border-rose-500/25 bg-rose-500/12 px-3 py-1 text-xs font-semibold text-rose-200">
                              MACRO TOP SELL
                            </span>
                          ) : null}
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
                  <div className="mt-5 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,35,.95),rgba(6,12,28,.8))] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Tactical Chart View</p>
                        <p className="mt-2 text-sm text-slate-300">Lectura rápida del activo líder con zona de acumulación y estructura de precio.</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{t.chartRange}: {chartRange}</p>
                        <p>{strongestRow?.volumePattern ?? '--'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {chartRangeOptions.map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setChartRange(range)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            chartRange === range
                              ? 'border-cyan-400/30 bg-cyan-400/12 text-cyan-100'
                              : 'border-white/10 bg-white/[0.04] text-slate-300'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                      <a
                        href={getTradingViewLink(strongestRow)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 transition hover:bg-emerald-500/15"
                      >
                        {t.openTv}
                      </a>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.34fr]">
                      <div className="rounded-[22px] border border-white/8 bg-slate-950/70 p-3">
                        {sparklinePath ? (
                          <svg viewBox="0 0 100 100" className="h-48 w-full">
                            <defs>
                              <linearGradient id="amaiaChartStroke" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#34d399" />
                              </linearGradient>
                            </defs>
                            <rect x="6" y="30" width="88" height="32" rx="8" fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.18)" strokeDasharray="3 3" />
                            {[20, 40, 60, 80].map((lineY) => (
                              <path key={lineY} d={`M 0 ${lineY} L 100 ${lineY}`} stroke="rgba(148,163,184,0.08)" strokeWidth="0.6" strokeDasharray="2 2" />
                            ))}
                            {candleGeometry.candles.map((candle, index) => (
                              <g key={`candle-${index}`}>
                                <line
                                  x1={candle.x}
                                  x2={candle.x}
                                  y1={candle.highY}
                                  y2={candle.lowY}
                                  stroke={candle.isBullish ? '#34d399' : '#f87171'}
                                  strokeWidth="0.9"
                                />
                                <rect
                                  x={candle.x - candle.bodyWidth / 2}
                                  y={candle.bodyY}
                                  width={candle.bodyWidth}
                                  height={candle.bodyHeight}
                                  rx="0.8"
                                  fill={candle.isBullish ? 'rgba(52,211,153,0.75)' : 'rgba(248,113,113,0.78)'}
                                />
                              </g>
                            ))}
                            <path d={sparklinePath} fill="none" stroke="url(#amaiaChartStroke)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
                            {ema20Path ? <path d={ema20Path} fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="1.2" strokeDasharray="2 1.5" /> : null}
                            {ema50Path ? <path d={ema50Path} fill="none" stroke="rgba(244,114,182,0.85)" strokeWidth="1.2" strokeDasharray="4 2" /> : null}
                            {liquidityTrapMarkers.map((marker, index) => (
                              <g key={`${marker.type}-${index}`}>
                                <circle cx={marker.x} cy={marker.y} r="1.9" fill={marker.type === 'upper' ? '#f97316' : '#34d399'} />
                                <circle cx={marker.x} cy={marker.y} r="3.3" fill="transparent" stroke={marker.type === 'upper' ? '#f97316' : '#34d399'} strokeOpacity="0.35" />
                              </g>
                            ))}
                          </svg>
                        ) : (
                          <div className="flex h-48 items-center justify-center text-sm text-slate-500">No chart data yet.</div>
                        )}
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {getSetupDirection(strongestRow) === 'dump' ? 'Distribution Zone' : 'Accumulation Zone'}
                          </p>
                          <p className="mt-2 text-sm text-white">{formatPercent(strongestRow?.rangePct ?? strongestRow?.range_pct)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {getSetupDirection(strongestRow) === 'dump' ? '24H Change' : 'Dump'}
                          </p>
                          <p className="mt-2 text-sm text-white">
                            {getSetupDirection(strongestRow) === 'dump'
                              ? formatPercent(strongestRow?.change24h)
                              : formatPercent(strongestRow?.dumpPct ?? strongestRow?.dump_pct)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phase</p>
                          <p className="mt-2 text-sm text-white">{strongestRow?.statusLabel ?? strongestRow?.status_label ?? '--'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">EMA Overlay</p>
                          <p className="mt-2 text-sm text-white">EMA20 / EMA50</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[22px] border border-emerald-500/15 bg-emerald-500/8 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/70">
                            {getSetupDirection(strongestRow) === 'dump' ? 'Sell Ladder' : 'Buy Ladder'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-emerald-50">
                            Tres entradas limit sugeridas para {strongestRow?.symbol ?? 'el activo seleccionado'}, adaptadas al rango {chartRange} y a una
                            estrategia {getSetupDirection(strongestRow) === 'dump' ? 'short' : 'long'}.
                          </p>
                        </div>
                        {macroBottomBuy ? (
                          <span className="inline-flex rounded-full border border-fuchsia-500/20 bg-fuchsia-500/12 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                            MACRO BOTTOM BUY
                          </span>
                        ) : null}
                        {macroTopSell ? (
                          <span className="inline-flex rounded-full border border-rose-500/25 bg-rose-500/12 px-3 py-1 text-xs font-semibold text-rose-200">
                            MACRO TOP SELL
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => setActiveTradeModal('entries')}
                          className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Entries</p>
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.8)]" />
                          </div>
                          <p className="mt-4 text-3xl font-semibold text-white">{suggestedEntries.length}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">Layered limit ladder</p>
                          <p className="mt-4 text-sm leading-7 text-slate-400">Abre las entradas limit en un popup limpio y separado.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTradeModal('plan')}
                          className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Execution Plan</p>
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]" />
                          </div>
                          <p className="mt-4 text-3xl font-semibold text-white">{tradePlan?.decision ?? '--'}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">Order blotter view</p>
                          <p className="mt-4 text-sm leading-7 text-slate-400">Visualiza entry, stop, risk, sizing y take profits sin compresion visual.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTradeModal('telegram')}
                          className="rounded-[26px] border border-emerald-500/12 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))] p-5 text-left transition hover:border-emerald-400/20 hover:bg-emerald-500/[0.08]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/70">Telegram Link</p>
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
                          </div>
                          <p className="mt-4 text-3xl font-semibold text-white">{telegramConfigured ? 'Ready' : 'Setup'}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">Alert delivery bridge</p>
                          <p className="mt-4 text-sm leading-7 text-slate-400">Configura tu bot y envia el setup activo desde una ventana dedicada.</p>
                        </button>
                      </div>
                    </div>
                  </div>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompactRadar((current) => !current)}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  {showCompactRadar ? 'Expand' : 'Compact'}
                </button>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                  {formatTime(lastUpdated)}
                </div>
              </div>
            </div>

              {showCompactRadar ? (
                <div className="mt-5 grid gap-3">
                  {topPanelRows.slice(0, 4).map((row, index) => (
                    <button
                      key={`${row.market_type}-${row.exchange}-${row.symbol}`}
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(row.symbol);
                        setSearchTerm(row.symbol);
                      }}
                      className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">#{String(index + 1).padStart(2, '0')}</p>
                          <p className="mt-2 text-lg font-semibold text-white">{row.symbol}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {row.exchange.toUpperCase()} · {row.market_type.toUpperCase()}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStateClass(row.estado)}`}>{row.estado}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Score</p>
                          <p className="mt-1 font-semibold text-white">{row.score}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                            {getSetupDirection(row) === 'dump' ? '24H' : 'Dump'}
                          </p>
                          <p className="mt-1 text-slate-200">
                            {getSetupDirection(row) === 'dump' ? formatPercent(row.change_24h) : formatPercent(row.dump_pct)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Range</p>
                          <p className="mt-1 text-slate-200">{formatPercent(row.range_pct)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
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
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                getSetupDirection(row) === 'dump'
                                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                                  : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              }`}
                            >
                              {row.signal_label}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getDirectionClass(getSetupDirection(row))}`}>
                              {getSetupDirection(row) === 'dump' ? 'SELL / SHORT' : 'BUY / LONG'}
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
                          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">
                            {getSetupDirection(row) === 'dump' ? '24H Change' : 'Dump'}
                          </p>
                          <p className="mt-2 text-sm text-slate-200">
                            {getSetupDirection(row) === 'dump' ? formatPercent(row.change_24h) : formatPercent(row.dump_pct)}
                          </p>
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
                      <p className="mt-4 text-sm leading-6 text-slate-400">{row.setup ?? row.summary ?? row.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
              {!loading && topPanelRows.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-400">
                  No hay oportunidades con los filtros actuales.
                </div>
              ) : null}
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

        <section className={`grid gap-6 ${isBasicView ? 'xl:grid-cols-1' : 'xl:grid-cols-[1.25fr_0.75fr]'}`}>
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
                      <th className="px-5 py-4 font-medium">Side</th>
                      <th className="px-5 py-4 font-medium">Score</th>
                      <th className="px-5 py-4 font-medium">Drawdown</th>
                      <th className="px-5 py-4 font-medium">Range</th>
                      <th className="px-5 py-4 font-medium">ATR Ratio</th>
                      <th className="px-5 py-4 font-medium">Volume Pattern</th>
                      <th className="px-5 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/6 bg-[rgba(4,8,22,0.62)]">
                    {filteredRows.map((row) => {
                      const isExpanded = expandedRowId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className="cursor-pointer transition hover:bg-white/[0.035]"
                            onClick={() => setExpandedRowId((current) => (current === row.id ? null : row.id))}
                          >
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-white">{row.symbol}</span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                    {isExpanded ? 'Open' : 'Details'}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getMarketTypeClass(row.marketType)}`}>
                                    {row.marketType.toUpperCase()}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                      getSetupDirection(row) === 'dump'
                                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                                    }`}
                                  >
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
                            <td className="px-5 py-4 text-sm">
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDirectionClass(getSetupDirection(row))}`}>
                                {getSetupDirection(row) === 'dump' ? 'SELL / SHORT' : 'BUY / LONG'}
                              </span>
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
                          {isExpanded ? (
                            <tr className="bg-white/[0.025]">
                              <td colSpan="9" className="px-5 py-5">
                                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
                                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Setup Context</p>
                                    <p className="mt-3 text-sm leading-7 text-slate-300">{row.summary ?? row.setup ?? row.explanation}</p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Price</p>
                                        <p className="mt-2 text-white">{formatPrice(row.price)}</p>
                                      </div>
                                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Volume</p>
                                        <p className="mt-2 text-white">{formatVolume(row.volume)}</p>
                                      </div>
                                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">24H Change</p>
                                        <p className="mt-2 text-white">{typeof row.change24h === 'number' ? `${row.change24h.toFixed(2)}%` : '--'}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Signal Readout</p>
                                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                                      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <span>Status</span>
                                        <span className="font-semibold text-white">{row.statusLabel}</span>
                                      </div>
                                      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <span>Signal</span>
                                        <span className={`font-semibold ${getSetupDirection(row) === 'dump' ? 'text-rose-200' : 'text-emerald-300'}`}>
                                          {row.signalLabel}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <span>Narrative</span>
                                        <span className="font-semibold text-cyan-200">{row.narrativeLabel ?? row.narrative}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Action Rail</p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedSymbol(row.symbol);
                                          setSearchTerm(row.symbol);
                                        }}
                                        className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                                      >
                                        Load in Chart
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedSymbol(row.symbol);
                                          setSearchTerm(row.symbol);
                                          setActiveTradeModal('plan');
                                        }}
                                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:text-white"
                                      >
                                        Open Plan
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                    {!loading && filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-5 py-8 text-center text-sm text-slate-400">
                          No hay filas con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {isProView ? (
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
                <h2 className="mt-2 text-xl font-semibold text-white">Alert Center</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">High Alerts</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">{filteredAlerts.filter((item) => item.estado === 'HIGH').length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Watch Alerts</p>
                  <p className="mt-2 text-xl font-semibold text-amber-300">{filteredAlerts.filter((item) => item.estado === 'WATCHLIST').length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Audio</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{soundEnabled ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <FilterSelect label="Alert Market" value={alertMarketFilter} onChange={(event) => setAlertMarketFilter(event.target.value)} options={[{ value: 'all', label: 'All Markets' }, { value: 'spot', label: 'Spot' }, { value: 'futures', label: 'Futures' }]} />
                <FilterSelect label="Alert Exchange" value={alertExchangeFilter} onChange={(event) => setAlertExchangeFilter(event.target.value)} options={exchangeOptions} />
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Alert Score</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={alertScoreThreshold}
                    onChange={(event) => setAlertScoreThreshold(Number(event.target.value))}
                    className="accent-cyan-400"
                  />
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>0</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{alertScoreThreshold}</span>
                    <span>10</span>
                  </div>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="text-sm text-slate-300">
                  Regla activa: {alertMarketFilter}/{alertExchangeFilter}/score {alertScoreThreshold}
                </div>
                <button
                  type="button"
                  onClick={handleSaveAlertRule}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Save Rule
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {savedAlertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {rule.market}/{rule.exchange}/score {rule.score}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          rule.priority === 'high'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                            : rule.priority === 'medium'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                              : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                        }`}
                      >
                        {rule.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAlertRule(rule.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          rule.enabled
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            : 'border-white/10 bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        {rule.enabled ? 'On' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAlertRule(rule.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {savedAlertRules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                    No saved alert rules yet. Guarda una combinacion de mercado, exchange y score para reutilizarla.
                  </div>
                ) : null}
              </div>
              <div className="mt-5 space-y-3">
                {filteredAlerts.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {item.exchange} · {item.marketType} · {item.narrativeLabel ?? item.narrative}
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
                {filteredAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    No alerts match the current alert filters.
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
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Silent Market Mode</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Low Attention Assets</h2>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span>Silent assets visible</span>
                <span className="font-semibold text-cyan-300">{summary.silentCount}</span>
              </div>
              <div className="mt-4 space-y-3">
                {silentRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{row.marketType}</p>
                      </div>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                        Quiet
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{row.summary}</p>
                  </div>
                ))}
                {silentRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    No hay activos silenciosos destacados con los filtros actuales.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Volume Spike Detector</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Expansion Radar</h2>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                <span>Spike candidates</span>
                <span className="font-semibold text-emerald-300">{summary.spikeCount}</span>
              </div>
              <div className="mt-4 space-y-3">
                {spikeRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{row.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{row.volumePattern}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        Spike
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{row.summary}</p>
                  </div>
                ))}
                {spikeRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    No hay spikes relevantes en este universo filtrado.
                  </div>
                ) : null}
              </div>
            </div>
            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Watchlist Module</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Pre-Move Candidates</h2>
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
                    No hay activos en pre-move watchlist ahora mismo.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="glass-panel rounded-[36px] p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Saved Setups</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Local History</h2>
              </div>
              <div className="mt-5 space-y-3">
                {savedSetups.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.symbol}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {item.exchange?.toUpperCase()} · {item.marketType}
                        </p>
                      </div>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                        {item.decision}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
                      <span>Score {item.score}</span>
                      <span>Entry {formatPrice(item.avgEntry)}</span>
                      <span>Stop {formatPrice(item.stopLoss)}</span>
                    </div>
                  </div>
                ))}
                {savedSetups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                    Aun no has guardado setups. Usa `Save Setup` desde el modal Execution Plan.
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-panel rounded-[36px] p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Watchlist Module</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Pre-Move Candidates</h2>
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
                      No hay activos en pre-move watchlist ahora mismo.
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="glass-panel rounded-[36px] p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Alert Snapshot</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Live Priority Queue</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">High Alerts</p>
                    <p className="mt-2 text-xl font-semibold text-emerald-300">{filteredAlerts.filter((item) => item.estado === 'HIGH').length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Watch Alerts</p>
                    <p className="mt-2 text-xl font-semibold text-amber-300">{filteredAlerts.filter((item) => item.estado === 'WATCHLIST').length}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {filteredAlerts.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{item.symbol}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {item.exchange} · {item.marketType} · {item.narrativeLabel ?? item.narrative}
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
                  {filteredAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-400">
                      No alerts match the current filters.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>

        {isProView ? <AmaiaCopilotPanel /> : null}

        <TradeDeskModal
          open={activeTradeModal === 'entries'}
          title={`${getSetupDirection(strongestRow) === 'dump' ? 'Sell Ladder' : 'Entry Ladder'} · ${strongestRow?.symbol ?? '--'}`}
          subtitle={`Tres entradas limit sugeridas para ${strongestRow?.symbol ?? 'el activo seleccionado'}, adaptadas al rango ${chartRange} y al flujo ${
            getSetupDirection(strongestRow) === 'dump' ? 'short' : 'long'
          }.`}
          onClose={() => setActiveTradeModal(null)}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {suggestedEntries.map((entry) => (
              <div key={entry.label} className="rounded-[26px] border border-white/8 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{entry.label}</p>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                    {entry.offsetPct.toFixed(2)}% {getSetupDirection(strongestRow) === 'dump' ? 'above' : 'below'}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">{formatPrice(entry.price)}</p>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Orden limit escalonada para construir posicion {getSetupDirection(strongestRow) === 'dump' ? 'short' : 'long'} con mejor timing.
                </p>
              </div>
            ))}
          </div>
        </TradeDeskModal>

        <TradeDeskModal
          open={activeTradeModal === 'plan'}
          title={`Execution Plan · ${strongestRow?.symbol ?? '--'}`}
          subtitle={tradePlan?.decisionReason ?? 'Sin plan disponible todavia.'}
          onClose={() => setActiveTradeModal(null)}
        >
          {tradePlan ? (
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
                  <div className="grid gap-4 md:grid-cols-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Decision</p>
                      <p className="mt-2 text-lg font-semibold text-white">{tradePlan.decision}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Score</p>
                      <p className="mt-2 text-lg font-semibold text-cyan-200">{strongestRow?.score ?? '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Market</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow?.marketType ?? '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Exchange</p>
                      <p className="mt-2 text-lg font-semibold text-white">{strongestRow?.exchange?.toUpperCase() ?? '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Side</p>
                      <p className={`mt-2 text-lg font-semibold ${tradePlan.side === 'short' ? 'text-rose-200' : 'text-emerald-300'}`}>
                        {tradePlan.side === 'short' ? 'SELL / SHORT' : 'BUY / LONG'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCopyTradePlan}
                    className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
                  >
                    Copy Trade Plan
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSetupSnapshot}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
                  >
                    Save Setup
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      tradePlan.decision === 'Entry'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                        : tradePlan.decision === 'Monitor'
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    {tradePlan.decision}
                  </span>
                  {macroBottomBuy ? (
                    <span className="inline-flex rounded-full border border-fuchsia-500/20 bg-fuchsia-500/12 px-3 py-1 text-xs font-semibold text-fuchsia-200">
                      MACRO BOTTOM BUY
                    </span>
                  ) : null}
                  {macroTopSell ? (
                    <span className="inline-flex rounded-full border border-rose-500/25 bg-rose-500/12 px-3 py-1 text-xs font-semibold text-rose-200">
                      MACRO TOP SELL
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Avg Entry</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{formatPrice(tradePlan.avgEntry)}</p>
                  </div>
                  <div className="rounded-[24px] border border-rose-500/15 bg-rose-500/8 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-rose-200/70">Stop Loss</p>
                    <p className="mt-3 text-3xl font-semibold text-rose-100">{formatPrice(tradePlan.stopPrice)}</p>
                    <p className="mt-3 text-sm text-rose-200/70">Risk {tradePlan.maxRiskPct.toFixed(2)}%</p>
                  </div>
                  <div className="rounded-[24px] border border-cyan-500/15 bg-cyan-500/8 p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">Position Risk</p>
                    <p className="mt-3 text-3xl font-semibold text-cyan-100">{tradePlan.allocationPct}% size</p>
                    <p className="mt-3 text-sm text-cyan-200/70">RR max {tradePlan.riskRewardAtTp3}R</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Account Capital</p>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={accountCapital}
                      onChange={(event) => setAccountCapital(event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Risk Per Trade %</p>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={riskPercentPerTrade}
                      onChange={(event) => setRiskPercentPerTrade(event.target.value)}
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>
                </div>

                {positionSizing ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Risk Budget</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{formatPrice(positionSizing.riskBudgetUsd)}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Position Size</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{formatPrice(positionSizing.positionSizeUsd)}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Quantity</p>
                      <p className="mt-3 text-3xl font-semibold text-white">{positionSizing.quantity.toFixed(4)}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Take Profit Ladder</p>
                <div className="mt-5 grid gap-4">
                  {tradePlan.takeProfits.map((target) => (
                    <div key={target.label} className="rounded-[22px] border border-white/8 bg-slate-950/55 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{target.label}</p>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                          {target.rewardMultiple.toFixed(1)}R
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-semibold text-white">{formatPrice(target.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </TradeDeskModal>

        <TradeDeskModal
          open={activeTradeModal === 'telegram'}
          title="Telegram Link"
          subtitle="Conecta tu bot personal y envia el setup activo desde una vista limpia y dedicada."
          onClose={() => setActiveTradeModal(null)}
        >
          <div className="grid gap-5 xl:grid-cols-[0.72fr_1fr]">
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Telegram Alerts</p>
                <button
                  type="button"
                  onClick={() => setTelegramEnabled((current) => !current)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    telegramEnabled
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/[0.04] text-slate-300'
                  }`}
                >
                  {telegramEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                {telegramConfigured
                  ? `Configurado en servidor · chat ${telegramChatPreview || '--'}`
                  : 'Aun no hay credenciales guardadas en servidor.'}
              </p>
              <button
                type="button"
                onClick={handleSendCurrentSetupToTelegram}
                className="mt-5 w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/15"
              >
                Send setup
              </button>
              <button
                type="button"
                onClick={handleSendTelegramTest}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
              >
                Send test message
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bot Token</p>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(event) => setTelegramBotToken(event.target.value)}
                  placeholder="123456:ABC..."
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Chat ID</p>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(event) => setTelegramChatId(event.target.value)}
                  placeholder="123456789"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Delivery</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">Las credenciales se guardan cifradas del lado servidor y no se exponen al cliente.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveTelegramSettings}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15 md:col-span-2"
              >
                Save Telegram Securely
              </button>
              {telegramStatus ? <p className="text-sm text-slate-300 md:col-span-2">{telegramStatus}</p> : null}
            </div>
          </div>
        </TradeDeskModal>

          </div>
        </div>

        {activeAlert ? (
          <div
            className={`fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] rounded-[28px] border p-5 backdrop-blur ${
              getSetupDirection(activeAlert) === 'dump'
                ? 'border-rose-400/20 bg-slate-950/92 shadow-[0_24px_90px_rgba(244,63,94,0.16)]'
                : 'border-emerald-400/20 bg-slate-950/92 shadow-[0_24px_90px_rgba(16,185,129,0.18)]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-[11px] uppercase tracking-[0.3em] ${
                      getSetupDirection(activeAlert) === 'dump' ? 'text-rose-300' : 'text-emerald-400'
                    }`}
                  >
                    {getSetupDirection(activeAlert) === 'dump' ? 'SELL Alert' : 'BUY Alert'}
                  </p>
                  {activeAlert.estado === 'HIGH' ? (
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        getSetupDirection(activeAlert) === 'dump'
                          ? 'border-rose-500/25 bg-rose-500/12 text-rose-200'
                          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                      }`}
                    >
                      HIGH CONVICTION
                    </span>
                  ) : null}
                  {macroBottomBuy && activeAlert.symbol === strongestRow?.symbol ? (
                    <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/12 px-3 py-1 text-[11px] font-semibold text-fuchsia-200">
                      MACRO BOTTOM BUY
                    </span>
                  ) : null}
                  {macroTopSell && activeAlert.symbol === strongestRow?.symbol ? (
                    <span className="rounded-full border border-rose-500/25 bg-rose-500/12 px-3 py-1 text-[11px] font-semibold text-rose-200">
                      MACRO TOP SELL
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white">{activeAlert.symbol}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Score {activeAlert.score} detectado en {activeAlert.exchange.toUpperCase()} bajo narrativa{' '}
                  {activeAlert.narrativeLabel ?? activeAlert.narrative}.
                </p>
                  {activeAlert.estado === 'HIGH' && activeAlert.symbol === strongestRow?.symbol ? (
                    <div className="mt-4 grid gap-2">
                      {suggestedEntries.map((entry) => (
                        <div key={`popup-${entry.label}`} className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
                          {entry.label} ({getSetupDirection(activeAlert) === 'dump' ? 'sell limit' : 'buy limit'}): {formatPrice(entry.price)}
                        </div>
                      ))}
                      {tradePlan ? (
                        <div className="mt-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] p-3 text-sm text-slate-200">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Trade Plan</p>
                          <p className="mt-2">
                            {tradePlan.decision} · Avg {formatPrice(tradePlan.avgEntry)} · Stop {formatPrice(tradePlan.stopPrice)}
                          </p>
                          <p className="mt-1 text-slate-400">
                            TP1 {formatPrice(tradePlan.takeProfits[0]?.price)} · TP2 {formatPrice(tradePlan.takeProfits[1]?.price)} · TP3 {formatPrice(tradePlan.takeProfits[2]?.price)}
                          </p>
                          {positionSizing ? (
                            <p className="mt-1 text-slate-400">
                              Risk {formatPrice(positionSizing.riskBudgetUsd)} · Size {formatPrice(positionSizing.positionSizeUsd)} · Qty {positionSizing.quantity.toFixed(4)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
