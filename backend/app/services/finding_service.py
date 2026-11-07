"""
Finding Provenance Service for PS105.

Orchestrates asset scan against vulnerability intelligence database, evaluates
CPE applicability, and writes verified findings with complete audit provenance.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload

from app.models.domain import Asset, Vulnerability, AssetVulnerabilityFinding
from app.engines.cpe_matcher import CPEMatcher, MatchOutcome, CPEMatchResult


class FindingService:
    """
    Service responsible for generating and managing verified asset vulnerability findings.
    """

    @staticmethod
    def scan_and_generate_findings(
        db: Session, organization_id: Optional[int] = None
    ) -> List[AssetVulnerabilityFinding]:
        """
        Scans organizational assets against cached vulnerability rules.
        Creates or updates AssetVulnerabilityFinding entities ONLY on definitive MATCH outcomes.
        
        False-positive protection: Assets with missing installed_version or non-matching CPE
        specs produce NO findings.
        """
        asset_query = db.query(Asset)
        if organization_id is not None:
            asset_query = asset_query.filter(Asset.organization_id == organization_id)
        
        assets = asset_query.all()
        vulnerabilities = db.query(Vulnerability).options(
            joinedload(Vulnerability.cpe_criteria)
        ).all()

        generated_findings: List[AssetVulnerabilityFinding] = []

        for asset in assets:
            for vuln in vulnerabilities:
                outcome, match_result = CPEMatcher.evaluate_asset_against_vulnerability(asset, vuln)

                if outcome == MatchOutcome.MATCH and match_result is not None:
                    # Check if finding already exists
                    finding = db.query(AssetVulnerabilityFinding).filter(
                        AssetVulnerabilityFinding.asset_id == asset.asset_id,
                        AssetVulnerabilityFinding.vulnerability_id == vuln.vulnerability_id,
                    ).first()

                    src_name = "NVD + CISA KEV" if vuln.cisa_kev_listed else "NVD"
                    src_url = f"https://nvd.nist.gov/vuln/detail/{vuln.cve_id}"

                    if finding:
                        # Update existing finding provenance
                        finding.matched_cpe = match_result.matched_cpe
                        finding.matched_version = match_result.matched_version or asset.installed_version
                        finding.confidence = match_result.confidence
                        finding.source_name = src_name
                        finding.source_url = src_url
                        finding.evidence_summary = match_result.evidence_summary
                    else:
                        # Create new verified finding
                        finding = AssetVulnerabilityFinding(
                            asset_id=asset.asset_id,
                            vulnerability_id=vuln.vulnerability_id,
                            matched_cpe=match_result.matched_cpe,
                            matched_version=match_result.matched_version or asset.installed_version,
                            confidence=match_result.confidence,
                            source_name=src_name,
                            source_url=src_url,
                            evidence_summary=match_result.evidence_summary,
                        )
                        db.add(finding)

                    generated_findings.append(finding)

                elif outcome == MatchOutcome.NO_MATCH:
                    # If asset was updated to a patched version, remove obsolete finding
                    existing_stale = db.query(AssetVulnerabilityFinding).filter(
                        AssetVulnerabilityFinding.asset_id == asset.asset_id,
                        AssetVulnerabilityFinding.vulnerability_id == vuln.vulnerability_id,
                    ).first()
                    if existing_stale:
                        db.delete(existing_stale)

        db.commit()
        return generated_findings

    @staticmethod
    def get_findings_for_asset(db: Session, asset_id: int) -> List[AssetVulnerabilityFinding]:
        """
        Returns all verified findings for a specific asset.
        """
        return db.query(AssetVulnerabilityFinding).filter(
            AssetVulnerabilityFinding.asset_id == asset_id
        ).all()

    @staticmethod
    def get_findings_for_organization(db: Session, organization_id: int) -> List[AssetVulnerabilityFinding]:
        """
        Returns all verified findings for all assets belonging to an organization.
        """
        return (
            db.query(AssetVulnerabilityFinding)
            .join(Asset, AssetVulnerabilityFinding.asset_id == Asset.asset_id)
            .filter(Asset.organization_id == organization_id)
            .all()
        )
