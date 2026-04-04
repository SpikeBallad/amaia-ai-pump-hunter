import asyncio
from contextlib import suppress

from app.core.config import settings
from app.models.market import ScoreChange, TopOpportunity, WebSocketSnapshot
from app.services.market_service import get_market_overview


class MarketStreamService:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[WebSocketSnapshot]] = set()
        self._broadcast_task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()
        self._latest_snapshot: WebSocketSnapshot | None = None
        self._previous_scores: dict[str, tuple[int, str]] = {}
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._broadcast_task and not self._broadcast_task.done():
                return
            self._stop_event = asyncio.Event()
            self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def stop(self) -> None:
        self._stop_event.set()
        task = self._broadcast_task
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        self._broadcast_task = None

    async def subscribe(self) -> asyncio.Queue[WebSocketSnapshot]:
        queue: asyncio.Queue[WebSocketSnapshot] = asyncio.Queue(maxsize=1)
        self._subscribers.add(queue)
        if self._latest_snapshot is None:
            self._latest_snapshot = await self._build_snapshot()
        if self._latest_snapshot is not None:
            await self._publish_to_queue(queue, self._latest_snapshot)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[WebSocketSnapshot]) -> None:
        self._subscribers.discard(queue)

    async def _broadcast_loop(self) -> None:
        while not self._stop_event.is_set():
            if not self._subscribers:
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=settings.ws_default_interval_seconds,
                    )
                except TimeoutError:
                    continue
                break

            snapshot = await self._build_snapshot()
            self._latest_snapshot = snapshot
            await self._broadcast(snapshot)
            try:
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=settings.ws_default_interval_seconds,
                )
            except TimeoutError:
                continue

    async def _build_snapshot(self) -> WebSocketSnapshot:
        overview = await get_market_overview(
            timeframe="4H",
            exchange="auto",
            market_type="spot",
            limit=settings.ws_top_limit,
        )
        score_changes = self._extract_score_changes(overview.top)
        return WebSocketSnapshot(
            type="snapshot",
            generated_at=overview.generated_at,
            timeframe="4H",
            exchange="auto",
            market_type="spot",
            top=overview.top,
            score_changes=score_changes,
        )

    def _extract_score_changes(self, opportunities: list[TopOpportunity]) -> list[ScoreChange]:
        changes: list[ScoreChange] = []
        current_scores: dict[str, tuple[int, str]] = {
            f"{opportunity.market_type}:{opportunity.exchange}:{opportunity.symbol}": (
                opportunity.score,
                opportunity.estado,
            )
            for opportunity in opportunities
        }

        for identifier, (current_score, current_estado) in current_scores.items():
            previous = self._previous_scores.get(identifier)
            if previous is None:
                continue
            previous_score, previous_estado = previous
            if previous_score != current_score or previous_estado != current_estado:
                market_type, exchange, symbol = identifier.split(":", 2)
                changes.append(
                    ScoreChange(
                        symbol=symbol,
                        exchange=exchange,
                        market_type=market_type,
                        instrument_type="PERPETUAL" if market_type.endswith("FUTURES") else "SPOT",
                        previous_score=previous_score,
                        current_score=current_score,
                        previous_estado=previous_estado,
                        current_estado=current_estado,
                    )
                )

        self._previous_scores = current_scores
        return changes

    async def _broadcast(self, snapshot: WebSocketSnapshot) -> None:
        if not self._subscribers:
            return
        await asyncio.gather(
            *(self._publish_to_queue(queue, snapshot) for queue in list(self._subscribers)),
            return_exceptions=True,
        )

    async def _publish_to_queue(
        self,
        queue: asyncio.Queue[WebSocketSnapshot],
        snapshot: WebSocketSnapshot,
    ) -> None:
        if queue.full():
            with suppress(asyncio.QueueEmpty):
                queue.get_nowait()
        await queue.put(snapshot)


market_stream_service = MarketStreamService()
