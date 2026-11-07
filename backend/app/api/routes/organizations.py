"""
Organization API Router for PS105 (Phase 8).
Provides organization profile retrieval and update endpoints scoped to current user.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Organization
from app.schemas.schemas import OrganizationResponse, OrganizationUpdate
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/me", response_model=OrganizationResponse, summary="Get Current User Organization")
def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the authenticated user's organization profile.
    Strictly organization-scoped.
    """
    org = db.query(Organization).filter(Organization.organization_id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    # Compute is_demo flag for frontend display
    resp = OrganizationResponse.model_validate(org)
    resp.is_demo = (org.name == "ABC Financial Services")
    return resp


@router.put("/me", response_model=OrganizationResponse, summary="Update Current User Organization")
def update_my_organization(
    org_in: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates organization parameters (name, industry, revenue, budget) for current user's organization.
    Does not allow modifying primary keys or ownership.
    """
    org = db.query(Organization).filter(Organization.organization_id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    update_data = org_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(org, field, value)

    db.commit()
    db.refresh(org)
    return org
