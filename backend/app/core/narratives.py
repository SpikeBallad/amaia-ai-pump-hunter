"""What bucket a symbol belongs to, and what to call it on the card.

TWO TAXONOMIES, ONE INTERFACE. Crypto narratives ("AI", "Gaming", "DePIN") are a
market convention: they exist because traders talk that way, they are not
derivable from anything, and so they stay a hand-written table below. Equities do
not work like that — their organising fact is the sector, which is published,
objective, and changes on its own. Inventing an equity table in the same shape
would mean maintaining a few thousand hand-written labels that silently go
stale, and this table is already living proof of that failure mode.

So equities get their sector, resolved from data (see sectors.py), and crypto
keeps its table. Callers see the same two functions either way.

BOTH FUNCTIONS ARE SYNCHRONOUS AND MUST STAY THAT WAY. They are called from
comprehensions inside request handlers, and turning a label lookup async would
ripple through market_service for something cosmetic. The sector comes from a
cache that `prime_sectors` fills — see list_pairs.
"""
from app.core.sectors import cached_sector
from app.models.market import NarrativeMode

TOKEN_NARRATIVE_LABELS: dict[str, str] = {
    "BTCUSDT": "Smart Money",
    "ETHUSDT": "Smart Money",
    "SOLUSDT": "AI",
    "XRPUSDT": "All Market",
    "DOGEUSDT": "All Market",
    "ADAUSDT": "Gaming",
    "AVAXUSDT": "Gaming",
    "LINKUSDT": "Infra",
    "BNBUSDT": "Smart Money",
    "TRXUSDT": "All Market",
    "DOTUSDT": "Infra",
    "LTCUSDT": "All Market",
    "SUIUSDT": "Infra",
    "APTUSDT": "Infra",
    "NEARUSDT": "AI",
    "ARBUSDT": "Infra",
    "OPUSDT": "Infra",
    "TIAUSDT": "DePIN",
    "SEIUSDT": "Gaming",
    "WIFUSDT": "Microcaps (MEXC)",
    "PEPEUSDT": "Microcaps (MEXC)",
    "SHIBUSDT": "Microcaps (MEXC)",
    "UNIUSDT": "All Market",
    "ATOMUSDT": "Infra",
}

CORE_NARRATIVE_LABELS = {"AI", "DePIN", "Infra", "Gaming"}

# Shown while a sector is still unresolved, and for an equity Yahoo has no sector
# for. Deliberately the asset class rather than "All Market": that bucket would
# file a bank next to a memecoin.
EQUITY_FALLBACK_LABEL = "Equities"


def is_crypto_symbol(symbol: str) -> bool:
    """AMAIA's crypto universe is quoted in USDT throughout — discover_symbols
    only ever returns pairs from Binance and MEXC. Anything else arriving here is
    an equity ticker."""
    return symbol.upper().endswith("USDT")


def get_narrative(symbol: str) -> NarrativeMode:
    if not is_crypto_symbol(symbol):
        return "Equity Sectors"
    label = TOKEN_NARRATIVE_LABELS.get(symbol.upper(), "All Market")
    if label in CORE_NARRATIVE_LABELS:
        return "Core Narratives"
    return label


def get_narrative_label(symbol: str) -> str:
    if not is_crypto_symbol(symbol):
        # No network call here: the cache is primed upstream, and an unprimed
        # symbol reads as "Equities" rather than blocking the response.
        return cached_sector(symbol) or EQUITY_FALLBACK_LABEL
    return TOKEN_NARRATIVE_LABELS.get(symbol.upper(), "All Market")
