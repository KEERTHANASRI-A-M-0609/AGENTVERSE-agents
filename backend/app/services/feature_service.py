"""
Feature engineering pipeline.
Transforms raw sales DataFrame into ML-ready feature matrix.
"""
from datetime import date, timedelta
import pandas as pd


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Input:  raw sales df with columns [sale_date, quantity_sold, is_weekend, is_festival, is_holiday]
    Output: feature-engineered df ready for model training
    """
    df = df.copy()
    df["sale_date"] = pd.to_datetime(df["sale_date"])
    df = df.sort_values("sale_date").reset_index(drop=True)

    for col in ("is_festival", "is_holiday", "is_weekend", "quantity_sold"):
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Fill missing dates with 0 sales (continuous time series)
    full_range = pd.date_range(df["sale_date"].min(), df["sale_date"].max(), freq="D")
    df = df.set_index("sale_date").reindex(full_range, fill_value=0).reset_index()
    df.rename(columns={"index": "sale_date"}, inplace=True)

    # Date features
    df["day_of_week"] = df["sale_date"].dt.dayofweek       # 0=Mon, 6=Sun
    df["week_of_year"] = df["sale_date"].dt.isocalendar().week.astype(int)
    df["month"] = df["sale_date"].dt.month
    df["day_of_month"] = df["sale_date"].dt.day
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_festival"] = pd.to_numeric(df["is_festival"], errors="coerce").fillna(0).astype(int)
    df["is_holiday"] = pd.to_numeric(df["is_holiday"], errors="coerce").fillna(0).astype(int)

    # Lag features — capture recent demand momentum
    df["lag_7"] = df["quantity_sold"].shift(7).fillna(0)
    df["lag_14"] = df["quantity_sold"].shift(14).fillna(0)
    df["lag_30"] = df["quantity_sold"].shift(30).fillna(0)

    # Rolling averages — smooth out noise
    df["rolling_mean_7"] = df["quantity_sold"].shift(1).rolling(7, min_periods=1).mean().fillna(0)
    df["rolling_mean_14"] = df["quantity_sold"].shift(1).rolling(14, min_periods=1).mean().fillna(0)
    df["rolling_mean_30"] = df["quantity_sold"].shift(1).rolling(30, min_periods=1).mean().fillna(0)

    # Rolling std — demand volatility
    df["rolling_std_7"] = df["quantity_sold"].shift(1).rolling(7, min_periods=1).std().fillna(0)

    return df


def build_future_features(last_date: date, horizon: int, avg_daily: float) -> pd.DataFrame:
    """
    Build feature rows for future dates (no actual sales yet).
    Uses rolling averages from historical data as proxy.
    """
    future_dates = [last_date + timedelta(days=i + 1) for i in range(horizon)]
    rows = []
    for d in future_dates:
        dt = pd.Timestamp(d)
        rows.append(
            {
                "sale_date": dt,
                "day_of_week": dt.dayofweek,
                "week_of_year": dt.isocalendar()[1],
                "month": dt.month,
                "day_of_month": dt.day,
                "is_weekend": int(dt.dayofweek in [5, 6]),
                "is_festival": 0,
                "is_holiday": 0,
                "lag_7": avg_daily,
                "lag_14": avg_daily,
                "lag_30": avg_daily,
                "rolling_mean_7": avg_daily,
                "rolling_mean_14": avg_daily,
                "rolling_mean_30": avg_daily,
                "rolling_std_7": avg_daily * 0.2,
            }
        )
    return pd.DataFrame(rows)


FEATURE_COLUMNS = [
    "day_of_week",
    "week_of_year",
    "month",
    "day_of_month",
    "is_weekend",
    "is_festival",
    "is_holiday",
    "lag_7",
    "lag_14",
    "lag_30",
    "rolling_mean_7",
    "rolling_mean_14",
    "rolling_mean_30",
    "rolling_std_7",
]
