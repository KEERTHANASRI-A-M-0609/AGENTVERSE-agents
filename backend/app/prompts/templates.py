from typing import Optional


def build_prediction_prompt(
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
) -> str:
    stockout_line = (
        f"Stock will run out in approximately {days_until_stockout} days."
        if days_until_stockout
        else "Stock levels are currently adequate."
    )

    reorder_line = (
        f"Reorder of {recommended_qty} units is recommended immediately."
        if reorder_required
        else "No reorder action needed at this time."
    )

    return f"""
Analyze this retail demand forecast and write a clear business explanation.

PRODUCT: {product_name}
CATEGORY: {product_category}
SHOP TYPE: {shop_type}
FORECAST HORIZON: {forecast_horizon} days
PREDICTED DEMAND: {int(total_predicted)} units
CONFIDENCE SCORE: {int(confidence * 100)}%
TREND: {trend_type}
CURRENT STOCK: {current_stock} units
{stockout_line}
{reorder_line}

Write a 2-4 sentence explanation for the shop owner. Be specific, actionable, and professional.
"""
