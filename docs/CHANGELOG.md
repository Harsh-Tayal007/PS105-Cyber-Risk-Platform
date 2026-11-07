# Changelog & Engineering Release History

All notable technical milestones and releases for the **PS105 Cyber Risk Quantification & Security Investment Optimization Platform** are documented herein.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-07

### Added
* **Phase 1 (Scaffold):** Python 3.13 project setup with FastAPI, Pydantic v2 `BaseSettings`, structured logging, and CORS handling.
* **Phase 2 (Data Layer):** 14 relational SQLAlchemy 2.0 ORM models in 3NF/BCNF with database-level CHECK constraints (including Risk XOR provenance `ck_risks_xor_finding_asset`).
* **Phase 3 (Vulnerability Intelligence):** Deterministic Common Platform Enumeration (CPE) matching engine with semantic interval comparison (`version_start_including`, `version_end_excluding`) and `INSUFFICIENT_DATA` false-positive protection.
* **Phase 4 (Synthetic Demonstration Dataset):** Seed script for ABC Financial Services (₹50 Cr revenue, ₹25 L budget, 4 assets, 5 threats, 5 risks, 8 candidate controls, 15 risk-control mappings).
* **Phase 5 (Deterministic Risk Engine):** Single Loss Expectancy ($SLE = \text{Asset Value} \times EF$) and Annualized Rate of Occurrence ($ARO = P_{\text{threat}} \times M_{\text{exploit}}$) calculations producing deterministic baseline ALE ($SLE \times ARO$).
* **Phase 6 (Monte Carlo Engine):** 10,000-iteration Poisson frequency and LogNormal severity stochastic simulation engine computing empirical percentiles ($P10, P50, P90, P95$) and the Loss Exceedance Curve (LEC).
* **Phase 7 (MILP Optimizer):** 0/1 Knapsack optimization using the COIN-OR CBC branch-and-cut solver with non-linear multiplicative post-evaluation ($\prod (1 - E_{ij} x_i)$) and brute-force $2^8 = 256$ state space global verification.
* **Phase 8 (REST API):** 25 endpoints under `/api/v1` across 9 routers (Auth, Orgs, Assets, Vulnerabilities, Risks, Controls, Simulations, Optimization, Reports) with JWT Bearer authentication and multi-tenant scoping.
* **Phases 9–10 (React 19 Frontend):** Single-page application built with React 19, TypeScript, Vite, Tailwind CSS v4, and Recharts across 11 core module views.
* **Phase 11 (Hardening):** Multi-tenant isolation testing, 116 backend pytest unit/integration tests, 45 frontend vitest tests, and oxlint verification.
* **Phase 12 (Board Reporting):** 13-page consulting-grade ReportLab PDF generation service with vector drawings, dynamic section numbering (`_snum()`), and `?sections=` query filtering.

### Post-Phase Major Enhancements
* **Design System Refresh:** Warm editorial paper light theme (`#F5F2EA`) and obsidian dark theme (`#111613`) with Newsreader serif, IBM Plex Sans, and IBM Plex Mono typography.
* **Platform Blueprint View:** In-app technical specification page containing 12 indexed engineering sections, KaTeX formulas, architecture diagrams, and search glossary.
* **App Shell Layout Contract:** Stationary app header positioned outside the `<main id="app-main-scroller">` scroll container with a centered sidebar collapse toggle.
* **Portalized InfoTip Tooltips:** Reusable contextual guidance popups rendered at `document.body` level via `ReactDOM.createPortal` to eliminate container clipping.
* **Methodological & Numerical Accuracy:**
  * Re-scaled synthetic demonstration asset valuations by $0.1\times$ to establish an industry-realistic baseline ALE-to-revenue ratio of 4.06% (₹2.03 Cr vs ₹50 Cr).
  * Removed all unverified claims of "ISO 27005 compliance" and "FAIR certification", standardizing on "FAIR-inspired quantitative methodology".
  * Standardized Return on Security Investment (ROSI) to net return on first-year cost ($6.30\times$).
  * Unified risk band color thresholds between the Quantitative Risk Register and the 5×5 Likelihood × Impact Heatmap.
  * Added triple revenue sanity callout alerts to the executive PDF report.
