"""
Demand Service — the main orchestrator.
Coordinates: Repository → ML → Reorder → (optional Gemini) → Response

Quota policy: dashboard/bulk/default predict use local template explanations only.
Gemini is only used via explain() or predict(include_ai=True) when GEMINI_ENABLED.
"""
import json
import time
import uuid
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ProductNotFoundError, PredictionNotFoundError
from app.core.logging import logger
from app.models.prediction import Prediction
from app.repositories.prediction_repo import PredictionRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.sale_repo import SaleRepository
from app.schemas.demand import (
    AccuracyReport,
    BulkForecastItem,
    BulkPredictRequest,
    BulkPredictResponse,
    BulkSummary,
    DailyPrediction,
    DashboardKPI,
    DashboardResponse,
    ExplainRequest,
    ExplainResponse,
    ForecastDetail,
    PredictRequest,
    PredictResponse,
    PredictionHistoryItem,
    RecommendationActionRequest,
    RecommendationActionResponse,
    ReorderDetail,
    TrendProductItem,
    TrendsResponse,
)
from app.services.gemini_service import GeminiService
from app.services.ml_service import MLService
from app.services.reorder_service import (
    calculate_reorder,
    classify_product,
    classify_urgency,
    detect_trend,
)


class DemandService:
    # In-process cache: (shop_id, horizon) -> (BulkPredictResponse, timestamp)
    _bulk_cache: Dict[Tuple[str, int], Tuple["BulkPredictResponse", float]] = {}
    _CACHE_TTL = 120  # seconds

    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.sale_repo = SaleRepository(db)
        self.prediction_repo = PredictionRepository(db)
        self.ml_service = MLService()
        self.gemini_service = GeminiService()

    def _explanation_text(self, raw: str) -> str:
        if not isinstance(raw, str):
            return str(raw)
        try:
            return json.loads(raw).get("explanation", raw)
        except (TypeError, json.JSONDecodeError):
            return raw

    async def predict(self, req: PredictRequest) -> PredictResponse:
        product = self.product_repo.get_by_shop_and_id(req.shop_id, req.product_id)
        if not product:
            raise ProductNotFoundError(req.product_id)

        df = self.sale_repo.get_sales_dataframe(req.shop_id, req.product_id)
        days_available = self.sale_repo.count_days(req.shop_id, req.product_id)
        category_avg = self.sale_repo.category_avg_daily(
            req.shop_id, product.category, exclude_product_id=product.id
        )

        warnings: List[str] = []
        if days_available < settings.MIN_HISTORY_DAYS:
            if days_available == 0 and category_avg > 0:
                warnings.append(
                    "No sales history for this product. Using category-level baseline forecast."
                )
            else:
                warnings.append(
                    f"Only {days_available} days of history available. Using moving average fallback."
                )

        daily_preds, confidence, model_used = self.ml_service.forecast(
            df,
            req.product_id,
            req.forecast_horizon_days,
            category_avg_daily=category_avg,
        )

        if confidence < settings.LOW_CONFIDENCE_THRESHOLD:
            warnings.append(f"Low confidence score ({confidence}). Treat forecast with caution.")

        trend_type = detect_trend(daily_preds)
        avg_historical = float(df["quantity_sold"].mean()) if not df.empty else 0.0
        classification = classify_product(
            daily_preds, avg_historical, category=product.category, name=product.name
        )
        try:
            self.product_repo.update_classification(product.id, classification)
        except Exception as e:
            logger.warning(f"Failed to persist classification for {product.id}: {e}")

        current_stock = req.current_stock if req.current_stock is not None else product.current_stock
        reorder_required, order_qty, order_by, days_until_stockout = calculate_reorder(
            daily_preds, current_stock, product.lead_time_days, product.reorder_point
        )

        total_predicted = sum(daily_preds)
        shop = product.shop
        use_gemini = bool(req.include_ai and settings.GEMINI_ENABLED)
        if use_gemini:
            explanation_raw = await self.gemini_service.explain_forecast(
                product_name=product.name,
                product_category=product.category,
                shop_type=shop.shop_type if shop else "retail",
                total_predicted=total_predicted,
                confidence=confidence,
                trend_type=trend_type,
                reorder_required=reorder_required,
                recommended_qty=order_qty,
                days_until_stockout=days_until_stockout,
                current_stock=current_stock,
                forecast_horizon=req.forecast_horizon_days,
                use_gemini=True,
            )
            explanation_text = self._explanation_text(explanation_raw)
        else:
            explanation_text = GeminiService.build_local_explanation(
                product_name=product.name,
                total_predicted=total_predicted,
                reorder_required=reorder_required,
                recommended_qty=order_qty,
                trend_type=trend_type,
                days_until_stockout=days_until_stockout,
            )

        today = date.today()
        daily_prediction_objs = [
            DailyPrediction(date=today + timedelta(days=i + 1), predicted_units=v)
            for i, v in enumerate(daily_preds)
        ]

        request_id = f"req_{uuid.uuid4().hex[:10]}"
        self._save_prediction(
            request_id=request_id,
            shop_id=req.shop_id,
            product_id=req.product_id,
            horizon=req.forecast_horizon_days,
            total_predicted=total_predicted,
            confidence=confidence,
            trend_type=trend_type,
            model_used=model_used,
            reorder_required=reorder_required,
            order_qty=order_qty,
            explanation=explanation_text,
            daily_preds=daily_preds,
        )

        return PredictResponse(
            request_id=request_id,
            shop_id=req.shop_id,
            product_id=req.product_id,
            product_name=product.name,
            forecast_horizon_days=req.forecast_horizon_days,
            generated_at=datetime.utcnow(),
            forecast=ForecastDetail(
                daily_predictions=daily_prediction_objs,
                total_predicted_units=round(total_predicted, 1),
                confidence_score=confidence,
                trend_type=trend_type,
                model_used=model_used,
            ),
            reorder=ReorderDetail(
                reorder_required=reorder_required,
                current_stock=current_stock,
                recommended_order_quantity=order_qty,
                recommended_order_by_date=order_by,
                days_until_stockout=days_until_stockout,
            ),
            ai_explanation=explanation_text,
            product_classification=classification,
            warnings=warnings,
        )

    async def bulk_predict(self, req: BulkPredictRequest) -> BulkPredictResponse:
        # Return cached result if fresh and not filtering specific products
        cache_key = (req.shop_id, req.forecast_horizon_days)
        if not req.product_ids:
            cached = DemandService._bulk_cache.get(cache_key)
            if cached and (time.time() - cached[1]) < DemandService._CACHE_TTL:
                return cached[0]

        products = self.product_repo.get_by_shop(req.shop_id)
        if req.product_ids:
            products = [p for p in products if p.id in req.product_ids]

        forecasts: List[BulkForecastItem] = []
        for product in products:
            try:
                single_req = PredictRequest(
                    shop_id=req.shop_id,
                    product_id=product.id,
                    forecast_horizon_days=req.forecast_horizon_days,
                    include_ai=False,
                )
                result = await self.predict(single_req)
                urgency = classify_urgency(
                    result.reorder.days_until_stockout, result.reorder.reorder_required
                )
                forecasts.append(
                    BulkForecastItem(
                        product_id=product.id,
                        product_name=product.name,
                        total_predicted_units=result.forecast.total_predicted_units,
                        confidence_score=result.forecast.confidence_score,
                        reorder_required=result.reorder.reorder_required,
                        days_until_stockout=result.reorder.days_until_stockout,
                        urgency=urgency,
                        trend_type=result.forecast.trend_type,
                        ai_explanation=result.ai_explanation,
                    )
                )
            except Exception as e:
                logger.warning(f"Skipping product {product.id} in bulk: {e}")

        urgency_order = {"high": 0, "medium": 1, "low": 2}
        forecasts.sort(key=lambda x: urgency_order.get(x.urgency, 3))

        summary = BulkSummary(
            high_urgency_count=sum(1 for f in forecasts if f.urgency == "high"),
            medium_urgency_count=sum(1 for f in forecasts if f.urgency == "medium"),
            low_urgency_count=sum(1 for f in forecasts if f.urgency == "low"),
        )

        result = BulkPredictResponse(
            shop_id=req.shop_id,
            generated_at=datetime.utcnow(),
            total_products=len(forecasts),
            forecasts=forecasts,
            summary=summary,
        )

        if not req.product_ids:
            DemandService._bulk_cache[cache_key] = (result, time.time())

        return result

    async def get_dashboard(self, shop_id: str, horizon_days: int = 7) -> DashboardResponse:
        horizon_days = max(1, min(90, horizon_days))
        bulk = await self.bulk_predict(
            BulkPredictRequest(shop_id=shop_id, forecast_horizon_days=horizon_days)
        )
        recent = self.prediction_repo.get_by_shop(shop_id, limit=10)
        accuracy = self.get_accuracy_report(shop_id)

        avg_conf = (
            sum(f.confidence_score for f in bulk.forecasts) / max(len(bulk.forecasts), 1)
        )
        total_demand = sum(f.total_predicted_units for f in bulk.forecasts)
        total = max(len(bulk.forecasts), 1)
        high = bulk.summary.high_urgency_count
        medium = bulk.summary.medium_urgency_count
        # Health: soft penalty for urgency; reward confidence (enterprise-friendly scale)
        urgency_penalty = (high * 8 + medium * 3) / total
        inventory_health = round(
            max(0.0, min(100.0, avg_conf * 85 + 15 - urgency_penalty * 4)),
            1,
        )
        reorder_needed = sum(1 for f in bulk.forecasts if f.reorder_required)
        coverage = round(100.0 * (1 - reorder_needed / total), 1)

        history_items = [
            PredictionHistoryItem(
                request_id=p.request_id,
                product_id=p.product_id,
                product_name=None,
                forecast_horizon_days=p.forecast_horizon_days,
                total_predicted_units=p.total_predicted_units,
                confidence_score=p.confidence_score,
                trend_type=p.trend_type,
                reorder_required=p.reorder_required,
                ai_explanation=p.ai_explanation,
                created_at=p.created_at,
            )
            for p in recent
        ]
        for item in history_items:
            product = self.product_repo.get(item.product_id)
            if product:
                item.product_name = product.name

        stockout_alerts = [
            f
            for f in bulk.forecasts
            if f.urgency == "high"
            or (f.days_until_stockout is not None and f.days_until_stockout <= 3)
        ]

        shop = None
        from app.models.shop import Shop
        shop = self.db.query(Shop).filter(Shop.id == shop_id).first()
        shop_name = shop.name if shop else shop_id

        if high > 0:
            brief = (
                f"{high} SKU(s) need immediate replenishment within the next 3 days. "
                f"Portfolio health is {inventory_health}/100 with {coverage}% of items adequately stocked "
                f"for the {horizon_days}-day horizon."
            )
        elif medium > 0:
            brief = (
                f"Operations are stable with {medium} medium-priority reorder(s). "
                f"Health score {inventory_health}/100 — review medium-urgency SKUs this week."
            )
        else:
            brief = (
                f"Inventory posture is healthy ({inventory_health}/100). "
                f"No critical stockout risk across {bulk.total_products} tracked SKUs for the next {horizon_days} days."
            )

        return DashboardResponse(
            shop_id=shop_id,
            shop_name=shop_name,
            generated_at=datetime.utcnow(),
            forecast_horizon_days=horizon_days,
            kpis=DashboardKPI(
                total_products=bulk.total_products,
                high_urgency_products=bulk.summary.high_urgency_count,
                medium_urgency_products=bulk.summary.medium_urgency_count,
                avg_confidence_score=round(avg_conf, 2),
                total_predicted_demand_7d=round(total_demand, 1),
                inventory_health_score=inventory_health,
                reorder_coverage_pct=coverage,
                forecast_horizon_days=horizon_days,
            ),
            top_reorder_products=bulk.forecasts[:5],
            portfolio=bulk.forecasts,
            recent_predictions=history_items,
            accuracy=accuracy,
            stockout_alerts=stockout_alerts[:10],
            executive_brief=brief,
        )

    async def get_trends(self, shop_id: str) -> TrendsResponse:
        bulk = await self.bulk_predict(
            BulkPredictRequest(shop_id=shop_id, forecast_horizon_days=7)
        )
        products = [
            TrendProductItem(
                product_id=f.product_id,
                product_name=f.product_name,
                trend_type=f.trend_type,
                urgency=f.urgency,
                total_predicted_units=f.total_predicted_units,
                days_until_stockout=f.days_until_stockout,
            )
            for f in bulk.forecasts
        ]
        trend_counts: dict = {}
        for p in products:
            trend_counts[p.trend_type] = trend_counts.get(p.trend_type, 0) + 1

        top_movers = sorted(products, key=lambda x: x.total_predicted_units, reverse=True)[:5]

        return TrendsResponse(
            shop_id=shop_id,
            generated_at=datetime.utcnow(),
            trend_counts=trend_counts,
            urgency_summary=bulk.summary,
            products=products,
            top_movers=top_movers,
        )

    async def explain(self, req: ExplainRequest) -> ExplainResponse:
        """Explicit Gemini path — only place that should call Gemini for UI."""
        product = self.product_repo.get_by_shop_and_id(req.shop_id, req.product_id)
        if not product:
            raise ProductNotFoundError(req.product_id)

        # Reuse local ML predict (no Gemini), then enrich explanation
        predict_req = PredictRequest(
            shop_id=req.shop_id,
            product_id=req.product_id,
            forecast_horizon_days=req.forecast_horizon_days,
            current_stock=req.current_stock,
            include_ai=False,
        )
        result = await self.predict(predict_req)

        shop = product.shop
        use_gemini = bool(settings.GEMINI_ENABLED and self.gemini_service.is_available)
        raw = await self.gemini_service.explain_forecast(
            product_name=product.name,
            product_category=product.category,
            shop_type=shop.shop_type if shop else "retail",
            total_predicted=result.forecast.total_predicted_units,
            confidence=result.forecast.confidence_score,
            trend_type=result.forecast.trend_type,
            reorder_required=result.reorder.reorder_required,
            recommended_qty=result.reorder.recommended_order_quantity,
            days_until_stockout=result.reorder.days_until_stockout,
            current_stock=result.reorder.current_stock,
            forecast_horizon=req.forecast_horizon_days,
            use_gemini=use_gemini,
        )
        explanation = self._explanation_text(raw)
        source = "gemini" if use_gemini else "local_template"

        return ExplainResponse(
            shop_id=req.shop_id,
            product_id=req.product_id,
            product_name=product.name,
            explanation=explanation,
            source=source,
            generated_at=datetime.utcnow(),
        )

    def apply_recommendation_action(
        self, req: RecommendationActionRequest
    ) -> RecommendationActionResponse:
        pred = self.prediction_repo.get_by_request_id(req.request_id)
        if not pred:
            raise PredictionNotFoundError(req.request_id)

        pred.recommendation_status = req.action
        if req.action == "modified":
            qty = req.modified_order_quantity
            if qty is None:
                qty = pred.recommended_order_quantity
            pred.modified_order_quantity = qty
        else:
            pred.modified_order_quantity = pred.recommended_order_quantity

        self.db.commit()
        return RecommendationActionResponse(
            request_id=req.request_id,
            action=req.action,
            modified_order_quantity=pred.modified_order_quantity,
        )

    def get_accuracy_report(self, shop_id: str) -> AccuracyReport:
        """Compare older predictions vs actual sales over the forecast horizon."""
        preds = self.prediction_repo.get_by_shop(shop_id, limit=50)
        cutoff = datetime.utcnow() - timedelta(days=1)
        eligible = [
            p
            for p in preds
            if p.created_at
            and (
                p.created_at.replace(tzinfo=None)
                if getattr(p.created_at, "tzinfo", None)
                else p.created_at
            )
            <= cutoff
        ]

        errors: List[float] = []
        for p in eligible[:20]:
            created = p.created_at.date() if hasattr(p.created_at, "date") else date.today()
            end = created + timedelta(days=max(1, p.forecast_horizon_days))
            actual = self.sale_repo.sum_quantity_between(shop_id, p.product_id, created, end)
            predicted = float(p.total_predicted_units or 0)
            if predicted <= 0 and actual <= 0:
                continue
            denom = max(predicted, actual, 1.0)
            errors.append(abs(predicted - actual) / denom)

        if not errors:
            return AccuracyReport(
                available=False,
                accuracy_pct=None,
                sample_size=0,
                message="Not enough comparison data yet. Accuracy appears after forecasts age and sales land.",
            )

        mape = sum(errors) / len(errors)
        accuracy_pct = round(max(0.0, min(100.0, (1.0 - mape) * 100.0)), 1)
        return AccuracyReport(
            available=True,
            accuracy_pct=accuracy_pct,
            sample_size=len(errors),
            message=f"Last period predictions were about {accuracy_pct}% accurate ({len(errors)} samples).",
        )

    def _save_prediction(self, **kwargs) -> None:
        try:
            pred = Prediction(
                request_id=kwargs["request_id"],
                shop_id=kwargs["shop_id"],
                product_id=kwargs["product_id"],
                forecast_horizon_days=kwargs["horizon"],
                total_predicted_units=kwargs["total_predicted"],
                confidence_score=kwargs["confidence"],
                trend_type=kwargs["trend_type"],
                model_used=kwargs["model_used"],
                reorder_required=kwargs["reorder_required"],
                recommended_order_quantity=kwargs["order_qty"],
                ai_explanation=kwargs["explanation"],
                daily_predictions=kwargs["daily_preds"],
                recommendation_status="pending",
            )
            self.prediction_repo.save(pred)
        except Exception as e:
            logger.error(f"Failed to save prediction: {e}")
