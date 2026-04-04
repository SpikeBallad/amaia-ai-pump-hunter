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
    binance_klines_url: str = os.getenv("AMAIA_BINANCE_KLINES_URL", "https://api.binance.com/api/v3/klines")
    binance_futures_klines_url: str = os.getenv("AMAIA_BINANCE_FUTURES_KLINES_URL", "https://fapi.binance.com/fapi/v1/klines")
    mexc_klines_url: str = os.getenv("AMAIA_MEXC_KLINES_URL", "https://api.mexc.com/api/v3/klines")
    mexc_futures_klines_url: str = os.getenv("AMAIA_MEXC_FUTURES_KLINES_URL", "https://contract.mexc.com/api/v1/contract/kline")
    ohlcv_limit: int = int(os.getenv("AMAIA_OHLCV_LIMIT", "120"))
    max_scan_pairs: int = int(os.getenv("AMAIA_MAX_SCAN_PAIRS", "24"))
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
