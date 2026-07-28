"""
Events API — SSE streaming endpoint + alert management + agent decisions.
GET  /api/v1/events/stream/{shop_id}   → SSE stream of live retail events
GET  /api/v1/events/history/{shop_id}  → last N events (for reconnect replay)
GET  /api/v1/events/alerts/{shop_id}   → active proactive alerts
POST /api/v1/events/alerts/{shop_id}/{alert_id}/ack → acknowledge alert
GET  /api/v1/events/decisions/{shop_id} → recent agent decisions
GET  /api/v1/events/livekpi/{shop_id}  → real-time KPI snapshot
"""
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import verify_api_key
from app.schemas.events import AlertNotification, RetailEvent, EventType
from app.services.alert_engine import alert_engine
from app.services.event_bus import event_bus
from app.services.event_simulator import get_simulator

router = APIRouter(prefix="/events", tags=["Real-Time Events"])

KEEPALIVE_INTERVAL = 20  # seconds between SSE keepalive pings


@router.get("/stream/{shop_id}")
async def stream_events(
    shop_id: str,
    request: Request,
    replay: int = 20,  # how many history events to replay on connect
):
    """
    Server-Sent Events stream. No API key in header for SSE (browser EventSource
    doesn't support custom headers). Pass key as query param for dev.
    Production: use a short-lived token or cookie.
    """
    # Ensure simulator is running for this shop
    sim = get_simulator(shop_id)
    await sim.start()

    async def event_generator() -> AsyncGenerator[str, None]:
        q = event_bus.subscribe(shop_id)
        try:
            # Replay recent history so the client has context on connect
            history = event_bus.get_history(shop_id, limit=replay)
            for past_event in reversed(history):
                yield past_event.to_sse()

            # Stream live events
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event: RetailEvent = await asyncio.wait_for(q.get(), timeout=KEEPALIVE_INTERVAL)
                    yield event.to_sse()
                except asyncio.TimeoutError:
                    # Send keepalive comment to prevent proxy timeouts
                    yield ": keepalive\n\n"
        finally:
            event_bus.unsubscribe(shop_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        },
    )


@router.get("/history/{shop_id}", response_model=list[RetailEvent])
async def get_event_history(
    shop_id: str,
    limit: int = 50,
    _: str = Depends(verify_api_key),
):
    """Return recent event history for a shop (for initial page load)."""
    return event_bus.get_history(shop_id, limit=limit)


@router.get("/alerts/{shop_id}", response_model=list[AlertNotification])
async def get_alerts(
    shop_id: str,
    unread_only: bool = False,
    _: str = Depends(verify_api_key),
):
    """Return active proactive alerts for a shop."""
    alerts = alert_engine.get_alerts(shop_id)
    if unread_only:
        alerts = [a for a in alerts if not a.acknowledged]
    return alerts


@router.post("/alerts/{shop_id}/{alert_id}/ack")
async def acknowledge_alert(
    shop_id: str,
    alert_id: str,
    _: str = Depends(verify_api_key),
):
    """Mark an alert as acknowledged."""
    success = alert_engine.acknowledge(shop_id, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "acknowledged", "alert_id": alert_id}


@router.get("/alerts/{shop_id}/count")
async def get_alert_count(
    shop_id: str,
    _: str = Depends(verify_api_key),
):
    return {
        "shop_id": shop_id,
        "unacknowledged": alert_engine.unacknowledged_count(shop_id),
        "active_subscribers": event_bus.subscriber_count(shop_id),
    }


@router.get("/decisions/{shop_id}")
async def get_agent_decisions(
    shop_id: str,
    limit: int = 20,
    _: str = Depends(verify_api_key),
):
    """Return recent agent decisions extracted from event history."""
    history = event_bus.get_history(shop_id, limit=200)
    decisions = [
        e for e in history
        if e.event_type == EventType.AGENT_DECISION
    ]
    return list(reversed(decisions))[:limit]


@router.get("/livekpi/{shop_id}")
async def get_live_kpi(
    shop_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    """Real-time KPI snapshot: revenue today, active alerts, agent status."""
    from app.services.analytics_service import AnalyticsService
    from app.services.demand_service import DemandService
    from app.schemas.demand import BulkPredictRequest

    analytics = AnalyticsService(db)
    ref = analytics.resolve_as_of(shop_id)
    today_rev, today_orders, today_units = analytics.repo.daily_metrics(shop_id, ref)

    unacked = alert_engine.unacknowledged_count(shop_id)
    history = event_bus.get_history(shop_id, limit=50)
    recent_decisions = sum(1 for e in history if e.event_type == EventType.AGENT_DECISION)
    critical_events = sum(1 for e in history if e.severity == "critical")

    return {
        "shop_id": shop_id,
        "as_of": ref.isoformat(),
        "revenue_today": round(today_rev, 2),
        "orders_today": today_orders,
        "units_today": today_units,
        "unacked_alerts": unacked,
        "agent_decisions_recent": recent_decisions,
        "critical_events_recent": critical_events,
        "agents_active": True,
        "event_stream_subscribers": event_bus.subscriber_count(shop_id),
    }
