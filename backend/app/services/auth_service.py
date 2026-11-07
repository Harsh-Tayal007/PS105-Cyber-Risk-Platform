"""
Authentication Service & Security Dependencies for PS105 (Phase 8).

Handles password hashing (Bcrypt), JWT token generation/validation,
and organization-scoped current_user dependency injection.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
try:
    import jwt
    from jwt import PyJWTError as JWTError
except ImportError:
    from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func
import bcrypt
from app.config import settings
from app.database.connection import get_db
from app.models.domain import User, Organization
from app.schemas.schemas import TokenData, UserRegister

# OAuth2 Scheme for Swagger UI & Authorization Header extraction
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored Bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str, rounds: int | None = None) -> str:
    """Generates a Bcrypt hash for a plain text password.

    The work factor (rounds) defaults to 12 for production security.
    Set the BCRYPT_ROUNDS environment variable to a lower value (e.g. 4)
    to speed up tests without changing production security.
    """
    import os
    if rounds is None:
        rounds = int(os.environ.get("BCRYPT_ROUNDS", "12"))
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt(rounds=rounds)).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def register_user(db: Session, user_in: UserRegister) -> User:
    """
    Registers a new user and ensures organization association.
    If no organization exists or is provided, creates a new organization
    with user-supplied details. Rejects name collisions to prevent hijacking.
    """
    # Check if user email already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # Determine Organization ID
    org_id = user_in.organization_id
    if not org_id:
        # Create a new organization for this user if organization_name specified or default
        org_name = user_in.organization_name or f"{user_in.name}'s Organization"
        org = db.query(Organization).filter(Organization.name == org_name).first()
        if org:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An organization with this name already exists. Please choose a unique organization name.",
            )
        org = Organization(
            name=org_name,
            industry=user_in.industry or "Not Specified",
            organization_size=user_in.organization_size or "Not Specified",
            annual_revenue=user_in.annual_revenue if user_in.annual_revenue is not None else 0.0,
            cybersecurity_budget=user_in.cybersecurity_budget if user_in.cybersecurity_budget is not None else 0.0,
        )
        db.add(org)
        db.flush()
        org_id = org.organization_id

    # Create new user record
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        organization_id=org_id,
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_pwd,
        role=user_in.role or "analyst",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that extracts, decodes, and validates the JWT Bearer token,
    returning the authenticated User ORM entity.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or missing access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    clean_sub = token_data.email.strip().lower() if token_data.email else ""
    user = db.query(User).filter(func.lower(func.trim(User.email)) == clean_sub).first()
    if user is None:
        raise credentials_exception
    return user
