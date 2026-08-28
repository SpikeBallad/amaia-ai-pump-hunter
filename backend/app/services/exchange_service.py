from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.services import alpaca_service
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

DISCOVERY_URLS: dict[MarketRequestType, dict[str, str]] = {
    "spot": {
        "binance": settings.binance_exchange_info_url,
        "mexc": settings.mexc_exchange_info_url,
    },
    "futures": {
        "binance": settings.binance_futures_exchange_info_url,
        "mexc": settings.mexc_futures_contract_detail_url,
    },
}

TICKER_URLS: dict[MarketRequestType, dict[str, str]] = {
    "spot": {
        "binance": settings.binance_ticker_24h_url,
        "mexc": settings.mexc_ticker_24h_url,
    },
    "futures": {
        "binance": settings.binance_futures_ticker_24h_url,
        "mexc": settings.mexc_futures_ticker_url,
    },
}

_symbol_cache: dict[tuple[str, MarketRequestType], tuple[datetime, list[str]]] = {}
_ticker_cache: dict[tuple[str, MarketRequestType], tuple[datetime, dict[str, dict[str, float]]]] = {}


def _utc_now() -> datetime:
    return datetime.now(tz=UTC)


def _to_datetime(timestamp_ms: int) -> datetime:
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC)


def _canonical_market_type(exchange: str, market_type: MarketRequestType) -> MarketTypeName:
    if exchange == "alpaca":
        return "ALPACA_EQUITY"
    return f"{exchange.upper()}_{market_type.upper()}"  # type: ignore[return-value]


def _instrument_type(market_type: MarketRequestType, exchange: str = "") -> InstrumentType:
    if exchange == "alpaca":
        return "EQUITY"
    return "SPOT" if market_type == "spot" else "PERPETUAL"


def _mexc_futures_symbol(symbol: str) -> str:
    return f"{symbol.upper().removesuffix('USDT')}_USDT"


def _normalize_mexc_futures_symbol(symbol: str) -> str:
    return symbol.upper().replace("_", "")


async def _request_json(url: str, params: dict | None = None) -> list | dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(url, params=params)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Error consultando {url}")

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Respuesta invalida desde {url}") from exc

    if not isinstance(payload, (list, dict)):
        raise HTTPException(status_code=502, detail=f"Payload inesperado desde {url}")

    return payload


def _cache_get_list(cache_key: tuple[str, MarketRequestType]) -> list[str] | None:
    cached_entry = _symbol_cache.get(cache_key)
    if cached_entry is None:
        return None
    expires_at, symbols = cached_entry
    if expires_at <= _utc_now():
        _symbol_cache.pop(cache_key, None)
        return None
    return symbols


def _cache_get_tickers(cache_key: tuple[str, MarketRequestType]) -> dict[str, dict[str, float]] | None:
    cached_entry = _ticker_cache.get(cache_key)
    if cached_entry is None:
        return None
    expires_at, tickers = cached_entry
    if expires_at <= _utc_now():
        _ticker_cache.pop(cache_key, None)
        return None
    return tickers


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
        quote_volume=float(row[7]) if len(row) > 7 and row[7] is not None else float(row[5]),
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


def _normalize_binance_symbols(payload: dict, market_type: MarketRequestType) -> list[str]:
    symbols = payload.get("symbols") or []
    normalized: list[str] = []
    for item in symbols:
        symbol = (item.get("symbol") or "").upper()
        quote_asset = (item.get("quoteAsset") or "").upper()
        status = (item.get("status") or "").upper()
        if not symbol.endswith("USDT") or quote_asset != "USDT":
            continue
        if market_type == "spot":
            if status != "TRADING" or not item.get("isSpotTradingAllowed", False):
                continue
        else:
            if status != "TRADING" or (item.get("contractType") or "").upper() != "PERPETUAL":
                continue
        normalized.append(symbol)
    return sorted(set(normalized))


def _normalize_mexc_spot_symbols(payload: dict) -> list[str]:
    symbols = payload.get("symbols") or []
    normalized: list[str] = []
    for item in symbols:
        symbol = (item.get("symbol") or "").upper()
        quote_asset = (item.get("quoteAsset") or "").upper()
        status = str(item.get("status") or "").upper()
        is_spot_trading_allowed = bool(item.get("isSpotTradingAllowed", True))
        if not symbol.endswith("USDT") or quote_asset != "USDT":
            continue
        if status not in {"1", "ENABLED"} or not is_spot_trading_allowed:
            continue
        normalized.append(symbol)
    return sorted(set(normalized))


def _normalize_mexc_futures_symbols(payload: dict) -> list[str]:
    contracts = payload.get("data") or []
    normalized: list[str] = []
    for item in contracts:
        quote_coin = (item.get("quoteCoin") or "").upper()
        symbol = (item.get("symbol") or "").upper()
        if quote_coin != "USDT" or not symbol.endswith("_USDT"):
            continue
        normalized.append(_normalize_mexc_futures_symbol(symbol))
    return sorted(set(normalized))


def _normalize_binance_tickers(payload: list) -> dict[str, dict[str, float]]:
    tickers: dict[str, dict[str, float]] = {}
    for item in payload:
        symbol = (item.get("symbol") or "").upper()
        if not symbol.endswith("USDT"):
            continue
        tickers[symbol] = {
            "price": float(item.get("lastPrice") or 0.0),
            "change_24h": float(item.get("priceChangePercent") or 0.0),
            "quote_volume": float(item.get("quoteVolume") or 0.0),
        }
    return tickers


def _normalize_mexc_spot_tickers(payload: list) -> dict[str, dict[str, float]]:
    tickers: dict[str, dict[str, float]] = {}
    for item in payload:
        symbol = (item.get("symbol") or "").upper()
        if not symbol.endswith("USDT"):
            continue
        tickers[symbol] = {
            "price": float(item.get("lastPrice") or 0.0),
            "change_24h": float(item.get("priceChangePercent") or 0.0) * 100,
            "quote_volume": float(item.get("quoteVolume") or 0.0),
        }
    return tickers


def _normalize_mexc_futures_tickers(payload: dict) -> dict[str, dict[str, float]]:
    raw_data = payload.get("data") or []
    if isinstance(raw_data, dict):
        raw_data = [raw_data]

    tickers: dict[str, dict[str, float]] = {}
    for item in raw_data:
        symbol = _normalize_mexc_futures_symbol(item.get("symbol") or "")
        if not symbol.endswith("USDT"):
            continue
        tickers[symbol] = {
            "price": float(item.get("lastPrice") or 0.0),
            "change_24h": float(item.get("riseFallRate") or 0.0) * 100,
            "quote_volume": float(item.get("amount24") or 0.0),
        }
    return tickers


async def discover_symbols(exchange: str, market_type: MarketRequestType) -> list[str]:
    cache_key = (exchange, market_type)
    cached_symbols = _cache_get_list(cache_key)
    if cached_symbols is not None:
        return cached_symbols

    if exchange == "alpaca":
        # Equities have no perpetuals. Answering "none" is the truth and keeps
        # the futures scan from asking Alpaca for something it cannot have.
        symbols = await alpaca_service.discover_symbols() if market_type == "spot" else []
        _symbol_cache[cache_key] = (
            _utc_now() + timedelta(seconds=settings.discovery_cache_ttl_seconds), symbols)
        return symbols

    payload = await _request_json(DISCOVERY_URLS[market_type][exchange])
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail=f"Exchange info invalida para {exchange} {market_type}")

    if exchange == "binance":
        symbols = _normalize_binance_symbols(payload, market_type)
    elif market_type == "spot":
        symbols = _normalize_mexc_spot_symbols(payload)
    else:
        symbols = _normalize_mexc_futures_symbols(payload)

    _symbol_cache[cache_key] = (_utc_now() + timedelta(seconds=settings.discovery_cache_ttl_seconds), symbols)
    return symbols


async def fetch_market_snapshots(exchange: str, market_type: MarketRequestType) -> dict[str, dict[str, float]]:
    cache_key = (exchange, market_type)
    cached_tickers = _cache_get_tickers(cache_key)
    if cached_tickers is not None:
        return cached_tickers

    if exchange == "alpaca":
        symbols = await discover_symbols("alpaca", market_type)
        tickers = await alpaca_service.fetch_snapshots(symbols)
        _ticker_cache[cache_key] = (
            _utc_now() + timedelta(seconds=settings.ticker_cache_ttl_seconds), tickers)
        return tickers

    payload = await _request_json(TICKER_URLS[market_type][exchange])

    if exchange == "binance":
        if not isinstance(payload, list):
            raise HTTPException(status_code=502, detail=f"Ticker 24h invalido para {exchange} {market_type}")
        tickers = _normalize_binance_tickers(payload)
    elif market_type == "spot":
        if not isinstance(payload, list):
            raise HTTPException(status_code=502, detail="Ticker 24h invalido para mexc spot")
        tickers = _normalize_mexc_spot_tickers(payload)
    else:
        if not isinstance(payload, dict):
            raise HTTPException(status_code=502, detail="Ticker invalido para mexc futures")
        tickers = _normalize_mexc_futures_tickers(payload)

    _ticker_cache[cache_key] = (_utc_now() + timedelta(seconds=settings.ticker_cache_ttl_seconds), tickers)
    return tickers


def invalidate_exchange_cache() -> None:
    _symbol_cache.clear()
    _ticker_cache.clear()


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

    payload = await _request_json(EXCHANGE_URLS[market_type][exchange], params=params)
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
    payload = await _request_json(
        f"{settings.mexc_futures_klines_url}/{_mexc_futures_symbol(symbol)}",
        params=params,
    )

    if not isinstance(payload, dict) or not payload.get("success"):
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


async def _request_alpaca(symbol: str, timeframe: TimeframeName) -> OhlcvResponse:
    candles = await alpaca_service.fetch_bars(symbol, timeframe)
    if not candles:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron velas para {symbol.upper()} en alpaca",
        )
    return OhlcvResponse(
        exchange="alpaca",
        symbol=symbol.upper(),
        market_type="ALPACA_EQUITY",
        instrument_type="EQUITY",
        timeframe=timeframe,
        candles=candles,
        candle_count=len(candles),
    )


async def fetch_ohlcv(
    symbol: str,
    timeframe: TimeframeName,
    exchange: str = "auto",
    market_type: MarketRequestType = "spot",
) -> OhlcvResponse:
    requested_exchange = exchange.lower()

    # Checked before the table lookup: Alpaca is deliberately not in
    # EXCHANGE_URLS, so without this it would fall through to the crypto
    # auto-loop and an equity ticker would be asked of Binance.
    if requested_exchange == "alpaca":
        return await _request_alpaca(symbol, timeframe)

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
