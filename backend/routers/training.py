import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, UserStats, ErrorLog, TrainingPlan, TrainingPlanHistory, DailyActivity
from schemas import TrainingPlanOut, CalendarOut, DailyActivityOut
from core.security import get_current_user
from core.level_engine import update_user_level

router = APIRouter(tags=["Training"])

LEVEL_CURRICULUM = {
    "beginner": [
        {"type": "spelling", "title": "Basic Spelling", "count": 5},
        {"type": "article", "title": "Articles: a, an, the", "count": 5},
        {"type": "subject_verb", "title": "Subject-Verb Basics", "count": 3},
    ],
    "elementary": [
        {"type": "tense", "title": "Simple Tenses", "count": 5},
        {"type": "preposition", "title": "Common Prepositions", "count": 5},
        {"type": "article", "title": "Articles in Context", "count": 3},
    ],
    "intermediate": [
        {"type": "tense", "title": "Perfect and Progressive Tenses", "count": 5},
        {"type": "word_order", "title": "Sentence Structure", "count": 5},
        {"type": "vocabulary", "title": "Vocabulary Expansion", "count": 5},
    ],
    "advanced": [
        {"type": "vocabulary", "title": "Advanced Vocabulary", "count": 5},
        {"type": "word_order", "title": "Complex Sentence Patterns", "count": 5},
        {"type": "tense", "title": "Mixed and Conditional Tenses", "count": 5},
    ],
}

WEAKNESS_EXERCISES = {
    "tense":        {"title": "Tense Reinforcement Drills", "count": 5},
    "article":      {"title": "Article Practice", "count": 5},
    "preposition":  {"title": "Preposition Builder", "count": 5},
    "subject_verb": {"title": "Subject-Verb Agreement", "count": 5},
    "spelling":     {"title": "Spelling Correction", "count": 5},
    "vocabulary":   {"title": "Word Booster", "count": 5},
    "word_order":   {"title": "Structured Writing Drills", "count": 5},
}


def detect_weaknesses(user_id: int, db: Session, top_n: int = 2) -> list:
    results = (
        db.query(ErrorLog.error_category, func.count(ErrorLog.id).label("count"))
        .filter(ErrorLog.user_id == user_id)
        .group_by(ErrorLog.error_category)
        .order_by(func.count(ErrorLog.id).desc())
        .limit(top_n)
        .all()
    )
    return [r.error_category for r in results]


def build_plan(user: User, db: Session) -> TrainingPlan:
    stats = user.stats
    level = stats.level if stats else "beginner"
    weaknesses = detect_weaknesses(user.id, db)

    base = list(LEVEL_CURRICULUM.get(level, LEVEL_CURRICULUM["beginner"]))
    extra = []
    for w in weaknesses:
        ex = WEAKNESS_EXERCISES.get(w)
        if ex:
            extra.append({"type": w, **ex})

    all_exercises = base + extra
    xp_goal = len(all_exercises) * 10 + 50
    valid_until = (datetime.datetime.utcnow() + datetime.timedelta(days=7)).date()

    existing = db.query(TrainingPlan).filter(TrainingPlan.user_id == user.id).first()

    if existing:
        existing.level = level
        existing.focus_areas = list(set(e["type"] for e in all_exercises))
        existing.weekly_exercises = all_exercises
        existing.xp_goal = xp_goal
        existing.weaknesses = weaknesses
        existing.generated_at = datetime.datetime.utcnow()
        existing.valid_until = valid_until
        existing.is_active = True
        plan = existing
    else:
        plan = TrainingPlan(
            user_id=user.id,
            level=level,
            focus_areas=list(set(e["type"] for e in all_exercises)),
            weekly_exercises=all_exercises,
            xp_goal=xp_goal,
            weaknesses=weaknesses,
            valid_until=valid_until,
        )
        db.add(plan)

    db.add(TrainingPlanHistory(
        user_id=user.id,
        level=level,
        focus_areas=plan.focus_areas,
        weaknesses=weaknesses,
        xp_goal=xp_goal,
    ))

    db.commit()
    db.refresh(plan)
    return plan


# ─── TRAINING PLAN ROUTES ────────────────────────────

@router.get("/training/plan", response_model=TrainingPlanOut)
def get_training_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(TrainingPlan).filter(TrainingPlan.user_id == current_user.id).first()

    if not plan or plan.valid_until < datetime.date.today():
        plan = build_plan(current_user, db)

    return plan


@router.post("/training/plan/regenerate", response_model=TrainingPlanOut)
def regenerate_plan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = build_plan(current_user, db)
    return plan


@router.post("/training/update-level")
def trigger_level_update(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_user_level(current_user.id, db)
    return result


# ─── CALENDAR ROUTES ─────────────────────────────────

@router.get("/calendar", response_model=CalendarOut)
def get_calendar(
    year: int = None,
    month: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.datetime.utcnow()
    year = year or now.year
    month = month or now.month

    activities = (
        db.query(DailyActivity)
        .filter(
            DailyActivity.user_id == current_user.id,
            func.year(DailyActivity.date) == year,
            func.month(DailyActivity.date) == month,
        )
        .order_by(DailyActivity.date)
        .all()
    )

    stats = current_user.stats
    total_active = sum(1 for a in activities if (a.exercise_count or 0) > 0)

    return CalendarOut(
        year=year,
        month=month,
        activities=[
            DailyActivityOut(
                date=a.date,
                exercise_count=a.exercise_count or 0,
                xp_earned=a.xp_earned or 0,
                goal_met=bool(a.goal_met),
            ) for a in activities
        ],
        current_streak=stats.current_streak if stats else 0,
        total_active_days=total_active,
    )
