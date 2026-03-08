import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserStats, Submission, ErrorLog, DailyActivity
from schemas import CorrectionRequest, SubmitResponse
from core.security import get_current_user
from core.rate_limit import check_rate_limit
from core.level_engine import update_user_level
from gec_service import correct_text, calculate_grammar_accuracy
import difflib

router = APIRouter(prefix="/exercises", tags=["Exercises"])

XP_PER_EXERCISE = 10
XP_DAILY_COMPLETION = 50
EXERCISES_PER_DAY_GOAL = 5


def build_error_list(original: str, corrected: str) -> list:
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

        errors.append({
            "category": "other",
            "type": tag,
            "severity": "medium",
            "original": orig_fragment,
            "corrected": corr_fragment,
            "start": start,
            "end": end,
        })

        char_offset = end + 1

    return errors


def update_streak(stats: UserStats):
    today = datetime.date.today()

    if stats.last_active_date is None:
        stats.current_streak = 1
    elif stats.last_active_date == today:
        return
    elif (today - stats.last_active_date).days == 1:
        stats.current_streak += 1
    else:
        stats.current_streak = 1

    stats.last_active_date = today

    if stats.current_streak > stats.longest_streak:
        stats.longest_streak = stats.current_streak


def _int_or_zero(value) -> int:
    return value if isinstance(value, int) else 0


@router.post("/submit", response_model=SubmitResponse)
def submit_exercise(
    request: Request,
    body: CorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_rate_limit(request)

    if len(body.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short. Minimum 5 characters.")

    corrected = correct_text(body.text)
    accuracy = calculate_grammar_accuracy(body.text, corrected)
    confidence_score = round(accuracy / 100, 4)

    detected_errors = build_error_list(body.text, corrected)
    has_errors = len(detected_errors) > 0
    severity_weight = len(detected_errors) * 2.0
    error_categories = list(set(e["category"] for e in detected_errors))

    submission = Submission(
        user_id=current_user.id,
        original_text=body.text,
        corrected_text=corrected,
        confidence_score=confidence_score,
        has_errors=has_errors,
        error_count=len(detected_errors),
        severity_weight=severity_weight,
        error_categories=error_categories,
        xp_earned=XP_PER_EXERCISE,
    )
    db.add(submission)
    db.flush()

    for err in detected_errors:
        db.add(ErrorLog(
            submission_id=submission.id,
            user_id=current_user.id,
            error_category=err["category"],
            error_type=err["type"],
            severity=err["severity"],
            original_fragment=err["original"],
            corrected_fragment=err["corrected"],
            position_start=err["start"],
            position_end=err["end"],
        ))

    stats = current_user.stats
    if not stats:
        stats = UserStats(user_id=current_user.id)
        db.add(stats)
        db.flush()

    stats.total_exercises = _int_or_zero(stats.total_exercises) + 1
    stats.total_corrections = _int_or_zero(stats.total_corrections) + len(detected_errors)
    stats.xp = _int_or_zero(stats.xp) + XP_PER_EXERCISE
    stats.weekly_xp = _int_or_zero(stats.weekly_xp) + XP_PER_EXERCISE
    update_streak(stats)

    today = datetime.date.today()
    activity = db.query(DailyActivity).filter(
        DailyActivity.user_id == current_user.id,
        DailyActivity.date == today,
    ).first()

    if not activity:
        activity = DailyActivity(user_id=current_user.id, date=today)
        db.add(activity)

    activity.exercise_count = _int_or_zero(activity.exercise_count) + 1
    activity.xp_earned = _int_or_zero(activity.xp_earned) + XP_PER_EXERCISE

    if activity.exercise_count >= EXERCISES_PER_DAY_GOAL and not bool(activity.goal_met):
        activity.goal_met = True
        stats.daily_goal_met = True
        stats.xp = _int_or_zero(stats.xp) + XP_DAILY_COMPLETION
        stats.weekly_xp = _int_or_zero(stats.weekly_xp) + XP_DAILY_COMPLETION

    db.commit()

    # Update proficiency score after each submission
    update_user_level(current_user.id, db)

    db.refresh(submission)

    return SubmitResponse(
        submission=submission,
        xp_earned=XP_PER_EXERCISE,
        streak=stats.current_streak,
        has_errors=has_errors,
    )


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submissions = (
        db.query(Submission)
        .filter(Submission.user_id == current_user.id)
        .order_by(Submission.submitted_at.desc())
        .limit(20)
        .all()
    )
    return submissions