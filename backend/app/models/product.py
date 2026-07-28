from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    shop_id = Column(String, ForeignKey("shops.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # e.g. staples, beverages, stationery
    unit = Column(String, default="units")
    current_stock = Column(Integer, default=0)
    reorder_point = Column(Integer, default=10)
    lead_time_days = Column(Integer, default=3)
    selling_price = Column(Float, nullable=True)
    classification = Column(String, default="unknown")  # fast_moving, slow_moving, seasonal
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    shop = relationship("Shop", back_populates="products")
    sales = relationship("Sale", back_populates="product", lazy="dynamic")
    predictions = relationship("Prediction", back_populates="product", lazy="dynamic")
