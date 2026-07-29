from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

extra_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    extra_args["connect_args"] = {"check_same_thread": False}
    extra_args["poolclass"] = NullPool

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    **extra_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
