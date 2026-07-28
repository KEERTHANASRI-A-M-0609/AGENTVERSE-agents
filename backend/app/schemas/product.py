from typing import Optional, List
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str
    category: str
    unit: str = "units"
    current_stock: int = 0
    reorder_point: int = 10
    lead_time_days: int = 3
    selling_price: Optional[float] = None


class ProductCreate(ProductBase):
    id: str
    shop_id: str


class ProductResponse(ProductBase):
    id: str
    shop_id: str
    classification: str
    is_active: bool

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    status: str = "success"
    shop_id: str
    total: int
    products: List[ProductResponse]
