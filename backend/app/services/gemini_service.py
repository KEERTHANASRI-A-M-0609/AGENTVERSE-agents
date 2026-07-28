"""
Gemini AI Service — generates structured business-language explanations for forecasts.
Gracefully degrades if Gemini is disabled or unavailable.
Quota-safe: only call when GEMINI_ENABLED=true and an API key is set.
"""
import asyncio
import json
import re
from typing import Optional

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional runtime dependency
    genai = None

from app.core.config import settings
from app.core.logging import logger
from app.prompts.system_prompt import SYSTEM_PROMPT
from app.prompts.templates import build_prediction_prompt


class GeminiService:
    def __init__(self):
        self._model = None
        if not settings.GEMINI_ENABLED:
            logger.info("GEMINI_ENABLED=false. Explanations use local templates.")
            return
        if settings.GEMINI_API_KEY and genai is not None:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=SYSTEM_PROMPT,
            )
        else:
            logger.warning("GEMINI is unavailable. AI explanations will use fallback.")

    @property
    def is_available(self) -> bool:
        return self._model is not None

    @staticmethod
    def build_local_explanation(
        product_name: str,
        total_predicted: float,
        reorder_required: bool,
        recommended_qty: int,
        trend_type: str = "stable",
        days_until_stockout: Optional[int] = None,
    ) -> str:
        """Deterministic plain-English explanation — no API call."""
        payload = GeminiService._fallback_payload(
            product_name=product_name,
            total_predicted=total_predicted,
            reorder_required=reorder_required,
            recommended_qty=recommended_qty,
            trend_type=trend_type,
            days_until_stockout=days_until_stockout,
        )
        return payload["explanation"]

    async def explain_forecast(
        self,
        product_name: str,
        product_category: str,
        shop_type: str,
        total_predicted: float,
        confidence: float,
        trend_type: str,
        reorder_required: bool,
        recommended_qty: int,
        days_until_stockout: Optional[int],
        current_stock: int,
        forecast_horizon: int,
        use_gemini: bool = True,
    ) -> str:
        payload = self._fallback_payload(
            product_name=product_name,
            total_predicted=total_predicted,
            reorder_required=reorder_required,
            recommended_qty=recommended_qty,
            trend_type=trend_type,
            days_until_stockout=days_until_stockout,
        )

        if not use_gemini or self._model is None:
            return json.dumps(payload)

        prompt = build_prediction_prompt(
            product_name=product_name,
            product_category=product_category,
            shop_type=shop_type,
            total_predicted=total_predicted,
            confidence=confidence,
            trend_type=trend_type,
            reorder_required=reorder_required,
            recommended_qty=recommended_qty,
            days_until_stockout=days_until_stockout,
            current_stock=current_stock,
            forecast_horizon=forecast_horizon,
        )

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(self._model.generate_content, prompt),
                timeout=settings.GEMINI_TIMEOUT,
            )
            text = response.text.strip()
            parsed = self._parse_response(text)
            if parsed is not None:
                return json.dumps(parsed)
        except Exception as exc:
            logger.warning(f"Gemini call failed: {exc}. Using fallback explanation.")

        return json.dumps(payload)

    @staticmethod
    def _parse_response(text: str) -> Optional[dict]:
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = None

        if isinstance(payload, dict):
            return payload

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                payload = json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
            return payload if isinstance(payload, dict) else None

        return None

    @staticmethod
    def _fallback_payload(
        product_name: str,
        total_predicted: float,
        reorder_required: bool,
        recommended_qty: int,
        trend_type: str = "stable",
        days_until_stockout: Optional[int] = None,
    ) -> dict:
        trend_note = {
            "upward": "Demand is trending upward.",
            "downward": "Demand is softening.",
            "seasonal_spike": "A seasonal demand spike is expected.",
            "stable": "Demand looks stable versus recent history.",
        }.get(trend_type, "Demand looks stable versus recent history.")

        stockout_note = ""
        if days_until_stockout is not None:
            stockout_note = f" Current stock may last about {days_until_stockout} day(s)."

        if reorder_required:
            return {
                "reason": f"Historical demand patterns suggest {product_name} will require replenishment soon. {trend_note}",
                "business_recommendation": f"Order {recommended_qty} units promptly to avoid stockout.",
                "business_risk": "Stockout risk is high if replenishment is delayed.",
                "confidence_explanation": "The forecast is based on historical demand and recent sales momentum.",
                "inventory_advice": "Prioritize this item in the next replenishment cycle.",
                "explanation": (
                    f"{product_name} is forecast to need {int(total_predicted)} units over the horizon. "
                    f"{trend_note}{stockout_note} Reorder {recommended_qty} units to stay ahead of demand."
                ),
            }
        return {
            "reason": f"Historical demand patterns suggest {product_name} is moving steadily. {trend_note}",
            "business_recommendation": "Maintain current inventory discipline and monitor demand closely.",
            "business_risk": "Demand remains manageable, but watch for trend changes.",
            "confidence_explanation": "The forecast is based on historical demand and recent sales momentum.",
            "inventory_advice": "Keep stock levels aligned with the forecast and avoid over-ordering.",
            "explanation": (
                f"{product_name} is forecast to need {int(total_predicted)} units over the horizon. "
                f"{trend_note}{stockout_note}"
            ),
        }
