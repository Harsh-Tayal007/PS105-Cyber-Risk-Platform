# REST API Reference Specification

The **PS105 REST API** exposes 25 programmatic endpoints organized under `/api/v1` for asset management, vulnerability intelligence, deterministic risk modeling, stochastic simulation, knapsack optimization, and PDF generation.

Interactive OpenAPI documentation is available locally at:
* Swagger UI: `http://localhost:8000/docs`
* ReDoc: `http://localhost:8000/redoc`
* OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

---

## 1. Authentication & Tenant Ingress

All protected routes require an HTTP Bearer JWT token passed via the `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user & organization | No |
| `POST` | `/api/v1/auth/login` | Authenticate user & receive access token | No |
| `POST` | `/api/v1/auth/demo` | One-click access to ABC Financial Services demo account | No |
| `GET` | `/api/v1/organizations/me` | Fetch authenticated organization details | Yes |
| `PUT` | `/api/v1/organizations/me` | Update annual revenue and cybersecurity budget | Yes |

### Example: Quick Demo Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/demo \
  -H "Content-Type: application/json"
```
**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## 2. Asset Management

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assets` | List all assets belonging to caller's organization | Yes |
| `POST` | `/api/v1/assets` | Register a new asset with CPE & business valuation | Yes |
| `PUT` | `/api/v1/assets/{asset_id}` | Update asset attributes, criticality, or version | Yes |
| `DELETE` | `/api/v1/assets/{asset_id}` | Delete asset and cascade remove related findings | Yes |

### Asset Creation Schema
```json
{
  "name": "Trading Server Alpha",
  "asset_type": "Web Server",
  "business_value": 5000000.0,
  "cpe_vendor": "apache",
  "cpe_product": "http_server",
  "installed_version": "2.4.49",
  "criticality": "HIGH",
  "exposure_level": 0.85
}
```

---

## 3. Vulnerability Intelligence & Provenance Findings

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/vulnerabilities/intelligence` | List cached public CVE records (CVSS, KEV flags) | Yes |
| `GET` | `/api/v1/vulnerabilities/findings` | List deterministic CPE-matched findings for organization | Yes |

---

## 4. Risk Quantification & Mapping

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/risks/threats` | List catalog of standard threats (MITRE aligned) | Yes |
| `GET` | `/api/v1/risks/assessment` | Retrieve full risk register with SLE, ARO, and ALE | Yes |
| `POST` | `/api/v1/risks` | Manually bind threat to asset or verified finding | Yes |
| `POST` | `/api/v1/risks/auto-map` | Automatically map threat scenarios to findings & assets | Yes |
| `POST` | `/api/v1/risks/calculate` | Compute residual losses given a test set of control IDs | Yes |

### Example: Calculate Residual Risk
```bash
curl -X POST http://localhost:8000/api/v1/risks/calculate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"selected_control_ids": [1, 2, 5, 6]}'
```

---

## 5. Security Controls & Knapsack Optimization

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/controls` | List all 8 candidate security controls and unit costs | Yes |
| `POST` | `/api/v1/controls` | Register a custom security control | Yes |
| `GET` | `/api/v1/optimization/scenarios` | List configured budget allocation scenarios | Yes |
| `POST` | `/api/v1/optimization/scenarios` | Create a new budget scenario | Yes |
| `POST` | `/api/v1/optimization/run` | Execute MILP optimization solver under budget constraint | Yes |

### Optimization Run Schema
```json
{
  "scenario_id": 1,
  "available_budget": 2500000.0
}
```
**Response Sample:**
```json
{
  "feasible": true,
  "selected_control_ids": [1, 5, 6, 7],
  "selected_control_names": ["MFA", "SIEM", "Firewall Upgrade", "Pen Testing"],
  "total_investment": 2275000.0,
  "expected_loss_before": 20291250.0,
  "expected_loss_after": 3691680.0,
  "exact_risk_reduction": 16599570.0,
  "reduction_percentage": 81.8,
  "net_rosi": 6.30,
  "number_of_enumerated_portfolios": 256,
  "milp_matches_exhaustive_optimum": true
}
```

---

## 6. Monte Carlo Simulations

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/simulations/run` | Execute 10,000-trial Poisson-LogNormal simulation | Yes |

### Simulation Run Schema
```json
{
  "number_of_simulations": 10000,
  "random_seed": 42,
  "selected_control_ids": []
}
```
**Response Sample:**
```json
{
  "number_of_simulations": 10000,
  "mean_loss": 20291250.0,
  "p10": 1987000.0,
  "p50": 15420000.0,
  "p90": 38900000.0,
  "p95": 54100000.0,
  "loss_exceedance_curve": [
    {"loss_threshold": 0.0, "exceedance_probability": 1.0},
    {"loss_threshold": 10000000.0, "exceedance_probability": 0.68}
  ]
}
```

---

## 7. Executive Reports

| Method | Endpoint | Summary | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/executive-pdf` | Stream 13-page consulting-grade PDF document | Yes |

### Query Parameters
* `sections` (Optional, string): Comma-delimited list of section identifiers to include in the rendered document. Omitting generates all 11 sections.
  * Supported values: `summary`, `assets`, `findings`, `risks`, `simulation`, `optimization`, `scenarios`, `methodology`, `limitations`, `glossary`.
  * Dynamic section numbering will re-sequence automatically (e.g. `1.`, `2.`, `3.`) with no gaps in the document or Table of Contents.

```bash
# Example: Download report containing only Summary and Optimization
curl -X GET "http://localhost:8000/api/v1/reports/executive-pdf?sections=summary,optimization" \
  -H "Authorization: Bearer <token>" \
  -o executive_report.pdf
```
