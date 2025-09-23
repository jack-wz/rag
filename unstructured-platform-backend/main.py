from fastapi import FastAPI

from app.api.routers import processing_simple

app = FastAPI()

try:
    from app.api.routers import processing as processing_full
except Exception:
    processing_router = processing_simple.router
else:
    processing_router = processing_full.router

app.include_router(processing_router, prefix="/api/v1", tags=["processing"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
