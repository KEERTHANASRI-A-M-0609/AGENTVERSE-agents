from sqlalchemy import Column, String, Integer, Float, Date, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(String, ForeignKey("shops.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    sale_date = Column(Date, nullable=False, index=True)
    quantity_sold = Column(Integer, nullable=False)
    selling_price = Column(Float, nullable=True)
    is_weekend = Column(Boolean, default=False)
    is_festival = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="sales")
