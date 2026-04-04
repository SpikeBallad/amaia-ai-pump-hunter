import asyncio
from datetime import UTC, datetime, timedelta
from statistics import mean

from app.core.narratives import get_narrative, get_narrative_label
from app.core.config import settings
from app.models.market import (
    CacheInvalidateResponse,
    CacheStatsResponse,
    MarketTypeFilter,
    MarketTypeName,
    MarketOverviewResponse,
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
            supported_market_types=["spot", "futures"],
            narrative=get_narrative(symbol),
            narrative_label=get_narrative_label(symbol),
        )
        for symbol in settings.pair_universe[: settings.max_scan_pairs]
    ]
    return PairListResponse(
        pairs=pairs,
        total=len(pairs),
        supported_timeframes=["1D", "4H"],
        supported_market_types=["spot", "futures"],
    )


def _ema(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None

    multiplier = 2 / (period + 1)
    ema_value = mean(values[:period])
    for price in values[period:]:
        ema_value = (price - ema_value) * multiplier + ema_value
    return ema_value


def _rsi(values: list[float], period: int = 14) -> float | None:
    if len(values) <= period:
        return None

    gains: list[float] = []
    losses: list[float] = []
    for previous, current in zip(values[:-1], values[1:]):
        delta = current - previous
        gains.append(max(delta, 0.0))
        losses.append(abs(min(delta, 0.0)))

    avg_gain = mean(gains[:period])
    avg_loss = mean(losses[:period])

    for gain, loss in zip(gains[period:], losses[period:]):
        avg_gain = ((avg_gain * (period - 1)) + gain) / period
        avg_loss = ((avg_loss * (period - 1)) + loss) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _average(values: list[float], period: int) -> float | None:
    if len(values) < period:
        return None
    return mean(values[-period:])


def _atr(highs: list[float], lows: list[float], closes: list[float], period: int = 14) -> float | None:
    if len(highs) < period + 1 or len(lows) < period + 1 or len(closes) < period + 1:
        return None

    true_ranges: list[float] = []
    for index in range(1, len(closes)):
        high = highs[index]
        low = lows[index]
        previous_close = closes[index - 1]
        true_ranges.append(max(high - low, abs(high - previous_close), abs(low - previous_close)))

    return mean(true_ranges[-period:])


def _build_indicator_snapshot(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    volumes: list[float],
) -> dict[str, float | None]:
    current_close = closes[-1]
    previous_close = closes[-2] if len(closes) > 1 else closes[-1]
    current_volume = volumes[-1]
    average_volume_10 = _average(volumes, 10)
    average_volume_20 = _average(volumes, 20)
    ema_9 = _ema(closes, 9)
    ema_20 = _ema(closes, 20)
    ema_50 = _ema(closes, 50)
    atr_14 = _atr(highs, lows, closes, 14)
    rsi_14 = _rsi(closes, 14)

    price_change_pct = ((current_close - previous_close) / previous_close * 100) if previous_close else 0.0
    volume_change_pct = (
        ((current_volume - average_volume_20) / average_volume_20 * 100)
        if average_volume_20
        else None
    )
    atr_pct = ((atr_14 / current_close) * 100) if atr_14 and current_close else None

    return {
        "last_close": round(current_close, 6),
        "ema_9": round(ema_9, 6) if ema_9 is not None else None,
        "ema_20": round(ema_20, 6) if ema_20 is not None else None,
        "ema_50": round(ema_50, 6) if ema_50 is not None else None,
        "atr_14": round(atr_14, 6) if atr_14 is not None else None,
        "atr_pct": round(atr_pct, 4) if atr_pct is not None else None,
        "avg_volume_10": round(average_volume_10, 6) if average_volume_10 is not None else None,
        "avg_volume_20": round(average_volume_20, 6) if average_volume_20 is not None else None,
        "rsi_14": round(rsi_14, 4) if rsi_14 is not None else None,
        "price_change_pct": round(price_change_pct, 4),
        "volume_change_pct": round(volume_change_pct, 4) if volume_change_pct is not None else None,
    }


def _build_score(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    volumes: list[float],
    indicators: dict[str, float | None],
) -> tuple[int, str, dict[str, int], str, str]:
    last_close = closes[-1]
    ema_9 = indicators["ema_9"] or last_close
    ema_20 = indicators["ema_20"] or last_close
    ema_50 = indicators["ema_50"] or last_close
    atr_pct = indicators["atr_pct"] or 0.0
    avg_volume_10 = indicators["avg_volume_10"] or volumes[-1]
    avg_volume_20 = indicators["avg_volume_20"] or volumes[-1]

    ema_spread_pct = ((max(ema_9, ema_20, ema_50) - min(ema_9, ema_20, ema_50)) / last_close * 100) if last_close else 0.0
    prior_high = max(highs[-13:-1]) if len(highs) >= 13 else max(highs[:-1], default=highs[-1])
    prior_low = min(lows[-13:-1]) if len(lows) >= 13 else min(lows[:-1], default=lows[-1])
    recent_high = max(highs[-12:])
    recent_low = min(lows[-12:])
    range_pct = ((recent_high - recent_low) / last_close * 100) if last_close else 0.0
    latest_high = highs[-1]
    latest_open = closes[-2] if len(closes) > 1 else closes[-1]
    latest_close = closes[-1]

    low_volatility = atr_pct <= 3.5
    compressed_emas = ema_spread_pct <= 1.8
    declining_volume = avg_volume_10 <= avg_volume_20 * 0.92
    sideways_range = range_pct <= 6.0
    fake_breakout = latest_high > prior_high * 1.002 and latest_close < prior_high and latest_close <= latest_open

    score_breakdown = {
        "volatilidad_baja": 2 if low_volatility else 0,
        "emas_comprimidas": 2 if compressed_emas else 0,
        "volumen_decreciente": 2 if declining_volume else 0,
        "rango_lateral": 2 if sideways_range else 0,
        "fake_breakout": 1 if fake_breakout else 0,
    }
    score = sum(score_breakdown.values())

    if score >= 7:
        estado = "HIGH"
        signal_label = "Breakout Build"
        summary = "Setup de compresion fuerte con alta probabilidad de ruptura."
    elif score >= 4:
        estado = "WATCHLIST"
        signal_label = "Pressure Coil"
        summary = "Estructura interesante; conviene vigilar confirmacion."
    else:
        estado = "IGNORE"
        signal_label = "No Edge"
        summary = "El par no muestra suficiente compresion para este setup."

    return score, estado, score_breakdown, summary, signal_label


def _signal_strength_from_score(score: int) -> float:
    return round((score / 9) * 100, 2)


def _volume_score(indicators: dict[str, float | None]) -> float:
    volume_change_pct = indicators["volume_change_pct"] or 0.0
    avg_volume_10 = indicators["avg_volume_10"] or 0.0
    avg_volume_20 = indicators["avg_volume_20"] or 0.0
    if avg_volume_20 == 0:
        return 50.0
    compression_factor = max(0.0, min(1.0, 1 - (avg_volume_10 / avg_volume_20)))
    return round(max(0.0, min(100.0, 50 + (compression_factor * 50) - (volume_change_pct * 0.1))), 2)


def _momentum_score(indicators: dict[str, float | None]) -> float:
    price_change_pct = indicators["price_change_pct"] or 0.0
    atr_pct = indicators["atr_pct"] or 0.0
    return round(max(0.0, min(100.0, 50 + (price_change_pct * 6) - (atr_pct * 4))), 2)


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
        _scan_cache[cache_key] = (
            _utc_now() + timedelta(seconds=settings.scan_cache_ttl_seconds),
            scan,
        )


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
        _overview_cache[cache_key] = (
            _utc_now() + timedelta(seconds=settings.overview_cache_ttl_seconds),
            overview,
        )


async def scan_pair(
    symbol: str,
    timeframe: TimeframeName = "4H",
    exchange: str = "auto",
    market_type: MarketTypeName = "spot",
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
    indicators = _build_indicator_snapshot(closes, highs, lows, volumes)
    score, estado, score_breakdown, summary, signal_label = _build_score(closes, highs, lows, volumes, indicators)

    scan = ScanResult(
        exchange=ohlcv.exchange,
        symbol=ohlcv.symbol,
        market_type=ohlcv.market_type,
        narrative=get_narrative(ohlcv.symbol),
        narrative_label=get_narrative_label(ohlcv.symbol),
        timeframe=timeframe,
        score=score,
        estado=estado,
        trend=_trend_from_indicators(indicators),
        signal_strength=_signal_strength_from_score(score),
        volume_score=_volume_score(indicators),
        momentum_score=_momentum_score(indicators),
        signal_label=signal_label,
        summary=summary,
        indicators=indicators,
        score_breakdown=score_breakdown,
        ohlcv=ohlcv,
    )
    await _set_cached_scan(cache_key, scan)
    return scan


def _build_market_requests(market_type: MarketTypeFilter) -> list[MarketTypeName]:
    if market_type == "all":
        return ["spot", "futures"]
    return [market_type]


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

    async def _scan(symbol: str, request_market_type: MarketTypeName) -> ScanResult | None:
        async with semaphore:
            try:
                return await scan_pair(
                    symbol=symbol,
                    timeframe=timeframe,
                    exchange=exchange,
                    market_type=request_market_type,
                )
            except Exception:
                return None

    scans = await asyncio.gather(
        *[_scan(symbol, request_market_type) for request_market_type in market_requests for symbol in symbols]
    )
    valid_scans = [scan for scan in scans if scan is not None]
    ranked_scans = sorted(
        valid_scans,
        key=lambda item: (item.score, item.signal_strength, item.volume_score, item.market_type == "futures"),
        reverse=True,
    )[:limit]

    top = [
        TopOpportunity(
            rank=index,
            exchange=scan.exchange,
            symbol=scan.symbol,
            market_type=scan.market_type,
            narrative=scan.narrative,
            narrative_label=scan.narrative_label,
            timeframe=scan.timeframe,
            score=scan.score,
            estado=scan.estado,
            opportunity_score=scan.signal_strength,
            signal_label=scan.signal_label,
            setup=scan.summary,
            confidence="high" if scan.signal_strength >= 80 else "medium" if scan.signal_strength >= 65 else "low",
            indicators=scan.indicators,
            score_breakdown=scan.score_breakdown,
        )
        for index, scan in enumerate(ranked_scans, start=1)
    ]

    overview = MarketOverviewResponse(
        scans=valid_scans,
        top=top,
        total=len(valid_scans),
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
    return TopOpportunitiesResponse(opportunities=overview.top, total=len(overview.top))


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
