from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import verify_api_key
from app.repositories.product_repo import ProductRepository
from app.schemas.product import ProductListResponse, ProductResponse, ProductCreate
from app.models.product import Product

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/{shop_id}", response_model=ProductListResponse)
def list_products(
    shop_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    repo = ProductRepository(db)
    products = repo.get_by_shop(shop_id)
    return ProductListResponse(
        shop_id=shop_id,
        total=len(products),
        products=[ProductResponse.model_validate(p) for p in products],
    )


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: str = Depends(verify_api_key),
):
    repo = ProductRepository(db)
    product = Product(**payload.model_dump())
    return ProductResponse.model_validate(repo.create(product))
