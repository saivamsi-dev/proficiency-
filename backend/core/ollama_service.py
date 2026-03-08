import requests
import hashlib
import json
import logging
import redis
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", 30))
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1")
CACHE_TTL = 60 * 60 * 24  # 24 hours

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Ollama caching disabled.")


PROMPT_TEMPLATE = """
You are an English grammar tutor. A student submitted this sentence:

Original: {original}
Corrected: {corrected}
Error types: {error_types}

Respond ONLY in this JSON format with no extra text:
{{
  "explanation": "Why the original sentence is incorrect, explained simply.",
  "grammar_rule": "The grammar rule that applies here.",
  "example_usage": "A correct example sentence demonstrating the rule.",
  "improvement_suggestion": "One specific tip for the student to avoid this mistake."
}}
"""


def _cache_key(original: str, corrected: str) -> str:
    content = f"{original}|{corrected}"
    return f"ollama:{hashlib.sha256(content.encode()).hexdigest()}"


def sanitize_input(text: str) -> str:
    blocked = [
        "ignore previous instructions",
        "disregard your instructions",
        "you are now",
        "system:",
        "###",
        "forget everything",
        "new instructions",
    ]
    lowered = text.lower()
    for pattern in blocked:
        if pattern in lowered:
            raise ValueError("Input contains disallowed content.")
    return text[:1000]


def generate_feedback(original: str, corrected: str, error_types: list) -> dict:
    cache_key = _cache_key(original, corrected)

    # Check Redis cache first
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            result = json.loads(cached)
            result["cached"] = True
            return result

    prompt = PROMPT_TEMPLATE.format(
        original=original,
        corrected=corrected,
        error_types=", ".join(error_types) if error_types else "general",
    )

    try:
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        raw = response.json().get("response", "{}")

        # Strip markdown fences if present
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)

        result = {
            "success": True,
            "explanation": data.get("explanation", ""),
            "grammar_rule": data.get("grammar_rule", ""),
            "example_usage": data.get("example_usage", ""),
            "improvement_suggestion": data.get("improvement_suggestion", ""),
            "cached": False,
        }

        # Store in Redis
        if REDIS_AVAILABLE:
            redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))

        return result

    except requests.Timeout:
        logger.error("Ollama timeout. original: %s", original[:50])
        return {"success": False, "error": "Feedback service timed out."}

    except (requests.RequestException, json.JSONDecodeError) as e:
        logger.error("Ollama error: %s", str(e))
        return {"success": False, "error": "Feedback service unavailable."}
