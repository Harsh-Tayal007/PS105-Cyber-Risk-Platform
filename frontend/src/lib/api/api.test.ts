/**
 * Phase 11 — Comprehensive Frontend Test Suite for PS105.
 *
 * Covers:
 *  - API client token lifecycle + 401 auto-clear
 *  - API request builder (auth header injection, error handling, blob)
 *  - Auth module (login, register, logout)
 *  - Assets module (list, create, delete)
 *  - Vulnerabilities module (intelligence, findings)
 *  - Risks module (assessment, calculate)
 *  - Simulations module (runMonteCarloSimulation)
 *  - Optimization module (createScenario, runOptimization)
 *  - Organizations module (get, update)
 *  - Reports module (PDF download)
 *  - Controls module (list, create)
 *  - Frontend type-contract coverage
 *  - No local business-logic duplication guard
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  getToken,
  setToken,
  removeToken,
  apiRequest,
} from './client';

// ---------------------------------------------------------------------------
// 1.  Token Storage (existing + expanded)
// ---------------------------------------------------------------------------
describe('Token Storage', () => {
  beforeEach(() => removeToken());

  it('stores a token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
  });

  it('removes a token', () => {
    setToken('abc');
    removeToken();
    expect(getToken()).toBeNull();
  });

  it('returns null when no token is set', () => {
    expect(getToken()).toBeNull();
  });

  it('overwrites existing token', () => {
    setToken('first');
    setToken('second');
    expect(getToken()).toBe('second');
  });
});

// ---------------------------------------------------------------------------
// Mock global fetch for all subsequent tests
// ---------------------------------------------------------------------------
const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  const defaultHeaders: Record<string, string> = { 'content-type': 'application/json', ...headers };
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: (k: string) => defaultHeaders[k.toLowerCase()] ?? null },
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
  };
}

function pdfResponse(bytes: Uint8Array = new Uint8Array([0x25, 0x50, 0x44, 0x46])) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/pdf' : null) },
    json: async () => ({}),
    blob: async () => new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }),
  };
}

function errorResponse(status: number, detail = 'error') {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: () => 'application/json' },
    json: async () => ({ detail }),
    blob: async () => new Blob(),
  };
}

// ---------------------------------------------------------------------------
// 2.  apiRequest — core plumbing
// ---------------------------------------------------------------------------
describe('apiRequest', () => {
  beforeEach(() => {
    removeToken();
    mockFetch.mockReset();
  });

  it('adds Authorization header when token is set', async () => {
    setToken('mytoken');
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiRequest('/test');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer mytoken');
  });

  it('omits Authorization header when no token', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiRequest('/test');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(422, 'Validation error'));
    await expect(apiRequest('/bad')).rejects.toThrowError('Validation error');
  });

  it('clears token on 401', async () => {
    setToken('stale');
    mockFetch.mockResolvedValueOnce(errorResponse(401, 'Unauthorized'));
    await expect(apiRequest('/protected')).rejects.toThrowError();
    expect(getToken()).toBeNull();
  });

  it('returns empty object on 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: { get: () => null },
      json: async () => ({}),
    });
    const result = await apiRequest('/delete-thing');
    expect(result).toEqual({});
  });

  it('returns blob for PDF content-type', async () => {
    mockFetch.mockResolvedValueOnce(pdfResponse());
    const blob = await apiRequest('/reports/executive-pdf');
    expect(blob).toBeInstanceOf(Blob);
  });
});

// ---------------------------------------------------------------------------
// 3.  Auth module
// ---------------------------------------------------------------------------
describe('Auth API module', () => {
  beforeEach(() => {
    removeToken();
    mockFetch.mockReset();
  });

  it('loginApi stores token on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ access_token: 'jwt123', token_type: 'bearer' }));
    const { loginApi } = await import('./auth');
    const res = await loginApi({ email: 'ciso@abcfinancial.com', password: 'password123' });
    expect(res.access_token).toBe('jwt123');
    expect(getToken()).toBe('jwt123');
  });

  it('loginApi propagates API error on failure', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(401, 'Invalid credentials'));
    const { loginApi } = await import('./auth');
    await expect(loginApi({ email: 'ciso@abcfinancial.com', password: 'wrongpassword' })).rejects.toThrowError('Invalid credentials');
  });

  it('registerApi does NOT store token', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ user_id: 1, name: 'X', email: 'x@y.com', role: 'analyst', organization_id: 1, created_at: '2026-01-01' }));
    const { registerApi } = await import('./auth');
    await registerApi({ name: 'X', email: 'x@y.com', password: 'Password1!' });
    expect(getToken()).toBeNull();
  });

  it('logoutApi removes token', async () => {
    setToken('active');
    const { logoutApi } = await import('./auth');
    logoutApi();
    expect(getToken()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4.  Assets module
// ---------------------------------------------------------------------------
describe('Assets API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getAssets returns list', async () => {
    const mockAssets = [{ asset_id: 1, name: 'Server A', asset_type: 'Server', business_value: 1e6 }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mockAssets));
    const { getAssets } = await import('./assets');
    const result = await getAssets();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Server A');
  });

  it('createAsset sends POST', async () => {
    const mockAsset = { asset_id: 2, name: 'New', asset_type: 'DB', business_value: 500000 };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockAsset));
    const { createAsset } = await import('./assets');
    const result = await createAsset({ name: 'New', asset_type: 'DB', business_value: 500000 });
    expect(result.asset_id).toBe(2);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
  });

  it('deleteAsset sends DELETE', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: 'No Content', headers: { get: () => null }, json: async () => ({}) });
    const { deleteAsset } = await import('./assets');
    await deleteAsset(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/assets/1');
    expect(init.method).toBe('DELETE');
  });

  it('getAssets handles API error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'Internal server error'));
    const { getAssets } = await import('./assets');
    await expect(getAssets()).rejects.toThrowError('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// 5.  Vulnerabilities module
// ---------------------------------------------------------------------------
describe('Vulnerabilities API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getVulnerabilityIntelligence returns CVE list', async () => {
    const mock = [{ vulnerability_id: 1, cve_id: 'CVE-2021-41773', cvss_score: 9.8, exploitability_score: 3.9, cisa_kev_listed: true }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { getVulnerabilityIntelligence } = await import('./vulnerabilities');
    const result = await getVulnerabilityIntelligence();
    expect(result[0].cve_id).toBe('CVE-2021-41773');
  });

  it('getVerifiedFindings returns findings with provenance', async () => {
    const mock = [{ finding_id: 1, asset_id: 1, vulnerability_id: 1, matched_cpe: 'cpe:2.3:a:apache:http_server', matched_version: '2.4.49', confidence: 'VERIFIED', source_name: 'NVD', retrieved_at: '2026-01-01' }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { getVerifiedFindings } = await import('./vulnerabilities');
    const result = await getVerifiedFindings();
    expect(result[0].confidence).toBe('VERIFIED');
    expect(result[0].source_name).toBe('NVD');
  });

  it('handles empty intelligence list', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    const { getVulnerabilityIntelligence } = await import('./vulnerabilities');
    const result = await getVulnerabilityIntelligence();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6.  Risks module — verify frontend delegates to backend
// ---------------------------------------------------------------------------
describe('Risks API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getRiskAssessment returns quantified risks from backend', async () => {
    const mock = [{
      risk_id: 1, asset_id: 1, asset_name: 'Server', threat_id: 1, threat_name: 'Exploit',
      sle: 500000, aro: 0.3, ale_baseline: 150000, ale_residual: 150000,
      likelihood_score: 3, impact_score: 4, risk_score: 12, qualitative_rating: 'HIGH',
      applied_control_ids: [], residual_factor: 1.0, business_value: 1e6, exposure_factor: 0.5,
      threat_base_probability: 0.1, exploitability_multiplier: 3.0, vulnerability_cve: 'CVE-2021-41773',
    }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { getRiskAssessment } = await import('./risks');
    const result = await getRiskAssessment();
    expect(result[0].sle).toBe(500000);
    expect(result[0].ale_baseline).toBe(150000);
  });

  it('calculateRiskResiduals sends selected_control_ids to backend', async () => {
    const mock = [{ risk_id: 1, ale_residual: 75000 }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { calculateRiskResiduals } = await import('./risks');
    await calculateRiskResiduals([1, 2]);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.selected_control_ids).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// 7.  Simulations module
// ---------------------------------------------------------------------------
describe('Simulations API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('runMonteCarloSimulation sends correct payload', async () => {
    const mock = { simulations_count: 10000, seed: 42, mean_loss: 100000, min_loss: 0, max_loss: 500000, p10: 10000, p50: 80000, p90: 200000, p95: 300000, exceedance_curve: [] };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { runMonteCarloSimulation } = await import('./simulations');
    const result = await runMonteCarloSimulation({ number_of_simulations: 10000, random_seed: 42 });
    expect(result.simulations_count).toBe(10000);
    expect(result.p95).toBe(300000);
  });

  it('handles simulation API error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(422, 'number_of_simulations must be > 0'));
    const { runMonteCarloSimulation } = await import('./simulations');
    await expect(runMonteCarloSimulation({ number_of_simulations: -1 })).rejects.toThrowError();
  });
});

// ---------------------------------------------------------------------------
// 8.  Optimization module
// ---------------------------------------------------------------------------
describe('Optimization API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('createScenario sends POST and returns scenario', async () => {
    const mock = { scenario_id: 1, organization_id: 1, name: 'FY2026', available_budget: 2500000, created_at: '2026-01-01' };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { createScenario } = await import('./optimization');
    const result = await createScenario({ name: 'FY2026', available_budget: 2500000 });
    expect(result.scenario_id).toBe(1);
  });

  it('runOptimization returns MILP + exhaustive results', async () => {
    const mock = {
      feasible: true, available_budget: 2500000, total_investment: 2000000,
      remaining_budget: 500000, expected_loss_before: 1000000,
      milp_objective_loss: 400000, exact_multiplicative_loss: 420000,
      exact_risk_reduction: 580000, roi: 2.9,
      selected_control_ids: [1, 3, 5],
      exhaustive_optimum_loss: 410000, exhaustive_optimal_control_ids: [1, 3, 5],
      milp_matches_exhaustive: false, number_of_enumerated_portfolios: 256,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { runOptimization } = await import('./optimization');
    const result = await runOptimization({ scenario_id: 1 });
    expect(result.feasible).toBe(true);
    expect(result.number_of_enumerated_portfolios).toBe(256);
    expect(result.milp_objective_loss).not.toBe(result.exact_multiplicative_loss);
  });
});

// ---------------------------------------------------------------------------
// 9.  Organizations module
// ---------------------------------------------------------------------------
describe('Organizations API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getOrganizationMe returns organization data', async () => {
    const mock = { organization_id: 1, name: 'ABC Financial', annual_revenue: 50000000, cybersecurity_budget: 2500000, created_at: '2026-01-01' };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { getOrganizationMe } = await import('./organizations');
    const result = await getOrganizationMe();
    expect(result.name).toBe('ABC Financial');
  });

  it('updateOrganizationMe sends PUT', async () => {
    const mock = { organization_id: 1, name: 'ABC Financial', cybersecurity_budget: 3000000, annual_revenue: 50000000, created_at: '2026-01-01' };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { updateOrganizationMe } = await import('./organizations');
    const result = await updateOrganizationMe({ cybersecurity_budget: 3000000 });
    expect(result.cybersecurity_budget).toBe(3000000);
    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('PUT');
  });
});

// ---------------------------------------------------------------------------
// 10. Reports module
// ---------------------------------------------------------------------------
describe('Reports API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('downloadExecutivePdfReport returns Blob', async () => {
    mockFetch.mockResolvedValueOnce(pdfResponse());
    const { downloadExecutivePdfReport } = await import('./reports');
    const result = await downloadExecutivePdfReport();
    expect(result).toBeInstanceOf(Blob);
  });

  it('handles report API error', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'PDF generation failed'));
    const { downloadExecutivePdfReport } = await import('./reports');
    await expect(downloadExecutivePdfReport()).rejects.toThrowError('PDF generation failed');
  });
});

// ---------------------------------------------------------------------------
// 11. Controls module
// ---------------------------------------------------------------------------
describe('Controls API module', () => {
  beforeEach(() => mockFetch.mockReset());

  it('getSecurityControls returns list', async () => {
    const mock = [{ control_id: 1, name: 'WAF', category: 'Network', nist_function: 'PROTECT', implementation_cost: 100000, maintenance_cost: 20000, coverage: 0.8 }];
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { getSecurityControls } = await import('./controls');
    const result = await getSecurityControls();
    expect(result[0].control_id).toBe(1);
  });

  it('createSecurityControl sends POST', async () => {
    const mock = { control_id: 2, name: 'EDR', category: 'Endpoint', nist_function: 'DETECT', implementation_cost: 200000, maintenance_cost: 50000, coverage: 0.7 };
    mockFetch.mockResolvedValueOnce(jsonResponse(mock));
    const { createSecurityControl } = await import('./controls');
    const result = await createSecurityControl({ name: 'EDR', category: 'Endpoint', implementation_cost: 200000 });
    expect(result.name).toBe('EDR');
  });
});

// ---------------------------------------------------------------------------
// 12. Type contract guard — ensure TS types match expected backend shapes
// ---------------------------------------------------------------------------
describe('TypeScript type contracts', () => {
  it('RiskQuantificationDict has all required Phase 5 fields', async () => {
    // This is a compile-time test — if types are wrong, TS will fail build
    const risk: import('@/types').RiskQuantificationDict = {
      risk_id: 1, asset_id: 1, asset_name: 'S', threat_id: 1, threat_name: 'T',
      vulnerability_cve: null, business_value: 1e6, exposure_factor: 0.5,
      sle: 500000, threat_base_probability: 0.1, exploitability_multiplier: 3,
      aro: 0.3, ale_baseline: 150000, likelihood_score: 3, impact_score: 4,
      risk_score: 12, qualitative_rating: 'HIGH',
      applied_control_ids: [], residual_factor: 1, ale_residual: 150000,
    };
    expect(risk.sle).toBe(risk.business_value * risk.exposure_factor);
  });

  it('OptimizationResultDict separates MILP vs exact vs exhaustive', async () => {
    const opt: import('@/types').OptimizationResultDict = {
      feasible: true, available_budget: 2.5e6, total_investment: 2e6,
      remaining_budget: 5e5, expected_loss_before: 1e6,
      milp_objective_loss: 4e5, exact_multiplicative_loss: 4.2e5,
      exact_risk_reduction: 5.8e5, roi: 2.9,
      selected_control_ids: [1, 3],
      exhaustive_optimum_loss: 4.1e5, exhaustive_optimal_control_ids: [1, 3],
      milp_matches_exhaustive: false, number_of_enumerated_portfolios: 256,
    };
    // MILP, exact multiplicative, and exhaustive are separate fields
    expect(opt).toHaveProperty('milp_objective_loss');
    expect(opt).toHaveProperty('exact_multiplicative_loss');
    expect(opt).toHaveProperty('exhaustive_optimum_loss');
    expect(opt.number_of_enumerated_portfolios).toBe(256);
  });

  it('SimulationResultDict includes percentile and exceedance fields', async () => {
    const sim: import('@/types').SimulationResultDict = {
      simulations_count: 10000, seed: 42, mean_loss: 1e5,
      min_loss: 0, max_loss: 5e5, p10: 1e4, p50: 8e4, p90: 2e5, p95: 3e5,
      exceedance_curve: [{ loss: 100000, probability: 0.5 }],
    };
    expect(sim.p10).toBeLessThanOrEqual(sim.p50);
    expect(sim.p50).toBeLessThanOrEqual(sim.p90);
    expect(sim.p90).toBeLessThanOrEqual(sim.p95);
  });
});

// ---------------------------------------------------------------------------
// 13. No business-logic duplication guard
// ---------------------------------------------------------------------------
describe('Frontend does NOT duplicate business logic', () => {
  it('risks module does not export SLE/ARO/ALE calculation functions', async () => {
    const risksModule = await import('./risks');
    const exports = Object.keys(risksModule);
    expect(exports).not.toContain('calculateSLE');
    expect(exports).not.toContain('calculateARO');
    expect(exports).not.toContain('calculateALE');
    expect(exports).not.toContain('monteCarloSample');
  });

  it('simulations module only exports API call, no local sampling', async () => {
    const simModule = await import('./simulations');
    const exports = Object.keys(simModule);
    expect(exports).toEqual(['runMonteCarloSimulation']);
  });

  it('optimization module only exports API calls, no local MILP', async () => {
    const optModule = await import('./optimization');
    const exports = Object.keys(optModule);
    expect(exports).toContain('createScenario');
    expect(exports).toContain('runOptimization');
    expect(exports).not.toContain('solveMILP');
    expect(exports).not.toContain('exhaustiveEnumerate');
  });
});
