from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Request Schemas ──────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    shop_id: str = Field(..., min_length=1)
    product_id: str = Field(..., min_length=1)
    forecast_horizon_days: int = Field(default=7, ge=1, le=90)
    current_stock: Optional[int] = Field(default=None, ge=0)
    include_ai: bool = False  # opt-in Gemini; prefer POST /demand/explain

    @field_validator("forecast_horizon_days")
    @classmethod
    def cap_horizon(cls, v: int) -> int:
        return min(v, 90)


class BulkPredictRequest(BaseModel):
    shop_id: str = Field(..., min_length=1)
    product_ids: Optional[List[str]] = None  # None means all products
    forecast_horizon_days: int = Field(default=7, ge=1, le=90)


class ExplainRequest(BaseModel):
    shop_id: str = Field(..., min_length=1)
    product_id: str = Field(..., min_length=1)
    forecast_horizon_days: int = Field(default=7, ge=1, le=90)
    current_stock: Optional[int] = Field(default=None, ge=0)


class RecommendationActionRequest(BaseModel):
    request_id: str = Field(..., min_length=1)
    action: str = Field(..., pattern="^(accepted|modified)$")
    modified_order_quantity: Optional[int] = Field(default=None, ge=0)


# ── Sub-response Schemas ─────────────────────────────────────────────────────

class DailyPrediction(BaseModel):
    date: date
    predicted_units: float


class ForecastDetail(BaseModel):
    daily_predictions: List[DailyPrediction]
    total_predicted_units: float
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    trend_type: str  # upward, downward, seasonal_spike, stable
    model_used: str


class ReorderDetail(BaseModel):
    reorder_required: bool
    current_stock: int
    recommended_order_quantity: int
    recommended_order_by_date: Optional[date]
    days_until_stockout: Optional[int]


# ── Full Prediction Response ─────────────────────────────────────────────────

class PredictResponse(BaseModel):
    status: str = "success"
    request_id: str
    shop_id: str
    product_id: str
    product_name: str
    forecast_horizon_days: int
    generated_at: datetime
    forecast: ForecastDetail
    reorder: ReorderDetail
    ai_explanation: str
    product_classification: str
    warnings: List[str] = []


class ExplainResponse(BaseModel):
    status: str = "success"
    shop_id: str
    product_id: str
    product_name: str
    explanation: str
    source: str  # gemini | local_template
    generated_at: datetime


class RecommendationActionResponse(BaseModel):
    status: str = "success"
    request_id: str
    action: str
    modified_order_quantity: Optional[int] = None


# ── Bulk Response ────────────────────────────────────────────────────────────

class BulkForecastItem(BaseModel):
    product_id: str
    product_name: str
    total_predicted_units: float
    confidence_score: float
    reorder_required: bool
    days_until_stockout: Optional[int]
    urgency: str  # high, medium, low
    trend_type: str
    ai_explanation: str


class BulkSummary(BaseModel):
    high_urgency_count: int
    medium_urgency_count: int
    low_urgency_count: int


class BulkPredictResponse(BaseModel):
    status: str = "success"
    shop_id: str
    generated_at: datetime
    total_products: int
    forecasts: List[BulkForecastItem]
    summary: BulkSummary


class TrendProductItem(BaseModel):
    product_id: str
    product_name: str
    trend_type: str
    urgency: str
    total_predicted_units: float
    days_until_stockout: Optional[int]


class TrendsResponse(BaseModel):
    status: str = "success"
    shop_id: str
    generated_at: datetime
    trend_counts: dict
    urgency_summary: BulkSummary
    products: List[TrendProductItem]
    top_movers: List[TrendProductItem]


# ── History ──────────────────────────────────────────────────────────────────

class PredictionHistoryItem(BaseModel):
    request_id: str
    product_id: str
    product_name: Optional[str]
    forecast_horizon_days: int
    total_predicted_units: float
    confidence_score: float
    trend_type: Optional[str]
    reorder_required: bool
    ai_explanation: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardKPI(BaseModel):
    total_products: int
    high_urgency_products: int
    avg_confidence_score: float
    total_predicted_demand_7d: float
    inventory_health_score: float = 0.0  # 0–100
    reorder_coverage_pct: float = 0.0
    medium_urgency_products: int = 0
    forecast_horizon_days: int = 7


class AccuracyReport(BaseModel):
    available: bool
    accuracy_pct: Optional[float] = None
    sample_size: int = 0
    message: str


class DashboardResponse(BaseModel):
    status: str = "success"
    shop_id: str
    shop_name: Optional[str] = None
    generated_at: datetime
    forecast_horizon_days: int = 7
    kpis: DashboardKPI
    top_reorder_products: List[BulkForecastItem]
    portfolio: List[BulkForecastItem] = []
    recent_predictions: List[PredictionHistoryItem]
    accuracy: AccuracyReport
    stockout_alerts: List[BulkForecastItem] = []
    executive_brief: str = ""
