import React from 'react';

export const Sec11Limitations: React.FC = () => {
  const points = [
    {
      title: 'Synthetic Demonstration Boundary',
      tag: 'DATA SCOPE',
      desc: 'ABC Financial Services and its underlying assets, vulnerabilities, values, and budgets are entirely synthetic construct models created for research and demonstration purposes. No real bank systems or networks are referenced.',
    },
    {
      title: 'Passive-Only Vulnerability Correlation',
      tag: 'NON-INTRUSIVE',
      desc: 'PS105 does not conduct network port scanning, dynamic exploitation, or active packet probing. Vulnerability correlation relies strictly on metadata declarations (CPE, version) matched against public NVD and CISA records.',
    },
    {
      title: 'Statistical Independence Assumption',
      tag: 'MATHEMATICAL MODEL',
      desc: 'The baseline FAIR calculation and standard Monte Carlo engine treat threat frequencies as independent Poisson arrival processes. In reality, coordinated advanced persistent threats (APTs) may execute chained exploits across multiple assets simultaneously.',
    },
    {
      title: 'Heuristic Knapsack Formulation vs. Non-linear Reality',
      tag: 'OPTIMIZATION',
      desc: 'While the engine performs a complete 256-state exhaustive verification of the 8 candidate controls, scaling to 50+ controls requires approximation algorithms where MILP additive approximations may exhibit bounded divergence from multiplicative compounding.',
    },
    {
      title: 'Garbage In, Garbage Out (GIGO) Sensitivity',
      tag: 'GOVERNANCE',
      desc: 'Financial quantification is directly proportional to enterprise asset business valuation and exposure factor inputs. If an organization misjudges the monetary replacement cost or outage liability of an asset, the calculated ALE will reflect that bias.',
    },
    {
      title: 'Decision Support Only — Not Autonomous Remediation',
      tag: 'ETHICS & COMPLIANCE',
      desc: 'PS105 is designed as an advisory decision support system for CISOs, CFOs, and Risk Committees. It does not automatically reconfigure firewalls, apply patches, or execute architectural changes without human governance approval.',
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-xs text-[var(--bp-muted)] leading-relaxed">
        Formal engineering disclosures regarding mathematical assumptions, operational boundaries, and governance considerations governing PS105 deployments.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {points.map((pt) => (
          <div
            key={pt.title}
            className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">
                  {pt.tag}
                </span>
              </div>
              <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
                {pt.title}
              </h4>
              <p className="text-xs text-[var(--bp-muted)] leading-relaxed pt-1">
                {pt.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

