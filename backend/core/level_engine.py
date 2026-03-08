from sqlalchemy.orm import Session
from models import UserStats, Submission, LevelHistory
import datetime

WPS_WEIGHTS = {
    "grammar_accuracy": 0.35,
    "error_severity": 0.20,
    "vocabulary_diversity": 0.15,
    "writing_complexity": 0.15,
    "reading_quiz": 0.15,
}

LEVEL_MAP = [
    (81, "advanced"),
    (61, "intermediate"),
    (41, "elementary"),
    (0,  "beginner"),
]

ROLLING_WINDOW = 50


def compute_grammar_accuracy(submissions: list) -> float:
    if not submissions:
        return 0.0
    correct = sum(1 for s in submissions if not s.has_errors)
    return round((correct / len(submissions)) * 100, 2)


def compute_error_severity(submissions: list) -> float:
    if not submissions:
        return 100.0
    total_weight = sum(s.severity_weight for s in submissions)
    max_possible = len(submissions) * 3
    penalty = (total_weight / max_possible) * 100 if max_possible else 0
    return round(max(0.0, 100.0 - penalty), 2)


def compute_vocabulary_diversity(submissions: list) -> float:
    all_words = []
    for s in submissions:
        all_words.extend(s.original_text.lower().split())
    if not all_words:
        return 0.0
    unique_ratio = len(set(all_words)) / len(all_words)
    return round(min(unique_ratio * 100, 100.0), 2)


def compute_writing_complexity(submissions: list) -> float:
    if not submissions:
        return 0.0
    lengths = [len(s.original_text.split()) for s in submissions]
    avg_length = sum(lengths) / len(lengths)
    return round(min((avg_length / 30) * 100, 100.0), 2)


def get_reading_quiz_score(stats: UserStats) -> float:
    if stats:
        return round(min(stats.proficiency_score, 100.0), 2)
    return 50.0


def wps_to_level(wps: float) -> str:
    for threshold, level in LEVEL_MAP:
        if wps >= threshold:
            return level
    return "beginner"


def compute_wps(user_id: int, db: Session) -> dict:
    recent = (
        db.query(Submission)
        .filter(Submission.user_id == user_id)
        .order_by(Submission.submitted_at.desc())
        .limit(ROLLING_WINDOW)
        .all()
    )

    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()

    ga = compute_grammar_accuracy(recent)
    es = compute_error_severity(recent)
    vd = compute_vocabulary_diversity(recent)
    wc = compute_writing_complexity(recent)
    rq = get_reading_quiz_score(stats)

    wps = round(
        WPS_WEIGHTS["grammar_accuracy"] * ga +
        WPS_WEIGHTS["error_severity"] * es +
        WPS_WEIGHTS["vocabulary_diversity"] * vd +
        WPS_WEIGHTS["writing_complexity"] * wc +
        WPS_WEIGHTS["reading_quiz"] * rq,
        2
    )

    return {
        "wps": wps,
        "breakdown": {
            "grammar_accuracy": ga,
            "error_severity": es,
            "vocabulary_diversity": vd,
            "writing_complexity": wc,
            "reading_quiz": rq,
        },
    }


def update_user_level(user_id: int, db: Session) -> dict:
    result = compute_wps(user_id, db)
    wps = result["wps"]
    new_level = wps_to_level(wps)

    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    old_level = stats.level

    stats.proficiency_score = wps
    stats.level = new_level

    db.add(LevelHistory(
        user_id=user_id,
        level=new_level,
        proficiency_score=wps,
        wps_breakdown=result["breakdown"],
        recorded_at=datetime.datetime.utcnow(),
    ))

    db.commit()

    return {
        "old_level": old_level,
        "new_level": new_level,
        "wps": wps,
        "breakdown": result["breakdown"],
        "level_changed": new_level != old_level,
    }