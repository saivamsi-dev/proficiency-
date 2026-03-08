import redis
import os
import time
from fastapi import Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False


RATE_LIMITS = {
    "/auth/register": (10, 3600),
    "/auth/login": (20, 3600),
    "/auth/forgot-password": (5, 3600),
    "/exercises/submit": (60, 3600),
    "/feedback/generate": (30, 3600),
}


def get_identifier(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host


def check_rate_limit(request: Request):
    # Skip preflight OPTIONS requests — let CORS middleware handle them
    if request.method == "OPTIONS":
        return

    if not REDIS_AVAILABLE:
        return

    path = request.url.path

    matched_limit = None
    for route, limits in RATE_LIMITS.items():
        if route in path:
            matched_limit = limits
            break

    if matched_limit is None:
        return

    max_requests, window = matched_limit
    identifier = get_identifier(request)
    key = f"ratelimit:{identifier}:{path}"

    count = redis_client.get(key)

    if count is None:
        redis_client.setex(key, window, 1)
    elif int(count) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Try again later.",
        )
    else:
        redis_client.incr(key)