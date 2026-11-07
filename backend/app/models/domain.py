from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database.connection import Base


class Organization(Base):
    """
    Organization Entity (3NF / BCNF)
    Determinant: organization_id -> name, industry, organization_size, annual_revenue, cybersecurity_budget
    """
    __tablename__ = "organizations"

    organization_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    industry = Column(String(100), nullable=True)
    organization_size = Column(String(50), nullable=True)
    annual_revenue = Column(Float, nullable=False, default=0.0)
    cybersecurity_budget = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="organization", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="organization", cascade="all, delete-orphan")
    snapshots = relationship("RiskAssessmentSnapshot", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    """
    User Entity (3NF / BCNF)
    Determinants: user_id, email -> organization_id, name, password_hash, role
    """
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.organization_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="analyst")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    organization = relationship("Organization", back_populates="users")


class Asset(Base):
    """
    Asset Entity (3NF / BCNF)
    Determinant: asset_id -> organization_id, name, asset_type, business_value, cpe details, criticality
    """
    __tablename__ = "assets"

    asset_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.organization_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)
    business_value = Column(Float, nullable=False, default=0.0)
    cpe_vendor = Column(String(100), nullable=True)
    cpe_product = Column(String(100), nullable=True)
    installed_version = Column(String(50), nullable=True)
    criticality = Column(String(50), nullable=False, default="MEDIUM")
    exposure_level = Column(Float, nullable=False, default=1.0)

    # Relationships
    organization = relationship("Organization", back_populates="assets")
    findings = relationship("AssetVulnerabilityFinding", back_populates="asset", cascade="all, delete-orphan")
    direct_risks = relationship("Risk", back_populates="direct_asset", cascade="all, delete-orphan")


class Vulnerability(Base):
    """
    Public Vulnerability Entity (3NF / BCNF)
    Determinants: vulnerability_id, cve_id -> description, cvss_score, exploitability_score, cisa_kev_listed
    """
    __tablename__ = "vulnerabilities"
    __table_args__ = (
        CheckConstraint("cvss_score >= 0 AND cvss_score <= 10", name="chk_vuln_cvss_score_range"),
        CheckConstraint("exploitability_score >= 0 AND exploitability_score <= 10", name="chk_vuln_exploitability_range"),
    )

    vulnerability_id = Column(Integer, primary_key=True, autoincrement=True)
    cve_id = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cvss_score = Column(Float, nullable=False, default=0.0)
    exploitability_score = Column(Float, nullable=False, default=1.0)
    cisa_kev_listed = Column(Boolean, nullable=False, default=False)
    published_date = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    cpe_criteria = relationship("VulnerabilityCPE", back_populates="vulnerability", cascade="all, delete-orphan")
    findings = relationship("AssetVulnerabilityFinding", back_populates="vulnerability", cascade="all, delete-orphan")


class VulnerabilityCPE(Base):
    """
    Vulnerability CPE Criteria Entity (3NF / BCNF)
    Determinant: vulnerability_cpe_id -> vulnerability_id, cpe_criteria, version limits
    """
    __tablename__ = "vulnerability_cpes"

    vulnerability_cpe_id = Column(Integer, primary_key=True, autoincrement=True)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.vulnerability_id", ondelete="CASCADE"), nullable=False, index=True)
    cpe_criteria = Column(String(255), nullable=False)
    version_start_including = Column(String(50), nullable=True)
    version_end_excluding = Column(String(50), nullable=True)
    vulnerable = Column(Boolean, nullable=False, default=True)

    # Relationship
    vulnerability = relationship("Vulnerability", back_populates="cpe_criteria")


class AssetVulnerabilityFinding(Base):
    """
    Verified Asset-Vulnerability Finding Provenance Table (3NF / BCNF)
    Determinants: finding_id, (asset_id, vulnerability_id) -> matched_cpe, confidence, evidence
    """
    __tablename__ = "asset_vulnerability_findings"
    __table_args__ = (
        UniqueConstraint("asset_id", "vulnerability_id", name="uq_asset_vulnerability"),
    )

    finding_id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    vulnerability_id = Column(Integer, ForeignKey("vulnerabilities.vulnerability_id", ondelete="CASCADE"), nullable=False, index=True)
    matched_cpe = Column(String(255), nullable=False)
    matched_version = Column(String(50), nullable=False)
    confidence = Column(String(50), nullable=False, default="VERIFIED")
    source_name = Column(String(100), nullable=False, default="NVD")
    source_url = Column(String(500), nullable=True)
    evidence_summary = Column(Text, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="findings")
    vulnerability = relationship("Vulnerability", back_populates="findings")
    risks = relationship("Risk", back_populates="finding", cascade="all, delete-orphan")


class Threat(Base):
    """
    Threat Agent Entity (3NF / BCNF)
    Determinant: threat_id -> name, category, base_probability, severity
    """
    __tablename__ = "threats"
    __table_args__ = (
        CheckConstraint("base_probability >= 0 AND base_probability <= 1", name="chk_threat_base_probability_range"),
    )

    threat_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    base_probability = Column(Float, nullable=False, default=0.1)
    severity = Column(String(50), nullable=False, default="MEDIUM")
    mitre_technique_id = Column(String(50), nullable=True)

    # Relationship
    risks = relationship("Risk", back_populates="threat")


class Risk(Base):
    """
    Risk Triad Entity with Exclusive XOR Provenance Rule (3NF / BCNF)
    Determinant: risk_id -> finding_id, asset_id, threat_id, likelihood, impact, exposure_factor
    Constraint: Exactly one of finding_id OR asset_id MUST be populated.
    """
    __tablename__ = "risks"
    __table_args__ = (
        CheckConstraint(
            "((finding_id IS NOT NULL AND asset_id IS NULL) OR (finding_id IS NULL AND asset_id IS NOT NULL))",
            name="chk_exclusive_asset_provenance",
        ),
        CheckConstraint("likelihood >= 1 AND likelihood <= 5", name="chk_risk_likelihood_range"),
        CheckConstraint("impact >= 1 AND impact <= 5", name="chk_risk_impact_range"),
        CheckConstraint("exposure_factor >= 0 AND exposure_factor <= 1", name="chk_risk_exposure_factor_range"),
    )

    risk_id = Column(Integer, primary_key=True, autoincrement=True)
    finding_id = Column(Integer, ForeignKey("asset_vulnerability_findings.finding_id", ondelete="CASCADE"), nullable=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=True, index=True)
    threat_id = Column(Integer, ForeignKey("threats.threat_id", ondelete="RESTRICT"), nullable=False, index=True)
    likelihood = Column(Integer, nullable=False, default=3)
    impact = Column(Integer, nullable=False, default=3)
    exposure_factor = Column(Float, nullable=False, default=1.0)
    status = Column(String(50), nullable=False, default="ACTIVE")

    # Relationships
    finding = relationship("AssetVulnerabilityFinding", back_populates="risks")
    direct_asset = relationship("Asset", back_populates="direct_risks")
    threat = relationship("Threat", back_populates="risks")
    controls = relationship("RiskControl", back_populates="risk", cascade="all, delete-orphan")

    @property
    def resolved_asset(self):
        """Returns the associated Asset, resolved either through finding provenance or direct asset link."""
        if self.finding:
            return self.finding.asset
        return self.direct_asset


class SecurityControl(Base):
    """
    Security Control Entity (3NF / BCNF)
    Determinant: control_id -> name, category, nist_function, cost details, coverage
    """
    __tablename__ = "security_controls"
    __table_args__ = (
        CheckConstraint("coverage >= 0 AND coverage <= 1", name="chk_control_coverage_range"),
        CheckConstraint("implementation_cost >= 0", name="chk_control_implementation_cost_non_negative"),
        CheckConstraint("maintenance_cost >= 0", name="chk_control_maintenance_cost_non_negative"),
    )

    control_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    nist_function = Column(String(50), nullable=False, default="PROTECT")
    implementation_cost = Column(Float, nullable=False, default=0.0)
    maintenance_cost = Column(Float, nullable=False, default=0.0)
    coverage = Column(Float, nullable=False, default=1.0)

    # Relationships
    risks = relationship("RiskControl", back_populates="control", cascade="all, delete-orphan")
    result_allocations = relationship("OptimizationResultControl", back_populates="control")


class RiskControl(Base):
    """
    Risk-Control Associative Entity with Composite Primary Key (BCNF)
    Determinant: (risk_id, control_id) -> effectiveness_against_risk
    """
    __tablename__ = "risk_controls"
    __table_args__ = (
        CheckConstraint("effectiveness_against_risk >= 0 AND effectiveness_against_risk <= 1", name="chk_rc_effectiveness_range"),
    )

    risk_id = Column(Integer, ForeignKey("risks.risk_id", ondelete="CASCADE"), primary_key=True)
    control_id = Column(Integer, ForeignKey("security_controls.control_id", ondelete="CASCADE"), primary_key=True)
    effectiveness_against_risk = Column(Float, nullable=False, default=0.5)

    # Relationships
    risk = relationship("Risk", back_populates="controls")
    control = relationship("SecurityControl", back_populates="risks")


class Scenario(Base):
    """
    Investment Scenario Entity (3NF / BCNF)
    Determinant: scenario_id -> organization_id, name, available_budget, created_at
    """
    __tablename__ = "scenarios"

    scenario_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.organization_id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    available_budget = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="scenarios")
    optimization_results = relationship("OptimizationResult", back_populates="scenario", cascade="all, delete-orphan")


class OptimizationResult(Base):
    """
    Optimization Execution Result Snapshot (3NF / BCNF)
    Determinant: result_id -> scenario_id, total_investment, loss before/after, roi
    """
    __tablename__ = "optimization_results"

    result_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.scenario_id", ondelete="CASCADE"), nullable=False, index=True)
    total_investment = Column(Float, nullable=False, default=0.0)
    expected_loss_before = Column(Float, nullable=False, default=0.0)
    expected_loss_after = Column(Float, nullable=False, default=0.0)
    risk_reduction = Column(Float, nullable=False, default=0.0)
    residual_risk = Column(Float, nullable=False, default=0.0)
    roi = Column(Float, nullable=False, default=0.0)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    scenario = relationship("Scenario", back_populates="optimization_results")
    selected_controls = relationship("OptimizationResultControl", back_populates="result", cascade="all, delete-orphan")


class OptimizationResultControl(Base):
    """
    Optimization Selected Control Allocation Associative Table (BCNF)
    Determinant: (result_id, control_id) -> allocated_cost
    """
    __tablename__ = "optimization_result_controls"

    result_id = Column(Integer, ForeignKey("optimization_results.result_id", ondelete="CASCADE"), primary_key=True)
    control_id = Column(Integer, ForeignKey("security_controls.control_id", ondelete="RESTRICT"), primary_key=True)
    allocated_cost = Column(Float, nullable=False, default=0.0)

    # Relationships
    result = relationship("OptimizationResult", back_populates="selected_controls")
    control = relationship("SecurityControl", back_populates="result_allocations")


class RiskAssessmentSnapshot(Base):
    """
    Risk Assessment Portfolio Snapshot Entity (3NF / BCNF)
    Determinant: snapshot_id -> organization_id, total_ale_before, total_ale_after, snapshot_date
    """
    __tablename__ = "risk_assessment_snapshots"

    snapshot_id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organizations.organization_id", ondelete="CASCADE"), nullable=False, index=True)
    total_ale_before = Column(Float, nullable=False, default=0.0)
    total_ale_after = Column(Float, nullable=False, default=0.0)
    snapshot_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    organization = relationship("Organization", back_populates="snapshots")
