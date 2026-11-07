# Mathematical & Quantitative Methodology Specification

This document provides the definitive mathematical formulation, probabilistic derivations, and optimization algorithms governing the **PS105 Cyber Risk Quantification Platform**.

---

## 1. Deterministic Financial Quantification (FAIR-Inspired)

PS105 translates technical vulnerability findings and threat intelligence into currency units (Indian Rupees, ₹) through a **FAIR-inspired quantitative methodology**.

### 1. Single Loss Expectancy (SLE)
The monetary loss expected if a single threat event successfully compromises the target asset:
$$\text{SLE} = V_{\text{asset}} \times \text{EF}$$

Where:
* $V_{\text{asset}} \in \mathbb{R}^+$: Economic business valuation of the asset in Rupees (e.g., ₹2.0 Cr for Core Banking DB).
* $\text{EF} \in [0.0, 1.0]$: Exposure Factor representing the estimated percentage of asset value destroyed, stolen, or incurred as business interruption losses during an incident.

### 2. Exploitability Multiplier ($M_{\text{exploit}}$)
For risks linked to verified Common Vulnerabilities and Exposures (CVE), the base threat frequency is amplified by the technical exploitability of the software defect:
$$M_{\text{exploit}} = 1.0 + \frac{\text{CVSS Exploitability Subscore}}{10.0}$$

* For vulnerability-derived risks: $M_{\text{exploit}} \in [1.0, 1.39]$ (since CVSS v3.1 exploitability subscores range up to 3.9).
* For direct asset threats (without specific CVE linkage, such as unpatched employee workstation phishing): $M_{\text{exploit}} = 1.0$.

### 3. Annualized Rate of Occurrence (ARO)
The statistically expected frequency of threat attempts resulting in successful compromise per calendar year:
$$\text{ARO} = P_{\text{threat}} \times M_{\text{exploit}}$$

Where $P_{\text{threat}} \in (0.0, 1.0]$ is the empirical or synthetic baseline annual arrival frequency of the threat actor group.

### 4. Annualized Loss Expectancy (ALE)
The deterministic expected annual monetary loss for an individual threat-asset pairing:
$$\text{ALE} = \text{SLE} \times \text{ARO}$$

For an organizational portfolio of $J$ risks:
$$\text{Total Baseline ALE} = \sum_{j=1}^J \text{ALE}_j$$

### 5. Qualitative Matrix Scoring vs Quantitative ARO
* Qualitative score: $\text{Score} = \text{Likelihood} \times \text{Impact} \in [1, 25]$ ($1 \le \text{Likelihood} \le 5$, $1 \le \text{Impact} \le 5$).
* **Important Invariant:** Qualitative matrix scoring is strictly used for board heatmap visualization and reporting bands (LOW: 1–5, MEDIUM: 6–11, HIGH: 12–19, CRITICAL: 20–25). **It does not feed the quantitative ARO or ALE calculations.**

---

## 2. Multiplicative Mitigation & Residual Risk Formulation

When multiple security controls act upon the same threat-asset scenario, their mitigating effects are non-linear and exhibit diminishing returns:

$$\text{Residual ALE}_j(S) = \text{ALE}_j \times \prod_{i \in S} \left(1 - E_{ij} \cdot x_i\right)$$

Where:
* $S \subseteq \{1, \dots, m\}$: Set of candidate security controls selected in the portfolio.
* $x_i \in \{0, 1\}$: Binary decision variable indicating whether control $i$ is procured ($x_i = 1$) or not ($x_i = 0$).
* $E_{ij} \in [0.0, 1.0]$: Defensible effectiveness of control $i$ against risk $j$.

### Exact Portfolio Risk Reduction
$$\Delta \text{Risk}(S) = \text{Total Baseline ALE} - \sum_{j=1}^J \text{Residual ALE}_j(S)$$

---

## 3. Monte Carlo Stochastic Simulation

Real-world cyber losses do not arrive deterministically. PS105 simulates uncertainty via a compound renewal process across **10,000 Monte Carlo trials**:

### 1. Frequency Distribution: Poisson Arrival Process
The number of successful breach events $N_j$ occurring in trial $k$ for risk $j$ follows a Poisson distribution parameterized by its Annualized Rate of Occurrence:
$$N_{j,k} \sim \text{Poisson}(\lambda = \text{ARO}_j)$$

$$P(N = n) = \frac{\lambda^n e^{-\lambda}}{n!}$$

### 2. Severity Distribution: LogNormal Distribution
For each incident $l \in \{1, \dots, N_{j,k}\}$, loss magnitude $X_{j,k,l}$ is modeled via a LogNormal distribution with expectation equal to the Single Loss Expectancy ($\mathbb{E}[X] = \text{SLE}_j$) and assumed dispersion parameter $\sigma = 0.5$:

$$X_{j,k,l} \sim \text{LogNormal}(\mu, \sigma)$$

$$\sigma = 0.5 \quad (\text{assumed standard deviation of log-severity})$$

$$\mu = \ln(\text{SLE}_j) - \frac{\sigma^2}{2}$$

This ensures:
$$\mathbb{E}[X] = e^{\mu + \sigma^2/2} = e^{\ln(\text{SLE}) - \sigma^2/2 + \sigma^2/2} = \text{SLE}_j$$

### 3. Total Annual Loss & Value-at-Risk (VaR)
The aggregate annual loss for trial $k$ across all $J$ portfolio risks is:
$$Y_k = \sum_{j=1}^J \sum_{l=1}^{N_{j,k}} X_{j,k,l}$$

From the 10,000 sorted simulated trials $Y_{(1)} \le Y_{(2)} \le \dots \le Y_{(10,000)}$, the engine extracts:
* **P10 (Optimistic Year):** 10th percentile loss
* **P50 (Median Year):** 50th percentile loss
* **P90 (Adverse Year):** 90th percentile Value-at-Risk
* **P95 (Tail Risk / Solvency Horizon):** 95th percentile Value-at-Risk ($\text{VaR}_{95}$)

### 4. Empirical Loss Exceedance Curve (LEC)
The probability that annual losses exceed an arbitrary monetary threshold $x$:
$$\text{LEC}(x) = P(Y > x) = 1 - \hat{F}_Y(x) = \frac{1}{K} \sum_{k=1}^K \mathbb{I}(Y_k > x)$$

---

## 4. 0/1 Knapsack Mixed-Integer Linear Programming (MILP)

### Optimization Problem Formulation
The security capital allocation decision is formulated as an integer knapsack optimization problem solved via the COIN-OR CBC branch-and-cut solver:

$$\max_{x} \sum_{i=1}^m R_i^{\text{additive}} \cdot x_i$$

Subject to:
1. **Budgetary Constraint:**
   $$\sum_{i=1}^m C_i \cdot x_i \le B$$
2. **Technical Dependency Constraints (if configured):**
   $$x_{\text{prerequisite}} \ge x_{\text{dependent}} \iff x_k \le x_m$$
3. **Mandatory Compliance Controls (if configured):**
   $$x_{\text{mandatory}} = 1$$
4. **Integrity Domain:**
   $$x_i \in \{0, 1\} \quad \forall i \in \{1, \dots, m\}$$

Where:
* $C_i = \text{Implementation Cost}_i + \text{First-Year Maintenance Cost}_i$
* $B$: Available organizational cybersecurity budget (₹25.0 Lakh in ABC demo)
* $R_i^{\text{additive}} = \sum_{j=1}^J \text{ALE}_j \times E_{ij}$ (linear additive heuristic for solver branching)

### Exact Multiplicative Post-Evaluation
Because the linear solver operates over additive approximations, the engine re-evaluates all candidate solution vectors through the exact non-linear multiplicative formulation $\Delta \text{Risk}(S)$.

### Exhaustive $2^n$ State Space Verification
For demonstration and analytical auditability with $m=8$ candidate controls, the engine enumerates all $2^8 = 256$ binary permutations:
$$\{x \in \{0, 1\}^8 \mid C^T x \le B\}$$
It identifies the true global optimum and mathematically asserts that the MILP solver's objective matches the brute-force optimum within tolerance ($| \text{Loss}_{\text{MILP}} - \text{Loss}_{\text{Exhaustive}} | \le 10^{-6} \times \text{Baseline ALE}$).

---

## 5. Return on Security Investment (ROSI)

PS105 defines ROSI strictly on a first-year capital cost basis:

$$\text{Net ROSI} = \frac{\Delta \text{Risk} - C_{\text{total}}}{C_{\text{total}}}$$

$$\text{Loss Avoided Per Rupee Spent} = \frac{\Delta \text{Risk}}{C_{\text{total}}} = \text{Net ROSI} + 1.0$$

* If $\text{Net ROSI} > 10.0$ (i.e. $> 1000\%$), it is rendered in compact notation (e.g. `12.5×`).
* For the baseline ABC Financial Services demo:
  * Total Spend: ₹22,75,000 (MFA, SIEM, Firewall Upgrade, Pen Testing)
  * Exact Loss Avoided: ₹1,66,00,000 (81.8% risk reduction)
  * $\text{Net ROSI} = \frac{166.00\text{ L} - 22.75\text{ L}}{22.75\text{ L}} = 6.30\times$ (629.6% net return)
