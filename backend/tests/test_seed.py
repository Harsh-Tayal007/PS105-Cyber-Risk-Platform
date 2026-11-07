"""
Unit & Integration Tests for Phase 4 Synthetic Demonstration Dataset Seeding (PS105).
"""

import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.connection import Base
from app.models.domain import (
    Organization,
    User,
    Asset,
    Vulnerability,
    VulnerabilityCPE,
    AssetVulnerabilityFinding,
    Threat,
    Risk,
    SecurityControl,
    RiskControl,
    Scenario,
)
from app.database.seed import run_seed


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture for test isolation."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_seed_execution_and_entity_counts(db_session):
    summary = run_seed(db_session)
    
    assert summary["organization"] == "ABC Financial Services"
    assert summary["assets_count"] == 4
    assert summary["threats_count"] == 5
    assert summary["risks_count"] == 5
    assert summary["controls_count"] == 8
    assert summary["scenario_budget"] == 2500000.0

    # Verify Organization
    org = db_session.query(Organization).filter_by(name="ABC Financial Services").first()
    assert org is not None
    assert org.annual_revenue == 500000000.0
    assert org.cybersecurity_budget == 2500000.0

    # Verify Assets
    assets = db_session.query(Asset).filter_by(organization_id=org.organization_id).all()
    assert len(assets) == 4
    asset_names = {a.name for a in assets}
    assert asset_names == {
        "Core Banking DB",
        "Payment Gateway API",
        "Employee Workstations",
        "Cloud Infrastructure",
    }

    # Verify Controls
    controls = db_session.query(SecurityControl).all()
    assert len(controls) == 8
    control_names = {c.name for c in controls}
    assert control_names == {
        "MFA",
        "EDR",
        "Immutable Backup",
        "Security Training",
        "SIEM",
        "Firewall Upgrade",
        "Pen Testing",
        "Network Segmentation",
    }

    # Verify Scenario
    scenario = db_session.query(Scenario).filter_by(organization_id=org.organization_id).first()
    assert scenario is not None
    assert scenario.available_budget == 2500000.0


def test_seed_idempotency(db_session):
    """
    Running seed script twice must NOT double entity counts or fail.
    """
    run_seed(db_session)
    run_seed(db_session)

    org_count = db_session.query(Organization).count()
    assert org_count == 1

    asset_count = db_session.query(Asset).count()
    assert asset_count == 4

    threat_count = db_session.query(Threat).count()
    assert threat_count == 5

    risk_count = db_session.query(Risk).count()
    assert risk_count == 5

    control_count = db_session.query(SecurityControl).count()
    assert control_count == 8

    finding_count = db_session.query(AssetVulnerabilityFinding).count()
    assert finding_count == 3


def test_vulnerability_provenance_and_insufficient_data_protection(db_session):
    run_seed(db_session)

    # 3 Real CVEs ingested
    cves = db_session.query(Vulnerability).all()
    assert len(cves) == 3
    cve_ids = {v.cve_id for v in cves}
    assert cve_ids == {"CVE-2021-41773", "CVE-2022-1552", "CVE-2023-23397"}

    # Verified findings
    findings = db_session.query(AssetVulnerabilityFinding).all()
    assert len(findings) == 3

    # Check evidence provenance attributes
    for f in findings:
        assert f.confidence == "VERIFIED"
        assert f.source_name in {"NVD", "NVD + CISA KEV"}
        assert f.source_url.startswith("https://nvd.nist.gov/vuln/detail/")
        assert len(f.evidence_summary) > 10

    # Ensure Cloud Infrastructure (missing installed_version) has ZERO findings
    cloud_asset = db_session.query(Asset).filter_by(name="Cloud Infrastructure").first()
    cloud_findings = db_session.query(AssetVulnerabilityFinding).filter_by(asset_id=cloud_asset.asset_id).all()
    assert len(cloud_findings) == 0


def test_risk_provenance_xor_constraint(db_session):
    run_seed(db_session)

    risks = db_session.query(Risk).all()
    assert len(risks) == 5

    for r in risks:
        # Check XOR constraint: exactly one of finding_id OR asset_id MUST be set
        has_finding = r.finding_id is not None
        has_asset = r.asset_id is not None
        assert has_finding != has_asset, f"Risk ID {r.risk_id} violates XOR constraint (finding={r.finding_id}, asset={r.asset_id})"

        # Check numeric ranges
        assert 1 <= r.likelihood <= 5
        assert 1 <= r.impact <= 5
        assert 0.0 <= r.exposure_factor <= 1.0


def test_risk_control_mappings(db_session):
    run_seed(db_session)

    rc_entries = db_session.query(RiskControl).all()
    assert len(rc_entries) >= 10

    for rc in rc_entries:
        assert 0.0 <= rc.effectiveness_against_risk <= 1.0


def test_seed_ale_revenue_ratio_under_15_percent(db_session):
    """Seed validation assertion (Item 17): Baseline ALE must not exceed 15% of annual revenue."""
    summary = run_seed(db_session)
    assert summary["ale_revenue_ratio"] <= 0.15, f"ALE/Revenue ratio {summary['ale_revenue_ratio']*100:.2f}% exceeds 15%"
    assert summary["baseline_ale"] > 0
    assert summary["net_rosi"] > 0
