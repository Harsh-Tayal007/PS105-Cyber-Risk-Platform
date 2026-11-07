/**
 * Complete Type Definitions matching FastAPI Pydantic v2 schemas
 */

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL';

// ==========================================
// Auth Schemas
// ==========================================
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  organization_name?: string;
  organization_id?: number;
  role?: string;
  industry?: string;
  organization_size?: string;
  annual_revenue?: number;
  cybersecurity_budget?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  user_id: number;
  name: string;
  email: string;
  role: string;
  organization_id: number;
  created_at: string;
}

// ==========================================
// Organization Schemas
// ==========================================
export interface OrganizationResponse {
  organization_id: number;
  name: string;
  industry?: string | null;
  organization_size?: string | null;
  annual_revenue: number;
  cybersecurity_budget: number;
  created_at: string;
  is_demo?: boolean;
}

export interface OrganizationUpdatePayload {
  name?: string;
  industry?: string;
  organization_size?: string;
  annual_revenue?: number;
  cybersecurity_budget?: number;
}

// ==========================================
// Asset Schemas
// ==========================================
export interface AssetResponse {
  asset_id: number;
  organization_id: number;
  name: string;
  asset_type: string;
  business_value: number;
  cpe_vendor?: string | null;
  cpe_product?: string | null;
  installed_version?: string | null;
  criticality: string;
  exposure_level: number;
}

export interface AssetCreatePayload {
  name: string;
  asset_type: string;
  business_value: number;
  cpe_vendor?: string;
  cpe_product?: string;
  installed_version?: string;
  criticality?: string;
  exposure_level?: number;
}

export interface AssetUpdatePayload {
  name?: string;
  asset_type?: string;
  business_value?: number;
  cpe_vendor?: string;
  cpe_product?: string;
  installed_version?: string;
  criticality?: string;
  exposure_level?: number;
}

// ==========================================
// Vulnerability & Finding Schemas
// ==========================================
export interface VulnerabilityResponse {
  vulnerability_id: number;
  cve_id: string;
  description?: string | null;
  cvss_score: number;
  exploitability_score: number;
  cisa_kev_listed: boolean;
  published_date?: string | null;
}

export interface FindingResponse {
  finding_id: number;
  asset_id: number;
  vulnerability_id: number;
  matched_cpe: string;
  matched_version: string;
  confidence: string;
  source_name: string;
  source_url?: string | null;
  evidence_summary?: string | null;
  retrieved_at: string;
}

// ==========================================
// Threat Schemas
// ==========================================
export interface ThreatResponse {
  threat_id: number;
  name: string;
  category: string;
  base_probability: number;
  severity: string;
  mitre_technique_id?: string | null;
}

// ==========================================
// Risk & Risk Quantification Schemas
// ==========================================
export interface RiskCreatePayload {
  finding_id?: number | null;
  asset_id?: number | null;
  threat_id: number;
  likelihood?: number;
  impact?: number;
  exposure_factor?: number;
}

export interface RiskQuantificationDict {
  risk_id: number;
  asset_id: number;
  asset_name: string;
  threat_id: number;
  threat_name: string;
  vulnerability_cve?: string | null;
  business_value: number;
  exposure_factor: number;
  sle: number;
  threat_base_probability: number;
  exploitability_multiplier: number;
  aro: number;
  ale_baseline: number;
  likelihood_score: number;
  impact_score: number;
  risk_score: number;
  qualitative_rating: SeverityLevel | string;
  applied_control_ids: number[];
  residual_factor: number;
  ale_residual: number;
}

// ==========================================
// Security Control Schemas
// ==========================================
export interface SecurityControlResponse {
  control_id: number;
  name: string;
  category: string;
  nist_function: string;
  implementation_cost: number;
  maintenance_cost: number;
  coverage: number;
}

export interface SecurityControlCreatePayload {
  name: string;
  category: string;
  nist_function?: string;
  implementation_cost: number;
  maintenance_cost?: number;
  coverage?: number;
}

// ==========================================
// Simulation Schemas
// ==========================================
export interface SimulationRunRequestPayload {
  number_of_simulations?: number;
  random_seed?: number;
  use_residual?: boolean;
  selected_control_ids?: number[];
  severity_distribution?: string;
}

export interface SimulationResultDict {
  number_of_simulations?: number;
  simulations_count?: number;
  random_seed?: number;
  seed?: number;
  mean_loss: number;
  min_loss: number;
  max_loss: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  probability_of_any_loss?: number;
  loss_exceedance_curve?: Array<{ loss: number; probability: number }>;
  exceedance_curve?: Array<{ loss: number; probability: number }>;
}

// ==========================================
// Scenario & Optimization Schemas
// ==========================================
export interface ScenarioCreatePayload {
  name: string;
  available_budget: number;
}

export interface ScenarioResponse {
  scenario_id: number;
  organization_id: number;
  name: string;
  available_budget: number;
  created_at: string;
}

export interface OptimizationRunRequestPayload {
  scenario_id?: number;
  available_budget?: number;
  mandatory_control_ids?: number[];
  dependencies?: Array<[number, number]>;
}

export interface OptimizationResultDict {
  feasible: boolean;
  available_budget: number;
  total_investment: number;
  remaining_budget: number;
  expected_loss_before: number;
  milp_objective_loss: number;
  exact_multiplicative_loss: number;
  exact_risk_reduction: number;
  roi: number;
  selected_control_ids: number[];
  exhaustive_optimum_loss: number;
  exhaustive_optimal_control_ids: number[];
  milp_matches_exhaustive: boolean;
  number_of_enumerated_portfolios: number;
}
