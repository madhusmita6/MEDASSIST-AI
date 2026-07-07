from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.logging import logger
from app.database import engine, Base

# Import API routers
from app.api.v1.auth import router as auth_router
from app.api.v1.appointments import router as appointments_router
from app.api.v1.reports import router as reports_router
from app.api.v1.reminders import router as reminders_router
from app.api.v1.emergency import router as emergency_router
from app.api.v1.caregivers import router as caregivers_router

# Initialize tables on startup if in development mode
if settings.ENVIRONMENT == "development":
    logger.info("Local development environment detected. Initializing database tables...")
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedAssist AI",
    description="Secure Healthcare Concierge Backend API",
    version="0.1.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Error Handling Middleware
@app.middleware("http")
async def log_requests_and_mask_exceptions(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Internal processing crashed: {str(e)}", exc_info=True)
        # Avoid leaking exact system stack details in JSON responses
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal system error occurred. Please contact support."}
        )

# Register routes under api/v1 prefix
app.include_router(auth_router, prefix="/api/v1")
app.include_router(appointments_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(reminders_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api/v1")
app.include_router(caregivers_router, prefix="/api/v1")

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "api_version": "0.1.0"
    }
