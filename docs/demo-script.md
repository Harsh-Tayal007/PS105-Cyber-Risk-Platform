# 5-Minute Technical Viva & Demonstration Script

This script provides an exact, step-by-step walkthrough for presenting the **PS105 Cyber Risk Quantification & Security Investment Optimization Platform** during academic viva examinations or executive leadership demonstrations.

**Total Time:** 5 Minutes  
**Demonstration Profile:** ABC Financial Services (Synthetic Demonstration Dataset)

---

## Pre-Demonstration Setup Checklist (30 Seconds)

1. Launch backend in terminal 1:
   ```bash
   uvicorn backend.app.main:app --port 8000 --reload
   ```
2. Launch frontend in terminal 2:
   ```bash
   cd frontend && npm run dev
   ```
3. Open browser to `http://localhost:3000`.

---

## Step 1: The Core Problem & One-Click Demo Entry (45 Seconds)

* **Screen:** Login Page (`/`)
* **Action:** Point out the tagline and click **"Explore Demo Organization"**.
* **What to Say:**
  > *"Most cybersecurity programs present risk as arbitrary red-amber-green heatmaps that CFOs cannot reconcile against capital budgets. PS105 answers a concrete boardroom question:*  
  > **'Given our technical assets, applicable public CVEs, threat assumptions, and a constrained budget, which specific combination of security controls should we purchase to achieve maximum reduction in expected financial cyber loss?'**  
  > *With one click, we log in as the CISO of ABC Financial Services—a synthetic enterprise with ₹50 Crore annual revenue and a ₹25 Lakh cybersecurity budget."*

---

## Step 2: Asset Inventory & Vulnerability Provenance (60 Seconds)

* **Screen:** Navigate to **Asset Inventory** (`assets`) then **Vulnerabilities & Findings** (`vulnerabilities`).
* **What to See:**
  * 4 Assets totaling ₹5.0 Crore in economic business value: Core Banking DB (₹2.0 Cr), Payment Gateway API (₹1.5 Cr), Employee Workstations (₹0.5 Cr), and Cloud Infrastructure (₹1.0 Cr).
  * 3 Verified Findings with cryptographic provenance:
    * `CVE-2021-41773` (Apache HTTP Server 2.4.49 Path Traversal, CVSS 9.8, CISA KEV Listed)
    * `CVE-2022-1552` (PostgreSQL Autovacuum Privilege Escalation, CVSS 8.8)
    * `CVE-2023-23397` (Microsoft Outlook NTLM Theft, CVSS 9.8, CISA KEV Listed)
* **What to Say:**
  > *"PS105 is not an active network port scanner. It matches an enterprise's declared asset software stack against locally cached, public NIST NVD and CISA KEV records using semantic version bounds.*  
  > *Notice that Cloud Infrastructure has zero findings: because it lacks an installed version tag, our engine flags it as INSUFFICIENT_DATA rather than emitting a false-positive alert. For the other three assets, deterministic findings are generated with full provenance, source URLs, and CVSS exploitability metrics."*

---

## Step 3: Deterministic Financial Risk Quantification (60 Seconds)

* **Screen:** Navigate to **Risk Quantification** (`risks`).
* **What to See:**
  * 5 Modeled Risks totaling **Baseline ALE: ₹2.03 Crore** (exactly 4.06% of annual revenue).
  * Web Application Exploitation ($SLE = \text{₹1.35 Cr}, ARO = 0.6255, ALE = \text{₹84.44 L}$).
  * Database Exfiltration ($SLE = \text{₹1.60 Cr}, ARO = 0.3200, ALE = \text{₹51.20 L}$).
  * Phishing & Credential Theft ($SLE = \text{₹30.0 L}, ARO = 0.8340, ALE = \text{₹25.02 L}$).
  * Ransomware / Extortion ($SLE = \text{₹35.0 L}, ARO = 0.3500, ALE = \text{₹12.25 L}$).
  * Cloud Misconfiguration ($SLE = \text{₹75.0 L}, ARO = 0.4000, ALE = \text{₹30.00 L}$).
* **What to Say:**
  > *"Instead of subjective 1-to-5 rankings driving calculations, PS105 applies a FAIR-inspired model:*  
  > **Single Loss Expectancy (SLE) = Asset Value × Exposure Factor**  
  > **Annualized Rate of Occurrence (ARO) = Threat Probability × (1 + Exploitability / 10)**  
  > *Multiplying them yields an annual baseline loss expectancy of ₹2.03 Crore. The 5×5 matrix score is used solely for visual grouping, ensuring mathematical integrity is never compromised by subjective scales."*

---

## Step 4: Monte Carlo Stochastic Simulation (45 Seconds)

* **Screen:** Navigate to **Loss Simulations** (`simulations`).
* **Action:** Click **"Run 10,000-Trial Simulation"**.
* **What to See:**
  * Iterations: 10,000 runs executed in < 50 milliseconds via vectorized NumPy.
  * $P10$ (Optimistic Year): ~₹19.87 Lakh.
  * $P50$ (Median Year): ~₹1.54 Crore.
  * $P90$ (Adverse Year): ~₹3.89 Crore.
  * $P95$ (Tail Risk / Solvency VaR): ~₹5.41 Crore.
  * Loss Exceedance Curve (LEC) with non-zero Rupee tick labels.
* **What to Say:**
  > *"Because threat arrivals follow random Poisson processes and incident losses follow LogNormal distributions, we simulate 10,000 artificial operating years.*  
  > *While our average loss is ₹2.03 Crore, our 95th percentile Value-at-Risk reaches ₹5.41 Crore. This tail risk curve shows CFOs the capital buffer required to survive a 1-in-20-year catastrophic breach year."*

---

## Step 5: MILP Optimization, ROSI & Board PDF Report (60 Seconds)

* **Screen:** Navigate to **Investment Optimization** (`optimization`) then **Executive Reports** (`reports`).
* **Action:** Review the optimal portfolio, then click **"Download Board Report (PDF)"**.
* **What to See:**
  * Budget: ₹25.0 Lakh.
  * **Selected Controls:** MFA (₹3.5 L) + SIEM (₹10.0 L) + Firewall Upgrade (₹4.25 L) + Pen Testing (₹5.0 L).
  * **Total Optimal Spend:** ₹22.75 Lakh (91.0% budget utilization).
  * **Residual Loss:** ₹36.92 Lakh (down from ₹2.03 Crore).
  * **Exact Risk Reduction:** ₹1.66 Crore (81.8% loss avoided).
  * **Net ROSI:** **6.30×** (₹6.30 net saved per ₹1.00 spent).
  * **Exhaustive Validation:** 256 states evaluated; solver guaranteed to match global mathematical optimum.
  * Executive PDF: 13 consulting-grade pages with dynamic Table of Contents, vector charts, methodology, and CISO/CFO sign-off blocks.
* **What to Say:**
  > *"Given 8 candidate controls and ₹25 Lakh budget, which combination is optimal? Human intuition fails when multiple controls overlap non-linearly.*  
  > *Our 0/1 Knapsack Mixed-Integer Linear Program solves the problem in milliseconds. It selects MFA, SIEM, Firewall Upgrade, and Pen Testing, investing ₹22.75 Lakh to eliminate ₹1.66 Crore in annual loss—an 81.8% risk reduction yielding a 6.30× Net ROSI.*  
  > *We verify this against all 2^8 = 256 possible portfolios to prove mathematically that no superior combination exists. Finally, the CISO can generate a 13-page consulting-grade PDF audit ready for board review."*

---

## Step 6: Platform Blueprint & Technical Viva Defense (30 Seconds)

* **Screen:** Navigate to **Platform Blueprint** (`blueprint`).
* **What to Say:**
  > *"For full academic transparency, the entire architecture, database schema, mathematical formulas, and limitation disclaimers are documented in the in-app Platform Blueprint across 12 indexed engineering sections.*  
  > *All 116 backend tests and 45 frontend tests pass 100%, proving full multi-tenant isolation, numerical reproducibility, and algorithmic correctness."*
