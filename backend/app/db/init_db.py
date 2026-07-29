from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine

# Import all models so Base knows about them before create_all
from app.models.shop import Shop  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.sale import Sale  # noqa: F401
from app.models.prediction import Prediction  # noqa: F401
from app.models.user import User  # noqa: F401


def _ensure_sqlite_columns() -> None:
    """Add new columns and indexes on existing SQLite DBs without Alembic."""
    if not str(engine.url).startswith("sqlite"):
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(predictions)")).fetchall()
        existing = {row[1] for row in rows}
        if "recommendation_status" not in existing:
            conn.execute(text("ALTER TABLE predictions ADD COLUMN recommendation_status VARCHAR"))
        if "modified_order_quantity" not in existing:
            conn.execute(text("ALTER TABLE predictions ADD COLUMN modified_order_quantity INTEGER"))

        # Composite indexes for analytics query performance
        existing_idx = {
            row[1] for row in conn.execute(text("PRAGMA index_list(sales)")).fetchall()
        }
        if "ix_sales_shop_date" not in existing_idx:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_shop_date ON sales (shop_id, sale_date)"))
        if "ix_sales_shop_product_date" not in existing_idx:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_shop_product_date ON sales (shop_id, product_id, sale_date)"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_columns()
