"""
Agent Orchestrator — the brain of the Retail OS.
Synthesizes events from the event bus into multi-agent decisions with AI reasoning.
Runs as a background task, continuously monitoring the event stream.
Publishes AgentDecision events back to the bus so the UI gets live reasoning.
"""
from __future__ import annotations

import asyncio
import random
from collections import deque
from datetime import datetime
from typing import Deque, Dict, List, Optional

from app.core.logging import logger
from app.schemas.events import (
    AgentDecision,
    AgentRole,
    DecisionPriority,
    EventSeverity,
    EventType,
    RetailEvent,
)
from app.services.event_bus import event_bus


class AgentOrchestrator:
    """
    Three-agent system:
    - DemandAgent: watches stock/demand events → reorder decisions
    - IntelligenceAgent: watches revenue/slow-mover events → business decisions
    - ManagerAgent: synthesizes both → executive decisions

    Each agent maintains a short-term memory (last 20 events) and produces
    structured decisions with reasoning chains.
    """

    DECISION_COOLDOWN = 30  # seconds between decisions for same product+type

    def __init__(self, shop_id: str) -> None:
        self.shop_id = shop_id
        self._memory: Deque[RetailEvent] = deque(maxlen=20)
        self._cooldowns: Dict[str, datetime] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._queue: Optional[asyncio.Queue] = None

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._queue = event_bus.subscribe(self.shop_id)
        self._task = asyncio.create_task(self._loop(), name=f"orchestrator:{self.shop_id}")
        logger.info(f"AgentOrchestrator started for {self.shop_id}")

    async def stop(self) -> None:
        self._running = False
        if self._queue:
            event_bus.unsubscribe(self.shop_id, self._queue)
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while self._running:
            try:
                event: RetailEvent = await asyncio.wait_for(
                    self._queue.get(), timeout=15.0
                )
                self._memory.append(event)
                await self._process(event)
            except asyncio.TimeoutError:
                # Periodic synthesis even without new events
                await self._periodic_synthesis()
            except Exception as exc:
                logger.warning(f"Orchestrator error: {exc}")

    async def _process(self, event: RetailEvent) -> None:
        """Route event to the right agent(s)."""
        handlers = {
            EventType.STOCK_CRITICAL: self._demand_agent_stock_critical,
            EventType.STOCK_OUT: self._demand_agent_stockout,
            EventType.SALE_SPIKE_DETECTED: self._demand_agent_spike,
            EventType.SLOW_MOVER_ALERT: self._intelligence_agent_slow_mover,
            EventType.REVENUE_MILESTONE: self._intelligence_agent_revenue,
            EventType.DEMAND_TREND_CHANGE: self._demand_agent_trend,
            EventType.CUSTOMER_ACTIVITY: self._intelligence_agent_customer,
            EventType.ORDER_PLACED: self._demand_agent_order,
            EventType.PRICE_ANOMALY: self._intelligence_agent_price,
        }
        handler = handlers.get(event.event_type)
        if handler:
            key = f"{event.event_type}:{event.product_id}"
            if not self._is_cooling_down(key):
                decision = await handler(event)
                if decision:
                    self._set_cooldown(key)
                    await self._publish_decision(decision)

    # ── Demand Agent ──────────────────────────────────────────────────────────

    async def _demand_agent_stock_critical(self, event: RetailEvent) -> Optional[AgentDecision]:
        stock = event.payload.get("current_stock", 0)
        reorder_qty = event.payload.get("recommended_order_quantity", 20)
        recent_spikes = sum(
            1 for e in self._memory
            if e.event_type == EventType.SALE_SPIKE_DETECTED
            and e.product_id == event.product_id
        )
        urgency_boost = " Demand spikes detected recently — accelerate order." if recent_spikes else ""

        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.DEMAND,
            priority=DecisionPriority.CRITICAL,
            title=f"Reorder {event.product_name} immediately",
            reasoning=(
                f"Stock at {stock} units, below reorder threshold. "
                f"ML forecast projects continued demand. "
                f"Lead time risk: stockout in <3 days.{urgency_boost}"
            ),
            action=f"Place order for {reorder_qty} units now",
            action_label="Approve Reorder",
            action_endpoint=f"/api/v1/demand/recommendations/action",
            confidence=0.92,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload={"recommended_order_quantity": reorder_qty, "current_stock": stock},
        )

    async def _demand_agent_stockout(self, event: RetailEvent) -> Optional[AgentDecision]:
        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.DEMAND,
            priority=DecisionPriority.CRITICAL,
            title=f"EMERGENCY: {event.product_name} is out of stock",
            reasoning=(
                "Zero units in stock. Every minute without inventory is direct revenue loss. "
                "Contact supplier on emergency channel. "
                "Consider substitution with nearest alternative SKU."
            ),
            action="Emergency supplier contact + substitution plan",
            action_label="Emergency Reorder",
            confidence=1.0,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload=event.payload,
        )

    async def _demand_agent_spike(self, event: RetailEvent) -> Optional[AgentDecision]:
        spike_pct = event.payload.get("spike_pct", 0)
        stock = event.payload.get("current_stock", 0)
        avg = event.payload.get("avg_daily", 1)
        days_cover = round(stock / max(avg * (1 + spike_pct / 100), 1), 1)

        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.DEMAND,
            priority=DecisionPriority.HIGH,
            title=f"Demand spike on {event.product_name} — pre-empt stockout",
            reasoning=(
                f"Sales running {spike_pct:.0f}% above forecast. "
                f"At current velocity, stock covers ~{days_cover} days. "
                f"Recommend pre-emptive reorder before next scheduled cycle."
            ),
            action="Trigger early reorder cycle",
            action_label="Pre-empt Reorder",
            confidence=0.85,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload=event.payload,
        )

    async def _demand_agent_trend(self, event: RetailEvent) -> Optional[AgentDecision]:
        trend = event.payload.get("trend", "upward")
        change = abs(event.payload.get("change_pct", 15))
        if trend in ("upward", "seasonal_spike"):
            return AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.DEMAND,
                priority=DecisionPriority.MEDIUM,
                title=f"Forecast update: {event.product_name} demand rising",
                reasoning=(
                    f"ML model detects {change:.0f}% demand increase over next 7 days. "
                    f"Seasonal or promotional driver likely. Adjust reorder plan upward."
                ),
                action="Increase next order quantity by 20%",
                action_label="Update Plan",
                confidence=0.78,
                product_id=event.product_id,
                product_name=event.product_name,
                source_event_ids=[event.event_id],
                payload=event.payload,
            )
        return None

    async def _demand_agent_order(self, event: RetailEvent) -> Optional[AgentDecision]:
        qty = event.payload.get("quantity", 0)
        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.DEMAND,
            priority=DecisionPriority.LOW,
            title=f"Order logged: {event.product_name}",
            reasoning=f"Customer order of {qty} units recorded. Inventory updated. Forecast recalibrated.",
            action="Monitor stock depletion rate",
            action_label="View Forecast",
            confidence=0.95,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload=event.payload,
        )

    # ── Intelligence Agent ────────────────────────────────────────────────────

    async def _intelligence_agent_slow_mover(self, event: RetailEvent) -> Optional[AgentDecision]:
        stock = event.payload.get("current_stock", 0)
        price = event.payload.get("unit_price", 50)
        capital_locked = stock * price
        days = event.payload.get("days_no_sale", 7)

        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.INTELLIGENCE,
            priority=DecisionPriority.MEDIUM,
            title=f"Free ₹{capital_locked:,.0f} locked in {event.product_name}",
            reasoning=(
                f"{event.product_name} has {stock} units unsold for ~{days} days. "
                f"Capital of ₹{capital_locked:,.0f} is idle. "
                f"A 15% markdown or bundle offer typically clears slow movers within 5 days."
            ),
            action="Create 15% markdown promotion",
            action_label="Create Promotion",
            confidence=0.80,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload={"capital_locked": capital_locked, "suggested_discount_pct": 15},
        )

    async def _intelligence_agent_revenue(self, event: RetailEvent) -> Optional[AgentDecision]:
        revenue = event.payload.get("revenue", 0)
        milestone = event.payload.get("milestone", 0)
        if milestone:
            return AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.INTELLIGENCE,
                priority=DecisionPriority.LOW,
                title=f"Revenue milestone ₹{milestone:,} reached",
                reasoning=(
                    f"Store crossed ₹{milestone:,} today. "
                    f"Momentum is strong — ensure top sellers are fully stocked "
                    f"to sustain the trajectory through end of day."
                ),
                action="Verify top-seller stock levels",
                action_label="Check Stock",
                confidence=0.90,
                source_event_ids=[event.event_id],
                payload={"revenue": revenue},
            )
        return None

    async def _intelligence_agent_customer(self, event: RetailEvent) -> Optional[AgentDecision]:
        activity = event.payload.get("activity_type", "browse")
        product = event.product_name or "unknown"
        if activity == "cart_abandon":
            return AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.INTELLIGENCE,
                priority=DecisionPriority.MEDIUM,
                title=f"Cart abandonment signal on {product}",
                reasoning=(
                    f"Customer browsed {product} but did not purchase. "
                    f"Price sensitivity or stock uncertainty likely. "
                    f"Consider a limited-time offer or stock visibility improvement."
                ),
                action="Trigger targeted offer for browsed product",
                action_label="Create Offer",
                confidence=0.72,
                product_id=event.product_id,
                product_name=event.product_name,
                source_event_ids=[event.event_id],
                payload=event.payload,
            )
        return None

    async def _intelligence_agent_price(self, event: RetailEvent) -> Optional[AgentDecision]:
        deviation = event.payload.get("deviation_pct", 0)
        direction = event.payload.get("direction", "above")
        return AgentDecision(
            shop_id=self.shop_id,
            agent=AgentRole.INTELLIGENCE,
            priority=DecisionPriority.MEDIUM,
            title=f"Price anomaly: {event.product_name} {deviation:.0f}% {direction} market",
            reasoning=(
                f"{event.product_name} is priced {deviation:.0f}% {direction} comparable market rate. "
                f"{'Margin opportunity — consider slight increase.' if direction == 'below' else 'Risk of lost sales — review pricing.'}"
            ),
            action="Review and adjust pricing",
            action_label="Adjust Price",
            confidence=0.75,
            product_id=event.product_id,
            product_name=event.product_name,
            source_event_ids=[event.event_id],
            payload=event.payload,
        )

    # ── Manager Agent (periodic synthesis) ───────────────────────────────────

    async def _periodic_synthesis(self) -> None:
        """Every ~15s, Manager Agent synthesizes recent memory into an executive decision."""
        if not self._memory:
            return

        critical_count = sum(1 for e in self._memory if e.severity == EventSeverity.CRITICAL)
        spike_count = sum(1 for e in self._memory if e.event_type == EventType.SALE_SPIKE_DETECTED)
        slow_count = sum(1 for e in self._memory if e.event_type == EventType.SLOW_MOVER_ALERT)

        key = f"manager:synthesis:{self.shop_id}"
        if self._is_cooling_down(key):
            return
        self._set_cooldown(key)

        if critical_count >= 2:
            decision = AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.MANAGER,
                priority=DecisionPriority.CRITICAL,
                title=f"Multi-SKU inventory crisis — {critical_count} critical alerts",
                reasoning=(
                    f"Demand Agent and Intelligence Agent both flagging {critical_count} critical events. "
                    f"Pattern suggests systemic supply chain pressure, not isolated incidents. "
                    f"Recommend emergency supplier review and safety stock increase across affected SKUs."
                ),
                action="Initiate emergency supply chain review",
                action_label="Executive Action",
                confidence=0.88,
                source_event_ids=[e.event_id for e in list(self._memory)[-5:]],
                payload={"critical_count": critical_count},
            )
        elif spike_count >= 2:
            decision = AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.MANAGER,
                priority=DecisionPriority.HIGH,
                title=f"Demand surge across {spike_count} products — act now",
                reasoning=(
                    f"Multiple demand spikes detected. This may indicate a local event, "
                    f"promotion effect, or seasonal shift. Increase safety stock across fast movers."
                ),
                action="Bulk reorder fast movers",
                action_label="Bulk Reorder",
                confidence=0.82,
                source_event_ids=[e.event_id for e in list(self._memory)[-5:]],
                payload={"spike_count": spike_count},
            )
        elif slow_count >= 2:
            decision = AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.MANAGER,
                priority=DecisionPriority.MEDIUM,
                title=f"Capital efficiency alert — {slow_count} slow movers identified",
                reasoning=(
                    f"Intelligence Agent flagged {slow_count} slow-moving SKUs. "
                    f"Bundling slow movers with fast movers can clear inventory and boost basket size."
                ),
                action="Create bundle promotion across slow movers",
                action_label="Bundle Strategy",
                confidence=0.77,
                source_event_ids=[e.event_id for e in list(self._memory)[-5:]],
                payload={"slow_count": slow_count},
            )
        else:
            # Routine status
            decision = AgentDecision(
                shop_id=self.shop_id,
                agent=AgentRole.MANAGER,
                priority=DecisionPriority.LOW,
                title="All agents nominal — store operating normally",
                reasoning=(
                    f"Reviewed last {len(self._memory)} events. "
                    f"No systemic issues detected. Demand and Intelligence agents are monitoring."
                ),
                action="Continue monitoring",
                action_label="View Status",
                confidence=0.95,
                source_event_ids=[],
                payload={},
            )

        await self._publish_decision(decision)

    async def _publish_decision(self, decision: AgentDecision) -> None:
        # Wrap decision as a RetailEvent so it flows through the same SSE stream
        event = RetailEvent(
            event_type=EventType.AGENT_DECISION,
            shop_id=self.shop_id,
            product_id=decision.product_id,
            product_name=decision.product_name,
            severity=self._priority_to_severity(decision.priority),
            title=decision.title,
            message=decision.reasoning,
            payload={
                "decision_id": decision.decision_id,
                "agent": decision.agent,
                "priority": decision.priority,
                "action": decision.action,
                "action_label": decision.action_label,
                "action_endpoint": decision.action_endpoint,
                "confidence": decision.confidence,
                "reasoning": decision.reasoning,
                **decision.payload,
            },
            action_required=decision.priority in (DecisionPriority.CRITICAL, DecisionPriority.HIGH),
            action_label=decision.action_label,
        )
        await event_bus.publish(event)
        logger.info(f"[{decision.agent}] {decision.priority}: {decision.title}")

    @staticmethod
    def _priority_to_severity(priority: DecisionPriority) -> EventSeverity:
        return {
            DecisionPriority.CRITICAL: EventSeverity.CRITICAL,
            DecisionPriority.HIGH: EventSeverity.WARNING,
            DecisionPriority.MEDIUM: EventSeverity.WARNING,
            DecisionPriority.LOW: EventSeverity.INFO,
        }.get(priority, EventSeverity.INFO)

    def _is_cooling_down(self, key: str) -> bool:
        from datetime import timedelta
        expiry = self._cooldowns.get(key)
        if expiry and datetime.utcnow() < expiry:
            return True
        return False

    def _set_cooldown(self, key: str) -> None:
        from datetime import timedelta
        self._cooldowns[key] = datetime.utcnow() + timedelta(seconds=self.DECISION_COOLDOWN)


# Global registry
_orchestrators: dict[str, AgentOrchestrator] = {}


def get_orchestrator(shop_id: str) -> AgentOrchestrator:
    if shop_id not in _orchestrators:
        _orchestrators[shop_id] = AgentOrchestrator(shop_id)
    return _orchestrators[shop_id]
