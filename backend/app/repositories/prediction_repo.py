from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.prediction import Prediction
from app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[Prediction]):
    def __init__(self, db: Session):
        super().__init__(Prediction, db)

    def get_by_shop(self, shop_id: str, limit: int = 20) -> List[Prediction]:
        return (
            self.db.query(Prediction)
            .filter(Prediction.shop_id == shop_id)
            .order_by(Prediction.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_by_request_id(self, request_id: str) -> Optional[Prediction]:
        return (
            self.db.query(Prediction)
            .filter(Prediction.request_id == request_id)
            .first()
        )

    def save(self, prediction: Prediction) -> Prediction:
        self.db.add(prediction)
        self.db.commit()
        self.db.refresh(prediction)
        return prediction
