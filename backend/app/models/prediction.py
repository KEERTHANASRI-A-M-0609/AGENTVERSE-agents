from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String, unique=True, index=True)
    shop_id = Column(String, ForeignKey("shops.id"), nullable=False, index=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False, index=True)
    forecast_horizon_days = Column(Integer, nullable=False)
    total_predicted_units = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    trend_type = Column(String, nullable=True)
    model_used = Column(String, nullable=False)
    reorder_required = Column(Boolean, default=False)
    recommended_order_quantity = Column(Integer, nullable=True)
    ai_explanation = Column(String, nullable=True)
    daily_predictions = Column(JSON, nullable=True)  # stored as JSON array
    recommendation_status = Column(String, nullable=True)  # accepted | modified | pending
    modified_order_quantity = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="predictions")
