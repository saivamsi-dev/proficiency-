"""
Groq API service for generating grammar feedback explanations.
Uses LLaMA 3.1 (llama3-8b-8192) model.
"""
import logging
import hashlib
import json
import redis
from groq import Groq
from core.config import settings

logger = logging.getLogger(__name__)

# Initialize Groq client
_groq_client = None


def get_groq_client() -> Groq:
    """Get or create Groq client instance."""
    global _groq_client
    if _groq_client is None:
        if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "your-groq-api-key-here":
            raise ValueError("GROQ_API_KEY not configured. Set it in .env file.")
        _groq_client = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


# Redis cache setup
CACHE_TTL = 60 * 60 * 24  # 24 hours

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False
    logger.warning("Redis not available. Groq response caching disabled.")


PROMPT_TEMPLATE = """You are an English grammar tutor. A student submitted this sentence:

Original (with errors): {original}
Corrected: {corrected}
Error types: {error_types}

Explain in under 120 words:
1. What was grammatically wrong
2. The grammar rule that applies
3. A short example demonstrating correct usage

Respond ONLY in this JSON format with no extra text:
{{
  "explanation": "Brief explanation of what was wrong",
  "grammar_rule": "The grammar rule that applies",
  "example_usage": "A correct example sentence",
  "improvement_suggestion": "One specific tip to avoid this mistake"
}}"""


def _cache_key(original: str, corrected: str) -> str:
    """Generate cache key from input texts."""
    content = f"groq:{original}|{corrected}"
    return f"groq:{hashlib.sha256(content.encode()).hexdigest()}"


def sanitize_input(text: str) -> str:
    """Sanitize input to prevent prompt injection."""
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


def generate_explanation(original_text: str, corrected_text: str, error_types: list = None) -> str:
    """
    Generate grammar explanation using Groq API with LLaMA 3.1.
    
    Args:
        original_text: The original text with errors
        corrected_text: The corrected text
        error_types: Optional list of error categories
        
    Returns:
        Explanation string
    """
    result = generate_feedback(original_text, corrected_text, error_types or [])
    if result.get("success"):
        return result.get("explanation", "")
    return ""


def generate_feedback(original: str, corrected: str, error_types: list) -> dict:
    """
    Generate detailed grammar feedback using Groq API.
    
    Args:
        original: The original text with errors
        corrected: The corrected text
        error_types: List of error categories
        
    Returns:
        Dictionary with success status and feedback fields
    """
    cache_key = _cache_key(original, corrected)
    
    # Check Redis cache first
    if REDIS_AVAILABLE:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                result = json.loads(cached)
                result["cached"] = True
                return result
        except Exception as e:
            logger.warning("Redis cache read failed: %s", e)
    
    prompt = PROMPT_TEMPLATE.format(
        original=original,
        corrected=corrected,
        error_types=", ".join(error_types) if error_types else "general",
    )
    
    try:
        client = get_groq_client()
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert English grammar tutor. Respond only in valid JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=settings.GROQ_MODEL,
            temperature=0.3,
            max_tokens=500,
            timeout=settings.GROQ_TIMEOUT,
        )
        
        raw = chat_completion.choices[0].message.content.strip()
        
        # Strip markdown fences if present
        raw = raw.lstrip("```json").lstrip("```").rstrip("```").strip()
        
        data = json.loads(raw)
        
        result = {
            "success": True,
            "explanation": data.get("explanation", ""),
            "grammar_rule": data.get("grammar_rule", ""),
            "example_usage": data.get("example_usage", ""),
            "improvement_suggestion": data.get("improvement_suggestion", ""),
            "cached": False,
        }
        
        # Store in Redis cache
        if REDIS_AVAILABLE:
            try:
                redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
            except Exception as e:
                logger.warning("Redis cache write failed: %s", e)
        
        return result
        
    except ValueError as e:
        # API key not configured
        logger.error("Groq API key error: %s", str(e))
        return {"success": False, "error": str(e)}
        
    except json.JSONDecodeError as e:
        logger.error("Groq response parse error: %s", str(e))
        return {"success": False, "error": "Failed to parse AI response."}
        
    except Exception as e:
        logger.error("Groq API error: %s", str(e))
        return {"success": False, "error": f"Feedback service error: {str(e)}"}
