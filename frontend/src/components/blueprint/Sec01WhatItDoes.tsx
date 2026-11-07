import React from 'react';

export const Sec01WhatItDoes: React.FC = () => (
  <div className="space-y-6">
    {/* Problem framing */}
    <div className="grid md:grid-cols-2 gap-4">
      <div
        className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-2"
      >
        <h3 className="text-sm font-semibold text-[var(--bp-accent)] uppercase tracking-wide">
          The board asks
        </h3>
        <p className="text-[var(--bp-ink)] text-base font-medium leading-snug" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
          "Given our current threat exposure, what is the optimal cybersecurity investment that minimises our residual annual financial loss within budget?"
        </p>
      </div>

      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--bp-muted)] uppercase tracking-wide">
          PS105 answers it in six steps
        </h3>
        <ol className="space-y-1.5 text-sm text-[var(--bp-ink)]">
          {[
            'Inventory monitored enterprise assets with CPE metadata',
            'Correlate assets against authoritative CVE / CISA KEV feeds',
            'Quantify monetary exposure via the FAIR model (SLE × ARO = ALE)',
            'Model stochastic tail risk with 10,000 Monte Carlo iterations',
            'Solve a 0/1 Knapsack MILP for the optimal defensive portfolio',
            'Compile a consulting-grade boardroom PDF report',
          ].map((step, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'var(--bp-accent-soft)', color: 'var(--bp-accent)' }}
              >
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>

    {/* Target users */}
    <div>
      <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
        Who it's for
      </h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            role: 'CISO',
            desc: 'Translate raw vulnerability scan backlogs into boardroom-ready ALE/ROSI language that justifies defensive spend.',
          },
          {
            role: 'CFO / Finance',
            desc: 'Understand cyber loss as a financial probability distribution — not an IT problem — and validate insurance coverage adequacy.',
          },
          {
            role: 'Risk Committee',
            desc: 'Compare alternative budget scenarios and read the efficient frontier to govern investment governance decisions.',
          },
        ].map((u) => (
          <div
            key={u.role}
            className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-4 space-y-1"
          >
            <span
              className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
              style={{ background: 'var(--bp-accent-soft)', color: 'var(--bp-accent)' }}
            >
              {u.role}
            </span>
            <p className="text-xs text-[var(--bp-muted)] leading-relaxed">{u.desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* What it is NOT */}
    <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5">
      <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
        What PS105 is not
      </h3>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {[
          ['Not a vulnerability scanner', 'No active probing. All data is passive, sourced from NVD and CISA.'],
          ['Not a SIEM or EDR', 'No real-time event collection or endpoint telemetry.'],
          ['Not a compliance checklist tool', 'Outputs monetary quantification, not control checklists.'],
          ['Not an automated remediation system', 'Decision support only — a human must act on the recommendations.'],
        ].map(([title, body]) => (
          <div key={title} className="flex gap-2 items-start py-1 border-b border-[var(--bp-line)] last:border-0">
            <span className="text-[var(--bp-accent)] shrink-0 mt-0.5">✕</span>
            <div>
              <span className="font-medium text-[var(--bp-ink)]">{title}. </span>
              <span className="text-[var(--bp-muted)]">{body}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Dataset note */}
    <p className="text-xs text-[var(--bp-muted)] leading-relaxed border-l-2 border-[var(--bp-accent-soft)] pl-3">
      <strong className="text-[var(--bp-ink)]">Demo dataset:</strong> The platform ships with a synthetic
      organisation called <em>ABC Financial Services</em> — a mid-size bank with 12 core assets, 3 verified
      CVE findings, 8 candidate security controls, and a ₹25 lakh annual security budget. All numbers are
      realistic but entirely fictional, generated for educational and research purposes.
    </p>
  </div>
);

