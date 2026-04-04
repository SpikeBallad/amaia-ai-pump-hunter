from datetime import UTC, datetime

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.models.market import OhlcvCandle, OhlcvResponse, TimeframeName

TIMEFRAME_MAP: dict[TimeframeName, str] = {
    "1D": "1d",
    "4H": "4h",
}

EXCHANGE_URLS = {
    "binance": settings.binance_klines_url,
    "mexc": settings.mexc_klines_url,
}


def _to_datetime(timestamp_ms: int) -> datetime:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC)


def _normalize_candle(exchange: str, row: list) -> OhlcvCandle:
    if exchange == "binance":
        return OhlcvCandle(
            open_time=_to_datetime(int(row[0])),
            open=float(row[1]),
            high=float(row[2]),
            low=float(row[3]),
            close=float(row[4]),
            volume=float(row[5]),
            close_time=_to_datetime(int(row[6])),
            quote_volume=float(row[7]),
            trades=int(row[8]),
            taker_buy_base_volume=float(row[9]),
            taker_buy_quote_volume=float(row[10]),
        )

    return OhlcvCandle(
        open_time=_to_datetime(int(row[0])),
        open=float(row[1]),
        high=float(row[2]),
        low=float(row[3]),
        close=float(row[4]),
        volume=float(row[5]),
        close_time=_to_datetime(int(row[6])),
        quote_volume=float(row[7]),
    )


async def _request_klines(exchange: str, symbol: str, timeframe: TimeframeName) -> OhlcvResponse:
    params = {
        "symbol": symbol.upper(),
        "interval": TIMEFRAME_MAP[timeframe],
        "limit": settings.ohlcv_limit,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(EXCHANGE_URLS[exchange], params=params)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"{exchange} devolvio un error al pedir klines para {symbol.upper()}",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Respuesta invalida de {exchange}") from exc

    if not isinstance(payload, list) or not payload:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron velas para {symbol.upper()} en {exchange}",
        )

    candles = [_normalize_candle(exchange, row) for row in payload]
    return OhlcvResponse(
        exchange=exchange,
        symbol=symbol.upper(),
        timeframe=timeframe,
        candles=candles,
        candle_count=len(candles),
    )


async def fetch_ohlcv(symbol: str, timeframe: TimeframeName, exchange: str = "auto") -> OhlcvResponse:
    requested_exchange = exchange.lower()

    if requested_exchange in EXCHANGE_URLS:
        return await _request_klines(requested_exchange, symbol, timeframe)

    last_error: HTTPException | None = None
    for candidate in ("binance", "mexc"):
        try:
            return await _request_klines(candidate, symbol, timeframe)
        except HTTPException as exc:
            last_error = exc

    raise last_error or HTTPException(status_code=502, detail="No fue posible obtener OHLCV")
