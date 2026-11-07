# Database Schema & Relational Data Model Specification

This document details the relational schema, entity relationships, normal forms, and integrity constraints of the **PS105 Cyber Risk Quantification & Security Investment Optimization Platform**.

---

## 1. Relational Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "employs"
    ORGANIZATIONS ||--o{ ASSETS : "owns"
    ORGANIZATIONS ||--o{ SCENARIOS : "configures"
    ORGANIZATIONS ||--o{ RISK_ASSESSMENT_SNAPSHOTS : "snapshots"

    ASSETS ||--o{ ASSET_VULNERABILITY_FINDINGS : "exhibits"
    VULNERABILITIES ||--o{ VULNERABILITY_CPES : "matches_via"
    VULNERABILITIES ||--o{ ASSET_VULNERABILITY_FINDINGS : "identified_in"

    ASSET_VULNERABILITY_FINDINGS ||--o| RISKS : "triggers (XOR)"
    ASSETS ||--o| RISKS : "direct_target (XOR)"
    THREATS ||--o{ RISKS : "exploits"

    RISKS ||--o{ RISK_CONTROLS : "mitigated_by"
    SECURITY_CONTROLS ||--o{ RISK_CONTROLS : "applies_to"

    SCENARIOS ||--o{ OPTIMIZATION_RESULTS : "evaluates"
    OPTIMIZATION_RESULTS ||--o{ OPTIMIZATION_RESULT_CONTROLS : "selects"
    SECURITY_CONTROLS ||--o{ OPTIMIZATION_RESULT_CONTROLS : "allocated_in"

    ORGANIZATIONS {
        int organization_id PK
        string name
        string industry
        string organization_size
        float annual_revenue
        float cybersecurity_budget
        datetime created_at
    }

    USERS {
        int user_id PK
        int organization_id FK
        string name
        string email
        string password_hash
        string role
        datetime created_at
    }

    ASSETS {
        int asset_id PK
        int organization_id FK
        string name
        string asset_type
        float business_value
        string cpe_vendor
        string cpe_product
        string installed_version
        string criticality
        float exposure_level
    }

    VULNERABILITIES {
        int vulnerability_id PK
        string cve_id UK
        string description
        float cvss_score
        float exploitability_score
        boolean cisa_kev_listed
        datetime published_date
    }

    VULNERABILITY_CPES {
        int vulnerability_cpe_id PK
        int vulnerability_id FK
        string cpe_criteria
        string version_start_including
        string version_end_excluding
        boolean vulnerable
    }

    ASSET_VULNERABILITY_FINDINGS {
        int finding_id PK
        int asset_id FK
        int vulnerability_id FK
        string matched_cpe
        string matched_version
        string confidence
        string source_name
        string source_url
        text evidence_summary
        datetime retrieved_at
    }

    THREATS {
        int threat_id PK
        string name
        string category
        float base_probability
        string severity
        string mitre_technique_id
    }

    RISKS {
        int risk_id PK
        int finding_id FK "XOR"
        int asset_id FK "XOR"
        int threat_id FK
        int likelihood
        int impact
        float exposure_factor
        string status
    }

    SECURITY_CONTROLS {
        int control_id PK
        string name
        string category
        string nist_function
        float implementation_cost
        float maintenance_cost
        float coverage
    }

    RISK_CONTROLS {
        int risk_id PK,FK
        int control_id PK,FK
        float effectiveness_against_risk
    }

    SCENARIOS {
        int scenario_id PK
        int organization_id FK
        string name
        float available_budget
        datetime created_at
    }

    OPTIMIZATION_RESULTS {
        int result_id PK
        int scenario_id FK
        float total_investment
        float expected_loss_before
        float expected_loss_after
        float risk_reduction
        float residual_risk
        float roi
        datetime calculated_at
    }

    OPTIMIZATION_RESULT_CONTROLS {
        int result_id PK,FK
        int control_id PK,FK
        float allocated_cost
    }

    RISK_ASSESSMENT_SNAPSHOTS {
        int snapshot_id PK
        int organization_id FK
        float total_ale_before
        float total_ale_after
        datetime snapshot_date
    }
```

---

## 2. Normalization Analysis (3NF & BCNF Compliance)

The PS105 database schema is normalized to **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)** to eliminate update anomalies, deletion anomalies, and data redundancy:

1. **First Normal Form (1NF):** Every attribute contains only atomic values; there are no repeating groups or comma-separated lists. Many-to-many relationships (e.g., Risks to Controls, Optimization Results to Controls) are resolved into associative junction tables (`risk_controls`, `optimization_result_controls`).
2. **Second Normal Form (2NF):** Every non-key attribute is fully functionally dependent on the entire primary key. In composite primary key tables (`risk_controls` on `(risk_id, control_id)`), the only non-key attribute `effectiveness_against_risk` depends strictly on the specific pairing of risk and control.
3. **Third Normal Form (3NF):** No transitive dependencies exist. For example, `asset_vulnerability_findings` stores `asset_id` and `vulnerability_id`; vulnerability details (`cvss_score`, `exploitability_score`, `cisa_kev_listed`) reside solely in `vulnerabilities` and are never duplicated in findings.
4. **Boyce-Codd Normal Form (BCNF):** For every non-trivial functional dependency $X \rightarrow Y$, $X$ is a superkey.

---

## 3. Database-Level CHECK Constraints & Integrity Invariants

The data model enforces mathematical and physical domain invariants directly at the database engine level:

### 1. Risk Provenance Exclusive OR (XOR) Constraint
A `Risk` record represents either a vulnerability-specific exploit scenario or an inherent direct threat to an asset. It must link to **either** a `finding_id` or an `asset_id`, but never both and never neither:
```sql
CHECK (
    (finding_id IS NOT NULL AND asset_id IS NULL) OR
    (finding_id IS NULL AND asset_id IS NOT NULL)
)
```

### 2. Probability & Rating Boundaries
* **Threat Probability:** `base_probability >= 0.0 AND base_probability <= 1.0`
* **Vulnerability CVSS & Exploitability:** `cvss_score BETWEEN 0.0 AND 10.0`, `exploitability_score BETWEEN 0.0 AND 10.0`
* **Risk Likelihood & Impact:** `likelihood BETWEEN 1 AND 5`, `impact BETWEEN 1 AND 5`
* **Exposure Factor & Control Coverage:** `exposure_factor BETWEEN 0.0 AND 1.0`, `coverage BETWEEN 0.0 AND 1.0`
* **Control Effectiveness:** `effectiveness_against_risk BETWEEN 0.0 AND 1.0`
* **Fiscal Costs:** `implementation_cost >= 0.0`, `maintenance_cost >= 0.0`

---

## 4. Entity Catalog (14 Tables)

| Table Name | Purpose | Primary Key | Foreign Keys | Key Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `organizations` | Multi-tenant tenant boundaries & fiscal profiles | `organization_id` | - | Unique `name` |
| `users` | Authenticated analysts & CISO administrators | `user_id` | `organization_id` | Unique `email` |
| `assets` | Monitored hardware, software, and cloud assets | `asset_id` | `organization_id` | - |
| `vulnerabilities` | Curated CVE intelligence records | `vulnerability_id` | - | Unique `cve_id` |
| `vulnerability_cpes` | NIST CPE version ranges and matching criteria | `vulnerability_cpe_id` | `vulnerability_id` | - |
| `asset_vulnerability_findings` | Deterministic matches between assets and CVEs | `finding_id` | `asset_id`, `vulnerability_id` | - |
| `threats` | Threat scenario catalog (MITRE ATT&CK aligned) | `threat_id` | - | Unique `name` |
| `risks` | Financial risk scenarios (SLE x ARO = ALE) | `risk_id` | `finding_id`, `asset_id`, `threat_id` | XOR check constraint |
| `security_controls` | Defensible candidate controls & costs | `control_id` | - | Unique `name` |
| `risk_controls` | Mitigation effectiveness of control on risk | `(risk_id, control_id)` | `risk_id`, `control_id` | Composite PK |
| `scenarios` | Budget allocation planning scenarios | `scenario_id` | `organization_id` | - |
| `optimization_results` | Optimal portfolio solutions from MILP solver | `result_id` | `scenario_id` | - |
| `optimization_result_controls` | Junction table of controls selected in scenario | `(result_id, control_id)` | `result_id`, `control_id` | Composite PK |
| `risk_assessment_snapshots` | Historical ALE baseline vs residual trends | `snapshot_id` | `organization_id` | - |
