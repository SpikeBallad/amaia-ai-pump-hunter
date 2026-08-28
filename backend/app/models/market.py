from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ExchangeName = Literal["binance", "mexc", "auto"]
ResolvedExchangeName = Literal["binance", "mexc"]
TimeframeName = Literal["1D", "4H"]
MarketRequestType = Literal["spot", "futures"]
MarketTypeFilter = Literal["spot", "futures", "all"]
MarketTypeName = Literal["BINANCE_SPOT", "BINANCE_FUTURES", "MEXC_SPOT", "MEXC_FUTURES"]
InstrumentType = Literal["SPOT", "PERPETUAL"]
SetupState = Literal["HIGH", "WATCHLIST", "IGNORE"]
PumpState = SetupState
SetupDirection = Literal["pump", "dump"]
SetupStatus = Literal[
    "Accumulation",
    "Pre-Breakout",
    "Breakout Starting",
    "Distribution",
    "Pre-Breakdown",
    "Breakdown Starting",
]
# "Equity Sectors" is the bucket for anything that is not a coin. Its
# narrative_label carries the actual sector (Technology, Energy, ...), resolved
# from data rather than declared — see core/sectors.py.
NarrativeMode = Literal[
    "Smart Money", "Core Narratives", "All Market", "Microcaps (MEXC)", "Equity Sectors"
]


class PairItem(BaseModel):
    symbol: str = Field(..., examples=["BTCUSDT"])
    base_asset: str = Field(..., examples=["BTC"])
    quote_asset: str = Field(..., examples=["USDT"])
    supported_exchanges: list[ResolvedExchangeName]
    supported_markets: list[MarketTypeName]
    supported_instruments: list[InstrumentType]
    narrative: NarrativeMode
    narrative_label: str


class PairListResponse(BaseModel):
    pairs: list[PairItem]
    total: int
    supported_timeframes: list[TimeframeName]
    supported_markets: list[MarketTypeName]


class OhlcvCandle(BaseModel):
    open_time: datetime
    close_time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    quote_volume: float
    trades: int | None = None
    taker_buy_base_volume: float | None = None
    taker_buy_quote_volume: float | None = None


class OhlcvResponse(BaseModel):
    exchange: ResolvedExchangeName
    symbol: str = Field(..., examples=["BTCUSDT"])
    market_type: MarketTypeName
    instrument_type: InstrumentType
    timeframe: TimeframeName
    candles: list[OhlcvCandle]
    candle_count: int


class ScanResult(BaseModel):
    exchange: ResolvedExchangeName
    symbol: str = Field(..., examples=["BTCUSDT"])
    market_type: MarketTypeName
    instrument_type: InstrumentType
    narrative: NarrativeMode
    narrative_label: str
    timeframe: TimeframeName
    score: int = Field(..., ge=0, le=10)
    estado: SetupState
    setup_direction: SetupDirection
    status_label: SetupStatus
    trend: str = Field(..., examples=["bullish"])
    signal_strength: float = Field(..., ge=0, le=100, examples=[82.5])
    volume_score: float = Field(..., ge=0, le=100, examples=[76.2])
    momentum_score: float = Field(..., ge=0, le=100, examples=[84.1])
    signal_label: str
    summary: str
    explanation: str
    price: float
    volume: float
    change_24h: float
    dump_pct: float
    range_pct: float
    atr_ratio: float
    volume_pattern: str
    liquidity_trap: bool
    ema_flattened: bool
    low_cap: bool
    silent_market: bool
    is_breaking_out: bool
    excluded_reason: str | None = None
    indicators: dict[str, float | None]
    score_breakdown: dict[str, int]
    ohlcv: OhlcvResponse


class TopOpportunity(BaseModel):
    rank: int = Field(..., ge=1)
    exchange: ResolvedExchangeName
    symbol: str = Field(..., examples=["SOLUSDT"])
    market_type: MarketTypeName
    instrument_type: InstrumentType
    narrative: NarrativeMode
    narrative_label: str
    timeframe: TimeframeName
    score: int = Field(..., ge=0, le=10)
    estado: SetupState
    setup_direction: SetupDirection
    status_label: SetupStatus
    opportunity_score: float = Field(..., ge=0, le=100, examples=[91.4])
    signal_label: str
    setup: str
    explanation: str
    confidence: str = Field(..., examples=["high"])
    price: float
    volume: float
    change_24h: float
    dump_pct: float
    range_pct: float
    atr_ratio: float
    volume_pattern: str
    low_cap: bool
    silent_market: bool
    indicators: dict[str, float | None]
    score_breakdown: dict[str, int]


class TopOpportunitiesResponse(BaseModel):
    opportunities: list[TopOpportunity]
    watchlist: list[TopOpportunity]
    total: int


class CoverageStats(BaseModel):
    total_pairs_discovered: int
    eligible_pairs: int
    refreshed_in_cycle: int
    cached_pairs: int
    excluded_pumped_pairs: int
    coverage_pct: float


class MarketOverviewResponse(BaseModel):
    scans: list[ScanResult]
    top: list[TopOpportunity]
    watchlist: list[TopOpportunity]
    total: int
    coverage: CoverageStats
    generated_at: datetime
    cache_ttl_seconds: int


class CacheStatsResponse(BaseModel):
    scan_cache_entries: int
    overview_cache_entries: int
    scan_cache_hits: int
    scan_cache_misses: int
    scan_cache_hit_rate: float
    overview_cache_hits: int
    overview_cache_misses: int
    overview_cache_hit_rate: float
    redis_enabled: bool


class CacheInvalidateResponse(BaseModel):
    cleared: bool
    scan_cache_entries_removed: int
    overview_cache_entries_removed: int


class ScoreChange(BaseModel):
    symbol: str
    exchange: ResolvedExchangeName
    market_type: MarketTypeName
    instrument_type: InstrumentType
    previous_score: int
    current_score: int
    previous_estado: SetupState
    current_estado: SetupState


class WebSocketSnapshot(BaseModel):
    type: Literal["snapshot"]
    generated_at: datetime
    timeframe: TimeframeName
    exchange: ExchangeName
    market_type: MarketRequestType
    top: list[TopOpportunity]
    score_changes: list[ScoreChange]
