from fastapi import FastAPI
from app.api.routers import processing, processing_simple

app = FastAPI()

# Include routers
app.include_router(processing.router, prefix="/api/v1", tags=["processing"])
app.include_router(processing_simple.router, prefix="/api/v1/simple", tags=["processing_simple"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}
