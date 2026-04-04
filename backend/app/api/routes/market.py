from fastapi import APIRouter, Query

from app.core.config import settings
from app.models.market import CacheInvalidateResponse, CacheStatsResponse, ExchangeName, MarketOverviewResponse, PairListResponse, ScanResult, TimeframeName, TopOpportunitiesResponse
from app.services.market_service import get_cache_stats, get_market_overview, get_top_opportunities, invalidate_cache, list_pairs, scan_pair

router = APIRouter(tags=["market"])


@router.get("/pairs", response_model=PairListResponse)
def get_pairs() -> PairListResponse:
    return list_pairs()


@router.get("/scan", response_model=ScanResult)
async def get_scan(
    symbol: str = Query(default="BTCUSDT", description="Par a analizar"),
    timeframe: TimeframeName = Query(default="4H"),
    exchange: ExchangeName = Query(default="auto"),
) -> ScanResult:
    return await scan_pair(symbol=symbol, timeframe=timeframe, exchange=exchange)


@router.get("/top", response_model=TopOpportunitiesResponse)
async def get_top(
    timeframe: TimeframeName = Query(default="4H"),
    exchange: ExchangeName = Query(default="auto"),
    limit: int = Query(default=10, ge=1, le=settings.max_scan_pairs),
) -> TopOpportunitiesResponse:
    return await get_top_opportunities(timeframe=timeframe, exchange=exchange, limit=limit)


@router.get("/overview", response_model=MarketOverviewResponse)
async def get_overview(
    timeframe: TimeframeName = Query(default="4H"),
    exchange: ExchangeName = Query(default="auto"),
    limit: int = Query(default=10, ge=1, le=settings.max_scan_pairs),
) -> MarketOverviewResponse:
    return await get_market_overview(timeframe=timeframe, exchange=exchange, limit=limit)


@router.get("/cache/stats", response_model=CacheStatsResponse)
def get_market_cache_stats() -> CacheStatsResponse:
    return get_cache_stats()


@router.post("/cache/invalidate", response_model=CacheInvalidateResponse)
async def invalidate_market_cache() -> CacheInvalidateResponse:
    return await invalidate_cache()
