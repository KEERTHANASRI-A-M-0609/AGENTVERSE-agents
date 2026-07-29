"""Business Analytics Agent API endpoints."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.exceptions import ShopMindException, to_http_exception
from app.core.logging import logger
from app.core.security import verify_api_key
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    AnalyticsInsightsResponse,
    BusinessHealthResponse,
    InsightsRequest,
    ProductAnalyticsResponse,
    RevenueTrendResponse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Business Analytics"])


@router.get(
    "/dashboard",
    response_model=AnalyticsDashboardResponse,
    summary="Dashboard KPIs",
    description=(
        "Returns Today's Revenue, Total Orders, Total Products Sold, "
        "and Revenue Growth % for the shop."
    ),
)
async def get_analytics_dashboard(
    shop_id: str = Query("shop_001", min_length=1),
    as_of: Optional[date] = Query(
        None, description="Reference date; defaults to latest available sale day"
    ),
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await AnalyticsService(db).get_dashboard(shop_id, as_of=as_of)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get(
    "/products",
    response_model=ProductAnalyticsResponse,
    summary="Product analytics",
    description="Top 5 best-selling and top 5 slow-moving products.",
)
async def get_product_analytics(
    shop_id: str = Query("shop_001", min_length=1),
    as_of: Optional[date] = Query(None),
    lookback_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await AnalyticsService(db).get_product_analytics(
            shop_id, as_of=as_of, lookback_days=lookback_days
        )
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get(
    "/trends",
    response_model=RevenueTrendResponse,
    summary="Revenue trend",
    description="Last 7 days of daily revenue (configurable via days).",
)
async def get_revenue_trends(
    shop_id: str = Query("shop_001", min_length=1),
    as_of: Optional[date] = Query(None),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await AnalyticsService(db).get_revenue_trend(
            shop_id, as_of=as_of, days=days
        )
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get(
    "/health",
    response_model=BusinessHealthResponse,
    summary="Business health score",
    description=(
        "Score 0–100 from revenue growth, sales consistency, and product movement, "
        "with a short explanation."
    ),
)
async def get_business_health(
    shop_id: str = Query("shop_001", min_length=1),
    as_of: Optional[date] = Query(None),
    lookback_days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await AnalyticsService(db).get_health(shop_id, as_of=as_of, lookback_days=lookback_days)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.post(
    "/insights",
    response_model=AnalyticsInsightsResponse,
    summary="Prepare AI insights payload",
    description=(
        "Builds structured analytics (summary, highlights, recommendations, health_score) "
        "for Gemini. Does not call Gemini yet."
    ),
)
async def prepare_insights(
    req: InsightsRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        logger.info("POST /analytics/insights shop_id=%s lookback_days=%s", req.shop_id, req.lookback_days)
        return await AnalyticsService(db).prepare_insights(
            req.shop_id, as_of=req.as_of, lookback_days=req.lookback_days
        )
    except ShopMindException as e:
        raise to_http_exception(e)
