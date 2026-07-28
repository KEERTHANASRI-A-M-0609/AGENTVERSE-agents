from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import verify_api_key
from app.models.sale import Sale
from app.repositories.sale_repo import SaleRepository
from app.schemas.sale import SaleIngestRequest, SaleIngestResponse

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("/ingest", response_model=SaleIngestResponse)
def ingest_sales(
    payload: SaleIngestRequest,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    repo = SaleRepository(db)
    inserted = 0
    skipped = 0

    for record in payload.records:
        if repo.sale_exists(record.shop_id, record.product_id, record.sale_date):
            skipped += 1
            continue
        sale = Sale(**record.model_dump())
        db.add(sale)
        inserted += 1

    db.commit()
    return SaleIngestResponse(records_inserted=inserted, records_skipped=skipped)
