from fastapi import APIRouter
from app.api.v1.endpoints import demand, products, sales, health, analytics, events

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(demand.router)
api_router.include_router(products.router)
api_router.include_router(sales.router)
api_router.include_router(health.router)
api_router.include_router(analytics.router)
api_router.include_router(events.router)
