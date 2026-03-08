"""
Gemini-based OCR service for extracting text from images.
Uses Google's Gemini API for vision-based text extraction via REST API.
"""
import logging
import base64
import requests
from fastapi import HTTPException
from core.config import settings

logger = logging.getLogger(__name__)

# Supported image formats
SUPPORTED_FORMATS = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit

# Gemini API endpoint
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def validate_image(content_type: str, file_size: int) -> None:
    """
    Validate image file before processing.
    
    Args:
        content_type: MIME type of the uploaded file
        file_size: Size of the file in bytes
        
    Raises:
        HTTPException: If validation fails
    """
    if content_type not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format. Supported: JPEG, PNG, GIF, BMP, WebP, TIFF"
        )
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB."
        )


def extract_text_from_image(image_bytes: bytes, filename: str = "image.png") -> str:
    """
    Extract text from image using Google Gemini via REST API.
    
    Args:
        image_bytes: Raw bytes of the image file
        filename: Original filename (used to determine MIME type)
        
    Returns:
        Extracted plain text from the image
        
    Raises:
        HTTPException: If OCR fails or API key is not configured
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OCR service not configured. Set GEMINI_API_KEY in .env file."
        )
    
    # Determine MIME type from filename
    ext = filename.lower().split('.')[-1] if '.' in filename else 'png'
    mime_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'tiff': 'image/tiff',
        'tif': 'image/tiff',
    }
    mime_type = mime_map.get(ext, 'image/png')
    
    try:
        # Build API URL
        url = GEMINI_API_URL.format(model=settings.GEMINI_MODEL)
        url = f"{url}?key={settings.GEMINI_API_KEY}"
        
        # Prompt for OCR
        prompt = """Extract ALL text from this image exactly as it appears. 
Return ONLY the extracted text, nothing else. 
Preserve line breaks and formatting where possible.
If there is no readable text in the image, respond with: [NO TEXT FOUND]"""
        
        # Build request payload
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode('utf-8')
                        }
                    }
                ]
            }]
        }
        
        # Make request
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            logger.error("Gemini API error: %s", error_detail)
            raise HTTPException(status_code=503, detail=f"OCR service error: {error_detail}")
        
        result = response.json()
        
        # Extract text from response
        candidates = result.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=422, detail="No response from OCR service.")
        
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise HTTPException(status_code=422, detail="No text in OCR response.")
        
        extracted_text = parts[0].get("text", "").strip()
        
        # Check if no text was found
        if extracted_text == "[NO TEXT FOUND]" or not extracted_text:
            raise HTTPException(status_code=422, detail="No readable text found in image.")
        
        logger.info("OCR extracted %d characters using Gemini", len(extracted_text))
        return extracted_text
        
    except HTTPException:
        raise
    except requests.Timeout:
        logger.error("Gemini API timeout")
        raise HTTPException(status_code=504, detail="OCR service timed out.")
    except Exception as e:
        logger.error("Gemini OCR failed: %s", str(e))
        raise HTTPException(status_code=503, detail=f"OCR service error: {str(e)}")
