from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ExchangeName = Literal["binance", "mexc", "auto"]
TimeframeName = Literal["1D", "4H"]
PumpState = Literal["HIGH", "WATCHLIST", "IGNORE"]
NarrativeMode = Literal["Smart Money", "Core Narratives", "All Market", "Microcaps (MEXC)"]


class PairItem(BaseModel):
    symbol: str = Field(..., examples=["BTCUSDT"])
    base_asset: str = Field(..., examples=["BTC"])
    quote_asset: str = Field(..., examples=["USDT"])
    supported_exchanges: list[Literal["binance", "mexc"]]
    narrative: NarrativeMode
    narrative_label: str


class PairListResponse(BaseModel):
    pairs: list[PairItem]
    total: int
    supported_timeframes: list[TimeframeName]


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
    exchange: Literal["binance", "mexc"]
    symbol: str = Field(..., examples=["BTCUSDT"])
    timeframe: TimeframeName
    candles: list[OhlcvCandle]
    candle_count: int


class ScanResult(BaseModel):
    exchange: Literal["binance", "mexc"]
    symbol: str = Field(..., examples=["BTCUSDT"])
    narrative: NarrativeMode
    narrative_label: str
    timeframe: TimeframeName
    score: int = Field(..., ge=0, le=9)
    estado: PumpState
    trend: str = Field(..., examples=["bullish"])
    signal_strength: float = Field(..., ge=0, le=100, examples=[82.5])
    volume_score: float = Field(..., ge=0, le=100, examples=[76.2])
    momentum_score: float = Field(..., ge=0, le=100, examples=[84.1])
    summary: str
    indicators: dict[str, float | None]
    score_breakdown: dict[str, int]
    ohlcv: OhlcvResponse


class TopOpportunity(BaseModel):
    rank: int = Field(..., ge=1)
    exchange: Literal["binance", "mexc"]
    symbol: str = Field(..., examples=["SOLUSDT"])
    narrative: NarrativeMode
    narrative_label: str
    timeframe: TimeframeName
    score: int = Field(..., ge=0, le=9)
    estado: PumpState
    opportunity_score: float = Field(..., ge=0, le=100, examples=[91.4])
    setup: str
    confidence: str = Field(..., examples=["high"])
    indicators: dict[str, float | None]
    score_breakdown: dict[str, int]


class TopOpportunitiesResponse(BaseModel):
    opportunities: list[TopOpportunity]
    total: int


class MarketOverviewResponse(BaseModel):
    scans: list[ScanResult]
    top: list[TopOpportunity]
    total: int
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
    previous_score: int
    current_score: int
    previous_estado: PumpState
    current_estado: PumpState


class WebSocketSnapshot(BaseModel):
    type: Literal["snapshot"]
    generated_at: datetime
    timeframe: TimeframeName
    exchange: Literal["binance", "mexc", "auto"]
    top: list[TopOpportunity]
    score_changes: list[ScoreChange]
