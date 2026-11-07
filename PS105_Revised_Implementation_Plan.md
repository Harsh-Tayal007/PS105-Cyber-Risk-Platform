# PS105 — Revised Implementation Plan

**Project Title**: PS105 — Cyber Risk Quantification & Security Investment Optimization Platform  
**Document Version**: 2.2 (Normalized Source of Truth)  
**Status**: Approved Plan Specification  

---

## 1. Project Objective

The primary objective of PS105 is to build a full-stack, web-based decision-support platform that transforms organizational asset inventories, threat data, and public vulnerability intelligence into quantitative financial risk metrics, simulates loss uncertainty, and uses binary integer linear programming (MILP) paired with exact multiplicative mitigation post-evaluation to optimize cybersecurity budget allocation.

The platform answers the central executive question:
> **"Given our synthetic organizational assets, applicable public vulnerabilities, threats, and a constrained cybersecurity budget, which specific combination of security controls should we purchase to achieve the maximum practical reduction in expected financial cyber loss?"**

Vulnerability intelligence serves as a critical **input** to the risk model, which validates product/version applicability and preserves finding provenance, rather than acting as a standalone vulnerability scanner.

---

## 2. Scope and Non-Goals

### 2.1 In Scope
- **Quantitative Risk Calculation**: Deterministic Single Loss Expectancy (SLE), Annualized Rate of Occurrence (ARO), Annualized Loss Expectancy (ALE), and qualitative 5x5 Likelihood $\times$ Impact scoring.
- **Vulnerability Intelligence & Provenance**: Local caching and product/version applicability matching against official public vulnerability datasets (NVD CVE/CPE, CISA Known Exploited Vulnerabilities, MITRE ATT&CK techniques) with evidence tracking.
- **Synthetic Demonstration Organization**: A complete, reproducible synthetic dataset ("ABC Financial Services") with assets, financial values, threats, and security controls.
- **Monte Carlo Uncertainty Simulation**: Stochastic loss frequency (Poisson) and severity (LogNormal/PERT) simulations (1,000–10,000 runs) producing P10, P50, P90, P95 metrics and loss exceedance probability curves.
- **Security Investment Optimization (MILP + Post-Evaluation)**: Additive risk-reduction MILP solver in `PuLP`/`SciPy` for control selection under budget, dependency, and compliance constraints, evaluated under exact compounding multiplicative mitigation, paired with exhaustive $2^8 = 256$ enumeration verification.
- **Decision Engine Visualizations & Reporting**: Budget What-If scenarios, Pareto-optimal Efficient Frontier curves, Return on Security Investment (ROSI), interactive React TSX frontend, and downloadable ReportLab PDF executive reports.

### 2.2 Non-Goals & Explicit Boundaries
- **Active Network Scanning**: The application will **NOT** perform network port scanning, automated vulnerability probing, or agentless endpoint discovery.
- **Fabricated Vulnerability Claims**: Real public CVE IDs, CVSS scores, and CPE version limits must be used; synthetic organization data must be clearly distinguished from public vulnerability facts.
- **Unverified Vulnerability Matching**: Assets will **NOT** be flagged as vulnerable simply because a CVE exists; product/vendor and version matching must be explicitly validated.
- **Real Company Endorsement**: "ABC Financial Services" is strictly a synthetic demonstration entity.
- **Hard-Coded Financial Results**: Numerical outputs (ALE, residual losses, ROSI, Monte Carlo percentiles, specific control selections) are **calculated outputs** derived by the mathematical engines, not hard-coded constants.

---

## 3. Architecture

The system follows a **Modular Monolith** architecture engineered for rapid local execution (SQLite default) while maintaining strict architectural decoupling for future multi-tenant PostgreSQL/Supabase production deployment.

```
                                 ┌────────────────────────────────────────┐
                                 │       React + TypeScript + Vite        │
                                 │    Tailwind CSS + Recharts + Lucide    │
                                 └───────────────────┬────────────────────┘
                                                     │ HTTP / REST API
                                                     ▼
                                 ┌────────────────────────────────────────┐
                                 │           FastAPI (Python)             │
                                 │         JWT Auth & Middleware          │
                                 └───────────────────┬────────────────────┘
                                                     │
         ┌──────────────────────────────┬────────────┴─────────────────┬──────────────────────────────┐
         ▼                              ▼                              ▼                              ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│  Vulnerability   │          │   Deterministic  │          │   Monte Carlo    │          │  MILP Optimization│
│   Intelligence   │─────────►│    Risk Engine   │─────────►│Simulations Engine│─────────►│  + Multiplicative│
│ & Provenance     │          │    (ALE / SLE)   │          │ (NumPy Stochastic│          │  Post-Evaluator  │
└────────┬─────────┘          └──────────────────┘          └──────────────────┘          └────────┬─────────┘
         │                                                                                         │
         ▼                                                                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│              SQLAlchemy ORM (Strict 3NF/BCNF Normalized Schema: SQLite / PostgreSQL)                │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

- **Backend Framework**: Python 3.13+, FastAPI, Pydantic v2, Pydantic-Settings.
- **Database Layer**: SQLAlchemy ORM 2.0+, SQLite (local execution default), PostgreSQL/Supabase ready.
- **Analytics & Math Engines**:
  - `PuLP` & `SciPy.optimize`: Binary Integer Linear Programming (MILP) solver.
  - `NumPy` & `SciPy.stats`: Monte Carlo stochastic simulations.
- **Frontend Layer**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React.
- **Report Generation**: ReportLab (Executive PDF Reports).
- **Authentication & Security**: Passlib (Bcrypt hashing), PyJWT / Python-Jose (JWT tokens).
- **Intelligence Integrations**: Localized NVD CVE/CPE data feeds, CISA KEV JSON, MITRE ATT&CK v14+.
- **Testing**: Pytest, FastAPI TestClient, HTTPX.

---

## 5. Data and Vulnerability Intelligence Strategy

To ensure deterministic, reproducible, and verifiable evaluation without reliance on live external API rate limits during demonstrations:

1. **Local Intelligence Cache**: The platform maintains a structured database of official public vulnerability records from NVD (CVE ID, CVSS v3.1 vector, severity score, CWE) and CISA KEV (exploitability confirmation, action due dates).
2. **Product / Version Applicability Matching Pipeline**:
   $$\text{Asset Inventory} \xrightarrow{\text{Vendor, Product, Version}} \text{CPE Evaluator} \xrightarrow{\text{CPE Range Matching}} \text{Verified Finding} \xrightarrow{\text{Provenance Log}} \text{Risk Model}$$
   - Assets map to CPE vendor/product parameters (e.g., `cpe:2.3:a:postgresql:postgresql:14.2:*:*:*:*:*:*:*`).
   - The engine evaluates matching constraints via `VulnerabilityCPE` records.
   - Verified matches generate an `AssetVulnerabilityFinding` provenance entry.
3. **Evidence & Provenance Tracking**: Every finding explicitly links:
   - Source dataset (NVD, CISA KEV).
   - Reference URL.
   - Matched CPE string & evaluated version condition.
   - CVSS score breakdown & observation timestamp.
4. **Future Data Import Readiness**: Standardized asset and scanner JSON/CSV import adapters allow external authorized inventory exports to be ingested directly into the engine.

---

## 6. Relational Database Schema & Normalization Analysis

The relational database schema is normalized to **3NF and BCNF** to eliminate redundancy and transitive functional dependencies while maintaining query performance.

### 6.1 Entity-Relationship Structure

```
┌──────────────────┐         ┌──────────────────┐
│   Organization   │<────────│       User       │
└────────┬─────────┘         └──────────────────┘
         │
         │1
         ▼*
┌──────────────────┐         ┌──────────────────────────┐         ┌──────────────────┐
│      Asset       │<────────│ AssetVulnerabilityFinding│────────>│  Vulnerability   │
└────────┬─────────┘         └────────────┬─────────────┘         └────────┬─────────┘
         │                                │                                │1
         │                                │1                               ▼*
         │                                ▼*                      ┌──────────────────┐
         │                   ┌──────────────────────────┐         │ VulnerabilityCPE │
         └──────────────────>│           Risk           │         └──────────────────┘
                             └────────────┬─────────────┘
                                          │
                                          │1
                                          ▼*
┌──────────────────┐         ┌──────────────────────────┐
│ SecurityControl  │<───────>│       RiskControl        │
└────────┬─────────┘         └──────────────────────────┘
         │
         │1
         ▼*
┌────────────────────────────┐         ┌──────────────────────────┐
│ OptimizationResultControl  │<────────│    OptimizationResult    │
└────────────────────────────┘         └────────────┬─────────────┘
                                                    │
                                                    │*
                                                    ▼1
                                       ┌──────────────────────────┐
                                       │         Scenario         │
                                       └──────────────────────────┘
```

### 6.2 Relational Entities & Normalization Details

1. **`Organization`**:
   - Primary Key: `organization_id`
   - Attributes: `name` (UNIQUE), `industry`, `organization_size`, `annual_revenue`, `cybersecurity_budget`, `created_at`
   - Functional Dependencies: $\text{organization\_id} \rightarrow \text{name}, \text{industry}, \text{organization\_size}, \text{annual\_revenue}, \text{cybersecurity\_budget}, \text{created\_at}$
   - Normalization: **BCNF** (Determinant `organization_id` is a candidate key).

2. **`User`**:
   - Primary Key: `user_id`
   - Foreign Key: `organization_id` $\rightarrow$ `Organization.organization_id` (ON DELETE CASCADE)
   - Attributes: `name`, `email` (UNIQUE), `password_hash`, `role`, `created_at`
   - Functional Dependencies:
     - $\text{user\_id} \rightarrow \text{organization\_id}, \text{name}, \text{email}, \text{password\_hash}, \text{role}, \text{created\_at}$
     - $\text{email} \rightarrow \text{user\_id}, \text{organization\_id}, \dots$
   - Normalization: **BCNF** (All determinants are candidate keys).

3. **`Asset`**:
   - Primary Key: `asset_id`
   - Foreign Key: `organization_id` $\rightarrow$ `Organization.organization_id`
   - Attributes: `name`, `asset_type`, `business_value`, `cpe_vendor`, `cpe_product`, `installed_version`, `criticality`, `exposure_level`
   - Functional Dependencies: $\text{asset\_id} \rightarrow \text{organization\_id}, \text{name}, \text{asset\_type}, \text{business\_value}, \dots$
   - Normalization: **BCNF** (Determinant `asset_id` is a candidate key).

4. **`Vulnerability`**:
   - Primary Key: `vulnerability_id`
   - Attributes: `cve_id` (UNIQUE), `description`, `cvss_score`, `exploitability_score`, `cisa_kev_listed`, `published_date`
   - Functional Dependencies:
     - $\text{vulnerability\_id} \rightarrow \text{cve\_id}, \text{description}, \text{cvss\_score}, \text{exploitability\_score}, \dots$
     - $\text{cve\_id} \rightarrow \text{vulnerability\_id}, \dots$
   - Normalization: **BCNF** (All determinants are candidate keys).

5. **`VulnerabilityCPE`**:
   - Primary Key: `vulnerability_cpe_id`
   - Foreign Key: `vulnerability_id` $\rightarrow$ `Vulnerability.vulnerability_id` (ON DELETE CASCADE)
   - Attributes: `cpe_criteria` (Atomic), `version_start_including` (Atomic), `version_end_excluding` (Atomic), `vulnerable` (Boolean)
   - Functional Dependencies: $\text{vulnerability\_cpe\_id} \rightarrow \text{vulnerability\_id}, \text{cpe\_criteria}, \text{version\_start\_including}, \dots$
   - Normalization: **BCNF** (Atomic values, no repeating groups; determinant is candidate key).

6. **`AssetVulnerabilityFinding`** *(Provenance Table)*:
   - Primary Key: `finding_id`
   - Foreign Keys:
     - `asset_id` $\rightarrow$ `Asset.asset_id` (ON DELETE CASCADE)
     - `vulnerability_id` $\rightarrow$ `Vulnerability.vulnerability_id`
   - Attributes: `matched_cpe`, `matched_version`, `confidence`, `source_name`, `source_url`, `evidence_summary`, `retrieved_at`
   - Alternate Key: `UNIQUE (asset_id, vulnerability_id)`
   - Functional Dependencies:
     - $\text{finding\_id} \rightarrow \text{asset\_id}, \text{vulnerability\_id}, \text{matched\_cpe}, \text{matched\_version}, \dots$
     - $(\text{asset\_id}, \text{vulnerability\_id}) \rightarrow \text{finding\_id}, \text{matched\_cpe}, \dots$
   - Normalization: **BCNF** (All determinants are candidate keys).

7. **`Threat`**:
   - Primary Key: `threat_id`
   - Attributes: `name`, `category`, `base_probability`, `severity`, `mitre_technique_id`
   - Functional Dependencies: $\text{threat\_id} \rightarrow \text{name}, \text{category}, \text{base\_probability}, \dots$
   - Normalization: **BCNF**.

8. **`Risk`** *(Eliminating Transitive Dependencies via Exclusive XOR Constraints)*:
   - Primary Key: `risk_id`
   - Foreign Keys:
     - `finding_id` $\rightarrow$ `AssetVulnerabilityFinding.finding_id` (NULLABLE, ON DELETE CASCADE)
     - `asset_id` $\rightarrow$ `Asset.asset_id` (NULLABLE, ON DELETE CASCADE)
     - `threat_id` $\rightarrow$ `Threat.threat_id`
   - Attributes: `likelihood` (1–5), `impact` (1–5), `exposure_factor`, `status`
   - Check Constraint: `CHECK ((finding_id IS NOT NULL AND asset_id IS NULL) OR (finding_id IS NULL AND asset_id IS NOT NULL))`
   - **Normalization Analysis**:
     - For vulnerability-based risks (`finding_id` IS NOT NULL, `asset_id` IS NULL): The asset is obtained via $\text{Risk} \rightarrow \text{AssetVulnerabilityFinding} \rightarrow \text{Asset}$. This completely eliminates the transitive dependency $\text{risk\_id} \rightarrow \text{finding\_id} \rightarrow \text{asset\_id}$!
     - For non-vulnerability risks (`finding_id` IS NULL, `asset_id` IS NOT NULL): The asset is directly referenced.
     - Functional Dependencies: $\text{risk\_id} \rightarrow \text{finding\_id}, \text{asset\_id}, \text{threat\_id}, \text{likelihood}, \text{impact}, \text{exposure\_factor}, \text{status}$.
     - Every determinant (`risk_id`) is a candidate key $\implies$ **Strict 3NF and BCNF compliant**.

9. **`SecurityControl`**:
   - Primary Key: `control_id`
   - Attributes: `name`, `category`, `nist_function`, `implementation_cost`, `maintenance_cost`, `coverage`
   - Functional Dependencies: $\text{control\_id} \rightarrow \text{name}, \text{category}, \text{nist\_function}, \dots$
   - Normalization: **BCNF**.

10. **`RiskControl`** *(Associative Table)*:
    - Primary Key: `(risk_id, control_id)` *(Composite Primary Key)*
    - Foreign Keys:
      - `risk_id` $\rightarrow$ `Risk.risk_id` (ON DELETE CASCADE)
      - `control_id` $\rightarrow$ `SecurityControl.control_id` (ON DELETE CASCADE)
    - Attributes: `effectiveness_against_risk` ($E_{i,j} \in [0, 1]$)
    - Functional Dependencies: $(\text{risk\_id}, \text{control\_id}) \rightarrow \text{effectiveness\_against\_risk}$
    - Normalization: **BCNF** (Only determinant is the composite candidate key).

11. **`Scenario`**:
    - Primary Key: `scenario_id`
    - Foreign Key: `organization_id` $\rightarrow$ `Organization.organization_id`
    - Attributes: `name`, `available_budget`, `created_at`
    - Functional Dependencies: $\text{scenario\_id} \rightarrow \text{organization\_id}, \text{name}, \text{available\_budget}, \text{created\_at}$
    - Normalization: **BCNF**.

12. **`OptimizationResult`** *(Snapshot of Historical Calculation Execution)*:
    - Primary Key: `result_id`
    - Foreign Key: `scenario_id` $\rightarrow$ `Scenario.scenario_id` (ON DELETE CASCADE)
    - Attributes: `total_investment`, `expected_loss_before`, `expected_loss_after`, `risk_reduction`, `residual_risk`, `roi`, `calculated_at`
    - Functional Dependencies: $\text{result\_id} \rightarrow \text{scenario\_id}, \text{total\_investment}, \text{expected\_loss\_before}, \dots$
    - *Justification*: Stored financial metrics (`total_investment`, `expected_loss_after`, `roi`) are **justified historical calculation snapshots** representing point-in-time output state.
    - Normalization: **3NF / BCNF**.

13. **`OptimizationResultControl`** *(Associative Result Table)*:
    - Primary Key: `(result_id, control_id)` *(Composite Primary Key)*
    - Foreign Keys:
      - `result_id` $\rightarrow$ `OptimizationResult.result_id` (ON DELETE CASCADE)
      - `control_id` $\rightarrow$ `SecurityControl.control_id`
    - Attributes: `allocated_cost`
    - Functional Dependencies: $(\text{result\_id}, \text{control\_id}) \rightarrow \text{allocated\_cost}$
    - Normalization: **BCNF**.

14. **`RiskAssessmentSnapshot`** *(Assessment History)*:
    - Primary Key: `snapshot_id`
    - Foreign Key: `organization_id` $\rightarrow$ `Organization.organization_id`
    - Attributes: `total_ale_before`, `total_ale_after`, `snapshot_date`
    - Normalization: **BCNF**.

---

## 7. Mathematical & Optimization Model

### 7.1 Financial Risk Quantification
- **Single Loss Expectancy (SLE)**:
  $$\text{SLE}_j = \text{Asset Business Value}_j \times \text{Exposure Factor}_j \quad (EF \in [0, 1])$$
- **Annualized Rate of Occurrence (ARO)**:
  $$\text{ARO}_j = \text{Threat Base Probability}_j \times \text{Vulnerability Exploitability Multiplier}_j$$
- **Annualized Loss Expectancy (ALE / Expected Annual Loss)**:
  $$\text{ALE}_j = \text{SLE}_j \times \text{ARO}_j$$
- **Qualitative Risk Score**:
  $$\text{Score}_j = \text{Likelihood}_j (1–5) \times \text{Impact}_j (1–5) \in [1, 25]$$

### 7.2 Multi-Control Mitigation Model
When a selected portfolio of security controls $S = \{i \mid x_i = 1\}$ is implemented against risk $j$:
$$\text{Loss After}_j = \text{Loss Before}_j \times \prod_{i=1}^N (1 - E_{i,j} \cdot x_i)$$
where $E_{i,j} \in [0, 1]$ is control $i$'s mitigation effectiveness against risk $j$.

$$\text{Total Risk Reduction} = \sum_{j} \text{Loss Before}_j - \sum_{j} \text{Loss After}_j$$

### 7.3 Optimization Strategy (Linear MILP + Exact Multiplicative Post-Evaluation)

1. **MILP Linearized Formulation in PuLP**:
   - Decision Variable: $x_i \in \{0, 1\}$ for candidate control $i \in \{1, \dots, N\}$.
   - Additive Risk-Reduction Weight: $r_{i,j} = \text{Loss Before}_j \times E_{i,j}$.
   - **Objective Function**:
     $$\max_{\mathbf{x}} \sum_{i=1}^N \sum_{j=1}^M r_{i,j} \cdot x_i$$
   - **Constraints**:
     - Budget Limit: $\sum_{i=1}^N (\text{Cost}_i + \text{MaintCost}_i) \cdot x_i \le \text{Available Budget}$
     - Control Dependency: $x_k \le x_m$ (if control $k$ requires prerequisite control $m$)
     - Mandatory Regulatory Controls: $x_c = 1 \quad \forall c \in \text{Compliance Set}$

2. **Exact Multiplicative Post-Evaluation**:
   Once PuLP solves $\mathbf{x}^*$, residual loss is evaluated using exact compounding multiplication:
   $$\text{Loss After}_j(\mathbf{x}^*) = \text{Loss Before}_j \times \prod_{i=1}^N (1 - E_{i,j} \cdot x_i^*)$$

3. **Exhaustive Enumeration Validation**:
   For synthetic dataset ($N=8$, $2^8 = 256$ combinations), an exhaustive validator verifies PuLP's solution against the true multiplicative global optimum.

---

## 8. Detailed Implementation Phases

### Phase 1 — Foundation & Backend Scaffold (COMPLETED)
- **Status**: **COMPLETED** (Verified by Pytest: 2 passed).

---

### Phase 2 — Database Architecture & Core Domain Models
- **Status**: **COMPLETED** (Verified by Pytest: 17 passed).
- **Objective**: Implement normalized 3NF/BCNF SQLAlchemy ORM models, Pydantic schemas, and database relationship tests.
- **Dependencies**: Phase 1.
- **Files Created/Modified**:
  - `backend/app/models/domain.py` (All 14 ORM entities with 3NF/BCNF normalization, exclusive OR risk FK constraints, and database-level CheckConstraints).
  - `backend/app/schemas/schemas.py` (Pydantic v2 validation models with field-level range validation).
  - `backend/tests/test_database.py` (ORM table creation, CRUD, constraint, relationship, and database-level CheckConstraint enforcement tests).
- **Hardening Applied**:
  - Database-level `CheckConstraint` for: `Vulnerability.cvss_score` [0,10], `Vulnerability.exploitability_score` [0,10], `Threat.base_probability` [0,1], `Risk.likelihood` [1,5], `Risk.impact` [1,5], `Risk.exposure_factor` [0,1], `SecurityControl.coverage` [0,1], `SecurityControl.implementation_cost` ≥ 0, `SecurityControl.maintenance_cost` ≥ 0, `RiskControl.effectiveness_against_risk` [0,1].
  - 5 dedicated constraint violation tests verifying database rejects invalid data.
- **Completion Criteria** (All Met):
  - Relational schema implemented to 3NF & BCNF.
  - Foreign keys, composite primary keys, and exclusive XOR constraints verified.
  - Risk provenance relationships (`Risk` $\rightarrow$ `AssetVulnerabilityFinding` $\rightarrow$ `Asset`) verified.
  - Associative tables (`RiskControl`, `OptimizationResultControl`) verified.
  - Database-level CheckConstraints enforce range rules independent of API layer.
  - Pytest database test suite passes 100% (17/17).

---

### Phase 3 — Vulnerability Intelligence & Evidence/Provenance Engine
- **Status**: **COMPLETED** (Verified by Pytest: 34 passed total, 17 new + 17 Phase 1+2).
- **Objective**: Build local vulnerability intelligence cache importer, CPE applicability matching engine, and verified finding provenance engine.
- **Dependencies**: Phase 2.
- **Files Created/Modified**:
  - `backend/app/engines/version_compare.py` (Semantic version parser & boundary comparator; handles e.g. 1.10 > 1.9, open/closed bounds).
  - `backend/app/engines/cpe_matcher.py` (CPE applicability matching engine; evaluates vendor, product, version ranges; returns MATCH, NO_MATCH, or INSUFFICIENT_DATA).
  - `backend/app/services/vulnerability_intelligence.py` (Ingests NVD CVE data, CPE rules, and CISA KEV flags idempotently).
  - `backend/app/services/finding_service.py` (Scans assets against vulnerability rules, creates/updates `AssetVulnerabilityFinding` entries with full evidence provenance, removes obsolete findings on asset remediation).
  - `backend/tests/test_version_compare.py` (7 tests: semantic comparison, boundary limits, empty/invalid strings).
  - `backend/tests/test_cpe_matcher.py` (6 tests: CPE 2.3/2.2 parsing, MATCH/NO_MATCH, missing version INSUFFICIENT_DATA protection).
  - `backend/tests/test_vulnerability_intelligence.py` (4 tests: idempotent CVE/KEV ingestion, finding provenance, remediation cleanup).
- **Completion Criteria** (All Met):
  - Local vulnerability intelligence cache importer functions idempotently without duplicate records.
  - CPE matching handles standard semantic versioning (1.10 > 1.9) without naive floating point conversion.
  - False-positive protection verified: assets with missing installed_version return INSUFFICIENT_DATA and do NOT generate findings.
  - Every finding contains verified provenance attributes (`matched_cpe`, `matched_version`, `confidence`, `source_name`, `source_url`, `evidence_summary`).
  - Asset version remediation removes obsolete findings upon subsequent scan.
  - All 34 tests in the test suite pass (100% pass rate).

---

### Phase 4 — Synthetic Demonstration Dataset (ABC Financial Services)
- **Status**: **COMPLETED** (Verified by Pytest: 39 passed total, 5 new + 34 Phase 1-3).
- **Objective**: Create complete, deterministic, reproducible seed dataset for synthetic organization "ABC Financial Services".
- **Dependencies**: Phase 3.
- **Files Created/Modified**:
  - `backend/app/database/seed.py` (Idempotent database seeder with CLI entry point `python -m app.database.seed`).
  - `backend/tests/test_seed.py` (5 unit/integration tests verifying seed execution, entity counts, idempotency, provenance, XOR constraints, and control effectiveness bounds).
- **Entities & Counts Seeded**:
  - Organization: `ABC Financial Services` (Annual Revenue: ₹50 Cr, Budget: ₹25 Lakh).
  - Assets (4): Core Banking DB (₹20 Cr), Payment Gateway API (₹15 Cr), Employee Workstations (₹5 Cr), Cloud Infrastructure (₹10 Cr, missing version).
  - Public Vulnerabilities (3): Real CVE-2021-41773, CVE-2022-1552, CVE-2023-23397 from NVD/CISA KEV.
  - Verified Findings (3): Generated via Phase 3 CPE applicability matcher with full evidence provenance.
  - Threats (5): Ransomware, Phishing, Web App Exploitation, DB Privilege Abuse, Cloud Misconfiguration.
  - Risks (5): 3 vulnerability-based risks (finding_id XOR), 2 direct asset-based risks (asset_id XOR).
  - Security Controls (8): MFA (₹3.5L total), EDR (₹6.0L), Immutable Backup (₹7.5L), Security Training (₹2.5L), SIEM (₹10.0L), Firewall Upgrade (₹5.25L), Pen Testing (₹4.0L), Network Segmentation (₹8.0L) [Total candidate cost: ₹46.75L].
  - RiskControl Mappings (15): Explainable effectiveness values $E_{i,j} \in [0, 1]$.
  - Optimization Scenario (1): FY2026 Executive Budget Scenario (Available Budget: ₹25 Lakh).
- **Completion Criteria** (All Met):
  - Data separation rule respected: public facts (real CVEs/CVSS/CPE/KEV) clearly distinguished from synthetic demo assumptions.
  - Idempotency verified: running seed multiple times produces identical counts without duplicate records.
  - False-positive protection verified: Cloud Infrastructure (missing version) produces 0 findings.
  - Exclusive XOR risk provenance constraint strictly satisfied.
  - All 39 tests pass (100% pass rate).

---

### Phase 5 — Deterministic Risk Quantification Engine
- **Objective**: Implement risk calculations for SLE, ARO, ALE, 5x5 qualitative scores, and multi-control mitigations.
- **Dependencies**: Phase 4.

---

### Phase 6 — Monte Carlo Stochastic Loss Simulation Engine
- **Objective**: Implement stochastic loss frequency/severity sampling and percentile generator.
- **Dependencies**: Phase 5.

---

### Phase 7 — Security Investment Optimization (MILP Solver)
- **Objective**: Implement PuLP additive MILP solver paired with exact multiplicative post-evaluator and 256-combination exhaustive verification.
- **Dependencies**: Phase 6.

---

### Phase 8 — Service Layer & REST APIs
- **Objective**: Expose REST endpoints for authentication, CRUD, calculations, optimization, and ReportLab PDF export.
- **Dependencies**: Phase 7.

---

### Phase 9 — Frontend Design System & Custom UI Components
- **Objective**: Scaffold Vite React TSX project with Tailwind CSS, Lucide React, and custom reusable component library.
- **Dependencies**: Phase 8.

---

### Phase 10 — Frontend Pages & API Integration
- **Objective**: Build application pages and wire up REST API communication.
- **Dependencies**: Phase 9.

---

### Phase 11 — Testing, Security Hardening & Validation Suite
- **Objective**: Execute comprehensive backend, math, security, and API test pass.
- **Dependencies**: Phase 10.

---

### Phase 12 — End-to-End Demonstration Workflow & Executive Reporting
- **Objective**: Complete end-to-end verification run on synthetic dataset.
- **Dependencies**: Phase 11.

---

## 9. API Architecture

All RESTful endpoints operate under `/api/v1`:

- **Auth**: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- **Organizations**: `GET /api/v1/organizations/me`, `PUT /api/v1/organizations/me`
- **Assets**: `GET /api/v1/assets`, `POST /api/v1/assets`, `DELETE /api/v1/assets/{id}`
- **Vulnerabilities**: `GET /api/v1/vulnerabilities/intelligence`, `GET /api/v1/vulnerabilities/findings`
- **Risks**: `GET /api/v1/risks/assessment`, `POST /api/v1/risks/calculate`
- **Security Controls**: `GET /api/v1/controls`, `POST /api/v1/controls`
- **Simulations**: `POST /api/v1/simulations/run`
- **Optimization**: `POST /api/v1/optimization/run`, `POST /api/v1/optimization/scenarios`
- **Reports**: `GET /api/v1/reports/executive-pdf`

---

## 10. Frontend Architecture

The React UI provides executive decision support for cybersecurity budget allocation:

- **Primary Accent & Posture Cards**: Dark-mode aesthetic with color-coded risk severity badges.
- **Central Decision Engine View (`OptimizerPage.tsx`)**: Budget sliders, MILP solver trigger, Recharts Monte Carlo loss histograms, ROSI indicator cards.
- **Scenario Analysis View (`ScenariosPage.tsx`)**: Pareto-optimal **Efficient Frontier** line chart.

---

## 11. Synthetic Demonstration Dataset

Synthetic organization **ABC Financial Services**:
- **Annual Revenue**: ₹50,00,00,000 (₹50 Cr).
- **Cybersecurity Budget**: ₹25,00,000 (₹25 Lakh) demonstration scenario.
- **Assets**: Core Banking DB, Payment Gateway API, Employee Workstations, Cloud Infrastructure.
- **Dynamic Output Principle**: ALE, Monte Carlo percentiles, optimal control portfolio, residual loss, and ROSI are **calculated dynamically** by the implemented engines during execution.

---

## 12. Testing & Verification Strategy

1. **Normalization & Schema Tests**: Verify functional dependencies, candidate keys, foreign key constraints, composite primary keys, and 3NF/BCNF compliance.
2. **Database-Level Constraint Tests**: Verify CheckConstraints reject out-of-range values at the SQL engine level.
3. **Vulnerability Applicability Tests**: Verify CPE version range matching produces verified findings with evidence logs.
4. **Deterministic Risk Math Tests**: Validate exact SLE, ARO, ALE formulas against manual benchmarks.
5. **PuLP MILP Solver & Exhaustive Validation**: Test budget constraints, control dependencies, and compare MILP selections against exhaustive $2^8 = 256$ enumeration evaluations.
6. **Monte Carlo Stochastic Tests**: Validate percentile ordering ($P10 \le P50 \le P90 \le P95$) and non-negativity.
7. **Report & E2E Tests**: Validate ReportLab PDF stream generation and frontend-to-backend API workflow execution.

---

## 13. End-to-End Demonstration Workflow

```
1. Synthetic Org (ABC Financial Services) Ingested
2. Public Vulnerability Intelligence Matched (CPE Range Matching -> Provenance Logs)
3. Deterministic ALE & Monte Carlo Stochastic Loss Calculated
4. PuLP MILP Optimization Solver & Post-Evaluator Triggered (Verified via 256 Enumeration)
5. Residual Risk & ROSI Computed Dynamically
6. Scenario & PDF Executive Report Generated
```

---

## 14. Risks, Assumptions and Open Questions

- **Assumption**: SQLite is used for deterministic local zero-setup evaluation; all SQLAlchemy ORM schemas remain 100% PostgreSQL-compatible.
- **Risk**: Large Monte Carlo iterations (> 50,000) could introduce UI latency if run synchronously.

---

## 15. Final Definition of Done

The project will be considered complete when:
1. All 12 implementation phases are fully executed and pass unit/integration tests.
2. The relational schema satisfies 3NF & BCNF with verified provenance relationships and zero transitive dependencies.
3. Public vulnerability matching, provenance tracking, ALE calculation, Monte Carlo simulation, PuLP MILP optimization, and exact multiplicative post-evaluation function cleanly.
4. The React TSX dashboard renders interactive visualizations.
5. Executive PDF reports download cleanly via ReportLab integration.

---

## 16. Exact Next Step

- **Proceed to Phase 5**: Implement deterministic risk calculation engine for SLE, ARO, ALE, 5x5 qualitative scores, and multi-control mitigations in `backend/app/engines/risk_engine.py`.
