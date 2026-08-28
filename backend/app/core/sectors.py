"""Sector lookup for equities — the narrative spine for anything that is not a coin.

WHY THIS EXISTS
AMAIA's narratives are a hand-written table of 25 USDT pairs in narratives.py.
Every symbol outside it falls through to "All Market", so an equity would arrive
labelled with the bucket meaning "we have nothing to say about this". The table
is also already rotting: it is maintained by hand and nothing tells you when a
label stops being true.

Repeating that mistake at equity scale would be worse, not better — there are
thousands of listed names against 25 pairs. So the equity label is DERIVED, not
declared: Yahoo is asked what sector a ticker belongs to, and the answer is
whatever Yahoo currently says. A reclassification propagates on its own.

WHY YAHOO'S SEARCH ENDPOINT AND NOT quoteSummary
quoteSummary/assetProfile is the obvious home for `sector`, and it now answers
401 without a cookie-and-crumb handshake. The search endpoint returns the same
two fields for an exact ticker match, needs no key, and answers 200. Being
keyless is the point: a credential that expires unnoticed is how the market
brief lost its news providers for months.

WHAT COMES BACK FOR NON-EQUITIES
ETFs and crypto pairs resolve to None, which is correct rather than a failure —
they are not equities and must keep their own narrative. Callers treat None as
"not an equity", never as "lookup broken".

NEVER RAISES. A sector is a label on a card. If Yahoo is unreachable the card
should read "Equities" and the scan should still run; losing a whole scan
because a cosmetic lookup timed out is a bad trade.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Iterable

import httpx

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"

# Yahoo serves this endpoint to browsers and 4xx to obvious scripts.
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# A company changes sector roughly never, so a hit is cached for a month. A miss
# is cached for an hour only: "no sector" is also the answer you get from a
# transient failure, and caching that for a month would freeze a real equity as
# unlabelled until the process restarted.
_TTL_HIT = 30 * 24 * 3600
_TTL_MISS = 3600

# Yahoo rate-limits per address, and a full scan can ask about hundreds of
# tickers at once. Six in flight resolves a large universe in a few seconds
# without collecting 429s.
_CONCURRENCY = 6
_TIMEOUT = 8.0

# symbol -> (sector | None, expires_at)
_cache: dict[str, tuple[str | None, float]] = {}
_lock = asyncio.Lock()


def cached_sector(symbol: str) -> str | None:
    """Sector already known for `symbol`, without any network call.

    The narrative helpers are synchronous and called from list comprehensions
    inside request handlers; making them async would ripple through the service
    for a cosmetic label. They read the cache, and `prime_sectors` fills it.
    """
    hit = _cache.get(symbol.upper())
    if hit is None:
        return None
    sector, expires = hit
    return sector if expires > time.time() else None


async def _fetch_one(client: httpx.AsyncClient, symbol: str) -> str | None:
    r = await client.get(
        _SEARCH_URL,
        params={"q": symbol, "quotesCount": 6, "newsCount": 0},
        headers={"User-Agent": _UA, "Accept": "application/json"},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    quotes = r.json().get("quotes") or []

    # Match the ticker exactly. A search for "O" returns a dozen names and the
    # first is not necessarily the one asked about; taking quotes[0] would file
    # Realty Income under whatever happened to rank highest that day.
    for q in quotes:
        if str(q.get("symbol", "")).upper() != symbol.upper():
            continue
        if q.get("quoteType") != "EQUITY":
            return None  # ETF, index or crypto pair — not an equity, by design
        sector = q.get("sector")
        return str(sector) if sector else None
    return None


async def prime_sectors(symbols: Iterable[str]) -> dict[str, str | None]:
    """Resolve and cache the sector for each symbol. Returns what is known.

    Symbols already cached cost nothing, so this is safe to call on every
    request: after the first scan, an unchanged universe makes zero requests.
    """
    wanted = {s.upper() for s in symbols if s}
    now = time.time()
    missing = [s for s in wanted if (c := _cache.get(s)) is None or c[1] <= now]

    if missing:
        sem = asyncio.Semaphore(_CONCURRENCY)

        async def one(client: httpx.AsyncClient, sym: str) -> None:
            async with sem:
                try:
                    sector = await _fetch_one(client, sym)
                    ttl = _TTL_HIT if sector else _TTL_MISS
                except Exception as exc:  # noqa: BLE001 — cosmetic lookup, never fatal
                    logger.warning("[sectors] %s unresolved: %s", sym, exc)
                    sector, ttl = None, _TTL_MISS
                async with _lock:
                    _cache[sym] = (sector, time.time() + ttl)

        try:
            async with httpx.AsyncClient() as client:
                await asyncio.gather(*(one(client, s) for s in missing))
        except Exception as exc:  # noqa: BLE001 — e.g. no network at all
            logger.warning("[sectors] lookup unavailable: %s", exc)

        resolved = sum(1 for s in missing if (_cache.get(s) or (None, 0))[0])
        logger.info("[sectors] resolved %d/%d newly seen symbols", resolved, len(missing))

    return {s: cached_sector(s) for s in wanted}
