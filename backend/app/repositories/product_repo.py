from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: Session):
        super().__init__(Product, db)

    def get_by_shop(self, shop_id: str, active_only: bool = True) -> List[Product]:
        q = self.db.query(Product).filter(Product.shop_id == shop_id)
        if active_only:
            q = q.filter(Product.is_active == True)
        return q.all()

    def get_by_shop_and_id(self, shop_id: str, product_id: str) -> Optional[Product]:
        return (
            self.db.query(Product)
            .filter(Product.shop_id == shop_id, Product.id == product_id)
            .first()
        )

    def update_classification(self, product_id: str, classification: str) -> None:
        self.db.query(Product).filter(Product.id == product_id).update(
            {"classification": classification}
        )
        self.db.commit()
