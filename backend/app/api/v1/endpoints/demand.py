from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import verify_api_key
from app.core.exceptions import ShopMindException, to_http_exception
from app.schemas.demand import (
    PredictRequest,
    PredictResponse,
    BulkPredictRequest,
    BulkPredictResponse,
    DashboardResponse,
    PredictionHistoryItem,
    ExplainRequest,
    ExplainResponse,
    RecommendationActionRequest,
    RecommendationActionResponse,
    TrendsResponse,
)
from app.services.demand_service import DemandService

router = APIRouter(prefix="/demand", tags=["Demand Prediction"])


@router.post("/predict", response_model=PredictResponse)
async def predict_demand(
    req: PredictRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await DemandService(db).predict(req)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.post("/forecast", response_model=PredictResponse)
async def forecast_demand(
    req: PredictRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    return await predict_demand(req=req, db=db, _=_)


@router.post("/predict/bulk", response_model=BulkPredictResponse)
async def bulk_predict(
    req: BulkPredictRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await DemandService(db).bulk_predict(req)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get("/dashboard/{shop_id}", response_model=DashboardResponse)
async def get_dashboard(
    shop_id: str,
    horizon: int = 7,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await DemandService(db).get_dashboard(shop_id, horizon_days=horizon)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get("/trends/{shop_id}", response_model=TrendsResponse)
async def get_trends(
    shop_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await DemandService(db).get_trends(shop_id)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.post("/explain", response_model=ExplainResponse)
async def explain_forecast(
    req: ExplainRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return await DemandService(db).explain(req)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.post("/recommendations/action", response_model=RecommendationActionResponse)
def recommendation_action(
    req: RecommendationActionRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    try:
        return DemandService(db).apply_recommendation_action(req)
    except ShopMindException as e:
        raise to_http_exception(e)


@router.get("/history/{shop_id}", response_model=list[PredictionHistoryItem])
def get_history(
    shop_id: str,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    from app.repositories.prediction_repo import PredictionRepository
    from app.repositories.product_repo import ProductRepository

    preds = PredictionRepository(db).get_by_shop(shop_id, limit=limit)
    product_repo = ProductRepository(db)

    result = []
    for p in preds:
        product = product_repo.get(p.product_id)
        result.append(
            PredictionHistoryItem(
                request_id=p.request_id,
                product_id=p.product_id,
                product_name=product.name if product else None,
                forecast_horizon_days=p.forecast_horizon_days,
                total_predicted_units=p.total_predicted_units,
                confidence_score=p.confidence_score,
                trend_type=p.trend_type,
                reorder_required=p.reorder_required,
                ai_explanation=p.ai_explanation,
                created_at=p.created_at,
            )
        )
    return result
