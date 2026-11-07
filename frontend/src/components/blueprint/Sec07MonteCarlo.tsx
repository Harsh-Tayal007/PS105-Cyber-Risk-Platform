import React from 'react';
import { FormulaBlock } from './FormulaBlock';

export const Sec07MonteCarlo: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Simulation Flow Architecture */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
          Stochastic Sampling Pipeline (Single Simulated Year)
        </h3>
        <div className="grid md:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STAGE 1</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">Event Frequency</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Sample number of breach occurrences <span className="bp-mono font-semibold">k</span> from a Poisson distribution parameterized by annualized rate of occurrence:
            </p>
            <FormulaBlock formula="k \sim \text{Poisson}(\lambda = \text{ARO})" displayMode={false} />
          </div>

          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STAGE 2</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">Event Severity</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              For each occurrence <span className="bp-mono font-semibold">i = 1..k</span>, draw loss amount from right-skewed LogNormal distribution:
            </p>
            <FormulaBlock formula="X_i \sim \text{LogNormal}(\mu, \sigma)" displayMode={false} />
          </div>

          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STAGE 3</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">Annual Summation</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Aggregate all incident losses within the trial calendar year:
            </p>
            <FormulaBlock formula="L_\text{year} = \sum_{i=1}^{k} X_i" displayMode={false} />
          </div>

          <div className="p-4 rounded-xl border border-[var(--bp-accent)] bg-[var(--bp-accent-soft)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STAGE 4</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">10,000 Iterations</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Repeat 10,000 times to construct the empirical cumulative probability distribution and exceedance curve.
            </p>
          </div>
        </div>
      </div>

      {/* Illustrative Loss Exceedance Curve SVG */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
            Loss Exceedance Curve (LEC) & Percentile Metrics
          </h4>
          <span className="text-[11px] bp-mono text-[var(--bp-muted)] px-2 py-0.5 rounded border border-[var(--bp-line)]">
            P(Loss &gt; x) = 1 - F(x)
          </span>
        </div>

        {/* Inline SVG Chart */}
        <div className="w-full h-64 overflow-hidden rounded-lg bg-[var(--bp-surface-2)] p-2">
          <svg viewBox="0 0 500 220" className="w-full h-full text-[var(--bp-ink)]" role="img" aria-label="Illustrative Loss Exceedance Curve">
            {/* Grid Lines */}
            <line x1="60" y1="20" x2="480" y2="20" stroke="var(--bp-line)" strokeDasharray="3 3" />
            <line x1="60" y1="70" x2="480" y2="70" stroke="var(--bp-line)" strokeDasharray="3 3" />
            <line x1="60" y1="120" x2="480" y2="120" stroke="var(--bp-line)" strokeDasharray="3 3" />
            <line x1="60" y1="170" x2="480" y2="170" stroke="var(--bp-line)" strokeDasharray="3 3" />

            {/* Axes */}
            <line x1="60" y1="190" x2="480" y2="190" stroke="var(--bp-ink)" strokeWidth="1.5" />
            <line x1="60" y1="10" x2="60" y2="190" stroke="var(--bp-ink)" strokeWidth="1.5" />

            {/* Axis Labels */}
            <text x="25" y="25" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">100%</text>
            <text x="25" y="75" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">75%</text>
            <text x="25" y="115" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">50%</text>
            <text x="25" y="175" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">5%</text>

            <text x="160" y="206" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">P50 (₹2.1 Cr)</text>
            <text x="380" y="206" fontSize="10" fill="var(--bp-muted)" textAnchor="middle">P95 VaR (₹8.4 Cr)</text>

            {/* Exceedance Curve */}
            <path
              d="M 60 25 C 100 30, 130 65, 160 110 C 220 160, 320 172, 380 175 C 430 177, 460 185, 480 188"
              fill="none"
              stroke="var(--bp-accent)"
              strokeWidth="2.5"
            />

            {/* P50 Marker */}
            <line x1="160" y1="110" x2="160" y2="190" stroke="var(--bp-muted)" strokeDasharray="4 4" strokeWidth="1.2" />
            <line x1="60" y1="110" x2="160" y2="110" stroke="var(--bp-muted)" strokeDasharray="4 4" strokeWidth="1.2" />
            <circle cx="160" cy="110" r="4" fill="var(--bp-accent)" />

            {/* P95 Marker */}
            <line x1="380" y1="175" x2="380" y2="190" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.2" />
            <line x1="60" y1="175" x2="380" y2="175" stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.2" />
            <circle cx="380" cy="175" r="4" fill="#ef4444" />
            <text x="390" y="170" fontSize="10" fill="#ef4444" fontWeight="bold">P95 Tail Risk</text>
          </svg>
        </div>

        {/* Interpretation Cards */}
        <div className="grid md:grid-cols-2 gap-4 text-xs pt-1">
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-1">
            <span className="font-bold text-[var(--bp-ink)]">How to Read P95 Value-at-Risk (VaR)</span>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              P95 indicates that in 95% of simulated years, annual loss is less than or equal to ₹8.4 Cr. Conversely, there is a 5% probability (a 1-in-20 year disaster confluence) that cumulative losses exceed this threshold.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-1">
            <span className="font-bold text-[var(--bp-ink)]">Reproducibility & Deterministic Random Seeds</span>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Every simulation run accepts an explicit integer seed (default: <span className="bp-mono font-semibold">seed=42</span>). This guarantees identical stochastic distributions across subsequent runs, satisfying formal external audit requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

