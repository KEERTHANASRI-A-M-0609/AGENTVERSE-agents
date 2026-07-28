"""
Dataset Loader — loads the real ShopMind AI dataset CSV into SQLite.
Maps the actual CSV columns to the ORM models.
Run: python -m app.db.load_dataset
"""
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from sqlalchemy.exc import SQLAlchemyError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.sale import Sale
from app.models.shop import Shop


DATASET_PATH = Path(__file__).resolve().parents[2] / "Datasets" / "shopmind_ai_multi_agent_dataset.csv"
if not DATASET_PATH.exists():
    DATASET_PATH = Path(__file__).resolve().parents[3] / "Datasets" / "shopmind_ai_multi_agent_dataset.csv"

SHOP = {
    "id": "shop_001",
    "name": "ShopMind Demo Store",
    "shop_type": "grocery",
    "owner_name": "Demo Owner",
    "region": "Chennai",
}

REQUIRED_COLUMNS = {
    "date",
    "product_id",
    "product_name",
    "category",
    "current_stock_qty",
    "reorder_level_qty",
    "current_price_inr",
    "units_sold",
    "is_weekend",
    "is_festival",
}


def _validate_dataset(df: pd.DataFrame) -> None:
    missing = sorted(REQUIRED_COLUMNS - set(df.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")

    if df.empty:
        raise ValueError("Dataset is empty.")


def _normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce").dt.date
    normalized["product_id"] = normalized["product_id"].astype(str).str.strip()
    normalized["product_name"] = normalized["product_name"].astype(str).str.strip()
    normalized["category"] = normalized["category"].astype(str).str.strip()
    normalized["current_stock_qty"] = pd.to_numeric(normalized["current_stock_qty"], errors="coerce").fillna(0).astype(int)
    normalized["reorder_level_qty"] = pd.to_numeric(normalized["reorder_level_qty"], errors="coerce").fillna(0).astype(int)
    normalized["current_price_inr"] = pd.to_numeric(normalized["current_price_inr"], errors="coerce").fillna(0.0)
    normalized["units_sold"] = pd.to_numeric(normalized["units_sold"], errors="coerce").fillna(0).astype(int)
    normalized["is_weekend"] = normalized["is_weekend"].fillna(False).astype(bool)
    normalized["is_festival"] = normalized["is_festival"].fillna(False).astype(bool)
    normalized = normalized.dropna(subset=["date", "product_id", "product_name"])
    normalized = normalized.drop_duplicates(subset=["date", "product_id"])
    return normalized.reset_index(drop=True)


def _upsert_shop(db) -> None:
    shop = db.query(Shop).filter(Shop.id == SHOP["id"]).first()
    if shop is None:
        db.add(Shop(**SHOP))
        db.commit()
        print(f"[OK] Shop created: {SHOP['name']}")


def _upsert_products(db, df: pd.DataFrame) -> int:
    products_df = (
        df[["product_id", "product_name", "category", "current_stock_qty", "reorder_level_qty", "current_price_inr"]]
        .drop_duplicates("product_id")
        .copy()
    )

    created = 0
    for _, row in products_df.iterrows():
        existing = db.query(Product).filter(Product.id == row["product_id"]).first()
        if existing:
            continue
        db.add(
            Product(
                id=row["product_id"],
                shop_id=SHOP["id"],
                name=row["product_name"],
                category=row["category"],
                current_stock=int(row["current_stock_qty"]),
                reorder_point=int(row["reorder_level_qty"]),
                selling_price=float(row["current_price_inr"]),
                lead_time_days=3,
            )
        )
        created += 1
    db.commit()
    return created


def _load_sales(db, df: pd.DataFrame) -> Tuple[int, int]:
    inserted = 0
    skipped = 0
    for _, row in df.iterrows():
        exists = (
            db.query(Sale)
            .filter(
                Sale.shop_id == SHOP["id"],
                Sale.product_id == row["product_id"],
                Sale.sale_date == row["date"],
            )
            .first()
        )
        if exists:
            skipped += 1
            continue
        db.add(
            Sale(
                shop_id=SHOP["id"],
                product_id=row["product_id"],
                sale_date=row["date"],
                quantity_sold=int(row["units_sold"]),
                selling_price=float(row["current_price_inr"]),
                is_weekend=bool(row["is_weekend"]),
                is_festival=bool(row["is_festival"]),
                is_holiday=False,
            )
        )
        inserted += 1
    db.commit()
    return inserted, skipped


def load() -> None:
    init_db()
    db = SessionLocal()

    try:
        if not DATASET_PATH.exists():
            raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

        df = pd.read_csv(DATASET_PATH)
        _validate_dataset(df)
        normalized = _normalize_dataframe(df)

        _upsert_shop(db)
        product_count = _upsert_products(db, normalized)
        sale_count, skipped = _load_sales(db, normalized)

        print(f"[OK] {product_count} products loaded")
        print(f"[OK] {sale_count} sales records loaded ({skipped} skipped as duplicates)")
        print("\nDataset loaded. Start the server: python run.py")
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}")
        print("Please ensure the CSV file is in the Datasets/ folder.")
    except ValueError as exc:
        print(f"ERROR: {exc}")
    except SQLAlchemyError as exc:
        db.rollback()
        print(f"ERROR: Database failed while loading dataset: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    load()
