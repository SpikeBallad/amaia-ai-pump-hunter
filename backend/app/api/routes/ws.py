from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.stream_service import market_stream_service

router = APIRouter()


@router.websocket("/ws")
async def websocket_market_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = await market_stream_service.subscribe()

    try:
        while True:
            snapshot = await queue.get()
            await websocket.send_json(snapshot.model_dump(mode="json"))
    except WebSocketDisconnect:
        pass
    finally:
        market_stream_service.unsubscribe(queue)
