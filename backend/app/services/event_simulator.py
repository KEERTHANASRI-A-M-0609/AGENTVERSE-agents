"""
Retail Event Simulator — generates realistic live retail events from actual DB data.
Runs as a background asyncio task. Publishes to the event bus.
Simulates: sales, stock changes, demand spikes, slow movers, revenue milestones.
"""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, date
from typing import List, Optional

from app.core.logging import logger
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.sale import Sale
from app.schemas.events import EventSeverity, EventType, RetailEvent
from app.services.alert_engine import alert_engine
from app.services.event_bus import event_bus


class RetailEventSimulator:
    """
    Simulates a live retail store by reading real product/sales data
    and generating plausible real-time events at configurable intervals.
    """

    def __init__(self, shop_id: str, interval_seconds: float = 8.0) -> None:
        self.shop_id = shop_id
        self.interval = interval_seconds
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._daily_revenue: float = 0.0
        self._revenue_milestone_hit = False

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop(), name=f"simulator:{self.shop_id}")
        logger.info(f"RetailEventSimulator started for {self.shop_id} (interval={self.interval}s)")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while self._running:
            try:
                await self._emit_event()
            except Exception as exc:
                logger.warning(f"Simulator error: {exc}")
            await asyncio.sleep(self.interval)

    async def _emit_event(self) -> None:
        products = self._load_products()
        if not products:
            await self._emit_heartbeat()
            return

        # Weighted random event selection
        roll = random.random()

        if roll < 0.25:
            await self._emit_sale_event(products)
        elif roll < 0.42:
            await self._emit_stock_event(products)
        elif roll < 0.55:
            await self._emit_demand_event(products)
        elif roll < 0.65:
            await self._emit_slow_mover_event(products)
        elif roll < 0.73:
            await self._emit_revenue_event()
        elif roll < 0.82:
            await self._emit_customer_event(products)
        elif roll < 0.90:
            await self._emit_order_event(products)
        elif roll < 0.96:
            await self._emit_price_anomaly_event(products)
        else:
            await self._emit_heartbeat()

    def _load_products(self) -> List[Product]:
        db = SessionLocal()
        try:
            return db.query(Product).filter(
                Product.shop_id == self.shop_id,
                Product.is_active == True,
            ).all()
        finally:
            db.close()

    async def _emit_sale_event(self, products: List[Product]) -> None:
        product = random.choice(products)
        qty = random.randint(1, max(1, int(product.current_stock * 0.15)))
        price = product.selling_price or 100.0
        revenue = qty * price

        # Detect spike: qty > 2x average daily
        db = SessionLocal()
        try:
            from sqlalchemy import func
            avg_row = db.query(func.avg(Sale.quantity_sold)).filter(
                Sale.shop_id == self.shop_id,
                Sale.product_id == product.id,
            ).scalar()
            avg_daily = float(avg_row or qty)
        finally:
            db.close()

        self._daily_revenue += revenue

        is_spike = qty > avg_daily * 2.0 and avg_daily > 0

        if is_spike:
            spike_pct = ((qty / avg_daily) - 1) * 100
            event = RetailEvent(
                event_type=EventType.SALE_SPIKE_DETECTED,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.WARNING,
                title=f"Sales Spike: {product.name}",
                message=f"{product.name} sold {qty} units — {spike_pct:.0f}% above daily average.",
                payload={
                    "quantity_sold": qty,
                    "avg_daily": round(avg_daily, 1),
                    "spike_pct": round(spike_pct, 1),
                    "revenue": round(revenue, 2),
                },
                action_required=True,
                action_label="Review Stock",
            )
        else:
            event = RetailEvent(
                event_type=EventType.SALE_RECORDED,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.INFO,
                title=f"Sale: {product.name}",
                message=f"{qty} unit(s) of {product.name} sold. Revenue: ₹{revenue:.0f}.",
                payload={
                    "quantity_sold": qty,
                    "revenue": round(revenue, 2),
                    "current_stock": product.current_stock,
                },
            )

        await self._publish(event)

    async def _emit_stock_event(self, products: List[Product]) -> None:
        # Focus on products with low stock
        at_risk = [p for p in products if p.current_stock <= p.reorder_point * 1.5]
        product = random.choice(at_risk) if at_risk else random.choice(products)

        stock = product.current_stock
        reorder_qty = max(product.reorder_point * 3, 20)

        if stock == 0:
            event = RetailEvent(
                event_type=EventType.STOCK_OUT,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.CRITICAL,
                title=f"STOCKOUT: {product.name}",
                message=f"{product.name} is completely out of stock.",
                payload={"current_stock": 0, "recommended_order_quantity": reorder_qty},
                action_required=True,
                action_label="Emergency Reorder",
            )
        elif stock <= product.reorder_point:
            event = RetailEvent(
                event_type=EventType.STOCK_CRITICAL,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.CRITICAL,
                title=f"Critical Stock: {product.name}",
                message=f"{product.name} stock at {stock} units — below reorder point of {product.reorder_point}.",
                payload={
                    "current_stock": stock,
                    "reorder_point": product.reorder_point,
                    "recommended_order_quantity": reorder_qty,
                },
                action_required=True,
                action_label="Approve Reorder",
            )
        else:
            event = RetailEvent(
                event_type=EventType.STOCK_LOW,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.WARNING,
                title=f"Low Stock: {product.name}",
                message=f"{product.name} stock at {stock} units. Approaching reorder threshold.",
                payload={"current_stock": stock, "reorder_point": product.reorder_point},
                action_required=False,
            )

        await self._publish(event)

    async def _emit_demand_event(self, products: List[Product]) -> None:
        product = random.choice(products)
        trend = random.choice(["upward", "downward", "seasonal_spike", "stable"])
        change_pct = random.uniform(10, 45)

        if trend in ("upward", "seasonal_spike"):
            event = RetailEvent(
                event_type=EventType.DEMAND_TREND_CHANGE,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.WARNING,
                title=f"Demand Rising: {product.name}",
                message=f"Forecast model detects {change_pct:.0f}% demand increase for {product.name} over next 7 days.",
                payload={"trend": trend, "change_pct": round(change_pct, 1)},
                action_required=True,
                action_label="Update Reorder Plan",
            )
        elif trend == "downward":
            event = RetailEvent(
                event_type=EventType.DEMAND_TREND_CHANGE,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.INFO,
                title=f"Demand Softening: {product.name}",
                message=f"Forecast model detects {change_pct:.0f}% demand decrease for {product.name}. Avoid over-ordering.",
                payload={"trend": trend, "change_pct": round(-change_pct, 1)},
                action_required=False,
            )
        else:
            event = RetailEvent(
                event_type=EventType.DEMAND_FORECAST_UPDATED,
                shop_id=self.shop_id,
                product_id=product.id,
                product_name=product.name,
                severity=EventSeverity.INFO,
                title=f"Forecast Refreshed: {product.name}",
                message=f"Demand forecast for {product.name} updated. Trend: stable.",
                payload={"trend": trend},
            )

        await self._publish(event)

    async def _emit_slow_mover_event(self, products: List[Product]) -> None:
        # Pick a product with low stock movement
        slow = [p for p in products if p.current_stock > p.reorder_point * 2]
        if not slow:
            return
        product = random.choice(slow)
        days_no_sale = random.randint(5, 14)

        event = RetailEvent(
            event_type=EventType.SLOW_MOVER_ALERT,
            shop_id=self.shop_id,
            product_id=product.id,
            product_name=product.name,
            severity=EventSeverity.WARNING,
            title=f"Slow Mover: {product.name}",
            message=f"{product.name} has {product.current_stock} units with low recent sales velocity.",
            payload={
                "current_stock": product.current_stock,
                "days_no_sale": days_no_sale,
                "unit_price": product.selling_price or 100,
            },
            action_required=True,
            action_label="Create Promotion",
        )
        await self._publish(event)

    async def _emit_revenue_event(self) -> None:
        milestones = [5000, 10000, 25000, 50000]
        for milestone in milestones:
            if self._daily_revenue >= milestone and not self._revenue_milestone_hit:
                self._revenue_milestone_hit = True
                event = RetailEvent(
                    event_type=EventType.REVENUE_MILESTONE,
                    shop_id=self.shop_id,
                    severity=EventSeverity.SUCCESS,
                    title=f"Revenue Milestone: ₹{milestone:,}",
                    message=f"Your store crossed ₹{milestone:,} in revenue today!",
                    payload={"revenue": round(self._daily_revenue, 2), "milestone": milestone},
                )
                await self._publish(event)
                return

        # Generic revenue update
        event = RetailEvent(
            event_type=EventType.REVENUE_MILESTONE,
            shop_id=self.shop_id,
            severity=EventSeverity.INFO,
            title="Revenue Update",
            message=f"Today's running revenue: ₹{self._daily_revenue:,.0f}",
            payload={"revenue": round(self._daily_revenue, 2)},
        )
        await self._publish(event)

    async def _emit_customer_event(self, products: list) -> None:
        product = random.choice(products)
        activity = random.choice(["browse", "cart_abandon", "repeat_purchase", "bulk_buy"])
        customer_id = f"cust_{random.randint(100, 999)}"

        messages = {
            "browse": f"Customer {customer_id} browsed {product.name} — no purchase yet.",
            "cart_abandon": f"Customer {customer_id} added {product.name} to cart but did not checkout.",
            "repeat_purchase": f"Loyal customer {customer_id} made repeat purchase of {product.name}.",
            "bulk_buy": f"Customer {customer_id} bought {random.randint(3,8)} units of {product.name} in one order.",
        }
        event = RetailEvent(
            event_type=EventType.CUSTOMER_ACTIVITY,
            shop_id=self.shop_id,
            product_id=product.id,
            product_name=product.name,
            severity=EventSeverity.WARNING if activity == "cart_abandon" else EventSeverity.INFO,
            title=f"Customer Activity: {activity.replace('_', ' ').title()}",
            message=messages[activity],
            payload={"activity_type": activity, "customer_id": customer_id},
            action_required=activity == "cart_abandon",
            action_label="Create Offer" if activity == "cart_abandon" else None,
        )
        await self._publish(event)

    async def _emit_order_event(self, products: list) -> None:
        product = random.choice(products)
        qty = random.randint(1, 5)
        revenue = qty * (product.selling_price or 100.0)
        self._daily_revenue += revenue
        event = RetailEvent(
            event_type=EventType.ORDER_PLACED,
            shop_id=self.shop_id,
            product_id=product.id,
            product_name=product.name,
            severity=EventSeverity.SUCCESS,
            title=f"Order Placed: {product.name}",
            message=f"New order: {qty} × {product.name} = ₹{revenue:.0f}.",
            payload={"quantity": qty, "revenue": round(revenue, 2), "product_id": product.id},
        )
        await self._publish(event)

    async def _emit_price_anomaly_event(self, products: list) -> None:
        product = random.choice(products)
        direction = random.choice(["above", "below"])
        deviation = random.uniform(8, 30)
        event = RetailEvent(
            event_type=EventType.PRICE_ANOMALY,
            shop_id=self.shop_id,
            product_id=product.id,
            product_name=product.name,
            severity=EventSeverity.WARNING,
            title=f"Price Signal: {product.name}",
            message=f"{product.name} is priced {deviation:.0f}% {direction} comparable market rate.",
            payload={"direction": direction, "deviation_pct": round(deviation, 1), "current_price": product.selling_price},
            action_required=True,
            action_label="Adjust Price",
        )
        await self._publish(event)

    async def _emit_heartbeat(self) -> None:
        event = RetailEvent(
            event_type=EventType.AGENT_HEARTBEAT,
            shop_id=self.shop_id,
            severity=EventSeverity.INFO,
            title="Agent Heartbeat",
            message=f"ShopMind AI agents are active and monitoring your store.",
            payload={"timestamp": datetime.utcnow().isoformat()},
        )
        await self._publish(event)

    async def _publish(self, event: RetailEvent) -> None:
        await event_bus.publish(event)
        # Let alert engine evaluate the event
        await alert_engine.process_event(event)


# Global simulator registry — one per shop
_simulators: dict[str, RetailEventSimulator] = {}


def get_simulator(shop_id: str) -> RetailEventSimulator:
    if shop_id not in _simulators:
        _simulators[shop_id] = RetailEventSimulator(shop_id)
    return _simulators[shop_id]
