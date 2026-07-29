"""Pydantic schemas for the Business Analytics Agent."""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Request ──────────────────────────────────────────────────────────────────

class InsightsRequest(BaseModel):
    shop_id: str = Field(..., min_length=1, description="Shop to analyze")
    as_of: Optional[date] = Field(
        default=None,
        description="Reference business date. Defaults to latest available sale date.",
    )
    lookback_days: int = Field(default=30, ge=1, le=365, description="Period window in days")


# ── Shared / nested ──────────────────────────────────────────────────────────

class DashboardKPIs(BaseModel):
    todays_revenue: float = Field(..., description="Revenue for the reference day (INR)")
    total_orders: int = Field(..., description="Sale-line count used as order proxy")
    total_products_sold: int = Field(..., description="Sum of units sold on the reference day")
    revenue_growth_pct: float = Field(
        ...,
        description="Revenue growth % vs previous day",
    )


class ProductSalesItem(BaseModel):
    product_id: str
    product_name: str
    category: Optional[str] = None
    units_sold: int
    revenue: float


class DailyRevenuePoint(BaseModel):
    date: date
    revenue: float
    orders: int
    units_sold: int


class HealthScoreBreakdown(BaseModel):
    revenue_growth: float = Field(..., ge=0, le=100, description="0–100 component")
    sales_consistency: float = Field(..., ge=0, le=100, description="0–100 component")
    product_movement: float = Field(..., ge=0, le=100, description="0–100 component")


# ── Responses ────────────────────────────────────────────────────────────────

class AnalyticsDashboardResponse(BaseModel):
    status: str = "success"
    shop_id: str
    shop_name: Optional[str] = None
    as_of: date
    generated_at: datetime
    kpis: DashboardKPIs


class ProductAnalyticsResponse(BaseModel):
    status: str = "success"
    shop_id: str
    as_of: date
    lookback_days: int
    generated_at: datetime
    best_selling: List[ProductSalesItem]
    slow_moving: List[ProductSalesItem]


class RevenueTrendResponse(BaseModel):
    status: str = "success"
    shop_id: str
    as_of: date
    generated_at: datetime
    days: int = 7
    series: List[DailyRevenuePoint]
    total_revenue: float


class BusinessHealthResponse(BaseModel):
    status: str = "success"
    shop_id: str
    as_of: date
    generated_at: datetime
    health_score: float = Field(..., ge=0, le=100)
    explanation: str
    breakdown: HealthScoreBreakdown


class AnalyticsInsightsResponse(BaseModel):
    """Structured analytics payload prepared for Gemini (no LLM call)."""
    status: str = "success"
    shop_id: str
    as_of: date
    generated_at: datetime
    summary: str
    highlights: List[str]
    recommendations: List[str]
    health_score: float = Field(..., ge=0, le=100)
