import asyncio
from datetime import UTC, datetime, timedelta
from statistics import mean

from app.core.config import settings
from app.core.narratives import get_narrative, get_narrative_label
from app.models.market import (
    CacheInvalidateResponse,
    CacheStatsResponse,
    MarketOverviewResponse,
    MarketRequestType,
    MarketTypeFilter,
    PairItem,
    PairListResponse,
    ScanResult,
    TimeframeName,
    TopOpportunitiesResponse,
    TopOpportunity,
)
from app.services.exchange_service import fetch_ohlcv

_scan_cache: dict[tuple[str, str, str, str], tuple[datetime, ScanResult]] = {}
_overview_cache: dict[tuple[str, str, str, int], tuple[datetime, MarketOverviewResponse]] = {}
_scan_cache_lock = asyncio.Lock()
_overview_cache_lock = asyncio.Lock()
_scan_cache_hits = 0
_scan_cache_misses = 0
_overview_cache_hits = 0
_overview_cache_misses = 0


def list_pairs() -> PairListResponse:
    pairs = [
        PairItem(
            symbol=symbol,
            base_asset=symbol.removesuffix("USDT"),
            quote_asset="USDT",
            supported_exchanges=["binance", "mexc"],
            supported_markets=["BINANCE_SPOT", "BINANCE_FUTURES", "MEXC_SPOT", "MEXC_FUTURES"],
            supported_instruments=["SPOT", "PERPETUAL"],
            narrative=get_narrative(symbol),
            narrative_label=get_narrative_label(symbol),
        )
        for symbol in settings.pair_universe[: settings.max_scan_pairs]
    ]
    return PairListResponse(
        pairs=pairs,
        total=len(pairs),
        supported_timeframes=["1D", "4H"],
        supported_markets=["BINANCE_SPOT", "BINANCE_FUTURES", "MEXC_SPOT", "MEXC_FUTURES"],
    )


def _ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    multiplier = 2 / (period + 1)
    ema_value = mean(values[:period])
    for price in values[period:]:
        ema_value = (price - ema_value) * multiplier + ema_value
    return ema_value


def _average(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return mean(values[-period:])


def _atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> float | None:
    if len(highs) < period + 1 or len(lows) < period + 1 or len(closes) < period + 1:
        return None
    true_ranges: list[float] = []
    for index in range(1, len(closes)):
        true_ranges.append(
            max(
                highs[index] - lows[index],
                abs(highs[index] - closes[index - 1]),
                abs(lows[index] - closes[index - 1]),
            )
        )
    return mean(true_ranges[-period:])


def _round(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(value, digits)


def _lookback_for_24h(timeframe: TimeframeName) -> int:
    return 1 if timeframe == "1D" else 6


def _change_24h(closes: list[float], timeframe: TimeframeName) -> float:
    lookback = _lookback_for_24h(timeframe)
    if len(closes) <= lookback:
        return 0.0
    reference_close = closes[-(lookback + 1)]
    if reference_close == 0:
        return 0.0
    return ((closes[-1] - reference_close) / reference_close) * 100


def _build_indicator_snapshot(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    volumes: list[float],
    timeframe: TimeframeName,
) -> dict[str, float | None]:
    current_close = closes[-1]
    current_volume = volumes[-1]
    average_volume_10 = _average(volumes, 10)
    average_volume_20 = _average(volumes, 20)
    average_volume_30 = _average(volumes, 30)
    ema_9 = _ema(closes, 9)
    ema_20 = _ema(closes, 20)
    ema_50 = _ema(closes, 50)
    atr_14 = _atr(highs, lows, closes, 14)
    atr_ratio = (atr_14 / current_close) if atr_14 and current_close else None

    accumulation_window = min(30, len(closes))
    accumulation_high = max(highs[-accumulation_window:])
    accumulation_low = min(lows[-accumulation_window:])
    range_pct = ((accumulation_high - accumulation_low) / current_close * 100) if current_close else 0.0
    cycle_high = max(highs)
    dump_pct = ((cycle_high - current_close) / cycle_high * 100) if cycle_high else 0.0
    change_24h = _change_24h(closes, timeframe)
    volume_change_pct = (
        ((current_volume - average_volume_20) / average_volume_20 * 100)
        if average_volume_20
        else None
    )

    return {
        "last_close": _round(current_close, 6),
        "ema_9": _round(ema_9, 6),
        "ema_20": _round(ema_20, 6),
        "ema_50": _round(ema_50, 6),
        "atr_14": _round(atr_14, 6),
        "atr_pct": _round((atr_ratio * 100) if atr_ratio is not None else None, 4),
        "atr_ratio": _round(atr_ratio, 6),
        "avg_volume_10": _round(average_volume_10, 6),
        "avg_volume_20": _round(average_volume_20, 6),
        "avg_volume_30": _round(average_volume_30, 6),
        "change_24h": _round(change_24h, 4),
        "volume_change_pct": _round(volume_change_pct, 4),
        "range_pct": _round(range_pct, 4),
        "dump_pct": _round(dump_pct, 4),
        "accumulation_high": _round(accumulation_high, 6),
        "accumulation_low": _round(accumulation_low, 6),
        "cycle_high": _round(cycle_high, 6),
    }


def _volume_pattern(volumes: list[float], indicators: dict[str, float | None]) -> tuple[str, bool, bool]:
    avg_volume_10 = indicators["avg_volume_10"] or volumes[-1]
    avg_volume_20 = indicators["avg_volume_20"] or volumes[-1]
    current_volume = volumes[-1]
    recent_spike = max(volumes[-3:]) if len(volumes) >= 3 else current_volume

    compression = avg_volume_10 <= avg_volume_20 * 0.75
    spike = recent_spike >= avg_volume_20 * 1.8

    if compression and spike:
        return "Compression + Spike", compression, spike
    if compression:
        return "Compression", compression, spike
    if spike:
        return "Spike Expansion", compression, spike
    return "Balanced", compression, spike


def _liquidity_trap(highs: list[float], lows: list[float], closes: list[float], accumulation_high: float, accumulation_low: float) -> bool:
    latest_high = highs[-1]
    latest_low = lows[-1]
    latest_close = closes[-1]
    upper_trap = latest_high > accumulation_high * 1.01 and latest_close < accumulation_high
    lower_trap = latest_low < accumulation_low * 0.99 and latest_close > accumulation_low
    return upper_trap or lower_trap


def _trend_from_indicators(indicators: dict[str, float | None]) -> str:
    ema_9 = indicators["ema_9"]
    ema_20 = indicators["ema_20"]
    ema_50 = indicators["ema_50"]
    if ema_9 is None or ema_20 is None or ema_50 is None:
        return "neutral"
    if ema_9 >= ema_20 >= ema_50:
        return "bullish"
    if ema_9 <= ema_20 <= ema_50:
        return "bearish"
    return "neutral"


def _build_setup_analysis(
    scan_exchange: str,
    market_type: str,
    instrument_type: str,
    closes: list[float],
    highs: list[float],
    lows: list[float],
    volumes: list[float],
    indicators: dict[str, float | None],
) -> dict[str, object]:
    last_close = closes[-1]
    ema_9 = indicators["ema_9"] or last_close
    ema_20 = indicators["ema_20"] or last_close
    ema_50 = indicators["ema_50"] or last_close
    atr_ratio = indicators["atr_ratio"] or 1.0
    dump_pct = indicators["dump_pct"] or 0.0
    range_pct = indicators["range_pct"] or 100.0
    change_24h = indicators["change_24h"] or 0.0
    accumulation_high = indicators["accumulation_high"] or max(highs[-30:])
    accumulation_low = indicators["accumulation_low"] or min(lows[-30:])
    average_volume_20 = indicators["avg_volume_20"] or volumes[-1]
    ema_spread_ratio = ((max(ema_9, ema_20, ema_50) - min(ema_9, ema_20, ema_50)) / last_close) if last_close else 1.0

    volume_pattern, volume_compression, volume_spike = _volume_pattern(volumes, indicators)
    ema_flattened = ema_spread_ratio <= 0.02
    liquidity_trap = _liquidity_trap(highs, lows, closes, accumulation_high, accumulation_low)
    low_volatility = atr_ratio <= 0.02
    tight_range = range_pct <= 15
    deep_dump = dump_pct >= 70
    breakout_starting = closes[-1] > accumulation_high * 1.015 and volumes[-1] >= average_volume_20 * 1.6

    score_breakdown = {
        "deep_dump": 2 if deep_dump else 0,
        "tight_accumulation": 2 if tight_range else 0,
        "low_volatility": 2 if low_volatility else 0,
        "volume_compression_spike": 2 if volume_compression and volume_spike else 1 if volume_compression else 0,
        "ema_flattening": 1 if ema_flattened else 0,
        "liquidity_traps": 1 if liquidity_trap else 0,
    }
    score = sum(score_breakdown.values())

    excluded_reason = None
    if change_24h > 25:
        excluded_reason = "Excluded: 24h change above 25%, already pumped."

    if score >= 8 and breakout_starting and not excluded_reason:
        estado = "HIGH"
        status_label = "Breakout Starting"
        signal_label = "HIGH PROBABILITY PUMP SETUP"
        summary = "Ruptura inicial detectada tras compresion profunda."
    elif score >= 8 and not excluded_reason:
        estado = "HIGH"
        status_label = "Pre-Breakout"
        signal_label = "HIGH PROBABILITY PUMP SETUP"
        summary = "Pre-breakout con compresion avanzada y perfil de acumulacion fuerte."
    elif score >= 5 and not excluded_reason:
        estado = "WATCHLIST"
        status_label = "Accumulation"
        signal_label = "Accumulation Build"
        summary = "Acumulacion valida, pero aun sin la calidad maxima del setup."
    else:
        estado = "IGNORE"
        status_label = "Accumulation"
        signal_label = "No Edge"
        summary = excluded_reason or "La estructura todavia no muestra una ventaja estadistica clara."

    quote_volume = average_volume_20 * last_close
    low_cap = quote_volume <= 15_000_000
    silent_market = quote_volume <= 4_000_000 and abs(change_24h) <= 3
    signal_strength = round((score / 10) * 100, 2)
    volume_score = round(min(100.0, max(0.0, (55 if volume_compression else 35) + (25 if volume_spike else 0))), 2)
    momentum_score = round(min(100.0, max(0.0, 50 + (max(0.0, 25 - abs(change_24h)) * 2) - (atr_ratio * 1000))), 2)

    explanation = (
        f"This {market_type.replace('_', ' ').title()} asset on {scan_exchange.title()} shows a {dump_pct:.1f}% drawdown, "
        f"a tight {range_pct:.1f}% accumulation range, and an ATR ratio of {atr_ratio:.4f}. "
        f"Volume profile: {volume_pattern}. Liquidity traps are {'present' if liquidity_trap else 'limited'}, "
        f"while EMA compression is {'confirmed' if ema_flattened else 'still loose'}. "
        f"The instrument is classified as {instrument_type.lower()} and currently sits in {status_label.lower()} mode."
    )

    return {
        "score": score,
        "estado": estado,
        "status_label": status_label,
        "signal_label": signal_label,
        "summary": summary,
        "explanation": explanation,
        "dump_pct": round(dump_pct, 2),
        "range_pct": round(range_pct, 2),
        "atr_ratio": round(atr_ratio, 4),
        "volume_pattern": volume_pattern,
        "liquidity_trap": liquidity_trap,
        "ema_flattened": ema_flattened,
        "low_cap": low_cap,
        "silent_market": silent_market,
        "is_breaking_out": breakout_starting,
        "excluded_reason": excluded_reason,
        "signal_strength": signal_strength,
        "volume_score": volume_score,
        "momentum_score": momentum_score,
        "score_breakdown": score_breakdown,
    }


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


def _get_cached_scan(cache_key: tuple[str, str, str, str]) -> ScanResult | None:
    global _scan_cache_hits, _scan_cache_misses
    cached_entry = _scan_cache.get(cache_key)
    if cached_entry is None:
        _scan_cache_misses += 1
        return None
    expires_at, scan = cached_entry
    if expires_at <= _utc_now():
        _scan_cache.pop(cache_key, None)
        _scan_cache_misses += 1
        return None
    _scan_cache_hits += 1
    return scan


async def _set_cached_scan(cache_key: tuple[str, str, str, str], scan: ScanResult) -> None:
    async with _scan_cache_lock:
        _scan_cache[cache_key] = (_utc_now() + timedelta(seconds=settings.scan_cache_ttl_seconds), scan)


def _get_cached_overview(cache_key: tuple[str, str, str, int]) -> MarketOverviewResponse | None:
    global _overview_cache_hits, _overview_cache_misses
    cached_entry = _overview_cache.get(cache_key)
    if cached_entry is None:
        _overview_cache_misses += 1
        return None
    expires_at, overview = cached_entry
    if expires_at <= _utc_now():
        _overview_cache.pop(cache_key, None)
        _overview_cache_misses += 1
        return None
    _overview_cache_hits += 1
    return overview


async def _set_cached_overview(cache_key: tuple[str, str, str, int], overview: MarketOverviewResponse) -> None:
    async with _overview_cache_lock:
        _overview_cache[cache_key] = (_utc_now() + timedelta(seconds=settings.overview_cache_ttl_seconds), overview)


async def scan_pair(
    symbol: str,
    timeframe: TimeframeName = "4H",
    exchange: str = "auto",
    market_type: MarketRequestType = "spot",
) -> ScanResult:
    cache_key = (symbol.upper(), timeframe, exchange, market_type)
    cached_scan = _get_cached_scan(cache_key)
    if cached_scan is not None:
        return cached_scan

    ohlcv = await fetch_ohlcv(symbol=symbol, timeframe=timeframe, exchange=exchange, market_type=market_type)
    closes = [candle.close for candle in ohlcv.candles]
    highs = [candle.high for candle in ohlcv.candles]
    lows = [candle.low for candle in ohlcv.candles]
    volumes = [candle.volume for candle in ohlcv.candles]
    indicators = _build_indicator_snapshot(closes, highs, lows, volumes, timeframe)
    setup = _build_setup_analysis(
        scan_exchange=ohlcv.exchange,
        market_type=ohlcv.market_type,
        instrument_type=ohlcv.instrument_type,
        closes=closes,
        highs=highs,
        lows=lows,
        volumes=volumes,
        indicators=indicators,
    )

    scan = ScanResult(
        exchange=ohlcv.exchange,
        symbol=ohlcv.symbol,
        market_type=ohlcv.market_type,
        instrument_type=ohlcv.instrument_type,
        narrative=get_narrative(ohlcv.symbol),
        narrative_label=get_narrative_label(ohlcv.symbol),
        timeframe=timeframe,
        score=setup["score"],
        estado=setup["estado"],
        status_label=setup["status_label"],
        trend=_trend_from_indicators(indicators),
        signal_strength=setup["signal_strength"],
        volume_score=setup["volume_score"],
        momentum_score=setup["momentum_score"],
        signal_label=setup["signal_label"],
        summary=setup["summary"],
        explanation=setup["explanation"],
        price=indicators["last_close"] or closes[-1],
        volume=indicators["avg_volume_20"] or volumes[-1],
        change_24h=indicators["change_24h"] or 0.0,
        dump_pct=setup["dump_pct"],
        range_pct=setup["range_pct"],
        atr_ratio=setup["atr_ratio"],
        volume_pattern=setup["volume_pattern"],
        liquidity_trap=setup["liquidity_trap"],
        ema_flattened=setup["ema_flattened"],
        low_cap=setup["low_cap"],
        silent_market=setup["silent_market"],
        is_breaking_out=setup["is_breaking_out"],
        excluded_reason=setup["excluded_reason"],
        indicators=indicators,
        score_breakdown=setup["score_breakdown"],
        ohlcv=ohlcv,
    )
    await _set_cached_scan(cache_key, scan)
    return scan


def _build_market_requests(market_type: MarketTypeFilter) -> list[MarketRequestType]:
    if market_type == "all":
        return ["spot", "futures"]
    return [market_type]


def _ranking_key(scan: ScanResult) -> tuple[float, ...]:
    attention_score = max(0.0, 100 - abs(scan.change_24h))
    return (
        float(scan.score),
        scan.signal_strength,
        1.0 if scan.low_cap else 0.0,
        1.0 if scan.silent_market else 0.0,
        attention_score,
        scan.dump_pct,
    )


def _to_top_opportunity(scan: ScanResult, rank: int) -> TopOpportunity:
    return TopOpportunity(
        rank=rank,
        exchange=scan.exchange,
        symbol=scan.symbol,
        market_type=scan.market_type,
        instrument_type=scan.instrument_type,
        narrative=scan.narrative,
        narrative_label=scan.narrative_label,
        timeframe=scan.timeframe,
        score=scan.score,
        estado=scan.estado,
        status_label=scan.status_label,
        opportunity_score=scan.signal_strength,
        signal_label=scan.signal_label,
        setup=scan.summary,
        explanation=scan.explanation,
        confidence="high" if scan.signal_strength >= 80 else "medium" if scan.signal_strength >= 60 else "low",
        price=scan.price,
        volume=scan.volume,
        change_24h=scan.change_24h,
        dump_pct=scan.dump_pct,
        range_pct=scan.range_pct,
        atr_ratio=scan.atr_ratio,
        volume_pattern=scan.volume_pattern,
        low_cap=scan.low_cap,
        silent_market=scan.silent_market,
        indicators=scan.indicators,
        score_breakdown=scan.score_breakdown,
    )


async def get_market_overview(
    timeframe: TimeframeName = "4H",
    exchange: str = "auto",
    market_type: MarketTypeFilter = "spot",
    limit: int = 10,
) -> MarketOverviewResponse:
    overview_cache_key = (exchange, timeframe, market_type, limit)
    cached_overview = _get_cached_overview(overview_cache_key)
    if cached_overview is not None:
        return cached_overview

    symbols = settings.pair_universe[: settings.max_scan_pairs]
    market_requests = _build_market_requests(market_type)
    semaphore = asyncio.Semaphore(8)

    async def _scan(symbol: str, request_market_type: MarketRequestType) -> ScanResult | None:
        async with semaphore:
            try:
                return await scan_pair(symbol=symbol, timeframe=timeframe, exchange=exchange, market_type=request_market_type)
            except Exception:
                return None

    scans = await asyncio.gather(*[_scan(symbol, request_market_type) for request_market_type in market_requests for symbol in symbols])
    valid_scans = [scan for scan in scans if scan is not None]
    actionable_scans = [scan for scan in valid_scans if scan.excluded_reason is None]
    ranked_scans = sorted(actionable_scans, key=_ranking_key, reverse=True)
    top_scans = ranked_scans[:limit]
    watchlist_scans = [scan for scan in ranked_scans if scan.score >= 8 and not scan.is_breaking_out][:limit]

    top = [_to_top_opportunity(scan, index) for index, scan in enumerate(top_scans, start=1)]
    watchlist = [_to_top_opportunity(scan, index) for index, scan in enumerate(watchlist_scans, start=1)]

    overview = MarketOverviewResponse(
        scans=actionable_scans,
        top=top,
        watchlist=watchlist,
        total=len(actionable_scans),
        generated_at=_utc_now(),
        cache_ttl_seconds=settings.overview_cache_ttl_seconds,
    )
    await _set_cached_overview(overview_cache_key, overview)
    return overview


async def get_top_opportunities(
    timeframe: TimeframeName = "4H",
    exchange: str = "auto",
    market_type: MarketTypeFilter = "spot",
    limit: int = 10,
) -> TopOpportunitiesResponse:
    overview = await get_market_overview(timeframe=timeframe, exchange=exchange, market_type=market_type, limit=limit)
    return TopOpportunitiesResponse(opportunities=overview.top, watchlist=overview.watchlist, total=len(overview.top))


def _hit_rate(hits: int, misses: int) -> float:
    total = hits + misses
    if total == 0:
        return 0.0
    return round((hits / total) * 100, 2)


def get_cache_stats() -> CacheStatsResponse:
    return CacheStatsResponse(
        scan_cache_entries=len(_scan_cache),
        overview_cache_entries=len(_overview_cache),
        scan_cache_hits=_scan_cache_hits,
        scan_cache_misses=_scan_cache_misses,
        scan_cache_hit_rate=_hit_rate(_scan_cache_hits, _scan_cache_misses),
        overview_cache_hits=_overview_cache_hits,
        overview_cache_misses=_overview_cache_misses,
        overview_cache_hit_rate=_hit_rate(_overview_cache_hits, _overview_cache_misses),
        redis_enabled=bool(settings.redis_url),
    )


async def invalidate_cache() -> CacheInvalidateResponse:
    scan_removed = len(_scan_cache)
    overview_removed = len(_overview_cache)
    async with _scan_cache_lock:
        _scan_cache.clear()
    async with _overview_cache_lock:
        _overview_cache.clear()
    return CacheInvalidateResponse(
        cleared=True,
        scan_cache_entries_removed=scan_removed,
        overview_cache_entries_removed=overview_removed,
    )
