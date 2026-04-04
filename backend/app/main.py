from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.services.stream_service import market_stream_service

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def startup_event() -> None:
    await market_stream_service.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await market_stream_service.stop()


@app.get("/")
def root():
    return {"app": settings.app_name, "status": "ok"}
