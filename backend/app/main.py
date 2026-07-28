from app.compat.bootstrap import install_pandas_shim

install_pandas_shim()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.db.init_db import init_db
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Demand Prediction Agent — ShopMind AI Multi-Agent Platform",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"status": "error", "error_code": "INTERNAL_ERROR", "message": str(exc)},
        )

    # Startup
    @app.on_event("startup")
    async def on_startup():
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        init_db()
        logger.info("Database initialized.")
        # Auto-start event simulator for the demo shop
        from app.services.event_simulator import get_simulator
        sim = get_simulator("shop_001")
        await sim.start()
        logger.info("Retail event simulator started for shop_001")
        # Start multi-agent orchestrator
        from app.services.agent_orchestrator import get_orchestrator
        orch = get_orchestrator("shop_001")
        await orch.start()
        logger.info("Agent orchestrator started for shop_001")

    # Routes
    app.include_router(api_router)

    return app


app = create_app()
