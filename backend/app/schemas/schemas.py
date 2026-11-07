from datetime import datetime
from typing import List, Optional, Tuple
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# ==========================================
# Organization Schemas
# ==========================================
class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    organization_size: Optional[str] = Field(None, max_length=50)
    annual_revenue: float = Field(default=0.0, ge=0.0)
    cybersecurity_budget: float = Field(default=0.0, ge=0.0)


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationResponse(OrganizationBase):
    organization_id: int
    created_at: datetime
    is_demo: bool = False
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# User Schemas
# ==========================================
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    role: str = Field(default="analyst", max_length=50)


class UserCreate(UserBase):
    organization_id: Optional[int] = None
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(UserBase):
    user_id: int
    organization_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    organization_name: Optional[str] = Field(None, max_length=255)
    organization_id: Optional[int] = None
    industry: Optional[str] = Field(None, max_length=100)
    organization_size: Optional[str] = Field(None, max_length=50)
    annual_revenue: Optional[float] = Field(None, ge=0.0)
    cybersecurity_budget: Optional[float] = Field(None, ge=0.0)
    role: Optional[str] = Field(default="analyst", max_length=50)


class UserLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    organization_size: Optional[str] = Field(None, max_length=50)
    annual_revenue: Optional[float] = Field(None, ge=0.0)
    cybersecurity_budget: Optional[float] = Field(None, ge=0.0)


# ==========================================
# Asset Schemas
# ==========================================
class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: str = Field(..., min_length=1, max_length=100)
    business_value: float = Field(default=0.0, ge=0.0)
    cpe_vendor: Optional[str] = Field(None, max_length=100)
    cpe_product: Optional[str] = Field(None, max_length=100)
    installed_version: Optional[str] = Field(None, max_length=50)
    criticality: str = Field(default="MEDIUM", max_length=50)
    exposure_level: float = Field(default=1.0, ge=0.0, le=1.0)


class AssetCreate(AssetBase):
    organization_id: Optional[int] = None


class AssetResponse(AssetBase):
    asset_id: int
    organization_id: int
    model_config = ConfigDict(from_attributes=True)


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    asset_type: Optional[str] = Field(None, min_length=1, max_length=100)
    business_value: Optional[float] = Field(None, ge=0.0)
    cpe_vendor: Optional[str] = Field(None, max_length=100)
    cpe_product: Optional[str] = Field(None, max_length=100)
    installed_version: Optional[str] = Field(None, max_length=50)
    criticality: Optional[str] = Field(None, max_length=50)
    exposure_level: Optional[float] = Field(None, ge=0.0, le=1.0)


# ==========================================
# Vulnerability Schemas
# ==========================================
class VulnerabilityCPEBase(BaseModel):
    cpe_criteria: str = Field(..., min_length=1, max_length=255)
    version_start_including: Optional[str] = Field(None, max_length=50)
    version_end_excluding: Optional[str] = Field(None, max_length=50)
    vulnerable: bool = True


class VulnerabilityCPECreate(VulnerabilityCPEBase):
    vulnerability_id: int


class VulnerabilityCPEResponse(VulnerabilityCPEBase):
    vulnerability_cpe_id: int
    vulnerability_id: int
    model_config = ConfigDict(from_attributes=True)


class VulnerabilityBase(BaseModel):
    cve_id: str = Field(..., min_length=5, max_length=50)
    description: Optional[str] = None
    cvss_score: float = Field(default=0.0, ge=0.0, le=10.0)
    exploitability_score: float = Field(default=1.0, ge=0.0, le=10.0)
    cisa_kev_listed: bool = False
    published_date: Optional[datetime] = None


class VulnerabilityCreate(VulnerabilityBase):
    pass


class VulnerabilityResponse(VulnerabilityBase):
    vulnerability_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Asset Vulnerability Finding Schemas (Provenance)
# ==========================================
class FindingBase(BaseModel):
    matched_cpe: str = Field(..., min_length=1, max_length=255)
    matched_version: str = Field(..., min_length=1, max_length=50)
    confidence: str = Field(default="VERIFIED", max_length=50)
    source_name: str = Field(default="NVD", max_length=100)
    source_url: Optional[str] = Field(None, max_length=500)
    evidence_summary: Optional[str] = None


class FindingCreate(FindingBase):
    asset_id: int
    vulnerability_id: int


class FindingResponse(FindingBase):
    finding_id: int
    asset_id: int
    vulnerability_id: int
    retrieved_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Threat Schemas
# ==========================================
class ThreatBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    base_probability: float = Field(default=0.1, ge=0.0, le=1.0)
    severity: str = Field(default="MEDIUM", max_length=50)
    mitre_technique_id: Optional[str] = Field(None, max_length=50)


class ThreatCreate(ThreatBase):
    pass


class ThreatResponse(ThreatBase):
    threat_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Risk Schemas (With Exclusive XOR Validation)
# ==========================================
class RiskBase(BaseModel):
    finding_id: Optional[int] = None
    asset_id: Optional[int] = None
    threat_id: int
    likelihood: int = Field(default=3, ge=1, le=5)
    impact: int = Field(default=3, ge=1, le=5)
    exposure_factor: float = Field(default=1.0, ge=0.0, le=1.0)
    status: str = Field(default="ACTIVE", max_length=50)

    @model_validator(mode="after")
    def validate_xor_provenance(self):
        """Enforces that exactly one of finding_id OR asset_id must be populated."""
        has_finding = self.finding_id is not None
        has_asset = self.asset_id is not None
        if not (has_finding ^ has_asset):
            raise ValueError("Risk must reference either finding_id OR asset_id, but not both or neither.")
        return self


class RiskCreate(RiskBase):
    pass


class RiskResponse(RiskBase):
    risk_id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Security Control & RiskControl Schemas
# ==========================================
class SecurityControlBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    nist_function: str = Field(default="PROTECT", max_length=50)
    implementation_cost: float = Field(default=0.0, ge=0.0)
    maintenance_cost: float = Field(default=0.0, ge=0.0)
    coverage: float = Field(default=1.0, ge=0.0, le=1.0)


class SecurityControlCreate(SecurityControlBase):
    pass


class SecurityControlResponse(SecurityControlBase):
    control_id: int
    model_config = ConfigDict(from_attributes=True)


class RiskControlBase(BaseModel):
    risk_id: int
    control_id: int
    effectiveness_against_risk: float = Field(default=0.5, ge=0.0, le=1.0)


class RiskControlCreate(RiskControlBase):
    pass


class RiskControlResponse(RiskControlBase):
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Scenario & Optimization Result Schemas
# ==========================================
class ScenarioBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    available_budget: float = Field(default=0.0, ge=0.0)


class ScenarioCreate(ScenarioBase):
    organization_id: Optional[int] = None


class ScenarioResponse(ScenarioBase):
    scenario_id: int
    organization_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class OptimizationResultControlBase(BaseModel):
    result_id: int
    control_id: int
    allocated_cost: float = Field(default=0.0, ge=0.0)


class OptimizationResultControlResponse(OptimizationResultControlBase):
    model_config = ConfigDict(from_attributes=True)


class OptimizationResultBase(BaseModel):
    scenario_id: int
    total_investment: float = Field(default=0.0, ge=0.0)
    expected_loss_before: float = Field(default=0.0, ge=0.0)
    expected_loss_after: float = Field(default=0.0, ge=0.0)
    risk_reduction: float = Field(default=0.0, ge=0.0)
    residual_risk: float = Field(default=0.0, ge=0.0)
    roi: float = Field(default=0.0)


class OptimizationResultResponse(OptimizationResultBase):
    result_id: int
    calculated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RiskAssessmentSnapshotBase(BaseModel):
    organization_id: int
    total_ale_before: float = Field(default=0.0, ge=0.0)
    total_ale_after: float = Field(default=0.0, ge=0.0)


class RiskAssessmentSnapshotResponse(RiskAssessmentSnapshotBase):
    snapshot_id: int
    snapshot_date: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# API Calculation & Engine Request Schemas
# ==========================================
class RiskCalculateRequest(BaseModel):
    selected_control_ids: Optional[List[int]] = None


class SimulationRunRequest(BaseModel):
    number_of_simulations: int = Field(default=10000, gt=0)
    random_seed: Optional[int] = 42
    use_residual: bool = False
    selected_control_ids: Optional[List[int]] = None
    severity_distribution: str = Field(default="lognormal", max_length=50)


class OptimizationRunRequest(BaseModel):
    scenario_id: Optional[int] = None
    available_budget: Optional[float] = Field(default=None, ge=0.0)
    mandatory_control_ids: Optional[List[int]] = None
    dependencies: Optional[List[Tuple[int, int]]] = None
