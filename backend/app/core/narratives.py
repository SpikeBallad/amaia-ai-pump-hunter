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


def get_narrative(symbol: str) -> NarrativeMode:
    label = TOKEN_NARRATIVE_LABELS.get(symbol.upper(), "All Market")
    if label in CORE_NARRATIVE_LABELS:
        return "Core Narratives"
    return label


def get_narrative_label(symbol: str) -> str:
    return TOKEN_NARRATIVE_LABELS.get(symbol.upper(), "All Market")
