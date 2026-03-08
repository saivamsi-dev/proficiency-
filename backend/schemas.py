from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime


# ─── AUTH ───────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ─── USER / PROFILE ─────────────────────────────────

class UserStatsOut(BaseModel):
    level: str
    proficiency_score: float
    xp: int
    current_streak: int
    longest_streak: int
    total_exercises: int
    total_corrections: int
    exercises_today: int
    daily_goal_met: bool
    weekly_xp: int

    class Config:
        from_attributes = True


class ProfileOut(BaseModel):
    id: int
    username: str
    email: str
    profile_picture: Optional[str]
    is_email_verified: bool
    created_at: datetime
    stats: Optional[UserStatsOut]

    class Config:
        from_attributes = True


# ─── EXERCISE ───────────────────────────────────────

class CorrectionRequest(BaseModel):
    text: str


class ErrorOut(BaseModel):
    error_category: str
    error_type: str
    severity: str
    original_fragment: str
    corrected_fragment: str
    position_start: Optional[int]
    position_end: Optional[int]

    class Config:
        from_attributes = True


class SubmissionOut(BaseModel):
    id: int
    original_text: str
    corrected_text: str
    confidence_score: float
    has_errors: bool
    error_count: int
    error_categories: Optional[List[str]]
    xp_earned: int
    submitted_at: datetime
    errors: List[ErrorOut] = []

    class Config:
        from_attributes = True


class SubmitResponse(BaseModel):
    submission: SubmissionOut
    xp_earned: int
    streak: int
    has_errors: bool


# ─── FEEDBACK ───────────────────────────────────────

class FeedbackRequest(BaseModel):
    submission_id: int


class FeedbackOut(BaseModel):
    explanation: str
    grammar_rule: str
    example_usage: str
    improvement_suggestion: str
    cached: bool


# ─── TRAINING PLAN ──────────────────────────────────

class ExerciseItem(BaseModel):
    type: str
    title: str
    count: int


class TrainingPlanOut(BaseModel):
    level: str
    focus_areas: List[str]
    weekly_exercises: List[dict]
    xp_goal: int
    weaknesses: List[str]
    valid_until: date

    class Config:
        from_attributes = True


# ─── CALENDAR ───────────────────────────────────────

class DailyActivityOut(BaseModel):
    date: date
    exercise_count: int
    xp_earned: int
    goal_met: bool

    class Config:
        from_attributes = True


class CalendarOut(BaseModel):
    year: int
    month: int
    activities: List[DailyActivityOut]
    current_streak: int
    total_active_days: int


# ─── LEVEL ──────────────────────────────────────────

class LevelUpdateOut(BaseModel):
    old_level: str
    new_level: str
    wps: float
    breakdown: dict
    level_changed: bool