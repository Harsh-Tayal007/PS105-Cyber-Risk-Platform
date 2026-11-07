"""
Asset Management API Router for PS105.
Provides organization-scoped CRUD endpoints for assets.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Asset
from app.schemas.schemas import AssetCreate, AssetResponse, AssetUpdate
from app.services.auth_service import get_current_user
from app.services.finding_service import FindingService

router = APIRouter()


@router.get("", response_model=List[AssetResponse], summary="List Organization Assets")
def list_assets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lists all assets belonging to the authenticated user's organization.
    Strict multi-tenant isolation enforced.
    """
    assets = db.query(Asset).filter(Asset.organization_id == current_user.organization_id).all()
    return assets


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED, summary="Create Asset")
def create_asset(
    asset_in: AssetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new asset owned by the authenticated user's organization.
    Ignores client-supplied organization_id to enforce authorization boundaries.
    Automatically triggers Phase 3 CPE applicability scan for the organization.
    """
    asset_dict = asset_in.model_dump()
    asset_dict["organization_id"] = current_user.organization_id

    asset = Asset(**asset_dict)
    db.add(asset)
    db.commit()
    db.refresh(asset)

    # Auto-trigger Phase 3 CPE applicability scan
    try:
        FindingService.scan_and_generate_findings(db, current_user.organization_id)
    except Exception:
        pass  # Finding scan is best-effort; asset creation still succeeds

    return asset


@router.put("/{asset_id}", response_model=AssetResponse, summary="Update Asset")
def update_asset(
    asset_id: int,
    asset_in: AssetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates an asset belonging to the authenticated user's organization.
    Re-triggers Phase 3 CPE applicability scan after technology/version changes.
    """
    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id,
        Asset.organization_id == current_user.organization_id,
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset ID {asset_id} not found or does not belong to your organization.",
        )

    update_data = asset_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(asset, field, value)

    db.commit()
    db.refresh(asset)

    # Re-trigger Phase 3 CPE applicability scan after update
    try:
        FindingService.scan_and_generate_findings(db, current_user.organization_id)
    except Exception:
        pass

    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Asset")
def delete_asset(
    asset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deletes an asset belonging to the authenticated user's organization.
    Rejects unauthorized access with 404/403.
    """
    asset = db.query(Asset).filter(
        Asset.asset_id == asset_id,
        Asset.organization_id == current_user.organization_id,
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset ID {asset_id} not found or does not belong to your organization.",
        )

    db.delete(asset)
    db.commit()
    return None

