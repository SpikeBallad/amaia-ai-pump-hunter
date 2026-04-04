'use client';

import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { WS_URL, fetchCacheStats, fetchHealth, fetchOverview, invalidateCache } from '@/src/lib/api';
import { playAlertSound, sendTelegramAlert } from '@/src/lib/alerts';

const REFRESH_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 5_000;

const MarketContext = createContext(null);

function getMarketBucket(marketType) {
  return marketType?.endsWith('FUTURES') ? 'futures' : 'spot';
}

function mapScanToRow(scan) {
  return {
    id: `${scan.market_type}-${scan.exchange}-${scan.symbol}`,
    symbol: scan.symbol,
    exchange: scan.exchange,
    marketType: scan.market_type,
    marketBucket: getMarketBucket(scan.market_type),
    instrumentType: scan.instrument_type,
    narrative: scan.narrative,
    narrativeLabel: scan.narrative_label,
    price: scan.price ?? scan.indicators?.last_close ?? null,
    score: scan.score,
    estado: scan.estado,
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

function mergeTopRows(previousRows, topRows) {
  const mergedById = new Map(previousRows.map((row) => [`${row.marketType}-${row.exchange}-${row.symbol}`, row]));
  topRows.forEach((row) => {
    const rowId = `${row.market_type}-${row.exchange}-${row.symbol}`;
    mergedById.set(rowId, {
      id: rowId,
      symbol: row.symbol,
      exchange: row.exchange,
      marketType: row.market_type,
      marketBucket: getMarketBucket(row.market_type),
      instrumentType: row.instrument_type,
      narrative: row.narrative,
      narrativeLabel: row.narrative_label,
      price: row.price ?? mergedById.get(rowId)?.price ?? null,
      score: row.score,
      estado: row.estado,
      statusLabel: row.status_label,
      volume: row.volume ?? mergedById.get(rowId)?.volume ?? null,
      volatility: mergedById.get(rowId)?.volatility ?? null,
      atrRatio: row.atr_ratio,
      dumpPct: row.dump_pct,
      rangePct: row.range_pct,
      volumePattern: row.volume_pattern,
      explanation: row.explanation,
      change24h: row.change_24h,
      lowCap: row.low_cap,
      silentMarket: row.silent_market,
      isBreakingOut: row.status_label === 'Breakout Starting',
      summary: row.setup,
      signalLabel: row.signal_label,
      signalStrength: row.opportunity_score,
      scoreBreakdown: row.score_breakdown,
      candles: mergedById.get(rowId)?.candles ?? [],
    });
  });
  return Array.from(mergedById.values());
}

export function MarketProvider({ children }) {
  const [backendStatus, setBackendStatus] = useState('Conectando...');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [marketTypeFilter, setMarketTypeFilter] = useState('all');
  const [narrativeFilter, setNarrativeFilter] = useState('All Market');
  const [scoreFilter, setScoreFilter] = useState(4);
  const [rows, setRows] = useState([]);
  const [topRows, setTopRows] = useState([]);
  const [watchlistRows, setWatchlistRows] = useState([]);
  const [scoreChanges, setScoreChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alertLog, setAlertLog] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);

  const resolvedExchange = exchangeFilter === 'all' ? 'auto' : exchangeFilter;
  const resolvedMarketType = marketTypeFilter === 'all' ? 'all' : marketTypeFilter;

  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const resolvedExchangeRef = useRef(resolvedExchange);
  const resolvedMarketTypeRef = useRef(resolvedMarketType);
  const alertTimeoutRef = useRef(null);
  const lastAlertScoresRef = useRef(new Map());

  useEffect(() => {
    resolvedExchangeRef.current = resolvedExchange;
  }, [resolvedExchange]);

  useEffect(() => {
    resolvedMarketTypeRef.current = resolvedMarketType;
  }, [resolvedMarketType]);

  const dismissActiveAlert = useCallback(() => {
    setActiveAlert(null);
    if (alertTimeoutRef.current) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  }, []);

  const triggerAlert = useCallback(
    async (row, source = 'stream') => {
      const alertItem = {
        id: `${row.id}-${Date.now()}`,
        symbol: row.symbol,
        exchange: row.exchange,
        score: row.score,
        estado: row.estado,
        narrative: row.narrative,
        narrativeLabel: row.narrativeLabel,
        source,
        createdAt: new Date().toISOString(),
      };

      startTransition(() => {
        setActiveAlert(alertItem);
        setAlertLog((previous) => [alertItem, ...previous].slice(0, 25));
      });

      if (soundEnabled) {
        playAlertSound();
      }

      try {
        await sendTelegramAlert(alertItem);
      } catch {
        // Placeholder does not need to fail the UI.
      }

      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
      alertTimeoutRef.current = window.setTimeout(() => {
        setActiveAlert(null);
      }, 6000);
    },
    [soundEnabled]
  );

  const syncAlertsFromRows = useCallback(
    async (candidateRows, source) => {
      const nextScores = new Map();
      const triggeredRows = [];

      candidateRows.forEach((row) => {
        nextScores.set(row.id, row.score);
        const previousScore = lastAlertScoresRef.current.get(row.id);
        const crossedThreshold =
          row.score >= 7 &&
          (previousScore === undefined || previousScore < 7 || previousScore !== row.score);

        if (crossedThreshold) {
          triggeredRows.push(row);
        }
      });

      lastAlertScoresRef.current = nextScores;

      for (const row of triggeredRows) {
        await triggerAlert(row, source);
      }
    },
    [triggerAlert]
  );

  const refreshMarketData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }

    try {
        const [healthData, overviewData, cacheStatsData] = await Promise.all([
          fetchHealth(),
          fetchOverview({
            exchange: resolvedExchangeRef.current,
            marketType: resolvedMarketTypeRef.current,
            limit: 10,
            timeframe: '4H',
          }),
          fetchCacheStats(),
        ]);
      const nextRows = (overviewData.scans ?? []).map((scan) => mapScanToRow(scan));

      if (!mountedRef.current) {
        return;
      }

      startTransition(() => {
        setBackendStatus(healthData.message);
        setRows(nextRows);
        setTopRows(overviewData.top ?? []);
        setWatchlistRows(overviewData.watchlist ?? []);
        setLastUpdated(overviewData.generated_at ? new Date(overviewData.generated_at) : new Date());
        setCacheStats(cacheStatsData);
        setError('');
      });
      await syncAlertsFromRows(nextRows, 'rest');
    } catch (requestError) {
      if (!mountedRef.current) {
        return;
      }
      setBackendStatus('Backend no disponible');
      setError('No se pudo cargar informacion del backend.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [syncAlertsFromRows]);

  const invalidateMarketCache = useCallback(async () => {
    try {
      await invalidateCache();
      await refreshMarketData();
    } catch {
      setError('No se pudo invalidar la cache.');
    }
  }, [refreshMarketData]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    refreshMarketData();

    refreshIntervalRef.current = window.setInterval(() => {
      refreshMarketData({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        window.clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshMarketData, resolvedExchange, resolvedMarketType]);

  useEffect(() => {
    if (!WS_URL || resolvedMarketType !== 'spot') {
      setSocketStatus('disabled');
      return undefined;
    }

    function cleanupSocket() {
      if (websocketRef.current) {
        websocketRef.current.onopen = null;
        websocketRef.current.onclose = null;
        websocketRef.current.onerror = null;
        websocketRef.current.onmessage = null;
        websocketRef.current.close();
        websocketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    function connectSocket() {
      cleanupSocket();
      setSocketStatus('connecting');

      const socket = new WebSocket(WS_URL);
      websocketRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) {
          return;
        }
        setSocketStatus('live');
      };

      socket.onerror = () => {
        if (!mountedRef.current) {
          return;
        }
        setSocketStatus('error');
        setError('Conexion WebSocket inestable. Se mantiene fallback por REST.');
      };

      socket.onclose = () => {
        if (!mountedRef.current) {
          return;
        }
        setSocketStatus('reconnecting');
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectSocket();
        }, RECONNECT_DELAY_MS);
      };

      socket.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type !== 'snapshot') {
            return;
          }

          if (!mountedRef.current) {
            return;
          }

          startTransition(() => {
            setTopRows(payload.top ?? []);
            setScoreChanges(payload.score_changes ?? []);
            setLastUpdated(payload.generated_at ? new Date(payload.generated_at) : new Date());
            setRows((previousRows) => {
              const mergedRows = mergeTopRows(previousRows, payload.top ?? []);
              void syncAlertsFromRows(mergedRows, 'stream');
              return mergedRows;
            });
            setError('');
          });

          if ((payload.score_changes ?? []).length > 0) {
            await refreshMarketData({ silent: true });
          }
        } catch (messageError) {
          if (!mountedRef.current) {
            return;
          }
          setError('No se pudo procesar el stream en tiempo real.');
        }
      };
    }

    connectSocket();

    return () => {
      cleanupSocket();
    };
  }, [refreshMarketData, resolvedMarketType, syncAlertsFromRows]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const exchangeMatches = exchangeFilter === 'all' || row.exchange === exchangeFilter;
      const marketMatches = marketTypeFilter === 'all' || row.marketBucket === marketTypeFilter;
      const narrativeMatches = narrativeFilter === 'All Market' || row.narrative === narrativeFilter;
      const scoreMatches = row.score >= scoreFilter;
      const moduleMatches =
        moduleFilter === 'all' ||
        (moduleFilter === 'spot' && row.marketBucket === 'spot') ||
        (moduleFilter === 'futures' && row.marketBucket === 'futures') ||
        (moduleFilter === 'watchlist' && row.score >= 8 && !row.isBreakingOut);
      return exchangeMatches && marketMatches && narrativeMatches && scoreMatches && moduleMatches;
    });
  }, [exchangeFilter, marketTypeFilter, moduleFilter, narrativeFilter, rows, scoreFilter]);

  const topPanelRows = useMemo(() => {
    const sourceRows = moduleFilter === 'watchlist' ? watchlistRows : topRows;
    return sourceRows.filter((row) => {
      const exchangeMatches = exchangeFilter === 'all' || row.exchange === exchangeFilter;
      const marketMatches = marketTypeFilter === 'all' || getMarketBucket(row.market_type ?? row.marketType) === marketTypeFilter;
      const narrativeMatches = narrativeFilter === 'All Market' || row.narrative === narrativeFilter;
      const scoreMatches = row.score >= scoreFilter;
      const moduleMatches =
        moduleFilter === 'all' ||
        (moduleFilter === 'spot' && getMarketBucket(row.market_type ?? row.marketType) === 'spot') ||
        (moduleFilter === 'futures' && getMarketBucket(row.market_type ?? row.marketType) === 'futures') ||
        (moduleFilter === 'watchlist' && row.score >= 8);
      return exchangeMatches && marketMatches && narrativeMatches && scoreMatches && moduleMatches;
    });
  }, [exchangeFilter, marketTypeFilter, moduleFilter, narrativeFilter, scoreFilter, topRows, watchlistRows]);

  const summary = useMemo(() => {
    const highCount = filteredRows.filter((row) => row.estado === 'HIGH').length;
    const watchlistCount = filteredRows.filter((row) => row.estado === 'WATCHLIST').length;
    const averageScore = filteredRows.length
      ? filteredRows.reduce((total, row) => total + row.score, 0) / filteredRows.length
      : 0;

    return {
      highCount,
      watchlistCount,
      averageScore,
      visibleCount: filteredRows.length,
      spotCount: filteredRows.filter((row) => row.marketBucket === 'spot').length,
      futuresCount: filteredRows.filter((row) => row.marketBucket === 'futures').length,
      watchlistCountOnly: filteredRows.filter((row) => row.score >= 8 && !row.isBreakingOut).length,
      silentCount: filteredRows.filter((row) => row.silentMarket).length,
      spikeCount: filteredRows.filter((row) => (row.volumePattern ?? '').toLowerCase().includes('spike')).length,
    };
  }, [filteredRows]);

  const value = useMemo(
    () => ({
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
      topRows,
      watchlistRows,
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
    }),
    [
      backendStatus,
      moduleFilter,
      exchangeFilter,
      marketTypeFilter,
      narrativeFilter,
      scoreFilter,
      soundEnabled,
      cacheStats,
      rows,
      filteredRows,
      topRows,
      watchlistRows,
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
      invalidateMarketCache,
    ]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within a MarketProvider');
  }
  return context;
}
