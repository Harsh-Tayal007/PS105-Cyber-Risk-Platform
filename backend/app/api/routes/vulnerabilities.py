"""
Vulnerability Intelligence & Provenance API Router for PS105 (Phase 8).
Provides cached vulnerability intelligence and verified finding provenance records.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Vulnerability, AssetVulnerabilityFinding, Asset
from app.schemas.schemas import VulnerabilityResponse, FindingResponse
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/intelligence", response_model=List[VulnerabilityResponse], summary="List Public Vulnerability Intelligence")
def list_vulnerability_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns public vulnerability intelligence cached in local database (Phase 3).
    """
    vulnerabilities = db.query(Vulnerability).all()
    return vulnerabilities


@router.get("/findings", response_model=List[FindingResponse], summary="List Verified Asset Vulnerability Findings")
def list_verified_findings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns verified findings for assets belonging to the authenticated user's organization.
    Includes full evidence provenance metadata.
    """
    findings = (
        db.query(AssetVulnerabilityFinding)
        .join(Asset, AssetVulnerabilityFinding.asset_id == Asset.asset_id)
        .filter(Asset.organization_id == current_user.organization_id)
        .all()
    )
    return findings
