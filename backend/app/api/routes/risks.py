"""
Risk Quantification API Router for PS105.
Orchestrates RiskQuantificationEngine without duplicating mathematical formulas.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.domain import User, Risk, Asset, Threat, AssetVulnerabilityFinding, SecurityControl, RiskControl
from app.schemas.schemas import RiskCalculateRequest, RiskCreate, RiskResponse, ThreatResponse
from app.engines.risk_engine import RiskQuantificationEngine
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/threats", response_model=List[ThreatResponse], summary="List Threat Definitions")
def list_threats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all threat definitions available in the platform catalog.
    """
    threats = db.query(Threat).all()
    return threats


@router.post("", response_model=RiskResponse, status_code=status.HTTP_201_CREATED, summary="Create Risk")
def create_risk(
    risk_in: RiskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new risk scoped to the current user's organization.
    Validates XOR provenance (finding_id OR asset_id, not both).
    Validates that the referenced asset or finding belongs to the user's organization.
    """
    # Validate org ownership of referenced asset or finding
    if risk_in.asset_id is not None:
        asset = db.query(Asset).filter(
            Asset.asset_id == risk_in.asset_id,
            Asset.organization_id == current_user.organization_id,
        ).first()
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found in your organization.")
    elif risk_in.finding_id is not None:
        finding = db.query(AssetVulnerabilityFinding).filter(
            AssetVulnerabilityFinding.finding_id == risk_in.finding_id,
        ).first()
        if not finding:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found.")
        # Verify the finding's asset belongs to user's org
        asset = db.query(Asset).filter(
            Asset.asset_id == finding.asset_id,
            Asset.organization_id == current_user.organization_id,
        ).first()
        if not asset:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Finding does not belong to your organization.")

    risk = Risk(**risk_in.model_dump())
    db.add(risk)
    db.commit()
    db.refresh(risk)

    # Link candidate security controls with explainable effectiveness
    _link_default_risk_controls(db, risk)

    return risk


def _link_default_risk_controls(db: Session, risk: Risk):
    """Associates candidate security controls to a risk with domain-appropriate effectiveness."""
    controls = {c.name: c for c in db.query(SecurityControl).all()}
    if not controls:
        return

    threat = db.query(Threat).filter(Threat.threat_id == risk.threat_id).first()
    if not threat:
        return

    t_name = (threat.name or "").lower()
    mappings = []

    if "web" in t_name or "exploit" in t_name:
        if "Firewall Upgrade" in controls:
            mappings.append((controls["Firewall Upgrade"].control_id, 0.80))
        if "Pen Testing" in controls:
            mappings.append((controls["Pen Testing"].control_id, 0.50))
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.40))
    elif "database" in t_name or "exfiltration" in t_name or "privilege" in t_name:
        if "Network Segmentation" in controls:
            mappings.append((controls["Network Segmentation"].control_id, 0.70))
        if "MFA" in controls:
            mappings.append((controls["MFA"].control_id, 0.50))
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.45))
        if "Pen Testing" in controls:
            mappings.append((controls["Pen Testing"].control_id, 0.35))
    elif "phishing" in t_name or "credential" in t_name:
        if "MFA" in controls:
            mappings.append((controls["MFA"].control_id, 0.80))
        if "EDR" in controls:
            mappings.append((controls["EDR"].control_id, 0.60))
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.30))
    elif "ransomware" in t_name or "malware" in t_name:
        if "Immutable Backup" in controls:
            mappings.append((controls["Immutable Backup"].control_id, 0.85))
        if "EDR" in controls:
            mappings.append((controls["EDR"].control_id, 0.70))
        if "Network Segmentation" in controls:
            mappings.append((controls["Network Segmentation"].control_id, 0.60))
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.40))
    elif "cloud" in t_name or "misconfiguration" in t_name:
        if "MFA" in controls:
            mappings.append((controls["MFA"].control_id, 0.70))
        if "Pen Testing" in controls:
            mappings.append((controls["Pen Testing"].control_id, 0.45))
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.35))
    else:
        if "SIEM" in controls:
            mappings.append((controls["SIEM"].control_id, 0.40))
        if "Pen Testing" in controls:
            mappings.append((controls["Pen Testing"].control_id, 0.35))

    for ctrl_id, eff in mappings:
        existing = db.query(RiskControl).filter(
            RiskControl.risk_id == risk.risk_id,
            RiskControl.control_id == ctrl_id,
        ).first()
        if not existing:
            rc = RiskControl(risk_id=risk.risk_id, control_id=ctrl_id, effectiveness_against_risk=eff)
            db.add(rc)
    db.commit()


@router.post("/auto-map", summary="Auto-Map Threat Scenarios to Findings and Assets")
def auto_map_threat_scenarios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Automatically creates domain-appropriate risk scenarios for all findings and assets
    belonging to the current user's organization.
    """
    org_id = current_user.organization_id
    threats = {t.name: t for t in db.query(Threat).all()}
    if not threats:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No threats cataloged in database.")

    # 1. Findings for this organization
    findings = (
        db.query(AssetVulnerabilityFinding)
        .join(Asset, AssetVulnerabilityFinding.asset_id == Asset.asset_id)
        .filter(Asset.organization_id == org_id)
        .all()
    )

    created_risks = []

    for f in findings:
        cve = f.vulnerability.cve_id if f.vulnerability else ""
        asset_name = (f.asset.name or "").lower() if f.asset else ""
        cpe = (f.matched_cpe or "").lower()

        # Select appropriate threat
        target_threat = None
        likelihood = 4
        impact = 5
        exp_factor = 0.9

        if "41773" in cve or "apache" in cpe or "gateway" in asset_name:
            target_threat = threats.get("Web Application Exploitation")
            likelihood = 4
            impact = 5
            exp_factor = 0.90
        elif "1552" in cve or "postgres" in cpe or "database" in asset_name or "sql" in asset_name:
            target_threat = threats.get("Database Exfiltration & Privilege Abuse")
            likelihood = 3
            impact = 5
            exp_factor = 0.80
        elif "23397" in cve or "outlook" in cpe or "workstation" in asset_name:
            target_threat = threats.get("Phishing & Credential Theft")
            likelihood = 4
            impact = 3
            exp_factor = 0.60

        if not target_threat:
            # Fallback threat
            target_threat = list(threats.values())[0]

        existing = db.query(Risk).filter(
            Risk.finding_id == f.finding_id,
            Risk.threat_id == target_threat.threat_id,
        ).first()

        if not existing:
            r = Risk(
                finding_id=f.finding_id,
                asset_id=None,
                threat_id=target_threat.threat_id,
                likelihood=likelihood,
                impact=impact,
                exposure_factor=exp_factor,
                status="ACTIVE",
            )
            db.add(r)
            db.commit()
            db.refresh(r)
            _link_default_risk_controls(db, r)
            created_risks.append(r.risk_id)

    # 2. Direct assets (especially those without findings or cloud assets)
    assets = db.query(Asset).filter(Asset.organization_id == org_id).all()
    for a in assets:
        a_name = (a.name or "").lower()
        a_type = (a.asset_type or "").lower()

        target_threat = None
        likelihood = 3
        impact = 4
        exp_factor = 0.70

        if "cloud" in a_name or "cloud" in a_type or "aws" in a_name:
            target_threat = threats.get("Cloud Infrastructure Misconfiguration")
            likelihood = 3
            impact = 4
            exp_factor = 0.75
        elif ("workstation" in a_name or "endpoint" in a_type) and "Ransomware / Extortion Attack" in threats:
            target_threat = threats.get("Ransomware / Extortion Attack")
            likelihood = 3
            impact = 4
            exp_factor = 0.70

        if target_threat:
            existing = db.query(Risk).filter(
                Risk.asset_id == a.asset_id,
                Risk.threat_id == target_threat.threat_id,
            ).first()
            if not existing:
                r = Risk(
                    finding_id=None,
                    asset_id=a.asset_id,
                    threat_id=target_threat.threat_id,
                    likelihood=likelihood,
                    impact=impact,
                    exposure_factor=exp_factor,
                    status="ACTIVE",
                )
                db.add(r)
                db.commit()
                db.refresh(r)
                _link_default_risk_controls(db, r)
                created_risks.append(r.risk_id)

    return {"message": "Auto-mapped threat scenarios successfully", "created_risks_count": len(created_risks)}



def _enrich_risk_dicts(quantified, org_risks) -> List[Dict[str, Any]]:
    risk_by_id = {r.risk_id: r for r in org_risks}
    results = []
    for q in quantified:
        d = q.to_dict()
        r = risk_by_id.get(q.risk_id)
        if r:
            asset = r.resolved_asset
            d["asset_name"] = asset.name if asset else f"Asset #{q.asset_id}"
            d["threat_name"] = r.threat.name if r.threat else "Unknown Threat"
            d["threat_id"] = r.threat_id
            if r.finding and r.finding.vulnerability:
                d["vulnerability_cve"] = r.finding.vulnerability.cve_id
            else:
                d["vulnerability_cve"] = None
        else:
            d["asset_name"] = f"Asset #{q.asset_id}"
            d["threat_name"] = "Threat"
            d["threat_id"] = 0
            d["vulnerability_cve"] = None

        d["business_value"] = q.asset_business_value
        d["ale_baseline"] = q.ale
        d["ale_residual"] = q.loss_after
        d["likelihood_score"] = q.likelihood
        d["impact_score"] = q.impact
        d["risk_score"] = q.qualitative_score

        # Qualitative severity tier
        score = q.qualitative_score
        if score >= 20:
            rating = "CRITICAL"
        elif score >= 12:
            rating = "HIGH"
        elif score >= 6:
            rating = "MEDIUM"
        else:
            rating = "LOW"
        d["qualitative_rating"] = rating
        d["applied_control_ids"] = q.selected_control_ids
        d["residual_factor"] = (q.loss_after / q.ale) if q.ale > 0 else 1.0

        results.append(d)
    return results


@router.get("/assessment", summary="Get Organization Risk Assessment")
def get_risk_assessment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Returns deterministic risk quantification metrics for all risks in current user's organization.
    Invokes existing RiskQuantificationEngine dynamically.
    """
    risks = (
        db.query(Risk)
        .join(Asset, Risk.asset_id == Asset.asset_id, isouter=True)
        .all()
    )

    # Scoped to current user's organization assets or findings
    org_risks = [r for r in risks if r.resolved_asset and r.resolved_asset.organization_id == current_user.organization_id]
    
    quantified = RiskQuantificationEngine.quantify_all_risks(org_risks)
    return _enrich_risk_dicts(quantified, org_risks)


@router.post("/calculate", summary="Calculate Risk Residuals with Control Portfolio")
def calculate_risk_residuals(
    req: RiskCalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Calculates residual risk metrics after applying a candidate control portfolio.
    Invokes existing RiskQuantificationEngine dynamically.
    """
    risks = (
        db.query(Risk)
        .join(Asset, Risk.asset_id == Asset.asset_id, isouter=True)
        .all()
    )

    org_risks = [r for r in risks if r.resolved_asset and r.resolved_asset.organization_id == current_user.organization_id]

    quantified = RiskQuantificationEngine.quantify_all_risks(org_risks, selected_control_ids=req.selected_control_ids)
    return _enrich_risk_dicts(quantified, org_risks)

