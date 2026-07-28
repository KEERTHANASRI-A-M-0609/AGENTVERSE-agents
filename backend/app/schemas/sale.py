from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field


class SaleRecord(BaseModel):
    shop_id: str
    product_id: str
    sale_date: date
    quantity_sold: int = Field(..., ge=0)
    selling_price: Optional[float] = None
    is_weekend: bool = False
    is_festival: bool = False
    is_holiday: bool = False


class SaleIngestRequest(BaseModel):
    records: List[SaleRecord]


class SaleIngestResponse(BaseModel):
    status: str = "success"
    records_inserted: int
    records_skipped: int
