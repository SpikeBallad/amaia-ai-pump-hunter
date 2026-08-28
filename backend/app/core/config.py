import os

from pydantic import BaseModel


def _split_csv_env(value: str | None, fallback: list[str]) -> list[str]:
    if not value:
        return fallback
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseModel):
    app_name: str = os.getenv("AMAIA_APP_NAME", "AMAIA AI PUMP HUNTER PRO API")
    allowed_origins: list[str] = _split_csv_env(
        os.getenv("AMAIA_ALLOWED_ORIGINS"),
        [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
    )
    scan_all_pairs: bool = os.getenv("AMAIA_SCAN_ALL_PAIRS", "true").lower() in {"1", "true", "yes", "on"}
    binance_klines_url: str = os.getenv("AMAIA_BINANCE_KLINES_URL", "https://api.binance.com/api/v3/klines")
    binance_futures_klines_url: str = os.getenv("AMAIA_BINANCE_FUTURES_KLINES_URL", "https://fapi.binance.com/fapi/v1/klines")
    mexc_klines_url: str = os.getenv("AMAIA_MEXC_KLINES_URL", "https://api.mexc.com/api/v3/klines")
    mexc_futures_klines_url: str = os.getenv("AMAIA_MEXC_FUTURES_KLINES_URL", "https://contract.mexc.com/api/v1/contract/kline")
    binance_exchange_info_url: str = os.getenv("AMAIA_BINANCE_EXCHANGE_INFO_URL", "https://api.binance.com/api/v3/exchangeInfo")
    binance_futures_exchange_info_url: str = os.getenv("AMAIA_BINANCE_FUTURES_EXCHANGE_INFO_URL", "https://fapi.binance.com/fapi/v1/exchangeInfo")
    mexc_exchange_info_url: str = os.getenv("AMAIA_MEXC_EXCHANGE_INFO_URL", "https://api.mexc.com/api/v3/exchangeInfo")
    mexc_futures_contract_detail_url: str = os.getenv("AMAIA_MEXC_FUTURES_CONTRACT_DETAIL_URL", "https://contract.mexc.com/api/v1/contract/detail")
    binance_ticker_24h_url: str = os.getenv("AMAIA_BINANCE_TICKER_24H_URL", "https://api.binance.com/api/v3/ticker/24hr")
    binance_futures_ticker_24h_url: str = os.getenv("AMAIA_BINANCE_FUTURES_TICKER_24H_URL", "https://fapi.binance.com/fapi/v1/ticker/24hr")
    mexc_ticker_24h_url: str = os.getenv("AMAIA_MEXC_TICKER_24H_URL", "https://api.mexc.com/api/v3/ticker/24hr")
    mexc_futures_ticker_url: str = os.getenv("AMAIA_MEXC_FUTURES_TICKER_URL", "https://contract.mexc.com/api/v1/contract/ticker")
    # Alpaca — US equities. Unlike the crypto venues these endpoints need a
    # key, so an unset credential means "no equities", never a crash: the
    # exchange is dropped from the pool and the crypto scan runs as before.
    alpaca_api_key: str = os.getenv("ALPACA_API_KEY", "")
    alpaca_secret_key: str = os.getenv("ALPACA_SECRET_KEY", "")
    alpaca_trading_url: str = os.getenv("AMAIA_ALPACA_TRADING_URL", "https://api.alpaca.markets")
    alpaca_data_url: str = os.getenv("AMAIA_ALPACA_DATA_URL", "https://data.alpaca.markets")
    # ~11,000 assets are active on Alpaca. Scanning them all would be a
    # different product; this keeps the equity universe to the most liquid
    # names, ranked by dollar volume (see _normalize_alpaca_snapshots).
    # Free and basic plans serve IEX; SIP is a paid subscription and returns
    # 403 without it. Defaulting to iex means the integration works on the
    # account that exists rather than the one we wish existed.
    alpaca_feed: str = os.getenv("AMAIA_ALPACA_FEED", "iex")
    alpaca_universe_cap: int = int(os.getenv("AMAIA_ALPACA_UNIVERSE_CAP", "100"))
    # Alpaca's "most active" screener ranks by SHARE count, which selects
    # penny stocks: measured live, it put CHOW ($0.65, $465k traded) above
    # NVDA ($1.69bn traded). These two floors re-rank that pool by money,
    # which is the only volume a setup can be sized against.
    alpaca_min_price: float = float(os.getenv("AMAIA_ALPACA_MIN_PRICE", "5"))
    alpaca_min_dollar_volume: float = float(
        os.getenv("AMAIA_ALPACA_MIN_DOLLAR_VOLUME", "25000000"))
    ohlcv_limit: int = int(os.getenv("AMAIA_OHLCV_LIMIT", "120"))
    max_scan_pairs: int = int(os.getenv("AMAIA_MAX_SCAN_PAIRS", "0"))
    overview_max_limit: int = int(os.getenv("AMAIA_OVERVIEW_MAX_LIMIT", "100"))
    scan_refresh_batch_size: int = int(os.getenv("AMAIA_SCAN_REFRESH_BATCH_SIZE", "120"))
    discovery_cache_ttl_seconds: int = int(os.getenv("AMAIA_DISCOVERY_CACHE_TTL_SECONDS", "1800"))
    ticker_cache_ttl_seconds: int = int(os.getenv("AMAIA_TICKER_CACHE_TTL_SECONDS", "120"))
    scan_request_concurrency: int = int(os.getenv("AMAIA_SCAN_REQUEST_CONCURRENCY", "20"))
    pair_universe: list[str] = [
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "DOGEUSDT",
        "ADAUSDT",
        "AVAXUSDT",
        "LINKUSDT",
        "BNBUSDT",
        "TRXUSDT",
        "DOTUSDT",
        "LTCUSDT",
        "SUIUSDT",
        "APTUSDT",
        "NEARUSDT",
        "ARBUSDT",
        "OPUSDT",
        "TIAUSDT",
        "SEIUSDT",
        "WIFUSDT",
        "PEPEUSDT",
        "SHIBUSDT",
        "UNIUSDT",
        "ATOMUSDT",
    ]
    ws_default_interval_seconds: int = int(os.getenv("AMAIA_WS_DEFAULT_INTERVAL_SECONDS", "45"))
    ws_min_interval_seconds: int = int(os.getenv("AMAIA_WS_MIN_INTERVAL_SECONDS", "30"))
    ws_max_interval_seconds: int = int(os.getenv("AMAIA_WS_MAX_INTERVAL_SECONDS", "60"))
    ws_top_limit: int = int(os.getenv("AMAIA_WS_TOP_LIMIT", "10"))
    scan_cache_ttl_seconds: int = int(os.getenv("AMAIA_SCAN_CACHE_TTL_SECONDS", "45"))
    overview_cache_ttl_seconds: int = int(os.getenv("AMAIA_OVERVIEW_CACHE_TTL_SECONDS", "20"))
    # Redis placeholder for future external cache/shared state.
    redis_url: str | None = os.getenv("AMAIA_REDIS_URL")


settings = Settings()
