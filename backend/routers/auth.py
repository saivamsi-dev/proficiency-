import secrets
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserStats
from schemas import RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from core.security import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
from core.rate_limit import check_rate_limit
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    check_rate_limit(request)

    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already taken.")

    user = User(
        username=body.username,
        email=body.email,
        password=hash_password(body.password),
        email_verification_token=secrets.token_urlsafe(32),
    )
    db.add(user)
    db.flush()

    stats = UserStats(user_id=user.id)
    db.add(stats)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    check_rate_limit(request)

    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid token.")

    user.is_email_verified = True
    user.email_verification_token = None
    db.commit()

    return {"message": "Email verified successfully."}


@router.post("/forgot-password")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    check_rate_limit(request)

    user = db.query(User).filter(User.email == body.email).first()

    # Always return same message to prevent email enumeration
    if user:
        user.password_reset_token = secrets.token_urlsafe(32)
        user.password_reset_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        db.commit()
        # Send email here when mail is configured

    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == body.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid token.")

    if user.password_reset_expires < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired.")

    user.password = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    return {"message": "Password reset successful."}


@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "profile_picture": current_user.profile_picture,
        "is_email_verified": current_user.is_email_verified,
        "created_at": current_user.created_at,
        "stats": {
            "level": current_user.stats.level if current_user.stats else "beginner",
            "proficiency_score": current_user.stats.proficiency_score if current_user.stats else 0.0,
            "xp": current_user.stats.xp if current_user.stats else 0,
            "current_streak": current_user.stats.current_streak if current_user.stats else 0,
            "longest_streak": current_user.stats.longest_streak if current_user.stats else 0,
            "total_exercises": current_user.stats.total_exercises if current_user.stats else 0,
            "total_corrections": current_user.stats.total_corrections if current_user.stats else 0,
            "exercises_today": current_user.stats.exercises_today if current_user.stats else 0,
            "daily_goal_met": current_user.stats.daily_goal_met if current_user.stats else False,
            "weekly_xp": current_user.stats.weekly_xp if current_user.stats else 0,
        }
    }
