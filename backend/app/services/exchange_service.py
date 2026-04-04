from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.models.market import (
    InstrumentType,
    MarketRequestType,
    MarketTypeName,
    OhlcvCandle,
    OhlcvResponse,
    TimeframeName,
)

SPOT_TIMEFRAME_MAP: dict[TimeframeName, str] = {
    "1D": "1d",
    "4H": "4h",
}

MEXC_FUTURES_TIMEFRAME_MAP: dict[TimeframeName, str] = {
    "1D": "Day1",
    "4H": "Hour4",
}

EXCHANGE_URLS: dict[MarketRequestType, dict[str, str]] = {
    "spot": {
        "binance": settings.binance_klines_url,
        "mexc": settings.mexc_klines_url,
    },
    "futures": {
        "binance": settings.binance_futures_klines_url,
        "mexc": settings.mexc_futures_klines_url,
    },
}


def _to_datetime(timestamp_ms: int) -> datetime:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC)


def _canonical_market_type(exchange: str, market_type: MarketRequestType) -> MarketTypeName:
    return f"{exchange.upper()}_{market_type.upper()}"  # type: ignore[return-value]


def _instrument_type(market_type: MarketRequestType) -> InstrumentType:
    return "SPOT" if market_type == "spot" else "PERPETUAL"


def _mexc_futures_symbol(symbol: str) -> str:
    return f"{symbol.upper().removesuffix('USDT')}_USDT"


def _normalize_spot_candle(exchange: str, row: list) -> OhlcvCandle:
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


def _normalize_mexc_futures_candles(payload: dict, timeframe: TimeframeName) -> list[OhlcvCandle]:
    data = payload.get("data") or {}
    times = data.get("time") or []
    opens = data.get("open") or []
    highs = data.get("high") or []
    lows = data.get("low") or []
    closes = data.get("close") or []
    volumes = data.get("vol") or []
    amounts = data.get("amount") or []
    candle_delta = timedelta(days=1) if timeframe == "1D" else timedelta(hours=4)

    candles: list[OhlcvCandle] = []
    for index, timestamp_seconds in enumerate(times):
        open_time = datetime.fromtimestamp(int(timestamp_seconds), tz=UTC)
        candles.append(
            OhlcvCandle(
                open_time=open_time,
                close_time=open_time + candle_delta,
                open=float(opens[index]),
                high=float(highs[index]),
                low=float(lows[index]),
                close=float(closes[index]),
                volume=float(volumes[index]),
                quote_volume=float(amounts[index]) if index < len(amounts) else float(volumes[index]),
            )
        )
    return candles


async def _request_spot_or_binance_futures(
    exchange: str,
    symbol: str,
    timeframe: TimeframeName,
    market_type: MarketRequestType,
) -> OhlcvResponse:
    params = {
        "symbol": symbol.upper(),
        "interval": SPOT_TIMEFRAME_MAP[timeframe],
        "limit": settings.ohlcv_limit,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(EXCHANGE_URLS[market_type][exchange], params=params)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"{exchange} devolvio un error al pedir klines para {symbol.upper()}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Respuesta invalida de {exchange}") from exc

    if not isinstance(payload, list) or not payload:
        raise HTTPException(status_code=404, detail=f"No se encontraron velas para {symbol.upper()} en {exchange}")

    candles = [_normalize_spot_candle(exchange, row) for row in payload]
    return OhlcvResponse(
        exchange=exchange,
        symbol=symbol.upper(),
        market_type=_canonical_market_type(exchange, market_type),
        instrument_type=_instrument_type(market_type),
        timeframe=timeframe,
        candles=candles,
        candle_count=len(candles),
    )


async def _request_mexc_futures(symbol: str, timeframe: TimeframeName) -> OhlcvResponse:
    params = {"interval": MEXC_FUTURES_TIMEFRAME_MAP[timeframe]}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{settings.mexc_futures_klines_url}/{_mexc_futures_symbol(symbol)}",
            params=params,
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"mexc devolvio un error al pedir futures klines para {symbol.upper()}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Respuesta invalida de mexc futures") from exc

    if not payload.get("success"):
        raise HTTPException(status_code=404, detail=f"No se encontraron velas para {symbol.upper()} en mexc futures")

    candles = _normalize_mexc_futures_candles(payload, timeframe)
    if not candles:
        raise HTTPException(status_code=404, detail=f"No se encontraron velas para {symbol.upper()} en mexc futures")

    trimmed_candles = candles[-settings.ohlcv_limit :]
    return OhlcvResponse(
        exchange="mexc",
        symbol=symbol.upper(),
        market_type="MEXC_FUTURES",
        instrument_type="PERPETUAL",
        timeframe=timeframe,
        candles=trimmed_candles,
        candle_count=len(trimmed_candles),
    )


async def fetch_ohlcv(
    symbol: str,
    timeframe: TimeframeName,
    exchange: str = "auto",
    market_type: MarketRequestType = "spot",
) -> OhlcvResponse:
    requested_exchange = exchange.lower()
    exchange_pool = EXCHANGE_URLS[market_type]

    if requested_exchange in exchange_pool:
        if requested_exchange == "mexc" and market_type == "futures":
            return await _request_mexc_futures(symbol, timeframe)
        return await _request_spot_or_binance_futures(requested_exchange, symbol, timeframe, market_type)

    last_error: HTTPException | None = None
    for candidate in exchange_pool:
        try:
            if candidate == "mexc" and market_type == "futures":
                return await _request_mexc_futures(symbol, timeframe)
            return await _request_spot_or_binance_futures(candidate, symbol, timeframe, market_type)
        except HTTPException as exc:
            last_error = exc

    raise last_error or HTTPException(status_code=502, detail="No fue posible obtener OHLCV")
