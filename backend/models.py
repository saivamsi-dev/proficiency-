from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Date, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    profile_picture = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(64), nullable=True)
    password_reset_token = Column(String(64), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    stats = relationship("UserStats", back_populates="user", uselist=False)
    submissions = relationship("Submission", back_populates="user")
    daily_activity = relationship("DailyActivity", back_populates="user")
    level_history = relationship("LevelHistory", back_populates="user")
    training_plan = relationship("TrainingPlan", back_populates="user", uselist=False)
    feedback_logs = relationship("FeedbackLog", back_populates="user")


class UserStats(Base):
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    level = Column(String(20), default="beginner")
    proficiency_score = Column(Float, default=0.0)
    xp = Column(Integer, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_active_date = Column(Date, nullable=True)
    total_exercises = Column(Integer, default=0, nullable=False)
    total_corrections = Column(Integer, default=0, nullable=False)
    exercises_today = Column(Integer, default=0, nullable=False)
    daily_goal_met = Column(Boolean, default=False, nullable=False)
    weekly_xp = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="stats")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    original_text = Column(Text)
    corrected_text = Column(Text)
    confidence_score = Column(Float)
    has_errors = Column(Boolean, default=False, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    severity_weight = Column(Float, default=0.0, nullable=False)
    error_categories = Column(JSON, default=list)
    xp_earned = Column(Integer, default=10, nullable=False)
    submitted_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User", back_populates="submissions")
    errors = relationship("ErrorLog", back_populates="submission")
    feedback = relationship("FeedbackLog", back_populates="submission")


class ErrorLog(Base):
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    error_category = Column(String(30), default="other", index=True)
    error_type = Column(String(100))
    severity = Column(String(10), default="medium")
    original_fragment = Column(Text)
    corrected_fragment = Column(Text)
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    logged_at = Column(DateTime, default=datetime.datetime.utcnow)

    submission = relationship("Submission", back_populates="errors")


class DailyActivity(Base):
    __tablename__ = "daily_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    date = Column(Date, index=True)
    exercise_count = Column(Integer, default=0, nullable=False)
    xp_earned = Column(Integer, default=0, nullable=False)
    goal_met = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="daily_activity")


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    level = Column(String(20))
    focus_areas = Column(JSON, default=list)
    weekly_exercises = Column(JSON, default=list)
    xp_goal = Column(Integer, default=200)
    weaknesses = Column(JSON, default=list)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    valid_until = Column(Date)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="training_plan")


class TrainingPlanHistory(Base):
    __tablename__ = "training_plan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    level = Column(String(20))
    focus_areas = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    xp_goal = Column(Integer)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)


class LevelHistory(Base):
    __tablename__ = "level_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    level = Column(String(20))
    proficiency_score = Column(Float)
    wps_breakdown = Column(JSON, default=dict)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="level_history")


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    explanation = Column(Text)
    grammar_rule = Column(Text)
    example_usage = Column(Text)
    improvement_suggestion = Column(Text)
    model_used = Column(String(50), default="ollama")
    cached = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    submission = relationship("Submission", back_populates="feedback")
    user = relationship("User", back_populates="feedback_logs")