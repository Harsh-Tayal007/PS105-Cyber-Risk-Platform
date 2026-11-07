"""
Executive Reports API Router for PS105 (Phase 8).
Provides downloadable PDF executive report generation interface.
"""

import re
from datetime import datetime, timezone
from typing import Optional, Set
from fastapi import APIRouter, Depends, Response, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Organization
from app.services.auth_service import get_current_user
from app.services.report_service import generate_executive_pdf_report, VALID_REPORT_SECTIONS

router = APIRouter()


@router.get("/executive-pdf", summary="Generate Executive Cyber Risk PDF Report")
def get_executive_pdf_report(
    sections: Optional[str] = Query(
        None,
        description="Optional comma-separated list of section keys: summary, assets, findings, risks, simulation, optimization, scenarios, methodology, limitations, glossary",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates and streams a downloadable executive ReportLab PDF report
    summarizing financial baselines, risk quantification, Monte Carlo percentiles,
    and security investment optimization.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authenticated user is not associated with an organization.",
        )

    # Parse and validate requested sections
    requested_sections: Optional[Set[str]] = None
    if sections is not None:
        raw_keys = [s.strip().lower() for s in sections.split(",") if s.strip()]
        if not raw_keys:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one valid section key must be specified when 'sections' query parameter is provided.",
            )
        invalid_keys = [k for k in raw_keys if k not in VALID_REPORT_SECTIONS]
        if invalid_keys:
            valid_list = ", ".join(sorted(VALID_REPORT_SECTIONS))
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown section keys: {', '.join(invalid_keys)}. Allowed section keys are: {valid_list}",
            )
        requested_sections = set(raw_keys)

    pdf_bytes = generate_executive_pdf_report(
        db, current_user.organization_id, sections=requested_sections
    )

    # Determine organization name slug and date for filename
    org = db.query(Organization).filter_by(organization_id=current_user.organization_id).first()
    org_name = org.name if org and org.name else f"Org_{current_user.organization_id}"
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", org_name).strip("_") or f"Org_{current_user.organization_id}"
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"PS105_Executive_Report_{slug}_{date_str}.pdf"

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
