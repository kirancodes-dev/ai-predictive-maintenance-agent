from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.async_database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def init_db():
    """Create all tables."""
    # Import all models so SQLAlchemy registers them before create_all
    import app.models.user  # noqa
    import app.models.machine  # noqa
    import app.models.sensor  # noqa
    import app.models.alert  # noqa
    import app.models.maintenance  # noqa
    import app.models.technician  # noqa
    import app.models.prediction  # noqa
    import app.models.failure_fingerprint  # noqa
    import app.models.isolation  # noqa
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
