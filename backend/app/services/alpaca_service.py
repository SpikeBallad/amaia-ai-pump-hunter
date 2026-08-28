"""Alpaca — the US equity venue.

WHY A SEPARATE MODULE
exchange_service is table-driven: `EXCHANGE_URLS[market_type][exchange]` and a
normalizer per venue. Alpaca does not fit that table. It authenticates with
headers where the crypto venues need none, its universe and its quotes come from
different hosts, and its bars endpoint takes a symbol list rather than one symbol
per call. Forcing it into the tables would mean special-casing every lookup in
them; keeping it here leaves the crypto path exactly as it was.

A SHARE IS A SPOT INSTRUMENT, so equities ride the existing "spot" request type
instead of adding a third MarketRequestType that every dispatcher would have to
learn. What differs is the venue label (ALPACA_EQUITY) and the instrument
(EQUITY). Asking Alpaca for "futures" returns nothing, which is the truth.

CREDENTIALS ARE OPTIONAL, ALWAYS. Without a key the venue reports itself
unavailable and drops out of the exchange pool; the crypto scan runs untouched.
An equity integration that breaks the crypto product when a key expires is worse
than no equity integration.

THE UNIVERSE IS THE LIQUID NAMES, NOT EVERY LISTING. Alpaca lists roughly eleven
thousand active assets. Scanning them is a different product, and most are too
thin for a setup to mean anything.

Alpaca's "most active" screener looks like the answer and is not: it ranks by
SHARE COUNT, so it fills with sub-dollar names. Measured live it put CHOW at
$0.65 — about $465k traded — ahead of NVDA at about $1.69bn. That is the whole
universe made of noise. The screener is therefore used as a candidate pool and
the ranking is redone on money traded, with a floor under price and dollar
volume. Nothing is maintained by hand: the pool refreshes itself daily.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings
from app.models.market import OhlcvCandle, TimeframeName

logger = logging.getLogger(__name__)

# AMAIA's two timeframes, in Alpaca's vocabulary.
TIMEFRAME_MAP: dict[TimeframeName, str] = {"1D": "1Day", "4H": "4Hour"}

# Venues whose listings are liquid enough to scan. OTC is excluded deliberately:
# a setup on a name that trades by appointment is not a setup.
_MAJOR_VENUES = {"NASDAQ", "NYSE", "ARCA", "AMEX", "BATS"}

# One URL can only carry so many symbols; Alpaca's own guidance is to batch.
_SNAPSHOT_CHUNK = 200
_TIMEOUT = 20.0


def enabled() -> bool:
    """Whether equities are available at all. Checked before every call so a
    missing key degrades to "no equities" instead of raising into a scan."""
    return bool(settings.alpaca_api_key and settings.alpaca_secret_key)


def _headers() -> dict[str, str]:
    return {
        "APCA-API-KEY-ID": settings.alpaca_api_key,
        "APCA-API-SECRET-KEY": settings.alpaca_secret_key,
        "accept": "application/json",
    }


async def _get(url: str, params: dict | None = None) -> dict | list:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(url, params=params, headers=_headers())
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------- universe


def _normalize_assets(payload: list) -> list[str]:
    out: list[str] = []
    for a in payload:
        if not a.get("tradable"):
            continue
        if str(a.get("status", "")).lower() != "active":
            continue
        if str(a.get("exchange", "")).upper() not in _MAJOR_VENUES:
            continue
        symbol = str(a.get("symbol", "")).upper()
        # Preferred shares and warrants arrive as "BRK.B" or "XYZW"; the dot
        # class is fine, but anything with a slash is a pair notation that does
        # not belong in an equity universe.
        if not symbol or "/" in symbol:
            continue
        out.append(symbol)
    return sorted(set(out))


async def _candidates() -> list[str]:
    """Names worth measuring. Ranking happens after, on dollar volume."""
    try:
        payload = await _get(
            f"{settings.alpaca_data_url}/v1beta1/screener/stocks/most-actives",
            params={"by": "volume", "top": 100},
        )
        actives = payload.get("most_actives") if isinstance(payload, dict) else None
        symbols = [str(a.get("symbol", "")).upper() for a in (actives or []) if a.get("symbol")]
        if symbols:
            return symbols
        logger.warning("[alpaca] screener returned no symbols; falling back to assets")
    except Exception as exc:  # noqa: BLE001 — the plan may not include the screener
        logger.warning("[alpaca] screener unavailable (%s); falling back to assets", exc)

    try:
        payload = await _get(
            f"{settings.alpaca_trading_url}/v2/assets",
            params={"status": "active", "asset_class": "us_equity"},
        )
        # Roughly eleven thousand names, and snapshotting all of them is 55
        # requests. The cap is applied before quoting; alphabetical order is a
        # poor proxy for interest, which is exactly why the screener is tried
        # first and this only runs when it is unavailable.
        return _normalize_assets(payload if isinstance(payload, list) else [])[:500]
    except Exception as exc:  # noqa: BLE001
        logger.error("[alpaca] discovery failed: %s", exc)
        return []


async def discover_symbols() -> list[str]:
    """The equity universe: liquid names, ranked by money traded.

    THE SCREENER RANKS BY SHARE COUNT, NOT BY MONEY, and that is not a detail —
    measured live it returned CHOW at $0.65 (about $465k traded) ahead of NVDA
    (about $1.69bn). Ranked that way the universe fills with sub-dollar names
    whose "breakout" is one order book away from noise, and the scan would spend
    its whole budget there. So the screener supplies candidates and the ranking
    is redone here on price × volume, with a floor under both.
    """
    if not enabled():
        return []

    cap = max(1, settings.alpaca_universe_cap)
    candidates = await _candidates()
    if not candidates:
        return []

    quotes = await fetch_snapshots(candidates)
    liquid = [
        (sym, q["quote_volume"])
        for sym, q in quotes.items()
        if q["price"] >= settings.alpaca_min_price
        and q["quote_volume"] >= settings.alpaca_min_dollar_volume
    ]
    liquid.sort(key=lambda pair: -pair[1])
    symbols = [sym for sym, _ in liquid[:cap]]

    logger.info(
        "[alpaca] universe: %d of %d candidates cleared $%.0fm / $%.2f floors",
        len(symbols), len(candidates),
        settings.alpaca_min_dollar_volume / 1_000_000, settings.alpaca_min_price,
    )
    return symbols


# ---------------------------------------------------------------- quotes


def _pct(now: float, prev: float) -> float:
    return ((now - prev) / prev * 100) if prev else 0.0


def _normalize_snapshots(payload: dict) -> dict[str, dict[str, float]]:
    out: dict[str, dict[str, float]] = {}
    for symbol, snap in (payload or {}).items():
        if not isinstance(snap, dict):
            continue
        daily = snap.get("dailyBar") or {}
        prev = snap.get("prevDailyBar") or {}
        close = float(daily.get("c") or 0.0)
        prev_close = float(prev.get("c") or 0.0)
        volume = float(daily.get("v") or 0.0)
        # vwap × volume is the dollar traded, which is what the crypto venues
        # report as quote_volume. Using share count instead would rank a $3
        # stock above a $400 one on identical money.
        vwap = float(daily.get("vw") or close)
        if close <= 0:
            continue
        out[str(symbol).upper()] = {
            "price": close,
            "change_24h": _pct(close, prev_close),
            "quote_volume": volume * vwap,
        }
    return out


async def fetch_snapshots(symbols: list[str]) -> dict[str, dict[str, float]]:
    """Price, session change and dollar volume, in the crypto venues' shape."""
    if not enabled() or not symbols:
        return {}

    chunks = [symbols[i:i + _SNAPSHOT_CHUNK] for i in range(0, len(symbols), _SNAPSHOT_CHUNK)]

    async def one(chunk: list[str]) -> dict[str, dict[str, float]]:
        try:
            payload = await _get(
                f"{settings.alpaca_data_url}/v2/stocks/snapshots",
                params={"symbols": ",".join(chunk), "feed": settings.alpaca_feed},
            )
            # The endpoint answers either {SYM: {...}} or {"snapshots": {...}}
            # depending on version; accept both rather than guess.
            if isinstance(payload, dict):
                return _normalize_snapshots(payload.get("snapshots") or payload)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[alpaca] snapshot chunk failed: %s", exc)
        return {}

    merged: dict[str, dict[str, float]] = {}
    for part in await asyncio.gather(*(one(c) for c in chunks)):
        merged.update(part)
    return merged


# ---------------------------------------------------------------- candles


def _to_dt(raw: str) -> datetime:
    # Alpaca stamps RFC-3339 with a trailing Z, which fromisoformat rejects on
    # older Pythons.
    return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).astimezone(timezone.utc)


def _normalize_bars(bars: list, timeframe: TimeframeName) -> list[OhlcvCandle]:
    span = 86400 if timeframe == "1D" else 4 * 3600
    out: list[OhlcvCandle] = []
    for b in bars or []:
        try:
            opened = _to_dt(b.get("t"))
            close = float(b.get("c"))
            volume = float(b.get("v") or 0.0)
            vwap = float(b.get("vw") or close)
            out.append(
                OhlcvCandle(
                    open_time=opened,
                    # Alpaca stamps a bar with its OPEN. The crypto candles carry
                    # both edges, so the close is derived rather than left equal
                    # to the open — a zero-length candle breaks any indicator
                    # that measures across the bar.
                    close_time=datetime.fromtimestamp(opened.timestamp() + span, tz=timezone.utc),
                    open=float(b.get("o")),
                    high=float(b.get("h")),
                    low=float(b.get("l")),
                    close=close,
                    volume=volume,
                    quote_volume=volume * vwap,
                    trades=int(b.get("n")) if b.get("n") is not None else None,
                )
            )
        except (TypeError, ValueError) as exc:
            logger.debug("[alpaca] skipping malformed bar: %s", exc)
    return out


async def fetch_bars(symbol: str, timeframe: TimeframeName) -> list[OhlcvCandle]:
    """The most recent `ohlcv_limit` candles, oldest first.

    TWO NON-OBVIOUS REQUIREMENTS, both found by asking and getting nothing back.
    Without `start` the endpoint answers 200 with an empty bar list — no error,
    no hint. And `limit` truncates from whichever end `sort` names, so the
    natural ascending order returns the OLDEST bars in the window: a 200-day
    start with limit 120 handed back candles ending a month ago, which every
    indicator downstream would have read as the present.

    So: reach far enough back to always have history, take the newest bars, and
    hand them over in chronological order like every other venue does.
    """
    if not enabled():
        return []

    payload = await _get(
        f"{settings.alpaca_data_url}/v2/stocks/bars",
        params={
            "symbols": symbol.upper(),
            "timeframe": TIMEFRAME_MAP[timeframe],
            # Generous on purpose: market holidays, halts and thin 4-hour
            # sessions all mean calendar days do not map to bars.
            "start": (datetime.now(timezone.utc) - timedelta(days=1200)).date().isoformat(),
            "limit": settings.ohlcv_limit,
            "sort": "desc",
            "feed": settings.alpaca_feed,
            # Splits and dividends would otherwise appear as gaps the scanner
            # reads as breakouts.
            "adjustment": "all",
        },
    )
    bars = ((payload or {}).get("bars") or {}).get(symbol.upper()) if isinstance(payload, dict) else None
    candles = _normalize_bars(bars or [], timeframe)
    candles.reverse()  # desc from the API, ascending for everyone downstream
    return candles
