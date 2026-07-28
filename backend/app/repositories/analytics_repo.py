"""
Analytics repository — optimized aggregate queries over sales/products.

Keeps analytics SQL out of SaleRepository so Demand Prediction remains untouched.
"""
from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale
from app.models.shop import Shop


class AnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Helpers ──────────────────────────────────────────────────────────────

    def get_shop(self, shop_id: str) -> Optional[Shop]:
        return self.db.query(Shop).filter(Shop.id == shop_id).first()

    def latest_sale_date(self, shop_id: str) -> Optional[date]:
        return (
            self.db.query(func.max(Sale.sale_date))
            .filter(Sale.shop_id == shop_id)
            .scalar()
        )

    def _revenue_expr(self):
        """Revenue = quantity_sold * COALESCE(sale.selling_price, product.selling_price, 0)."""
        price = func.coalesce(Sale.selling_price, Product.selling_price, 0.0)
        return Sale.quantity_sold * price

    # ── Daily aggregates ─────────────────────────────────────────────────────

    def daily_metrics(
        self, shop_id: str, on_date: date
    ) -> Tuple[float, int, int]:
        """Return (revenue, order_count, units_sold) for a single day."""
        revenue_expr = self._revenue_expr()
        row = (
            self.db.query(
                func.coalesce(func.sum(revenue_expr), 0.0).label("revenue"),
                func.count(Sale.id).label("orders"),
                func.coalesce(func.sum(Sale.quantity_sold), 0).label("units"),
            )
            .outerjoin(Product, Product.id == Sale.product_id)
            .filter(Sale.shop_id == shop_id, Sale.sale_date == on_date)
            .one()
        )
        return float(row.revenue or 0.0), int(row.orders or 0), int(row.units or 0)

    def revenue_trend(
        self, shop_id: str, start_date: date, end_date: date
    ) -> List[Tuple[date, float, int, int]]:
        """Daily (date, revenue, orders, units) inclusive of start/end, ordered ascending."""
        revenue_expr = self._revenue_expr()
        rows = (
            self.db.query(
                Sale.sale_date,
                func.coalesce(func.sum(revenue_expr), 0.0).label("revenue"),
                func.count(Sale.id).label("orders"),
                func.coalesce(func.sum(Sale.quantity_sold), 0).label("units"),
            )
            .outerjoin(Product, Product.id == Sale.product_id)
            .filter(
                Sale.shop_id == shop_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
            )
            .group_by(Sale.sale_date)
            .order_by(Sale.sale_date.asc())
            .all()
        )
        return [
            (r.sale_date, float(r.revenue or 0.0), int(r.orders or 0), int(r.units or 0))
            for r in rows
        ]

    # ── Product rankings ─────────────────────────────────────────────────────

    def top_products_by_units(
        self,
        shop_id: str,
        start_date: date,
        end_date: date,
        limit: int = 5,
        ascending: bool = False,
    ) -> List[Tuple[str, str, Optional[str], int, float]]:
        """
        Rank products by units sold in [start_date, end_date].

        Returns (product_id, name, category, units_sold, revenue).
        When ascending=True, returns slow movers among products that had at least one sale.
        """
        revenue_expr = self._revenue_expr()
        order = func.sum(Sale.quantity_sold).asc() if ascending else func.sum(Sale.quantity_sold).desc()

        rows = (
            self.db.query(
                Sale.product_id,
                Product.name,
                Product.category,
                func.coalesce(func.sum(Sale.quantity_sold), 0).label("units"),
                func.coalesce(func.sum(revenue_expr), 0.0).label("revenue"),
            )
            .join(Product, Product.id == Sale.product_id)
            .filter(
                Sale.shop_id == shop_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
                Product.is_active == True,  # noqa: E712
            )
            .group_by(Sale.product_id, Product.name, Product.category)
            .order_by(order)
            .limit(limit)
            .all()
        )
        return [
            (
                r.product_id,
                r.name or r.product_id,
                r.category,
                int(r.units or 0),
                float(r.revenue or 0.0),
            )
            for r in rows
        ]

    def slow_moving_including_zero_sales(
        self,
        shop_id: str,
        start_date: date,
        end_date: date,
        limit: int = 5,
    ) -> List[Tuple[str, str, Optional[str], int, float]]:
        """
        Slow movers: active products with lowest units in the window,
        including products with zero sales in the period.
        """
        revenue_expr = self._revenue_expr()
        sold_subq = (
            self.db.query(
                Sale.product_id.label("product_id"),
                func.coalesce(func.sum(Sale.quantity_sold), 0).label("units"),
                func.coalesce(func.sum(revenue_expr), 0.0).label("revenue"),
            )
            .outerjoin(Product, Product.id == Sale.product_id)
            .filter(
                Sale.shop_id == shop_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
            )
            .group_by(Sale.product_id)
            .subquery()
        )

        rows = (
            self.db.query(
                Product.id,
                Product.name,
                Product.category,
                func.coalesce(sold_subq.c.units, 0).label("units"),
                func.coalesce(sold_subq.c.revenue, 0.0).label("revenue"),
            )
            .outerjoin(sold_subq, sold_subq.c.product_id == Product.id)
            .filter(Product.shop_id == shop_id, Product.is_active == True)  # noqa: E712
            .order_by(func.coalesce(sold_subq.c.units, 0).asc(), Product.name.asc())
            .limit(limit)
            .all()
        )
        return [
            (
                r.id,
                r.name or r.id,
                r.category,
                int(r.units or 0),
                float(r.revenue or 0.0),
            )
            for r in rows
        ]

    # ── Health / movement inputs ─────────────────────────────────────────────

    def active_product_count(self, shop_id: str) -> int:
        return (
            self.db.query(func.count(Product.id))
            .filter(Product.shop_id == shop_id, Product.is_active == True)  # noqa: E712
            .scalar()
            or 0
        )

    def products_with_sales_count(
        self, shop_id: str, start_date: date, end_date: date
    ) -> int:
        return (
            self.db.query(func.count(func.distinct(Sale.product_id)))
            .filter(
                Sale.shop_id == shop_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
            )
            .scalar()
            or 0
        )

    def period_revenue(self, shop_id: str, start_date: date, end_date: date) -> float:
        revenue_expr = self._revenue_expr()
        total = (
            self.db.query(func.coalesce(func.sum(revenue_expr), 0.0))
            .outerjoin(Product, Product.id == Sale.product_id)
            .filter(
                Sale.shop_id == shop_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
            )
            .scalar()
        )
        return float(total or 0.0)
