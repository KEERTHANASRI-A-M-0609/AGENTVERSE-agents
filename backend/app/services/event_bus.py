"""
Retail Event Bus — in-memory pub/sub for real-time retail events.
Subscribers receive events via async queues (one per SSE connection).
Thread-safe for FastAPI's async context.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Dict, List, Set

from app.core.logging import logger
from app.schemas.events import RetailEvent


class RetailEventBus:
    """
    Singleton event bus. Producers publish events; SSE handlers subscribe.
    Each shop_id has its own subscriber set so events are shop-scoped.
    """

    def __init__(self) -> None:
        # shop_id → set of asyncio.Queue instances (one per active SSE connection)
        self._subscribers: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        # In-memory ring buffer of last 200 events per shop for replay on reconnect
        self._history: Dict[str, List[RetailEvent]] = defaultdict(list)
        self._history_limit = 200

    def subscribe(self, shop_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers[shop_id].add(q)
        logger.debug(f"EventBus: new subscriber for {shop_id} (total={len(self._subscribers[shop_id])})")
        return q

    def unsubscribe(self, shop_id: str, q: asyncio.Queue) -> None:
        self._subscribers[shop_id].discard(q)
        logger.debug(f"EventBus: subscriber removed for {shop_id}")

    async def publish(self, event: RetailEvent) -> None:
        """Publish event to all subscribers of the shop. Non-blocking."""
        # Store in history
        history = self._history[event.shop_id]
        history.append(event)
        if len(history) > self._history_limit:
            self._history[event.shop_id] = history[-self._history_limit:]

        # Fan-out to all active SSE connections for this shop
        dead: Set[asyncio.Queue] = set()
        for q in list(self._subscribers.get(event.shop_id, set())):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # Slow consumer — drop oldest and retry
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except Exception:
                    dead.add(q)

        for q in dead:
            self._subscribers[event.shop_id].discard(q)

    def get_history(self, shop_id: str, limit: int = 50) -> List[RetailEvent]:
        return list(reversed(self._history[shop_id]))[:limit]

    def subscriber_count(self, shop_id: str) -> int:
        return len(self._subscribers.get(shop_id, set()))


# Global singleton — imported everywhere
event_bus = RetailEventBus()
