from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import User, Submission, FeedbackLog
from schemas import FeedbackRequest, FeedbackOut, CorrectionRequest
from core.security import get_current_user
from core.rate_limit import check_rate_limit
from core.groq_service import generate_feedback, sanitize_input
from gec_service import correct_text, calculate_grammar_accuracy
import difflib

router = APIRouter(prefix="/feedback", tags=["Feedback"])


class ErrorDetail(BaseModel):
    category: str
    type: str
    severity: str
    original: str
    corrected: str
    start: Optional[int] = None
    end: Optional[int] = None


class CorrectionResponse(BaseModel):
    corrected_text: str
    accuracy_score: float
    errors: List[ErrorDetail]
    complexity_score: Optional[float] = None


def build_error_list(original: str, corrected: str) -> list:
    """Build list of errors by comparing original and corrected text."""
    orig_words = original.split()
    corr_words = corrected.split()
    matcher = difflib.SequenceMatcher(None, orig_words, corr_words)
    errors = []
    char_offset = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            char_offset += sum(len(w) + 1 for w in orig_words[i1:i2])
            continue

        orig_fragment = " ".join(orig_words[i1:i2])
        corr_fragment = " ".join(corr_words[j1:j2])
        start = char_offset
        end = start + len(orig_fragment)

        # Determine severity based on error type
        if tag == "delete":
            severity = "medium"
        elif tag == "insert":
            severity = "low"
        else:
            severity = "high" if len(orig_fragment) > 10 else "medium"

        errors.append({
            "category": "grammar",
            "type": tag,
            "severity": severity,
            "original": orig_fragment,
            "corrected": corr_fragment,
            "start": start,
            "end": end,
        })

        char_offset = end + 1

    return errors


def calculate_complexity(text: str) -> float:
    """Calculate text complexity score (0-100)."""
    words = text.split()
    if not words:
        return 0.0
    
    avg_word_length = sum(len(w) for w in words) / len(words)
    sentence_count = max(1, text.count('.') + text.count('!') + text.count('?'))
    words_per_sentence = len(words) / sentence_count
    
    # Simple complexity formula
    complexity = min(100, (avg_word_length * 8) + (words_per_sentence * 2))
    return round(complexity, 1)


@router.post("/correct", response_model=CorrectionResponse)
def correct_grammar(
    request: Request,
    body: CorrectionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Correct grammar in the provided text and return detailed analysis.
    """
    check_rate_limit(request)

    if len(body.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short. Minimum 5 characters.")

    corrected = correct_text(body.text)
    accuracy = calculate_grammar_accuracy(body.text, corrected)
    errors = build_error_list(body.text, corrected)
    complexity = calculate_complexity(body.text)

    return CorrectionResponse(
        corrected_text=corrected,
        accuracy_score=accuracy,
        errors=[ErrorDetail(**e) for e in errors],
        complexity_score=complexity,
    )


@router.post("/generate", response_model=FeedbackOut)
def get_feedback(
    request: Request,
    body: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_rate_limit(request)

    # Fetch the submission and verify it belongs to this user
    submission = db.query(Submission).filter(
        Submission.id == body.submission_id,
        Submission.user_id == current_user.id,
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    # Return cached feedback if it already exists
    existing = db.query(FeedbackLog).filter(
        FeedbackLog.submission_id == submission.id
    ).first()

    if existing:
        return FeedbackOut(
            explanation=existing.explanation,
            grammar_rule=existing.grammar_rule,
            example_usage=existing.example_usage,
            improvement_suggestion=existing.improvement_suggestion,
            cached=True,
        )

    # Sanitize input before sending to Ollama
    try:
        original = sanitize_input(submission.original_text)
    except ValueError:
        raise HTTPException(status_code=400, detail="Input contains disallowed content.")

    error_types = submission.error_categories or []

    result = generate_feedback(original, submission.corrected_text, error_types)

    if not result.get("success"):
        raise HTTPException(status_code=503, detail=result.get("error", "Feedback service unavailable."))

    # Store in database
    log = FeedbackLog(
        submission_id=submission.id,
        user_id=current_user.id,
        explanation=result["explanation"],
        grammar_rule=result["grammar_rule"],
        example_usage=result["example_usage"],
        improvement_suggestion=result["improvement_suggestion"],
        cached=result["cached"],
    )
    db.add(log)
    db.commit()

    return FeedbackOut(
        explanation=result["explanation"],
        grammar_rule=result["grammar_rule"],
        example_usage=result["example_usage"],
        improvement_suggestion=result["improvement_suggestion"],
        cached=result["cached"],
    )
