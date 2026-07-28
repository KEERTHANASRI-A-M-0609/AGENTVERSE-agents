"""
ML Service — Random Forest forecasting with moving average / category baseline fallback.
Models are persisted per product to avoid retraining on every request.
"""
import joblib
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error
from sklearn.model_selection import train_test_split

from app.core.config import settings
from app.core.logging import logger
from app.services.feature_service import (
    FEATURE_COLUMNS,
    build_features,
    build_future_features,
)


class MLService:
    def __init__(self):
        self.model_store = Path(settings.MODEL_STORE_PATH)
        self.model_store.mkdir(parents=True, exist_ok=True)

    def _model_path(self, product_id: str) -> Path:
        return self.model_store / f"{product_id}.pkl"

    def _load_model(self, product_id: str) -> RandomForestRegressor | None:
        path = self._model_path(product_id)
        if path.exists():
            try:
                return joblib.load(path)
            except Exception as e:
                logger.warning(f"Failed to load model for {product_id}: {e}")
                return None
        return None

    def _save_model(self, product_id: str, model: RandomForestRegressor) -> None:
        joblib.dump(model, self._model_path(product_id))

    def _train(self, df: pd.DataFrame, product_id: str) -> Tuple[RandomForestRegressor, float]:
        featured = build_features(df)
        featured = featured.dropna(subset=FEATURE_COLUMNS)

        X = featured[FEATURE_COLUMNS].values
        y = featured["quantity_sold"].values

        if len(X) < 10:
            raise ValueError("Not enough data to train model.")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)
        self._save_model(product_id, model)

        preds = model.predict(X_test)
        preds = np.clip(preds, 0, None)
        try:
            mape = mean_absolute_percentage_error(y_test + 1e-9, preds + 1e-9)
            confidence = round(max(0.0, min(1.0, 1.0 - mape)), 2)
        except Exception:
            confidence = 0.6

        logger.info(f"Model trained for {product_id} | confidence={confidence}")
        return model, confidence

    def _moving_average_forecast(
        self, df: pd.DataFrame, horizon: int
    ) -> Tuple[List[float], float]:
        """Fallback when insufficient data for ML model."""
        if df.empty or "quantity_sold" not in df.columns:
            return [0.0 for _ in range(horizon)], 0.3
        recent = df["quantity_sold"].tail(7).values
        avg = float(np.mean(recent)) if len(recent) > 0 else 0.0
        predictions = [max(0.0, round(avg, 1)) for _ in range(horizon)]
        confidence = 0.45
        return predictions, confidence

    def _category_baseline_forecast(
        self, category_avg_daily: float, horizon: int
    ) -> Tuple[List[float], float]:
        avg = max(0.0, float(category_avg_daily))
        predictions = [round(avg, 1) for _ in range(horizon)]
        return predictions, 0.35

    def forecast(
        self,
        df: pd.DataFrame,
        product_id: str,
        horizon: int,
        category_avg_daily: Optional[float] = None,
    ) -> Tuple[List[float], float, str]:
        """
        Returns: (daily_predictions, confidence_score, model_used)
        """
        days_available = len(df["sale_date"].unique()) if not df.empty else 0

        if days_available == 0 and category_avg_daily is not None and category_avg_daily > 0:
            preds, conf = self._category_baseline_forecast(category_avg_daily, horizon)
            return preds, conf, "category_baseline"

        if days_available < settings.MIN_HISTORY_DAYS:
            if days_available == 0 and category_avg_daily is not None and category_avg_daily > 0:
                preds, conf = self._category_baseline_forecast(category_avg_daily, horizon)
                return preds, conf, "category_baseline"
            preds, conf = self._moving_average_forecast(df, horizon)
            return preds, conf, "moving_average"

        # Prefer cached model only if feature count matches current FEATURE_COLUMNS
        model = self._load_model(product_id)
        if model is not None and getattr(model, "n_features_in_", None) != len(FEATURE_COLUMNS):
            logger.info(f"Feature schema changed for {product_id}; retraining.")
            model = None

        if model is None:
            try:
                model, _ = self._train(df, product_id)
            except Exception as e:
                logger.warning(f"Training failed for {product_id}: {e}. Using fallback.")
                preds, conf = self._moving_average_forecast(df, horizon)
                return preds, conf, "moving_average"

        last_date = pd.to_datetime(df["sale_date"]).max().date()
        avg_daily = float(df["quantity_sold"].mean())
        future_df = build_future_features(last_date, horizon, avg_daily)

        X_future = future_df[FEATURE_COLUMNS].values
        raw_preds = model.predict(X_future)
        predictions = [max(0.0, round(float(p), 1)) for p in raw_preds]

        try:
            featured = build_features(df).dropna(subset=FEATURE_COLUMNS)
            X = featured[FEATURE_COLUMNS].values
            y = featured["quantity_sold"].values
            if len(X) >= 10:
                split = max(1, int(len(X) * 0.8))
                test_preds = model.predict(X[split:])
                mape = mean_absolute_percentage_error(y[split:] + 1e-9, test_preds + 1e-9)
                confidence = round(max(0.0, min(1.0, 1.0 - mape)), 2)
            else:
                confidence = 0.6
        except Exception:
            confidence = 0.6

        return predictions, confidence, "random_forest"

    def retrain(self, df: pd.DataFrame, product_id: str) -> float:
        """Force retrain and return new confidence score."""
        _, confidence = self._train(df, product_id)
        return confidence
