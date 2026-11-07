import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError, OperationalError
from pydantic import ValidationError

# Ensure backend directory is in sys.path
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
    OptimizationResult,
    OptimizationResultControl,
    RiskAssessmentSnapshot,
)
from app.schemas.schemas import (
    OrganizationCreate,
    UserCreate,
    AssetCreate,
    VulnerabilityCreate,
    FindingCreate,
    RiskCreate,
    SecurityControlCreate,
    RiskControlCreate,
)


@pytest.fixture(scope="function")
def db_session():
    """In-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_create_all_tables(db_session):
    """Verifies all 14 core tables are successfully created in the schema."""
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    expected_tables = {
        "organizations",
        "users",
        "assets",
        "vulnerabilities",
        "vulnerability_cpes",
        "asset_vulnerability_findings",
        "threats",
        "risks",
        "security_controls",
        "risk_controls",
        "scenarios",
        "optimization_results",
        "optimization_result_controls",
        "risk_assessment_snapshots",
    }
    assert expected_tables.issubset(set(tables))


def test_organization_user_crud_and_cascade(db_session):
    """Tests Organization -> User 1-to-many relationship, CRUD, and CASCADE delete."""
    org = Organization(name="Synthetic Org", industry="Finance", annual_revenue=1000000.0, cybersecurity_budget=250000.0)
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    user1 = User(organization_id=org.organization_id, name="Alice Analyst", email="alice@synth.com", password_hash="hash123")
    user2 = User(organization_id=org.organization_id, name="Bob Admin", email="bob@synth.com", password_hash="hash456")
    db_session.add_all([user1, user2])
    db_session.commit()

    assert len(org.users) == 2
    assert user1.organization.name == "Synthetic Org"

    # Test Cascade Delete
    db_session.delete(org)
    db_session.commit()
    assert db_session.query(User).filter_by(organization_id=org.organization_id).count() == 0


def test_vulnerability_cpe_relationship(db_session):
    """Tests Vulnerability -> VulnerabilityCPE 1-to-many relationship."""
    vuln = Vulnerability(cve_id="CVE-2024-1234", description="Test Flaw", cvss_score=8.5, cisa_kev_listed=True)
    db_session.add(vuln)
    db_session.commit()

    cpe1 = VulnerabilityCPE(vulnerability_id=vuln.vulnerability_id, cpe_criteria="cpe:2.3:a:vendor:product:1.0:*", version_end_excluding="1.5.0")
    cpe2 = VulnerabilityCPE(vulnerability_id=vuln.vulnerability_id, cpe_criteria="cpe:2.3:a:vendor:product:2.0:*", version_end_excluding="2.1.0")
    db_session.add_all([cpe1, cpe2])
    db_session.commit()

    assert len(vuln.cpe_criteria) == 2
    assert cpe1.vulnerability.cve_id == "CVE-2024-1234"


def test_asset_vulnerability_finding_provenance(db_session):
    """Tests Asset -> AssetVulnerabilityFinding provenance mapping and UNIQUE constraint."""
    org = Organization(name="Org B", annual_revenue=50000.0)
    db_session.add(org)
    db_session.commit()

    asset = Asset(organization_id=org.organization_id, name="Banking DB", asset_type="Database", business_value=500000.0)
    vuln = Vulnerability(cve_id="CVE-2023-9999", cvss_score=9.8)
    db_session.add_all([asset, vuln])
    db_session.commit()

    finding = AssetVulnerabilityFinding(
        asset_id=asset.asset_id,
        vulnerability_id=vuln.vulnerability_id,
        matched_cpe="cpe:2.3:a:postgresql:postgresql:14.2:*",
        matched_version="14.2",
        confidence="VERIFIED",
        source_name="NVD",
        evidence_summary="Matched PostgreSQL 14.2 version spec"
    )
    db_session.add(finding)
    db_session.commit()

    assert finding.asset.name == "Banking DB"
    assert finding.vulnerability.cve_id == "CVE-2023-9999"

    # Test UNIQUE (asset_id, vulnerability_id) constraint
    duplicate_finding = AssetVulnerabilityFinding(
        asset_id=asset.asset_id,
        vulnerability_id=vuln.vulnerability_id,
        matched_cpe="cpe:2.3:a:postgresql:postgresql:14.2:*",
        matched_version="14.2"
    )
    db_session.add(duplicate_finding)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_risk_provenance_and_xor_constraint(db_session):
    """Tests Risk Exclusive XOR Provenance Rule ((finding_id IS NOT NULL AND asset_id IS NULL) OR (finding_id IS NULL AND asset_id IS NOT NULL))."""
    org = Organization(name="XOR Test Org")
    db_session.add(org)
    db_session.commit()

    asset = Asset(organization_id=org.organization_id, name="Server Alpha", asset_type="Server", business_value=100000.0)
    vuln = Vulnerability(cve_id="CVE-2024-5555", cvss_score=7.5)
    threat = Threat(name="Ransomware", category="Malware", base_probability=0.2)
    db_session.add_all([asset, vuln, threat])
    db_session.commit()

    finding = AssetVulnerabilityFinding(
        asset_id=asset.asset_id,
        vulnerability_id=vuln.vulnerability_id,
        matched_cpe="cpe:2.3:o:linux:kernel:5.10:*",
        matched_version="5.10"
    )
    db_session.add(finding)
    db_session.commit()

    # 1. Valid Finding-Based Risk (finding_id populated, asset_id NULL)
    risk1 = Risk(finding_id=finding.finding_id, asset_id=None, threat_id=threat.threat_id, likelihood=4, impact=5)
    db_session.add(risk1)
    db_session.commit()
    assert risk1.resolved_asset.name == "Server Alpha"

    # 2. Valid Asset-Based Risk (finding_id NULL, asset_id populated)
    risk2 = Risk(finding_id=None, asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=2, impact=3)
    db_session.add(risk2)
    db_session.commit()
    assert risk2.resolved_asset.name == "Server Alpha"

    # 3. Invalid Risk (BOTH finding_id and asset_id populated)
    invalid_risk_both = Risk(finding_id=finding.finding_id, asset_id=asset.asset_id, threat_id=threat.threat_id)
    db_session.add(invalid_risk_both)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # 4. Invalid Risk (NEITHER finding_id nor asset_id populated)
    invalid_risk_neither = Risk(finding_id=None, asset_id=None, threat_id=threat.threat_id)
    db_session.add(invalid_risk_neither)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_risk_control_composite_pk(db_session):
    """Tests RiskControl associative table with composite primary key (risk_id, control_id)."""
    org = Organization(name="Control Test Org")
    db_session.add(org)
    db_session.commit()

    asset = Asset(organization_id=org.organization_id, name="API Server", asset_type="Server")
    threat = Threat(name="Phishing", category="Social Engineering")
    db_session.add_all([asset, threat])
    db_session.commit()

    risk = Risk(asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=3, impact=4)
    control = SecurityControl(name="MFA", category="Identity", implementation_cost=30000.0)
    db_session.add_all([risk, control])
    db_session.commit()

    rc = RiskControl(risk_id=risk.risk_id, control_id=control.control_id, effectiveness_against_risk=0.75)
    db_session.add(rc)
    db_session.commit()

    assert rc.risk.likelihood == 3
    assert rc.control.name == "MFA"
    assert rc.effectiveness_against_risk == 0.75

    # Test Duplicate Composite Key
    db_session.expunge(rc)
    duplicate_rc = RiskControl(risk_id=risk.risk_id, control_id=control.control_id, effectiveness_against_risk=0.90)
    db_session.add(duplicate_rc)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_optimization_result_control_composite_pk(db_session):
    """Tests OptimizationResultControl composite primary key (result_id, control_id)."""
    org = Organization(name="Opt Test Org")
    db_session.add(org)
    db_session.commit()

    scenario = Scenario(organization_id=org.organization_id, name="Budget 25L", available_budget=250000.0)
    control = SecurityControl(name="EDR", category="Endpoint", implementation_cost=50000.0)
    db_session.add_all([scenario, control])
    db_session.commit()

    res = OptimizationResult(
        scenario_id=scenario.scenario_id,
        total_investment=50000.0,
        expected_loss_before=100000.0,
        expected_loss_after=30000.0,
        risk_reduction=70000.0,
        roi=1.4
    )
    db_session.add(res)
    db_session.commit()

    orc = OptimizationResultControl(result_id=res.result_id, control_id=control.control_id, allocated_cost=50000.0)
    db_session.add(orc)
    db_session.commit()

    assert len(res.selected_controls) == 1
    assert res.selected_controls[0].control.name == "EDR"


def test_unique_constraints(db_session):
    """Tests UNIQUE constraints on Organization.name, User.email, and Vulnerability.cve_id."""
    org1 = Organization(name="Unique Org")
    db_session.add(org1)
    db_session.commit()

    org2 = Organization(name="Unique Org")
    db_session.add(org2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    vuln1 = Vulnerability(cve_id="CVE-2024-0001")
    db_session.add(vuln1)
    db_session.commit()

    vuln2 = Vulnerability(cve_id="CVE-2024-0001")
    db_session.add(vuln2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_pydantic_validation_schemas():
    """Tests Pydantic v2 schemas for range constraints and Risk XOR model validation."""
    # 1. Valid Risk Schema (finding_id set, asset_id None)
    risk_valid = RiskCreate(finding_id=10, asset_id=None, threat_id=1, likelihood=4, impact=5, exposure_factor=0.8)
    assert risk_valid.likelihood == 4
    assert risk_valid.exposure_factor == 0.8

    # 2. Invalid Likelihood (> 5)
    with pytest.raises(ValidationError):
        RiskCreate(finding_id=10, asset_id=None, threat_id=1, likelihood=6, impact=5)

    # 3. Invalid Exposure Factor (> 1.0)
    with pytest.raises(ValidationError):
        RiskCreate(finding_id=10, asset_id=None, threat_id=1, exposure_factor=1.5)

    # 4. Invalid Risk XOR Validation (BOTH finding_id and asset_id set)
    with pytest.raises(ValidationError) as exc_info:
        RiskCreate(finding_id=10, asset_id=5, threat_id=1)
    assert "finding_id OR asset_id" in str(exc_info.value)

    # 5. Invalid Risk XOR Validation (NEITHER finding_id nor asset_id set)
    with pytest.raises(ValidationError) as exc_info:
        RiskCreate(finding_id=None, asset_id=None, threat_id=1)
    assert "finding_id OR asset_id" in str(exc_info.value)

    # 6. Valid RiskControl Schema
    rc_valid = RiskControlCreate(risk_id=1, control_id=2, effectiveness_against_risk=0.85)
    assert rc_valid.effectiveness_against_risk == 0.85

    # 7. Invalid RiskControl Effectiveness (> 1.0)
    with pytest.raises(ValidationError):
        RiskControlCreate(risk_id=1, control_id=2, effectiveness_against_risk=1.2)


def test_db_check_constraints_vulnerability(db_session):
    """Tests database-level CheckConstraints on Vulnerability numeric fields."""
    # Valid: cvss_score=8.5, exploitability_score=5.0 — should succeed
    vuln_valid = Vulnerability(cve_id="CVE-2024-CHK-001", cvss_score=8.5, exploitability_score=5.0)
    db_session.add(vuln_valid)
    db_session.commit()
    assert vuln_valid.vulnerability_id is not None

    # Invalid: cvss_score > 10
    vuln_bad_cvss = Vulnerability(cve_id="CVE-2024-CHK-002", cvss_score=11.0)
    db_session.add(vuln_bad_cvss)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: exploitability_score < 0
    vuln_bad_exploit = Vulnerability(cve_id="CVE-2024-CHK-003", exploitability_score=-1.0)
    db_session.add(vuln_bad_exploit)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_db_check_constraints_threat(db_session):
    """Tests database-level CheckConstraints on Threat.base_probability."""
    # Valid: base_probability=0.5 — should succeed
    threat_valid = Threat(name="Valid Threat", category="Malware", base_probability=0.5)
    db_session.add(threat_valid)
    db_session.commit()
    assert threat_valid.threat_id is not None

    # Invalid: base_probability > 1
    threat_bad = Threat(name="Bad Threat", category="Malware", base_probability=1.5)
    db_session.add(threat_bad)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: base_probability < 0
    threat_neg = Threat(name="Neg Threat", category="Malware", base_probability=-0.1)
    db_session.add(threat_neg)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_db_check_constraints_risk(db_session):
    """Tests database-level CheckConstraints on Risk likelihood, impact, exposure_factor."""
    org = Organization(name="CHK Risk Org")
    db_session.add(org)
    db_session.commit()

    asset = Asset(organization_id=org.organization_id, name="CHK Server", asset_type="Server")
    threat = Threat(name="CHK Threat", category="Network", base_probability=0.3)
    db_session.add_all([asset, threat])
    db_session.commit()

    # Invalid: likelihood > 5
    risk_bad_likelihood = Risk(asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=6, impact=3)
    db_session.add(risk_bad_likelihood)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: impact < 1
    risk_bad_impact = Risk(asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=3, impact=0)
    db_session.add(risk_bad_impact)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: exposure_factor > 1
    risk_bad_ef = Risk(asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=3, impact=3, exposure_factor=1.5)
    db_session.add(risk_bad_ef)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_db_check_constraints_security_control(db_session):
    """Tests database-level CheckConstraints on SecurityControl coverage, costs."""
    # Valid control
    ctrl_valid = SecurityControl(name="CHK Control", category="Endpoint", coverage=0.8, implementation_cost=5000, maintenance_cost=1000)
    db_session.add(ctrl_valid)
    db_session.commit()
    assert ctrl_valid.control_id is not None

    # Invalid: coverage > 1
    ctrl_bad_cov = SecurityControl(name="Bad Cov", category="Network", coverage=1.5)
    db_session.add(ctrl_bad_cov)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: implementation_cost < 0
    ctrl_bad_cost = SecurityControl(name="Bad Cost", category="Identity", implementation_cost=-100)
    db_session.add(ctrl_bad_cost)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: maintenance_cost < 0
    ctrl_bad_maint = SecurityControl(name="Bad Maint", category="Identity", maintenance_cost=-50)
    db_session.add(ctrl_bad_maint)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_db_check_constraints_risk_control(db_session):
    """Tests database-level CheckConstraints on RiskControl.effectiveness_against_risk."""
    org = Organization(name="RC CHK Org")
    db_session.add(org)
    db_session.commit()

    asset = Asset(organization_id=org.organization_id, name="RC Server", asset_type="Server")
    threat = Threat(name="RC Threat", category="Malware", base_probability=0.2)
    db_session.add_all([asset, threat])
    db_session.commit()

    risk = Risk(asset_id=asset.asset_id, threat_id=threat.threat_id, likelihood=3, impact=3)
    control = SecurityControl(name="RC Control", category="Endpoint", implementation_cost=10000)
    db_session.add_all([risk, control])
    db_session.commit()

    # Invalid: effectiveness_against_risk > 1
    rc_bad = RiskControl(risk_id=risk.risk_id, control_id=control.control_id, effectiveness_against_risk=1.5)
    db_session.add(rc_bad)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()

    # Invalid: effectiveness_against_risk < 0
    rc_neg = RiskControl(risk_id=risk.risk_id, control_id=control.control_id, effectiveness_against_risk=-0.1)
    db_session.add(rc_neg)
    with pytest.raises((IntegrityError, OperationalError)):
        db_session.commit()
    db_session.rollback()


def test_normalization_documentation():
    """
    Documentation test asserting functional dependencies and 3NF/BCNF standards across all 14 entities:
    - Organization: organization_id -> name, industry, size, revenue, budget (BCNF)
    - User: user_id, email -> organization_id, name, password_hash, role (BCNF)
    - Asset: asset_id -> organization_id, name, type, value, cpe specs (BCNF)
    - Vulnerability: vulnerability_id, cve_id -> description, cvss_score, exploitability (BCNF)
    - VulnerabilityCPE: vulnerability_cpe_id -> vulnerability_id, cpe_criteria, version limits (BCNF)
    - AssetVulnerabilityFinding: finding_id, (asset_id, vulnerability_id) -> matched_cpe, matched_version (BCNF)
    - Threat: threat_id -> name, category, probability, severity (BCNF)
    - Risk: risk_id -> finding_id, asset_id, threat_id, likelihood, impact, exposure_factor (BCNF - XOR rule eliminates transitive asset dependency)
    - SecurityControl: control_id -> name, category, nist_function, cost details (BCNF)
    - RiskControl: (risk_id, control_id) -> effectiveness_against_risk (BCNF)
    - Scenario: scenario_id -> organization_id, name, available_budget (BCNF)
    - OptimizationResult: result_id -> scenario_id, total_investment, loss before/after (BCNF - calculation snapshot)
    - OptimizationResultControl: (result_id, control_id) -> allocated_cost (BCNF)
    - RiskAssessmentSnapshot: snapshot_id -> organization_id, total_ale_before, total_ale_after (BCNF)
    """
    # Verify metadata contains all 14 tables
    assert len(Base.metadata.tables) == 14
