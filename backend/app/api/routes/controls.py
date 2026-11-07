"""
Security Controls API Router for PS105 (Phase 8).
Provides endpoints to list and register security controls.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, SecurityControl
from app.schemas.schemas import SecurityControlCreate, SecurityControlResponse
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("", response_model=List[SecurityControlResponse], summary="List Security Controls")
def list_security_controls(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all candidate security controls available in the platform catalog.
    """
    controls = db.query(SecurityControl).all()
    return controls


@router.post("", response_model=SecurityControlResponse, status_code=status.HTTP_201_CREATED, summary="Create Security Control")
def create_security_control(
    control_in: SecurityControlCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registers a new candidate security control into the catalog.
    Validates field constraints via Pydantic schemas and DB CheckConstraints.
    """
    ctrl = SecurityControl(**control_in.model_dump())
    db.add(ctrl)
    db.commit()
    db.refresh(ctrl)
    return ctrl
