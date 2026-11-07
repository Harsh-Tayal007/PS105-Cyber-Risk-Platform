"""
Database Seeding Script for Synthetic Demonstration Dataset (PS105 Phase 4).

Populates reproducible, deterministic seed data for synthetic organization:
"ABC Financial Services"

Distinguishes:
1. PUBLIC FACTS: Real public CVE IDs, CVSS scores, CPE criteria, CISA KEV flags.
2. SYNTHETIC DATA: Assets, business values, threats, risks, security controls,
   implementation costs, risk-control effectiveness, and investment scenarios.

Idempotency:
Executing this module multiple times will update existing entries without creating
duplicate rows or violating unique database constraints.
"""

import sys
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session

# Ensure backend root is in sys.path when executed directly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database.connection import engine, SessionLocal, Base
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
from app.services.vulnerability_intelligence import VulnerabilityIntelligenceService
from app.services.finding_service import FindingService


def seed_public_vulnerability_intelligence(db: Session) -> dict:
    """
    Ingests a small, curated set of REAL public vulnerabilities from official sources.
    
    Public Facts Used:
    - CVE-2021-41773: Apache HTTP Server 2.4.49 Path Traversal.
      NVD Primary CVSS is 7.5; CISA-ADP assessed CVSS is 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H).
      Data uses CVSS 9.8 (CISA-ADP) for weaponized active exploitation. CISA KEV Listed.
      Source: NVD / NIST (https://nvd.nist.gov/vuln/detail/CVE-2021-41773). Checked: 2024-11.
    - CVE-2022-1552: PostgreSQL Autovacuum & Security Bypass (CVSS 8.8).
      Not listed in CISA KEV catalogue as of 2024-11 check on cisa.gov/known-exploited-vulnerabilities-catalog.
      cisa_kev_listed is set to False per authoritative catalogue.
      Source: NVD / NIST (https://nvd.nist.gov/vuln/detail/CVE-2022-1552). Checked: 2024-11.
    - CVE-2023-23397: Microsoft Outlook Elevation of Privilege (CVSS 9.8, CISA KEV Listed)
      Source: NVD / NIST (https://nvd.nist.gov/vuln/detail/CVE-2023-23397). Checked: 2024-11.
    """
    real_cve_data = [
        {
            "cve_id": "CVE-2021-41773",
            "description": "A flaw was found in a change made to path normalization in Apache HTTP Server 2.4.49. An attacker could use a path traversal attack to map URLs to files outside the directories configured by Alias-like directives. If files outside of these directories are not protected by the usual default configuration 'require all denied', these requests can succeed. If CGI scripts are also enabled for these aliased pathes, this could allow for remote code execution. This issue is known to be exploited in the wild. This issue only affects Apache 2.4.49 and not earlier versions.",
            "cvss_score": 9.8,
            "exploitability_score": 3.9,
            "cisa_kev_listed": True,
            "published_date": "2021-10-05T00:00:00Z",
            "cpe_criteria": [
                {
                    "cpe_criteria": "cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*",
                    "version_start_including": "2.4.49",
                    "version_end_excluding": "2.4.50",
                    "vulnerable": True,
                }
            ],
        },
        {
            "cve_id": "CVE-2022-1552",
            "description": "A flaw was found in PostgreSQL. There is an issue with incomplete efforts to operate safely when a privileged user is maintaining another user's objects. The Autovacuum, REINDEX, CREATE INDEX, REFRESH MATERIALIZED VIEW, CLUSTER, and pg_amcheck commands activated relevant protections too late or not at all during the process. This flaw allows an attacker with permission to create non-temporary objects in at least one schema to execute arbitrary SQL functions under a superuser identity.",
            "cvss_score": 8.8,
            "exploitability_score": 2.8,
            "cisa_kev_listed": False,
            "published_date": "2022-05-11T00:00:00Z",
            "cpe_criteria": [
                {
                    "cpe_criteria": "cpe:2.3:a:postgresql:postgresql:*:*:*:*:*:*:*:*",
                    "version_start_including": "14.0",
                    "version_end_excluding": "14.3",
                    "vulnerable": True,
                }
            ],
        },
        {
            "cve_id": "CVE-2023-23397",
            "description": "Microsoft Outlook Elevation of Privilege Vulnerability",
            "cvss_score": 9.8,
            "exploitability_score": 3.9,
            "cisa_kev_listed": True,
            "published_date": "2023-03-14T00:00:00Z",
            "cpe_criteria": [
                {
                    "cpe_criteria": "cpe:2.3:a:microsoft:outlook:2016:*:*:*:*:*:*:*",
                    "version_start_including": None,
                    "version_end_excluding": None,
                    "vulnerable": True,
                }
            ],
        },
    ]

    res = VulnerabilityIntelligenceService.import_cve_records(db, real_cve_data)
    
    # Also explicitly process CISA KEV records (only for verified CISA KEV CVEs)
    kev_list = [
        {"cve_id": "CVE-2021-41773"},
        {"cve_id": "CVE-2023-23397"},
    ]
    VulnerabilityIntelligenceService.import_cisa_kev_records(db, kev_list)
    return res


def seed_synthetic_organization_and_assets(db: Session) -> Organization:
    """
    Creates or updates synthetic demonstration entity: ABC Financial Services.
    
    Synthetic Demonstration Assumptions:
    - Annual Revenue: ₹50,00,00,000 (₹50 Cr)
    - Cybersecurity Budget: ₹25,00,000 (₹25 Lakh)
    """
    org_name = "ABC Financial Services"
    org = db.query(Organization).filter(Organization.name == org_name).first()

    if not org:
        org = Organization(
            name=org_name,
            industry="Financial Services",
            organization_size="Enterprise",
            annual_revenue=500000000.0,      # ₹50 Cr
            cybersecurity_budget=2500000.0,    # ₹25 Lakh
        )
        db.add(org)
        db.flush()
    else:
        org.industry = "Financial Services"
        org.organization_size = "Enterprise"
        org.annual_revenue = 500000000.0
        org.cybersecurity_budget = 2500000.0

    # Ensure demonstration users exist with valid bcrypt password hash
    import os
    env = os.getenv("ENV", "development")
    demo_password = os.getenv("DEMO_USER_PASSWORD")
    if not demo_password:
        if env == "production":
            raise RuntimeError("DEMO_USER_PASSWORD environment variable must be set in production.")
        demo_password = "password123"

    from app.services.auth_service import get_password_hash
    demo_password_hash = get_password_hash(demo_password)

    demo_users_data = [
        {
            "email": "ciso@abcfinancial.com",
            "name": "CISO Administrator",
            "role": "ciso",
        },
        {
            "email": "admin@abcfinancial.com",
            "name": "Admin User",
            "role": "ciso",
        },
    ]

    for u_data in demo_users_data:
        user = db.query(User).filter(User.email == u_data["email"]).first()
        if not user:
            user = User(
                organization_id=org.organization_id,
                name=u_data["name"],
                email=u_data["email"],
                password_hash=demo_password_hash,
                role=u_data["role"],
            )
            db.add(user)
        else:
            user.organization_id = org.organization_id
            user.name = u_data["name"]
            user.role = u_data["role"]
            # Do NOT reset password_hash for existing user on re-seed

    # 4 Synthetic Assets (Scaled by 0.1 for realistic 4% baseline ALE vs revenue)
    assets_data = [
        {
            "name": "Core Banking DB",
            "asset_type": "Database Server",
            "business_value": 20000000.0,    # ₹2.0 Cr (scaled from ₹20 Cr)
            "cpe_vendor": "postgresql",
            "cpe_product": "postgresql",
            "installed_version": "14.2",
            "criticality": "CRITICAL",
            "exposure_level": 0.80,
        },
        {
            "name": "Payment Gateway API",
            "asset_type": "Web Server",
            "business_value": 15000000.0,    # ₹1.5 Cr (scaled from ₹15 Cr)
            "cpe_vendor": "apache",
            "cpe_product": "http_server",
            "installed_version": "2.4.49",
            "criticality": "HIGH",
            "exposure_level": 0.90,
        },
        {
            "name": "Employee Workstations",
            "asset_type": "Endpoint Fleet",
            "business_value": 5000000.0,     # ₹0.5 Cr (scaled from ₹5 Cr)
            "cpe_vendor": "microsoft",
            "cpe_product": "outlook",
            "installed_version": "2016",
            "criticality": "MEDIUM",
            "exposure_level": 0.60,
        },
        {
            "name": "Cloud Infrastructure",
            "asset_type": "Cloud Environment",
            "business_value": 10000000.0,    # ₹1.0 Cr (scaled from ₹10 Cr)
            "cpe_vendor": "amazon",
            "cpe_product": "aws",
            "installed_version": None,       # Intentionally missing version to demonstrate INSUFFICIENT_DATA
            "criticality": "HIGH",
            "exposure_level": 0.70,
        },
    ]

    for asset_dict in assets_data:
        asset = db.query(Asset).filter(
            Asset.organization_id == org.organization_id,
            Asset.name == asset_dict["name"],
        ).first()

        if not asset:
            asset = Asset(organization_id=org.organization_id, **asset_dict)
            db.add(asset)
        else:
            for k, v in asset_dict.items():
                setattr(asset, k, v)

    db.commit()
    return org


def seed_synthetic_threats(db: Session) -> dict:
    """
    Creates or updates synthetic threat catalogue appropriate for financial services.
    
    Synthetic Demonstration Assumptions:
    - Base probabilities and severities are model inputs for demonstration.
    """
    threats_data = [
        {
            "name": "Ransomware / Extortion Attack",
            "category": "Malware",
            "base_probability": 0.35,
            "severity": "HIGH",
            "mitre_technique_id": "T1486",
        },
        {
            "name": "Phishing & Credential Theft",
            "category": "Social Engineering",
            "base_probability": 0.60,
            "severity": "HIGH",
            "mitre_technique_id": "T1566",
        },
        {
            "name": "Web Application Exploitation",
            "category": "Web Exploitation",
            "base_probability": 0.45,
            "severity": "CRITICAL",
            "mitre_technique_id": "T1190",
        },
        {
            "name": "Database Exfiltration & Privilege Abuse",
            "category": "Insider / Exfiltration",
            "base_probability": 0.25,
            "severity": "HIGH",
            "mitre_technique_id": "T1078",
        },
        {
            "name": "Cloud Infrastructure Misconfiguration",
            "category": "Cloud Security",
            "base_probability": 0.40,
            "severity": "MEDIUM",
            "mitre_technique_id": "T1580",
        },
    ]

    threat_map = {}
    for threat_dict in threats_data:
        threat = db.query(Threat).filter(Threat.name == threat_dict["name"]).first()
        if not threat:
            threat = Threat(**threat_dict)
            db.add(threat)
            db.flush()
        else:
            for k, v in threat_dict.items():
                setattr(threat, k, v)
        threat_map[threat.name] = threat

    db.commit()
    return threat_map


def seed_synthetic_risks(db: Session, org_id: int, threat_map: dict) -> list:
    """
    Creates risk records linking verified vulnerability findings OR direct assets to threats.
    
    CRITICAL RULE: Replaces transitive dependencies and enforces exclusive XOR constraint:
    - Vulnerability-based risk: finding_id IS NOT NULL, asset_id IS NULL
    - Direct asset-based risk: finding_id IS NULL, asset_id IS NOT NULL
    """
    # Fetch verified findings generated by FindingService in Phase 3 matcher pass
    findings = (
        db.query(AssetVulnerabilityFinding)
        .join(Asset, AssetVulnerabilityFinding.asset_id == Asset.asset_id)
        .filter(Asset.organization_id == org_id)
        .all()
    )

    finding_by_asset_name = {}
    for f in findings:
        finding_by_asset_name[f.asset.name] = f

    assets = db.query(Asset).filter(Asset.organization_id == org_id).all()
    asset_by_name = {a.name: a for a in assets}

    risks = []

    # 1. Vulnerability Risk: Web Application Attack on Payment Gateway API
    pg_finding = finding_by_asset_name.get("Payment Gateway API")
    if pg_finding:
        web_threat = threat_map["Web Application Exploitation"]
        r1 = db.query(Risk).filter(Risk.finding_id == pg_finding.finding_id, Risk.threat_id == web_threat.threat_id).first()
        if not r1:
            r1 = Risk(
                finding_id=pg_finding.finding_id,
                asset_id=None,  # XOR: finding_id present -> asset_id MUST be None
                threat_id=web_threat.threat_id,
                likelihood=4,
                impact=5,
                exposure_factor=0.90,
                status="ACTIVE",
            )
            db.add(r1)
        risks.append(r1)

    # 2. Vulnerability Risk: DB Superuser Exploitation on Core Banking DB
    db_finding = finding_by_asset_name.get("Core Banking DB")
    if db_finding:
        db_threat = threat_map["Database Exfiltration & Privilege Abuse"]
        r2 = db.query(Risk).filter(Risk.finding_id == db_finding.finding_id, Risk.threat_id == db_threat.threat_id).first()
        if not r2:
            r2 = Risk(
                finding_id=db_finding.finding_id,
                asset_id=None,  # XOR: finding_id present -> asset_id MUST be None
                threat_id=db_threat.threat_id,
                likelihood=3,
                impact=5,
                exposure_factor=0.80,
                status="ACTIVE",
            )
            db.add(r2)
        risks.append(r2)

    # 3. Vulnerability Risk: Endpoint Infection on Employee Workstations via Outlook NTLM
    ws_finding = finding_by_asset_name.get("Employee Workstations")
    if ws_finding:
        phish_threat = threat_map["Phishing & Credential Theft"]
        r3 = db.query(Risk).filter(Risk.finding_id == ws_finding.finding_id, Risk.threat_id == phish_threat.threat_id).first()
        if not r3:
            r3 = Risk(
                finding_id=ws_finding.finding_id,
                asset_id=None,  # XOR: finding_id present -> asset_id MUST be None
                threat_id=phish_threat.threat_id,
                likelihood=4,
                impact=3,
                exposure_factor=0.60,
                status="ACTIVE",
            )
            db.add(r3)
        risks.append(r3)

    # 4. Direct Asset Risk: Ransomware Lateral Movement across Employee Workstations
    ws_asset = asset_by_name.get("Employee Workstations")
    if ws_asset:
        ransom_threat = threat_map["Ransomware / Extortion Attack"]
        r4 = db.query(Risk).filter(Risk.asset_id == ws_asset.asset_id, Risk.threat_id == ransom_threat.threat_id).first()
        if not r4:
            r4 = Risk(
                finding_id=None,  # XOR: asset_id present -> finding_id MUST be None
                asset_id=ws_asset.asset_id,
                threat_id=ransom_threat.threat_id,
                likelihood=3,
                impact=4,
                exposure_factor=0.70,
                status="ACTIVE",
            )
            db.add(r4)
        risks.append(r4)

    # 5. Direct Asset Risk: Cloud Account Compromise on Cloud Infrastructure
    cloud_asset = asset_by_name.get("Cloud Infrastructure")
    if cloud_asset:
        cloud_threat = threat_map["Cloud Infrastructure Misconfiguration"]
        r5 = db.query(Risk).filter(Risk.asset_id == cloud_asset.asset_id, Risk.threat_id == cloud_threat.threat_id).first()
        if not r5:
            r5 = Risk(
                finding_id=None,  # XOR: asset_id present -> finding_id MUST be None
                asset_id=cloud_asset.asset_id,
                threat_id=cloud_threat.threat_id,
                likelihood=3,
                impact=4,
                exposure_factor=0.75,
                status="ACTIVE",
            )
            db.add(r5)
        risks.append(r5)

    db.commit()
    return risks


def seed_synthetic_security_controls(db: Session) -> dict:
    """
    Creates or updates the exact 8 candidate controls required for the MILP optimization demonstration.
    
    Synthetic Demonstration Assumptions:
    - Costs and coverages are deterministic synthetic model inputs.
    - Total implementation + maintenance cost for all 8 controls = ₹46.75 Lakh.
    - Budget available in scenario = ₹25.00 Lakh.
    - This creates a realistic, non-trivial binary integer programming optimization problem.
    """
    controls_data = [
        {
            "name": "MFA",
            "category": "Identity & Access Control",
            "nist_function": "PROTECT",
            "implementation_cost": 300000.0,   # ₹3.0 Lakh
            "maintenance_cost": 50000.0,       # ₹0.5 Lakh (Total 3.5L)
            "coverage": 0.90,
        },
        {
            "name": "EDR",
            "category": "Endpoint Security",
            "nist_function": "DETECT",
            "implementation_cost": 500000.0,   # ₹5.0 Lakh
            "maintenance_cost": 100000.0,      # ₹1.0 Lakh (Total 6.0L)
            "coverage": 0.85,
        },
        {
            "name": "Immutable Backup",
            "category": "Data Resilience",
            "nist_function": "RECOVER",
            "implementation_cost": 600000.0,   # ₹6.0 Lakh
            "maintenance_cost": 150000.0,      # ₹1.5 Lakh (Total 7.5L)
            "coverage": 0.95,
        },
        {
            "name": "Security Training",
            "category": "Human Security",
            "nist_function": "PROTECT",
            "implementation_cost": 200000.0,   # ₹2.0 Lakh
            "maintenance_cost": 50000.0,       # ₹0.5 Lakh (Total 2.5L)
            "coverage": 0.75,
        },
        {
            "name": "SIEM",
            "category": "Security Operations & SOC",
            "nist_function": "DETECT",
            "implementation_cost": 800000.0,   # ₹8.0 Lakh
            "maintenance_cost": 200000.0,      # ₹2.0 Lakh (Total 10.0L)
            "coverage": 0.90,
        },
        {
            "name": "Firewall Upgrade",
            "category": "Network Security / WAF",
            "nist_function": "PROTECT",
            "implementation_cost": 450000.0,   # ₹4.5 Lakh
            "maintenance_cost": 75000.0,       # ₹0.75 Lakh (Total 5.25L)
            "coverage": 0.80,
        },
        {
            "name": "Pen Testing",
            "category": "Vulnerability Assessment",
            "nist_function": "IDENTIFY",
            "implementation_cost": 350000.0,   # ₹3.5 Lakh
            "maintenance_cost": 50000.0,       # ₹0.5 Lakh (Total 4.0L)
            "coverage": 0.70,
        },
        {
            "name": "Network Segmentation",
            "category": "Network Architecture",
            "nist_function": "PROTECT",
            "implementation_cost": 700000.0,   # ₹7.0 Lakh
            "maintenance_cost": 100000.0,      # ₹1.0 Lakh (Total 8.0L)
            "coverage": 0.85,
        },
    ]

    control_map = {}
    for ctrl_dict in controls_data:
        ctrl = db.query(SecurityControl).filter(SecurityControl.name == ctrl_dict["name"]).first()
        if not ctrl:
            ctrl = SecurityControl(**ctrl_dict)
            db.add(ctrl)
            db.flush()
        else:
            for k, v in ctrl_dict.items():
                setattr(ctrl, k, v)
        control_map[ctrl.name] = ctrl

    db.commit()
    return control_map


def seed_synthetic_risk_controls(db: Session, risks: list, control_map: dict):
    """
    Connects relevant candidate controls to risks with explainable effectiveness values (0 <= E <= 1).
    Keyed by (asset_name, threat_name) within the seeded organization only.
    
    Synthetic Demonstration Rationale:
    - MFA: High effectiveness against phishing & credential theft (0.80), cloud misconfig access (0.70).
    - EDR: High effectiveness against endpoint malware/ransomware (0.70), Outlook exploits (0.60).
    - Immutable Backup: High effectiveness against ransomware loss impact recovery (0.85).
    - Security Training: High effectiveness against phishing social engineering (0.65).
    - SIEM: Broad detection effectiveness across web, DB, endpoint, and cloud risks (0.40 - 0.60).
    - Firewall Upgrade (WAF): High effectiveness against web app exploitation (0.75).
    - Pen Testing: High effectiveness identifying web app and DB vulnerabilities (0.50 - 0.60).
    - Network Segmentation: High effectiveness containing DB attacks (0.70) and ransomware lateral movement (0.75).
    """
    # Key risks by (asset_name, threat_name) and threat_name strictly from the provided organization risks
    risk_by_key = {}
    for r in risks:
        asset_name = r.resolved_asset.name if r.resolved_asset else ""
        threat_name = r.threat.name if r.threat else ""
        risk_by_key[(asset_name, threat_name)] = r
        risk_by_key[threat_name] = r

    mappings = [
        # Risk: Web Application Exploitation (Payment Gateway API)
        ("Payment Gateway API", "Web Application Exploitation", "Firewall Upgrade", 0.75),
        ("Payment Gateway API", "Web Application Exploitation", "Pen Testing", 0.60),
        ("Payment Gateway API", "Web Application Exploitation", "SIEM", 0.40),

        # Risk: Database Exfiltration & Privilege Abuse (Core Banking DB)
        ("Core Banking DB", "Database Exfiltration & Privilege Abuse", "Network Segmentation", 0.70),
        ("Core Banking DB", "Database Exfiltration & Privilege Abuse", "SIEM", 0.50),
        ("Core Banking DB", "Database Exfiltration & Privilege Abuse", "Pen Testing", 0.50),

        # Risk: Phishing & Credential Theft (Employee Workstations)
        ("Employee Workstations", "Phishing & Credential Theft", "MFA", 0.80),
        ("Employee Workstations", "Phishing & Credential Theft", "Security Training", 0.65),
        ("Employee Workstations", "Phishing & Credential Theft", "EDR", 0.60),

        # Risk: Ransomware / Extortion Attack (Employee Workstations)
        ("Employee Workstations", "Ransomware / Extortion Attack", "Immutable Backup", 0.85),
        ("Employee Workstations", "Ransomware / Extortion Attack", "Network Segmentation", 0.75),
        ("Employee Workstations", "Ransomware / Extortion Attack", "EDR", 0.70),

        # Risk: Cloud Infrastructure Misconfiguration (Cloud Infrastructure)
        ("Cloud Infrastructure", "Cloud Infrastructure Misconfiguration", "MFA", 0.70),
        ("Cloud Infrastructure", "Cloud Infrastructure Misconfiguration", "SIEM", 0.60),
        ("Cloud Infrastructure", "Cloud Infrastructure Misconfiguration", "Firewall Upgrade", 0.50),
    ]

    for asset_name, threat_name, ctrl_name, effectiveness in mappings:
        risk = risk_by_key.get((asset_name, threat_name)) or risk_by_key.get(threat_name)
        ctrl = control_map.get(ctrl_name)
        if risk and ctrl:
            rc = db.query(RiskControl).filter(
                RiskControl.risk_id == risk.risk_id,
                RiskControl.control_id == ctrl.control_id,
            ).first()

            if not rc:
                rc = RiskControl(
                    risk_id=risk.risk_id,
                    control_id=ctrl.control_id,
                    effectiveness_against_risk=effectiveness,
                )
                db.add(rc)
            else:
                rc.effectiveness_against_risk = effectiveness

    db.commit()


def seed_synthetic_scenarios(db: Session, org_id: int) -> Scenario:
    """
    Creates the executive investment optimization scenario.
    
    Synthetic Demonstration Assumption:
    - Available Budget: ₹25,00,000 (₹25 Lakh)
    
    Note on Engine Capabilities:
    OptimizationProblemConfig supports prerequisite dependency constraints (e.g. Pen Testing
    as prerequisite before Network Segmentation) and regulatory mandatory controls (e.g. MFA = 1).
    In this primary demonstration scenario, the portfolio is solved unconstrained by dependencies.
    """
    scenario_name = "FY2026 Executive Budget Allocation Scenario"
    scenario = db.query(Scenario).filter(
        Scenario.organization_id == org_id,
        Scenario.name == scenario_name,
    ).first()

    if not scenario:
        scenario = Scenario(
            organization_id=org_id,
            name=scenario_name,
            available_budget=2500000.0,  # ₹25 Lakh
        )
        db.add(scenario)
    else:
        scenario.available_budget = 2500000.0

    db.commit()
    return scenario


def run_seed(db: Session) -> dict:
    """
    Main reproducible database seed entry point.
    Runs idempotently across all entities.
    """
    # 1. Public Vulnerability Intelligence (Real Facts)
    vuln_stats = seed_public_vulnerability_intelligence(db)

    # 2. Synthetic Organization & Assets
    org = seed_synthetic_organization_and_assets(db)

    # 3. Verified Findings via Phase 3 Applicability Engine
    findings = FindingService.scan_and_generate_findings(db, org.organization_id)

    # 4. Synthetic Threat Catalogue
    threat_map = seed_synthetic_threats(db)

    # 5. Synthetic Risks (XOR Compliant)
    risks = seed_synthetic_risks(db, org.organization_id, threat_map)

    # 6. Candidate Security Controls (Exact 8 Controls)
    control_map = seed_synthetic_security_controls(db)

    # 7. Risk-Control Effectiveness Relationships
    seed_synthetic_risk_controls(db, risks, control_map)

    # 8. Executive Optimization Scenario (₹25L Budget)
    scenario = seed_synthetic_scenarios(db, org.organization_id)

    # Analytical Validation & Threshold Assertion (Item 17)
    from app.engines.risk_engine import RiskQuantificationEngine
    from app.engines.optimization_engine import OptimizationEngine, OptimizationProblemConfig
    q_results = [RiskQuantificationEngine().quantify_risk(r) for r in risks]
    baseline_ale = sum(q.ale for q in q_results)
    ale_revenue_ratio = (baseline_ale / org.annual_revenue) if org.annual_revenue else 0.0

    r_ids = [r.risk_id for r in risks]
    rcs = db.query(RiskControl).filter(RiskControl.risk_id.in_(r_ids)).all() if r_ids else []
    opt_engine = OptimizationEngine()
    opt_res = opt_engine.optimize_portfolio(
        q_results,
        list(control_map.values()),
        rcs,
        OptimizationProblemConfig(available_budget=scenario.available_budget, run_exhaustive_validation=False),
    )
    spend = opt_res.total_investment
    net_rosi = ((opt_res.exact_risk_reduction - spend) / spend) if spend > 0 else 0.0

    print(f"\n[SEED VALIDATION] Baseline ALE: ₹{baseline_ale:,.2f}")
    print(f"[SEED VALIDATION] Annual Revenue: ₹{org.annual_revenue:,.2f}")
    print(f"[SEED VALIDATION] ALE / Revenue: {ale_revenue_ratio*100:.2f}% (Limit: 15.00%)")
    print(f"[SEED VALIDATION] Selected Controls: {', '.join(opt_res.selected_control_names)}")
    print(f"[SEED VALIDATION] Total Spend: ₹{spend:,.2f}")
    print(f"[SEED VALIDATION] Net ROSI: {net_rosi:.2f}× ({net_rosi*100:.1f}%)")

    if ale_revenue_ratio > 0.15:
        raise ValueError(
            f"Seed validation failed: ALE/Revenue ratio {ale_revenue_ratio*100:.2f}% exceeds 15% threshold."
        )

    return {
        "organization": org.name,
        "assets_count": len(org.assets),
        "vulnerabilities_ingested": vuln_stats["imported_cves"] + vuln_stats["updated_cves"],
        "findings_generated": len(findings),
        "threats_count": len(threat_map),
        "risks_count": len(risks),
        "controls_count": len(control_map),
        "scenario_budget": scenario.available_budget,
        "baseline_ale": baseline_ale,
        "ale_revenue_ratio": ale_revenue_ratio,
        "net_rosi": net_rosi,
    }


def main():
    """CLI execution entry point: python -m app.database.seed"""
    print("Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Executing Phase 4 Synthetic Demonstration Seeding...")
        summary = run_seed(db)
        print("\n--- Phase 4 Seed Summary ---")
        for k, v in summary.items():
            print(f"  {k}: {v}")
        print("Seeding Completed Successfully.")
    finally:
        session_close = getattr(db, "close", None)
        if session_close:
            session_close()


if __name__ == "__main__":
    main()
