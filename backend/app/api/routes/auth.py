"""
Authentication API Router for PS105 (Phase 8).
Provides user registration and login endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.connection import get_db
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, Token
from app.services.auth_service import register_user, verify_password, create_access_token, get_password_hash
from app.models.domain import User

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register New User")
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new user account and creates or associates an organization.
    Never returns password hashes.
    """
    return register_user(db, user_in)


@router.post("/login", response_model=Token, summary="User Authentication & Token Generation")
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns a signed JWT access token.
    """
    clean_email = login_in.email.strip().lower() if login_in.email else ""
    user = db.query(User).filter(func.lower(func.trim(User.email)) == clean_email).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email, "user_id": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/demo", response_model=Token, summary="Quick Demo Dataset Access")
def demo_login(db: Session = Depends(get_db)):
    """
    Provides instant one-click access to the ABC Financial Services synthetic
    demonstration dataset. Returns a signed JWT for the demo CISO account.
    """
    demo_email = "ciso@abcfinancial.com"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo dataset not available. Please run database seeding first.",
        )

    access_token = create_access_token(data={"sub": user.email, "user_id": user.user_id})
    return {"access_token": access_token, "token_type": "bearer"}
