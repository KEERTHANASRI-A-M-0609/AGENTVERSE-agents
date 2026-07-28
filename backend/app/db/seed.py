"""
Seed script — generates realistic sample sales data for a grocery shop.
Run once after init_db to populate the database for testing.
Usage: python -m app.db.seed
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import random
from datetime import date, timedelta
from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.models.shop import Shop
from app.models.product import Product
from app.models.sale import Sale


SHOP = {
    "id": "shop_001",
    "name": "Ravi Kirana Store",
    "shop_type": "grocery",
    "owner_name": "Ravi Kumar",
    "region": "Chennai",
}

PRODUCTS = [
    {"id": "prod_001", "name": "Tata Salt 1kg", "category": "staples", "current_stock": 45, "reorder_point": 20, "selling_price": 22.0},
    {"id": "prod_002", "name": "Sunflower Oil 1L", "category": "oils", "current_stock": 30, "reorder_point": 15, "selling_price": 145.0},
    {"id": "prod_003", "name": "Basmati Rice 5kg", "category": "staples", "current_stock": 20, "reorder_point": 10, "selling_price": 320.0},
    {"id": "prod_004", "name": "Toor Dal 1kg", "category": "pulses", "current_stock": 25, "reorder_point": 12, "selling_price": 110.0},
    {"id": "prod_005", "name": "Amul Butter 500g", "category": "dairy", "current_stock": 15, "reorder_point": 8, "selling_price": 260.0},
]

# Base daily demand per product (units/day)
BASE_DEMAND = {
    "prod_001": 8,
    "prod_002": 5,
    "prod_003": 4,
    "prod_004": 6,
    "prod_005": 3,
}


def generate_sales(shop_id: str, product_id: str, base: int, days: int = 120):
    records = []
    today = date.today()
    for i in range(days, 0, -1):
        sale_date = today - timedelta(days=i)
        is_weekend = sale_date.weekday() >= 5
        is_festival = sale_date.month in [10, 11] and sale_date.day in range(1, 10)

        multiplier = 1.0
        if is_weekend:
            multiplier *= 1.3
        if is_festival:
            multiplier *= 1.8

        qty = max(0, int(base * multiplier + random.gauss(0, base * 0.2)))
        records.append(
            Sale(
                shop_id=shop_id,
                product_id=product_id,
                sale_date=sale_date,
                quantity_sold=qty,
                is_weekend=is_weekend,
                is_festival=is_festival,
                is_holiday=False,
            )
        )
    return records


def seed():
    init_db()
    db = SessionLocal()
    try:
        # Shop
        if not db.query(Shop).filter(Shop.id == SHOP["id"]).first():
            db.add(Shop(**SHOP))
            db.commit()
            print(f"[OK] Shop created: {SHOP['name']}")

        # Products
        for p in PRODUCTS:
            if not db.query(Product).filter(Product.id == p["id"]).first():
                db.add(Product(shop_id=SHOP["id"], **p))
        db.commit()
        print(f"[OK] {len(PRODUCTS)} products created")

        # Sales
        total_sales = 0
        for p in PRODUCTS:
            sales = generate_sales(SHOP["id"], p["id"], BASE_DEMAND[p["id"]])
            db.bulk_save_objects(sales)
            total_sales += len(sales)
        db.commit()
        print(f"[OK] {total_sales} sales records generated")
        print("\nSeed complete. Run the server and test at http://localhost:8000/docs")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
