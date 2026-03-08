from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from routers import auth, exercises, feedback, training, ocr
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Proficiency +",
    description="AI-powered English learning platform",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5177",
]

# This intercepts OPTIONS before FastAPI routes or validates anything
@app.middleware("http")
async def cors_preflight_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "")
        if origin in ALLOWED_ORIGINS:
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "600",
                },
            )
    response = await call_next(request)
    return response

# Handles CORS headers on all other requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/v1")
app.include_router(exercises.router, prefix="/api/v1")
app.include_router(feedback.router,  prefix="/api/v1")
app.include_router(training.router,  prefix="/api/v1")
app.include_router(ocr.router,       prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Proficiency + API is running."}

@app.get("/health")
def health():
    return {"status": "ok"}
