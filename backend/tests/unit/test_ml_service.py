import pandas as pd
import numpy as np
from app.services.ml_service import MLService
from app.services.feature_service import build_features, FEATURE_COLUMNS
from app.services.reorder_service import (
    detect_trend,
    classify_urgency,
    calculate_reorder,
    classify_product,
)


def make_df(days: int = 60, base: int = 10) -> pd.DataFrame:
    from datetime import date, timedelta
    today = date.today()
    return pd.DataFrame(
        [
            {
                "sale_date": today - timedelta(days=days - i),
                "quantity_sold": max(0, base + np.random.randint(-2, 3)),
                "is_weekend": False,
                "is_festival": i % 15 == 0,
                "is_holiday": False,
            }
            for i in range(days)
        ]
    )


def test_feature_columns_include_festival_flags():
    assert "is_festival" in FEATURE_COLUMNS
    assert "is_holiday" in FEATURE_COLUMNS
    featured = build_features(make_df(30))
    for col in FEATURE_COLUMNS:
        assert col in featured.columns


def test_ml_forecast_returns_correct_length():
    svc = MLService()
    df = make_df(60)
    preds, conf, model = svc.forecast(df, "test_prod_ml", horizon=7)
    assert len(preds) == 7
    assert 0.0 <= conf <= 1.0
    assert model in ("random_forest", "moving_average")


def test_ml_forecast_fallback_on_insufficient_data():
    svc = MLService()
    df = make_df(3)  # only 3 days
    preds, conf, model = svc.forecast(df, "test_prod_fallback", horizon=7)
    assert model == "moving_average"
    assert conf < 0.5


def test_ml_category_baseline_for_new_product():
    svc = MLService()
    empty = pd.DataFrame()
    preds, conf, model = svc.forecast(
        empty, "brand_new_prod", horizon=7, category_avg_daily=12.5
    )
    assert model == "category_baseline"
    assert len(preds) == 7
    assert all(p == 12.5 for p in preds)
    assert conf < 0.5


def test_ml_forecast_no_negative_predictions():
    svc = MLService()
    df = make_df(60)
    preds, _, _ = svc.forecast(df, "test_prod_nonneg", horizon=14)
    assert all(p >= 0 for p in preds)


def test_detect_trend_upward():
    preds = [2, 3, 4, 5, 8, 10, 15]
    assert detect_trend(preds) in ("upward", "seasonal_spike")


def test_detect_trend_stable():
    preds = [5, 5, 5, 5, 5, 5, 5]
    assert detect_trend(preds) == "stable"


def test_detect_trend_downward():
    preds = [15, 12, 10, 8, 5, 3, 2]
    assert detect_trend(preds) == "downward"


def test_calculate_reorder_triggers_when_stock_low():
    preds = [10.0] * 7  # 70 units needed
    reorder, qty, order_by, days = calculate_reorder(preds, current_stock=5, lead_time_days=3, reorder_point=10)
    assert reorder is True
    assert qty > 0


def test_calculate_reorder_no_trigger_when_stock_sufficient():
    preds = [2.0] * 7  # 14 units needed
    reorder, qty, _, _ = calculate_reorder(preds, current_stock=100, lead_time_days=3, reorder_point=10)
    assert reorder is False


def test_classify_urgency_high():
    assert classify_urgency(days_until_stockout=2, reorder_required=True) == "high"


def test_classify_urgency_low():
    assert classify_urgency(days_until_stockout=None, reorder_required=False) == "low"


def test_classify_product_perishable():
    assert classify_product([5, 5, 5], 5.0, category="dairy", name="Fresh Milk") == "perishable"
