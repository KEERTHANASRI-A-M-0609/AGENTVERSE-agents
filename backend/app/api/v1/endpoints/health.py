from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.prediction import Prediction

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    model_store = Path(settings.MODEL_STORE_PATH)
    model_store_ok = model_store.exists()
    model_count = len(list(model_store.glob("*.pkl"))) if model_store_ok else 0

    last_prediction_at = None
    try:
        latest = (
            db.query(Prediction)
            .order_by(Prediction.created_at.desc())
            .first()
        )
        if latest and latest.created_at:
            last_prediction_at = latest.created_at.isoformat()
    except Exception:
        last_prediction_at = None

    gemini_status = "enabled" if settings.GEMINI_ENABLED else "disabled"
    if settings.GEMINI_ENABLED and not settings.GEMINI_API_KEY:
        gemini_status = "enabled_missing_key"

    healthy = db_ok and model_store_ok
    return {
        "status": "healthy" if healthy else "degraded",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "connected" if db_ok else "disconnected",
        "model_store": "ready" if model_store_ok else "missing",
        "models_cached": model_count,
        "prediction_service": "ready",
        "last_prediction_at": last_prediction_at,
        "gemini": gemini_status,
        "timestamp": datetime.utcnow().isoformat(),
    }
