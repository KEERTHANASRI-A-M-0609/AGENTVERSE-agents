"""
Business Analytics Service — orchestrates KPI, product, trend, health, and insight prep.

Does not call Gemini; prepare_insights() only builds a structured payload for future LLM use.
"""
from datetime import date, datetime, timedelta
from statistics import pstdev
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ShopNotFoundError
from app.core.logging import logger
from app.repositories.analytics_repo import AnalyticsRepository
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    AnalyticsInsightsResponse,
    BusinessHealthResponse,
    DailyRevenuePoint,
    DashboardKPIs,
    HealthScoreBreakdown,
    ProductAnalyticsResponse,
    ProductSalesItem,
    RevenueTrendResponse,
)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AnalyticsRepository(db)

    # ── Reference date ───────────────────────────────────────────────────────

    def resolve_as_of(self, shop_id: str, as_of: Optional[date] = None) -> date:
        """
        Prefer explicit as_of; otherwise use calendar today if sales exist,
        else fall back to the shop's latest sale date (demo-dataset friendly).
        """
        if as_of is not None:
            return as_of

        today = date.today()
        rev, orders, _ = self.repo.daily_metrics(shop_id, today)
        if orders > 0 or rev > 0:
            return today

        latest = self.repo.latest_sale_date(shop_id)
        if latest is not None:
            logger.info(
                "Analytics as_of fallback to latest sale_date=%s for shop=%s",
                latest,
                shop_id,
            )
            return latest
        return today

    def _ensure_shop(self, shop_id: str) -> str:
        shop = self.repo.get_shop(shop_id)
        if not shop:
            raise ShopNotFoundError(shop_id)
        return shop.name or shop_id

    # ── Dashboard KPIs ───────────────────────────────────────────────────────

    async def get_dashboard(
        self, shop_id: str, as_of: Optional[date] = None
    ) -> AnalyticsDashboardResponse:
        shop_name = self._ensure_shop(shop_id)
        ref = self.resolve_as_of(shop_id, as_of)
        prev = ref - timedelta(days=1)

        today_rev, today_orders, today_units = self.repo.daily_metrics(shop_id, ref)
        prev_rev, _, _ = self.repo.daily_metrics(shop_id, prev)

        if prev_rev > 0:
            growth = ((today_rev - prev_rev) / prev_rev) * 100.0
        elif today_rev > 0:
            growth = 100.0
        else:
            growth = 0.0

        logger.info(
            "Analytics dashboard shop=%s as_of=%s revenue=%.2f growth=%.2f%%",
            shop_id,
            ref,
            today_rev,
            growth,
        )

        return AnalyticsDashboardResponse(
            shop_id=shop_id,
            shop_name=shop_name,
            as_of=ref,
            generated_at=datetime.utcnow(),
            kpis=DashboardKPIs(
                todays_revenue=round(today_rev, 2),
                total_orders=today_orders,
                total_products_sold=today_units,
                revenue_growth_pct=round(growth, 2),
            ),
        )

    # ── Product analytics ────────────────────────────────────────────────────

    async def get_product_analytics(
        self,
        shop_id: str,
        as_of: Optional[date] = None,
        lookback_days: int = 30,
    ) -> ProductAnalyticsResponse:
        self._ensure_shop(shop_id)
        ref = self.resolve_as_of(shop_id, as_of)
        lookback_days = max(1, min(365, lookback_days))
        start = ref - timedelta(days=lookback_days - 1)

        best_rows = self.repo.top_products_by_units(
            shop_id, start, ref, limit=5, ascending=False
        )
        slow_rows = self.repo.slow_moving_including_zero_sales(
            shop_id, start, ref, limit=5
        )

        def to_item(row: Tuple) -> ProductSalesItem:
            pid, name, category, units, revenue = row
            return ProductSalesItem(
                product_id=pid,
                product_name=name,
                category=category,
                units_sold=units,
                revenue=round(revenue, 2),
            )

        return ProductAnalyticsResponse(
            shop_id=shop_id,
            as_of=ref,
            lookback_days=lookback_days,
            generated_at=datetime.utcnow(),
            best_selling=[to_item(r) for r in best_rows],
            slow_moving=[to_item(r) for r in slow_rows],
        )

    # ── Revenue trend (last 7 days) ──────────────────────────────────────────

    async def get_revenue_trend(
        self, shop_id: str, as_of: Optional[date] = None, days: int = 7
    ) -> RevenueTrendResponse:
        self._ensure_shop(shop_id)
        ref = self.resolve_as_of(shop_id, as_of)
        days = max(1, min(90, days))
        start = ref - timedelta(days=days - 1)

        by_day = {
            d: (rev, orders, units)
            for d, rev, orders, units in self.repo.revenue_trend(shop_id, start, ref)
        }

        series: List[DailyRevenuePoint] = []
        total = 0.0
        cursor = start
        while cursor <= ref:
            rev, orders, units = by_day.get(cursor, (0.0, 0, 0))
            total += rev
            series.append(
                DailyRevenuePoint(
                    date=cursor,
                    revenue=round(rev, 2),
                    orders=orders,
                    units_sold=units,
                )
            )
            cursor += timedelta(days=1)

        return RevenueTrendResponse(
            shop_id=shop_id,
            as_of=ref,
            generated_at=datetime.utcnow(),
            days=days,
            series=series,
            total_revenue=round(total, 2),
        )

    # ── Business health score ────────────────────────────────────────────────

    def _score_revenue_growth(self, growth_pct: float) -> float:
        """Map day-over-day growth % to 0–100."""
        # -20% → 0, 0% → 50, +20% → 100 (clamped)
        return round(max(0.0, min(100.0, 50.0 + (growth_pct * 2.5))), 1)

    def _score_sales_consistency(self, daily_revenues: List[float]) -> float:
        """Lower relative volatility → higher score."""
        if not daily_revenues:
            return 0.0
        mean = sum(daily_revenues) / len(daily_revenues)
        if mean <= 0:
            return 0.0 if all(v == 0 for v in daily_revenues) else 20.0
        if len(daily_revenues) < 2:
            return 50.0
        cv = pstdev(daily_revenues) / mean  # population CV
        # CV 0 → 100, CV 1 → ~0
        return round(max(0.0, min(100.0, 100.0 * (1.0 - min(cv, 1.0)))), 1)

    def _score_product_movement(
        self, active: int, with_sales: int, best_units: int, slow_units: int
    ) -> float:
        """Coverage of catalog selling + gap between best and slow movers."""
        if active <= 0:
            return 0.0
        coverage = with_sales / active  # 0–1
        # Prefer healthy spread without total stagnation on slow side
        if best_units <= 0:
            spread_factor = 0.3
        else:
            # slow/best closer to 0 is fine for retail; penalize if everything is dead
            ratio = slow_units / best_units
            spread_factor = 0.5 + 0.5 * (1.0 - min(ratio, 1.0))
        score = (coverage * 70.0) + (spread_factor * 30.0)
        return round(max(0.0, min(100.0, score)), 1)

    async def get_health(
        self, shop_id: str, as_of: Optional[date] = None
    ) -> BusinessHealthResponse:
        self._ensure_shop(shop_id)
        ref = self.resolve_as_of(shop_id, as_of)
        prev = ref - timedelta(days=1)
        week_start = ref - timedelta(days=6)
        lookback_start = ref - timedelta(days=29)

        today_rev, _, _ = self.repo.daily_metrics(shop_id, ref)
        prev_rev, _, _ = self.repo.daily_metrics(shop_id, prev)
        if prev_rev > 0:
            growth_pct = ((today_rev - prev_rev) / prev_rev) * 100.0
        elif today_rev > 0:
            growth_pct = 100.0
        else:
            growth_pct = 0.0

        trend_rows = self.repo.revenue_trend(shop_id, week_start, ref)
        by_day = {d: rev for d, rev, _, _ in trend_rows}
        daily_revs = [
            float(by_day.get(week_start + timedelta(days=i), 0.0)) for i in range(7)
        ]

        active = self.repo.active_product_count(shop_id)
        with_sales = self.repo.products_with_sales_count(shop_id, lookback_start, ref)
        best = self.repo.top_products_by_units(
            shop_id, lookback_start, ref, limit=1, ascending=False
        )
        slow = self.repo.slow_moving_including_zero_sales(
            shop_id, lookback_start, ref, limit=1
        )
        best_units = best[0][3] if best else 0
        slow_units = slow[0][3] if slow else 0

        growth_score = self._score_revenue_growth(growth_pct)
        consistency_score = self._score_sales_consistency(daily_revs)
        movement_score = self._score_product_movement(
            active, with_sales, best_units, slow_units
        )

        # Weighted blend: growth 40%, consistency 30%, movement 30%
        health = round(
            growth_score * 0.40 + consistency_score * 0.30 + movement_score * 0.30,
            1,
        )
        health = max(0.0, min(100.0, health))

        explanation = self._health_explanation(
            health, growth_pct, consistency_score, movement_score, with_sales, active
        )

        logger.info(
            "Business health shop=%s score=%.1f growth=%.1f consistency=%.1f movement=%.1f",
            shop_id,
            health,
            growth_score,
            consistency_score,
            movement_score,
        )

        return BusinessHealthResponse(
            shop_id=shop_id,
            as_of=ref,
            generated_at=datetime.utcnow(),
            health_score=health,
            explanation=explanation,
            breakdown=HealthScoreBreakdown(
                revenue_growth=growth_score,
                sales_consistency=consistency_score,
                product_movement=movement_score,
            ),
        )

    def _health_explanation(
        self,
        health: float,
        growth_pct: float,
        consistency: float,
        movement: float,
        with_sales: int,
        active: int,
    ) -> str:
        if health >= 75:
            tone = "Business performance is strong"
        elif health >= 50:
            tone = "Business performance is moderate"
        else:
            tone = "Business performance needs attention"

        growth_label = (
            f"revenue {'up' if growth_pct >= 0 else 'down'} {abs(growth_pct):.1f}% day-over-day"
        )
        consistency_label = (
            "stable daily sales"
            if consistency >= 60
            else "volatile daily sales"
        )
        coverage = f"{with_sales}/{active} active products sold in the last 30 days"
        return (
            f"{tone} (score {health:.0f}/100). "
            f"Driven by {growth_label}, {consistency_label}, "
            f"and product movement covering {coverage}."
        )

    # ── AI insight preparation (no Gemini) ───────────────────────────────────

    async def prepare_insights(
        self, shop_id: str, as_of: Optional[date] = None
    ) -> AnalyticsInsightsResponse:
        """Build structured analytics JSON for a future Gemini call."""
        dashboard = await self.get_dashboard(shop_id, as_of)
        products = await self.get_product_analytics(shop_id, as_of)
        trends = await self.get_revenue_trend(shop_id, as_of, days=7)
        health = await self.get_health(shop_id, as_of)

        kpis = dashboard.kpis
        highlights: List[str] = [
            f"Today's revenue is INR {kpis.todays_revenue:,.2f} "
            f"({kpis.revenue_growth_pct:+.1f}% vs prior day).",
            f"{kpis.total_orders} orders sold {kpis.total_products_sold} units.",
            f"Last 7 days revenue totals INR {trends.total_revenue:,.2f}.",
        ]

        if products.best_selling:
            top = products.best_selling[0]
            highlights.append(
                f"Top seller: {top.product_name} ({top.units_sold} units, INR {top.revenue:,.2f})."
            )
        if products.slow_moving:
            slow = products.slow_moving[0]
            highlights.append(
                f"Slowest mover: {slow.product_name} ({slow.units_sold} units)."
            )

        recommendations: List[str] = []
        if kpis.revenue_growth_pct < 0:
            recommendations.append(
                "Investigate day-over-day revenue decline; review promotions and stockouts on top SKUs."
            )
        else:
            recommendations.append(
                "Sustain growth momentum with focused merchandising on current top sellers."
            )

        if products.slow_moving and products.slow_moving[0].units_sold <= 1:
            recommendations.append(
                "Create clearance or bundle offers for slow-moving products to free working capital."
            )
        if health.breakdown.sales_consistency < 50:
            recommendations.append(
                "Smooth demand volatility with weekday-specific campaigns and inventory buffers."
            )
        if health.breakdown.product_movement < 50:
            recommendations.append(
                "Broaden assortment engagement — too few SKUs are contributing to sales."
            )
        if not recommendations:
            recommendations.append(
                "Maintain current assortment mix and monitor weekly health score for early signals."
            )

        summary = (
            f"Shop {shop_id} scored {health.health_score:.0f}/100 on {dashboard.as_of.isoformat()}. "
            f"Revenue INR {kpis.todays_revenue:,.2f} with {kpis.revenue_growth_pct:+.1f}% growth; "
            f"7-day revenue INR {trends.total_revenue:,.2f}."
        )

        logger.info("Prepared analytics insights for shop=%s (no Gemini call)", shop_id)

        return AnalyticsInsightsResponse(
            shop_id=shop_id,
            as_of=dashboard.as_of,
            generated_at=datetime.utcnow(),
            summary=summary,
            highlights=highlights,
            recommendations=recommendations,
            health_score=health.health_score,
        )
