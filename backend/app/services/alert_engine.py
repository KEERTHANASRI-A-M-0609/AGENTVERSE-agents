"""
Alert Engine — monitors the event stream and generates proactive AI alerts.
Runs as a background task. Deduplicates alerts within a cooldown window.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.core.logging import logger
from app.schemas.events import AlertNotification, EventSeverity, RetailEvent, EventType


class AlertEngine:
    """
    Stateful alert engine. Consumes events and produces AlertNotifications.
    Maintains a cooldown map to prevent alert spam for the same product.
    """

    COOLDOWN_MINUTES = 15  # Don't re-alert same product+type within this window

    def __init__(self) -> None:
        self._cooldowns: Dict[str, datetime] = {}  # key: f"{shop_id}:{product_id}:{alert_type}"
        self._active_alerts: Dict[str, List[AlertNotification]] = {}  # shop_id → alerts

    def get_alerts(self, shop_id: str) -> List[AlertNotification]:
        return list(reversed(self._active_alerts.get(shop_id, [])))

    def acknowledge(self, shop_id: str, alert_id: str) -> bool:
        for alert in self._active_alerts.get(shop_id, []):
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                return True
        return False

    def unacknowledged_count(self, shop_id: str) -> int:
        return sum(1 for a in self._active_alerts.get(shop_id, []) if not a.acknowledged)

    async def process_event(self, event: RetailEvent) -> Optional[AlertNotification]:
        """
        Evaluate an event and optionally generate an alert.
        Returns the alert if one was created, else None.
        """
        handler = self._EVENT_HANDLERS.get(event.event_type)
        if handler is None:
            return None

        cooldown_key = f"{event.shop_id}:{event.product_id}:{event.event_type}"
        if self._is_cooling_down(cooldown_key):
            return None

        alert = handler(self, event)
        if alert:
            self._set_cooldown(cooldown_key)
            shop_alerts = self._active_alerts.setdefault(event.shop_id, [])
            shop_alerts.append(alert)
            # Keep last 50 alerts per shop
            if len(shop_alerts) > 50:
                self._active_alerts[event.shop_id] = shop_alerts[-50:]
            logger.info(f"AlertEngine: [{alert.severity}] {alert.title} for {event.shop_id}")

        return alert

    def _is_cooling_down(self, key: str) -> bool:
        expiry = self._cooldowns.get(key)
        if expiry and datetime.utcnow() < expiry:
            return True
        return False

    def _set_cooldown(self, key: str) -> None:
        self._cooldowns[key] = datetime.utcnow() + timedelta(minutes=self.COOLDOWN_MINUTES)

    # ── Event → Alert handlers ────────────────────────────────────────────────

    def _handle_stock_critical(self, event: RetailEvent) -> Optional[AlertNotification]:
        stock = event.payload.get("current_stock", 0)
        reorder_qty = event.payload.get("recommended_order_quantity", 0)
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.CRITICAL,
            title=f"Critical Stock: {event.product_name}",
            body=(
                f"{event.product_name} has only {stock} units remaining. "
                f"At current sales velocity, stockout is imminent. "
                f"Immediate replenishment of {reorder_qty} units is required."
            ),
            product_id=event.product_id,
            product_name=event.product_name,
            recommended_action=f"Place order for {reorder_qty} units immediately.",
            business_impact=f"Stockout will cause direct revenue loss and customer dissatisfaction.",
            action_label="Approve Reorder",
            source_event_ids=[event.event_id],
        )

    def _handle_stock_out(self, event: RetailEvent) -> Optional[AlertNotification]:
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.CRITICAL,
            title=f"STOCKOUT: {event.product_name}",
            body=(
                f"{event.product_name} is OUT OF STOCK. "
                f"Every hour without stock is lost revenue. "
                f"Contact your supplier immediately."
            ),
            product_id=event.product_id,
            product_name=event.product_name,
            recommended_action="Contact supplier for emergency replenishment.",
            business_impact="Active revenue loss. Customer satisfaction at risk.",
            action_label="Emergency Reorder",
            source_event_ids=[event.event_id],
        )

    def _handle_sale_spike(self, event: RetailEvent) -> Optional[AlertNotification]:
        spike_pct = event.payload.get("spike_pct", 0)
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.WARNING,
            title=f"Demand Spike: {event.product_name}",
            body=(
                f"{event.product_name} sales are running {spike_pct:.0f}% above forecast. "
                f"Current stock may deplete faster than predicted. "
                f"Consider pre-emptive reorder."
            ),
            product_id=event.product_id,
            product_name=event.product_name,
            recommended_action="Review stock levels and consider early reorder.",
            business_impact="Unplanned demand spike may cause stockout before next scheduled order.",
            action_label="Review Forecast",
            source_event_ids=[event.event_id],
        )

    def _handle_slow_mover(self, event: RetailEvent) -> Optional[AlertNotification]:
        days_no_sale = event.payload.get("days_no_sale", 0)
        stock = event.payload.get("current_stock", 0)
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.WARNING,
            title=f"Slow Mover: {event.product_name}",
            body=(
                f"{event.product_name} has not sold in {days_no_sale} days with {stock} units in stock. "
                f"Capital is locked in idle inventory."
            ),
            product_id=event.product_id,
            product_name=event.product_name,
            recommended_action="Consider a promotional discount or bundle offer to clear stock.",
            business_impact=f"₹{stock * event.payload.get('unit_price', 50):.0f} in capital locked in slow-moving inventory.",
            action_label="Create Promotion",
            source_event_ids=[event.event_id],
        )

    def _handle_revenue_milestone(self, event: RetailEvent) -> Optional[AlertNotification]:
        amount = event.payload.get("revenue", 0)
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.SUCCESS,
            title="Revenue Milestone Reached",
            body=f"Your store has crossed ₹{amount:,.0f} in revenue today. Great performance!",
            recommended_action="Keep top-selling products well-stocked to sustain momentum.",
            business_impact="Strong revenue day — ensure supply chain is ready for continued demand.",
            source_event_ids=[event.event_id],
        )

    def _handle_demand_anomaly(self, event: RetailEvent) -> Optional[AlertNotification]:
        return AlertNotification(
            shop_id=event.shop_id,
            severity=EventSeverity.WARNING,
            title=f"Demand Anomaly: {event.product_name}",
            body=event.message,
            product_id=event.product_id,
            product_name=event.product_name,
            recommended_action="Review recent sales data and update forecast manually if needed.",
            business_impact="Anomalous demand may indicate an external event affecting your market.",
            source_event_ids=[event.event_id],
        )

    _EVENT_HANDLERS = {
        EventType.STOCK_CRITICAL: _handle_stock_critical,
        EventType.STOCK_OUT: _handle_stock_out,
        EventType.SALE_SPIKE_DETECTED: _handle_sale_spike,
        EventType.SLOW_MOVER_ALERT: _handle_slow_mover,
        EventType.REVENUE_MILESTONE: _handle_revenue_milestone,
        EventType.DEMAND_ANOMALY: _handle_demand_anomaly,
    }


# Global singleton
alert_engine = AlertEngine()
