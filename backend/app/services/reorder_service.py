"""
Reorder logic — determines if and when to reorder, and how much.
Pure business logic, no ML or AI dependencies.
"""
from datetime import date, timedelta
from typing import Optional, Tuple


def calculate_reorder(
    daily_predictions: list[float],
    current_stock: int,
    lead_time_days: int,
    reorder_point: int,
) -> Tuple[bool, int, Optional[date], Optional[int]]:
    """
    Returns:
        reorder_required: bool
        recommended_order_quantity: int
        recommended_order_by_date: Optional[date]
        days_until_stockout: Optional[int]
    """
    total_predicted = sum(daily_predictions)
    cumulative = 0.0
    days_until_stockout = None

    for i, daily in enumerate(daily_predictions):
        cumulative += daily
        if cumulative >= current_stock and days_until_stockout is None:
            days_until_stockout = i + 1

    # Demand during lead time window
    lead_time_demand = sum(daily_predictions[:lead_time_days])

    reorder_required = (
        current_stock <= reorder_point
        or current_stock < lead_time_demand
        or (days_until_stockout is not None and days_until_stockout <= lead_time_days + 2)
    )

    if reorder_required:
        # Order enough to cover full forecast horizon + 20% safety buffer
        order_qty = max(0, int((total_predicted - current_stock) * 1.2))
        order_qty = max(order_qty, reorder_point)  # at least reorder_point units
        order_by = date.today() + timedelta(days=max(1, lead_time_days - 1))
    else:
        order_qty = 0
        order_by = None

    return reorder_required, order_qty, order_by, days_until_stockout


def classify_urgency(days_until_stockout: Optional[int], reorder_required: bool) -> str:
    if not reorder_required:
        return "low"
    if days_until_stockout is None:
        return "medium"
    if days_until_stockout <= 3:
        return "high"
    if days_until_stockout <= 7:
        return "medium"
    return "low"


PERISHABLE_KEYWORDS = (
    "dairy",
    "milk",
    "bread",
    "fruit",
    "vegetable",
    "veg",
    "meat",
    "perishable",
    "fresh",
    "curd",
    "yogurt",
    "egg",
    "produce",
)


def classify_product(
    daily_predictions: list[float],
    avg_historical: float,
    category: str = "",
    name: str = "",
) -> str:
    text = f"{category} {name}".lower()
    if any(keyword in text for keyword in PERISHABLE_KEYWORDS):
        return "perishable"

    avg_predicted = sum(daily_predictions) / max(len(daily_predictions), 1)
    if avg_predicted == 0:
        return "slow_moving"
    ratio = avg_predicted / max(avg_historical, 0.1)
    if ratio >= 1.3:
        return "seasonal"
    if avg_predicted >= 10:
        return "fast_moving"
    return "slow_moving"


def detect_trend(daily_predictions: list[float]) -> str:
    if len(daily_predictions) < 3:
        return "stable"

    baseline = daily_predictions[0]
    if all(abs(value - baseline) <= 1e-9 for value in daily_predictions):
        return "stable"

    first_half = sum(daily_predictions[: len(daily_predictions) // 2])
    second_half = sum(daily_predictions[len(daily_predictions) // 2 :])
    ratio = second_half / max(first_half, 0.1)

    if abs(ratio - 1.0) <= 0.05:
        return "stable"
    if ratio >= 1.25:
        return "seasonal_spike" if ratio >= 1.5 else "upward"
    if ratio <= 0.75:
        return "downward"
    return "stable"
