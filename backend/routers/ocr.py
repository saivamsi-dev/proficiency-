"""
OCR router for extracting text from images.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from core.security import get_current_user
from core.rate_limit import check_rate_limit
from core.ocr_service import extract_text_from_image, validate_image
from gec_service import correct_text
from core.groq_service import generate_explanation

router = APIRouter(prefix="/ocr", tags=["OCR"])


class OCRResponse(BaseModel):
    """Response model for OCR extraction."""
    extracted_text: str


class OCRCorrectionResponse(BaseModel):
    """Response model for OCR + grammar correction."""
    extracted_text: str
    corrected_text: str
    explanation: str


@router.post("/upload", response_model=OCRResponse)
async def upload_image_for_ocr(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image and extract text using OCR.
    
    Accepts: JPEG, PNG, GIF, BMP, WebP, TIFF
    Max file size: 5 MB
    """
    check_rate_limit(request)
    
    # Read file content
    content = await file.read()
    
    # Validate image
    validate_image(file.content_type, len(content))
    
    # Extract text
    extracted_text = extract_text_from_image(content, file.filename or "image.png")
    
    return OCRResponse(extracted_text=extracted_text)


@router.post("/practice", response_model=OCRCorrectionResponse)
async def practice_from_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image, extract text, correct grammar, and generate explanation.
    
    This is a combined endpoint that:
    1. Extracts text from the uploaded image using OCR
    2. Corrects grammar using the BART model
    3. Generates an AI explanation of corrections using Groq
    
    Accepts: JPEG, PNG, GIF, BMP, WebP, TIFF
    Max file size: 5 MB
    """
    check_rate_limit(request)
    
    # Read file content
    content = await file.read()
    
    # Validate image
    validate_image(file.content_type, len(content))
    
    # Step 1: Extract text from image
    extracted_text = extract_text_from_image(content, file.filename or "image.png")
    
    # Step 2: Correct grammar
    corrected_text = correct_text(extracted_text)
    
    # Step 3: Generate explanation if there were corrections
    explanation = ""
    if extracted_text.strip() != corrected_text.strip():
        explanation = generate_explanation(
            original_text=extracted_text,
            corrected_text=corrected_text,
            error_types=["general"]
        )
    else:
        explanation = "No grammar errors detected in the extracted text."
    
    return OCRCorrectionResponse(
        extracted_text=extracted_text,
        corrected_text=corrected_text,
        explanation=explanation,
    )


class OCRExtractResponse(BaseModel):
    """Response model for OCR extraction with 'text' field."""
    text: str


@router.post("/extract", response_model=OCRExtractResponse)
async def extract_text_from_uploaded_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image and extract text using OCR.
    Returns text in format expected by frontend.
    
    Accepts: JPEG, PNG, GIF, BMP, WebP, TIFF
    Max file size: 5 MB
    """
    check_rate_limit(request)
    
    # Read file content
    content = await file.read()
    
    # Validate image
    validate_image(file.content_type, len(content))
    
    # Extract text
    extracted_text = extract_text_from_image(content, file.filename or "image.png")
    
    return OCRExtractResponse(text=extracted_text)
