from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Shop(Base):
    __tablename__ = "shops"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    shop_type = Column(String, nullable=False)  # grocery, stationery, textile, mobile
    owner_name = Column(String, nullable=True)
    region = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="shop", lazy="dynamic")
