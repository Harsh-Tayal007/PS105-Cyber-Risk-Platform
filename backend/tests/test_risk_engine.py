"""
Unit & Integration Tests for Deterministic Risk Quantification Engine (PS105 Phase 5).
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
    Asset,
    Vulnerability,
    AssetVulnerabilityFinding,
    Threat,
    Risk,
    SecurityControl,
    RiskControl,
)
from app.database.seed import run_seed
from app.engines.risk_engine import (
    calculate_sle,
    convert_exploitability_score_to_multiplier,
    calculate_aro,
    calculate_ale,
    calculate_qualitative_score,
    calculate_multi_control_residual_factor,
    calculate_risk_loss_after,
    RiskQuantificationEngine,
    RiskQuantificationResult,
)


@pytest.fixture
def db_session():
    """In-memory SQLite database session fixture."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# 1. SLE Calculation Test
def test_sle_calculation():
    # Benchmark: Asset BV = 200,000,000 (20 Cr), EF = 0.80 -> SLE = 160,000,000
    sle = calculate_sle(200000000.0, 0.80)
    assert sle == 160000000.0

    # Boundary: EF = 0 -> SLE = 0
    assert calculate_sle(100000.0, 0.0) == 0.0

    # Boundary: EF = 1.0 -> SLE = BV
    assert calculate_sle(50000.0, 1.0) == 50000.0


# 2. ARO Calculation Test
def test_aro_calculation():
    # Benchmark: Base Prob = 0.45, Multiplier = 1.39 -> ARO = 0.6255
    aro = calculate_aro(0.45, 1.39)
    assert pytest.approx(aro, abs=1e-6) == 0.6255

    # Direct asset default multiplier = 1.0
    assert calculate_aro(0.35) == 0.35


# 3. ALE Calculation Test
def test_ale_calculation():
    # Benchmark: SLE = 135,000,000, ARO = 0.6255 -> ALE = 84,442,500
    ale = calculate_ale(135000000.0, 0.6255)
    assert pytest.approx(ale, abs=1e-2) == 84442500.0


# 4. 5x5 Qualitative Scoring Test
def test_qualitative_scoring():
    # Range 1 to 25 benchmark cases
    assert calculate_qualitative_score(1, 1) == 1
    assert calculate_qualitative_score(4, 5) == 20
    assert calculate_qualitative_score(5, 5) == 25
    assert calculate_qualitative_score(3, 4) == 12


# 5. Exploitability Score to Multiplier Conversion Test
def test_exploitability_score_to_multiplier_conversion():
    # None (direct asset risk) -> 1.0
    assert convert_exploitability_score_to_multiplier(None) == 1.0

    # Score = 3.9 -> 1.0 + 3.9/10.0 = 1.39
    assert pytest.approx(convert_exploitability_score_to_multiplier(3.9), abs=1e-6) == 1.39

    # Score = 2.8 -> 1.0 + 2.8/10.0 = 1.28
    assert pytest.approx(convert_exploitability_score_to_multiplier(2.8), abs=1e-6) == 1.28

    # Score = 0.0 -> 1.0
    assert convert_exploitability_score_to_multiplier(0.0) == 1.0

    # Score = 10.0 -> 2.0
    assert convert_exploitability_score_to_multiplier(10.0) == 2.0


# 6. Vulnerability-Based Risk Resolution Test
def test_vulnerability_based_risk_resolution(db_session):
    org = Organization(name="TestOrg", annual_revenue=1e8, cybersecurity_budget=1e6)
    db_session.add(org)
    db_session.flush()

    asset = Asset(
        organization_id=org.organization_id,
        name="API Gateway",
        asset_type="Web Server",
        business_value=150000000.0,
        cpe_vendor="apache",
        cpe_product="http_server",
        installed_version="2.4.49",
    )
    vuln = Vulnerability(cve_id="CVE-2021-41773", cvss_score=9.8, exploitability_score=3.9)
    db_session.add_all([asset, vuln])
    db_session.flush()

    finding = AssetVulnerabilityFinding(
        asset_id=asset.asset_id,
        vulnerability_id=vuln.vulnerability_id,
        matched_cpe="cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
        matched_version="2.4.49",
        confidence="VERIFIED",
    )
    threat = Threat(name="Web Attack", category="Web", base_probability=0.45)
    db_session.add_all([finding, threat])
    db_session.flush()

    risk = Risk(
        finding_id=finding.finding_id,
        asset_id=None,  # XOR: finding present -> asset_id None
        threat_id=threat.threat_id,
        likelihood=4,
        impact=5,
        exposure_factor=0.90,
    )
    db_session.add(risk)
    db_session.commit()

    res = RiskQuantificationEngine.quantify_risk(risk)
    assert res.asset_business_value == 150000000.0
    assert res.sle == 135000000.0
    assert pytest.approx(res.exploitability_multiplier, abs=1e-6) == 1.39
    assert pytest.approx(res.aro, abs=1e-6) == 0.6255
    assert pytest.approx(res.ale, abs=1e-2) == 84442500.0
    assert res.qualitative_score == 20


# 7. Direct Asset-Based Risk Resolution Test
def test_direct_asset_based_risk_resolution(db_session):
    org = Organization(name="TestOrg2", annual_revenue=1e8, cybersecurity_budget=1e6)
    db_session.add(org)
    db_session.flush()

    asset = Asset(
        organization_id=org.organization_id,
        name="Cloud Infra",
        asset_type="Cloud Environment",
        business_value=100000000.0,
        cpe_vendor="amazon",
        cpe_product="aws",
    )
    threat = Threat(name="Cloud Misconfig", category="Cloud", base_probability=0.40)
    db_session.add_all([asset, threat])
    db_session.flush()

    risk = Risk(
        finding_id=None,  # XOR: direct asset risk
        asset_id=asset.asset_id,
        threat_id=threat.threat_id,
        likelihood=3,
        impact=4,
        exposure_factor=0.75,
    )
    db_session.add(risk)
    db_session.commit()

    res = RiskQuantificationEngine.quantify_risk(risk)
    assert res.asset_business_value == 100000000.0
    assert res.sle == 75000000.0
    assert res.exploitability_multiplier == 1.0  # Direct asset deterministic default
    assert res.aro == 0.40
    assert res.ale == 30000000.0
    assert res.qualitative_score == 12


# 8. Empty Control Portfolio Test
def test_empty_control_portfolio():
    factor = calculate_multi_control_residual_factor([])
    assert factor == 1.0
    loss_before = 50000.0
    loss_after = calculate_risk_loss_after(loss_before, factor)
    assert loss_after == loss_before


# 9. One-Control Mitigation Test
def test_one_control_mitigation():
    # Control effectiveness 0.75 -> Residual factor = 1 - 0.75 = 0.25
    factor = calculate_multi_control_residual_factor([0.75])
    assert factor == 0.25
    loss_after = calculate_risk_loss_after(100.0, factor)
    assert loss_after == 25.0


# 10. Multiple-Control Multiplicative Mitigation Test
def test_multiple_control_multiplicative_mitigation():
    # Controls with effectiveness 0.75 and 0.60
    # Compounding residual factor = (1 - 0.75) * (1 - 0.60) = 0.25 * 0.40 = 0.10
    factor = calculate_multi_control_residual_factor([0.75, 0.60])
    assert pytest.approx(factor, abs=1e-6) == 0.10

    loss_before = 84442500.0
    loss_after = calculate_risk_loss_after(loss_before, factor)
    assert pytest.approx(loss_after, abs=1e-2) == 8444250.0


# 11. Effectiveness Boundary 0 Test
def test_effectiveness_boundary_zero():
    # Control effectiveness 0.0 -> factor 1.0 -> Loss unchanged
    factor = calculate_multi_control_residual_factor([0.0])
    assert factor == 1.0
    assert calculate_risk_loss_after(1000.0, factor) == 1000.0


# 12. Effectiveness Boundary 1 Test
def test_effectiveness_boundary_one():
    # Control effectiveness 1.0 -> factor 0.0 -> Loss zeroed
    factor = calculate_multi_control_residual_factor([1.0])
    assert factor == 0.0
    assert calculate_risk_loss_after(1000.0, factor) == 0.0


# 13. Invalid Inputs Rejection Test
def test_invalid_inputs_rejection():
    with pytest.raises(ValueError):
        calculate_sle(-100.0, 0.5)

    with pytest.raises(ValueError):
        calculate_sle(100.0, 1.5)

    with pytest.raises(ValueError):
        convert_exploitability_score_to_multiplier(11.0)

    with pytest.raises(ValueError):
        calculate_aro(-0.1)

    with pytest.raises(ValueError):
        calculate_qualitative_score(6, 3)

    with pytest.raises(ValueError):
        calculate_multi_control_residual_factor([1.2])


# 14. Idempotency & Determinism Test
def test_idempotency_and_determinism(db_session):
    run_seed(db_session)
    risks = db_session.query(Risk).all()

    res1 = RiskQuantificationEngine.quantify_all_risks(risks, selected_control_ids=[1, 2])
    res2 = RiskQuantificationEngine.quantify_all_risks(risks, selected_control_ids=[1, 2])

    assert len(res1) == len(res2)
    for r1, r2 in zip(res1, res2):
        assert r1.to_dict() == r2.to_dict()


# 15. Phase 4 Seeded Risks Mathematical Benchmark Test
def test_phase_4_seeded_risks_benchmarks(db_session):
    run_seed(db_session)

    risks = db_session.query(Risk).all()
    assert len(risks) == 5

    results = RiskQuantificationEngine.quantify_all_risks(risks)
    res_by_threat = {r.threat.name: res for r, res in zip(risks, results)}

    # Risk 1: Payment Gateway API (CVE-2021-41773) + Web App Exploitation
    r1 = res_by_threat["Web Application Exploitation"]
    assert r1.asset_business_value == 15000000.0
    assert r1.exposure_factor == 0.90
    assert r1.sle == 13500000.0
    assert pytest.approx(r1.exploitability_multiplier, abs=1e-6) == 1.39
    assert pytest.approx(r1.aro, abs=1e-6) == 0.6255
    assert pytest.approx(r1.ale, abs=1e-2) == 8444250.0
    assert r1.qualitative_score == 20

    # Risk 2: Core Banking DB (CVE-2022-1552) + Database Exfiltration
    r2 = res_by_threat["Database Exfiltration & Privilege Abuse"]
    assert r2.asset_business_value == 20000000.0
    assert r2.exposure_factor == 0.80
    assert r2.sle == 16000000.0
    assert pytest.approx(r2.exploitability_multiplier, abs=1e-6) == 1.28
    assert pytest.approx(r2.aro, abs=1e-6) == 0.32
    assert pytest.approx(r2.ale, abs=1e-2) == 5120000.0
    assert r2.qualitative_score == 15

    # Risk 3: Employee Workstations (CVE-2023-23397) + Phishing
    r3 = res_by_threat["Phishing & Credential Theft"]
    assert r3.asset_business_value == 5000000.0
    assert r3.exposure_factor == 0.60
    assert r3.sle == 3000000.0
    assert pytest.approx(r3.exploitability_multiplier, abs=1e-6) == 1.39
    assert pytest.approx(r3.aro, abs=1e-6) == 0.834
    assert pytest.approx(r3.ale, abs=1e-2) == 2502000.0
    assert r3.qualitative_score == 12

    # Risk 4: Direct Asset Risk on Employee Workstations + Ransomware
    r4 = res_by_threat["Ransomware / Extortion Attack"]
    assert r4.asset_business_value == 5000000.0
    assert r4.exposure_factor == 0.70
    assert r4.sle == 3500000.0
    assert r4.exploitability_multiplier == 1.0  # Direct asset risk
    assert pytest.approx(r4.aro, abs=1e-6) == 0.35
    assert pytest.approx(r4.ale, abs=1e-2) == 1225000.0
    assert r4.qualitative_score == 12

    # Risk 5: Direct Asset Risk on Cloud Infrastructure + Cloud Misconfig
    r5 = res_by_threat["Cloud Infrastructure Misconfiguration"]
    assert r5.asset_business_value == 10000000.0
    assert r5.exposure_factor == 0.75
    assert r5.sle == 7500000.0
    assert r5.exploitability_multiplier == 1.0  # Direct asset risk
    assert pytest.approx(r5.aro, abs=1e-6) == 0.40
    assert pytest.approx(r5.ale, abs=1e-2) == 3000000.0
    assert r5.qualitative_score == 12

    # Total Portfolio Loss Before Mitigation Benchmark
    total_ale_before = sum(res.loss_before for res in results)
    assert pytest.approx(total_ale_before, abs=1e-2) == 20291250.0  # ₹2.029125 Cr
