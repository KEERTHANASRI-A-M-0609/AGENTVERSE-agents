from datetime import date
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from app.models.sale import Sale
from app.repositories.base import BaseRepository


class SaleRepository(BaseRepository[Sale]):
    def __init__(self, db: Session):
        super().__init__(Sale, db)

    def get_sales_dataframe(self, shop_id: str, product_id: str) -> pd.DataFrame:
        rows = (
            self.db.query(Sale)
            .filter(Sale.shop_id == shop_id, Sale.product_id == product_id)
            .order_by(Sale.sale_date.asc())
            .all()
        )
        if not rows:
            return pd.DataFrame()

        return pd.DataFrame(
            [
                {
                    "sale_date": r.sale_date,
                    "quantity_sold": r.quantity_sold,
                    "is_weekend": r.is_weekend,
                    "is_festival": r.is_festival,
                    "is_holiday": r.is_holiday,
                    "selling_price": r.selling_price,
                }
                for r in rows
            ]
        )

    def count_days(self, shop_id: str, product_id: str) -> int:
        return (
            self.db.query(func.count(func.distinct(Sale.sale_date)))
            .filter(Sale.shop_id == shop_id, Sale.product_id == product_id)
            .scalar()
            or 0
        )

    def sale_exists(self, shop_id: str, product_id: str, sale_date: date) -> bool:
        return (
            self.db.query(Sale)
            .filter(
                Sale.shop_id == shop_id,
                Sale.product_id == product_id,
                Sale.sale_date == sale_date,
            )
            .first()
            is not None
        )

    def sum_quantity_between(
        self, shop_id: str, product_id: str, start_date: date, end_date: date
    ) -> float:
        total = (
            self.db.query(func.coalesce(func.sum(Sale.quantity_sold), 0.0))
            .filter(
                Sale.shop_id == shop_id,
                Sale.product_id == product_id,
                Sale.sale_date >= start_date,
                Sale.sale_date <= end_date,
            )
            .scalar()
        )
        return float(total or 0.0)

    def category_avg_daily(self, shop_id: str, category: str, exclude_product_id: str) -> float:
        """Average daily units sold for other products in the same category at this shop."""
        from app.models.product import Product

        rows = (
            self.db.query(Sale.quantity_sold, Sale.sale_date)
            .join(Product, Product.id == Sale.product_id)
            .filter(
                Sale.shop_id == shop_id,
                Product.category == category,
                Sale.product_id != exclude_product_id,
            )
            .all()
        )
        if not rows:
            return 0.0
        by_day: dict[date, float] = {}
        for qty, sale_date in rows:
            by_day[sale_date] = by_day.get(sale_date, 0.0) + float(qty or 0)
        if not by_day:
            return 0.0
        return float(sum(by_day.values()) / len(by_day))
