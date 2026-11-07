import React from 'react';
import { FormulaBlock } from './FormulaBlock';

export const Sec08Optimization: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Knapsack Problem Framing */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent-soft)] text-[var(--bp-accent)] bp-mono">
            PROBLEM FORMULATION
          </span>
          <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
            The 0/1 Cyber Capital Allocation Knapsack
          </h4>
        </div>
        <p className="text-xs text-[var(--bp-muted)] leading-relaxed">
          The CISO must choose which cybersecurity controls to purchase from a candidate set of <span className="bp-mono font-semibold text-[var(--bp-ink)]">m</span> controls, each carrying cost <span className="bp-mono font-semibold text-[var(--bp-ink)]">c_j</span> and mitigating risk across enterprise threats, without exceeding total allocated cybersecurity budget <span className="bp-mono font-semibold text-[var(--bp-ink)]">B</span>.
        </p>
        <FormulaBlock formula="\max \sum_{j=1}^{m} \Delta \text{ALE}_j \cdot x_j \quad \text{s.t.} \quad \sum_{j=1}^{m} c_j \cdot x_j \le B, \quad x_j \in \{0, 1\}" />
      </div>

      {/* 3-Step Hybrid Optimization Pipeline */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
          3-Tier Hybrid Optimization Engine
        </h3>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STEP 1</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">MILP Candidate Selection</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              PuLP CBC mixed-integer solver evaluates the additive knapsack approximation under operational budget and dependency constraints:
            </p>
            <div className="p-2 rounded bg-[var(--bp-surface-2)] bp-mono text-[11px] text-[var(--bp-ink)]">
              x_child ≤ x_parent
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STEP 2</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">Multiplicative Evaluation</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              The engine recalculates true residual loss using non-linear diminishing returns to prevent over-estimating combined control effectiveness:
            </p>
            <FormulaBlock formula="\text{Residual} = \text{ALE}_0 \prod (1 - E_{ij} x_j)" displayMode={false} />
          </div>

          <div className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">STEP 3</span>
            <h4 className="font-semibold text-sm text-[var(--bp-ink)]">256-State Exhaustive Audit</h4>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Because <span className="bp-mono font-semibold">2^8 = 256</span> binary combinations is small, the engine iterates through all valid states to confirm whether MILP matched the true exhaustive optimum.
            </p>
            <div className="p-2 rounded bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold text-[11px]">
              ✓ Verified Optimal in &lt; 5 ms
            </div>
          </div>
        </div>
      </div>

      {/* Additive vs Multiplicative Divergence Card */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface-2)] p-4 space-y-3 text-xs">
        <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
          Why Additive Models Fail: The Compounding Divergence
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="font-bold text-red-600 uppercase text-[10px]">Naive Additive Model (Erroneous)</span>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              If Control A mitigates 60% and Control B mitigates 50%, naive summing predicts <span className="font-bold text-red-600">110% mitigation</span> (impossible negative residual risk).
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-green-600 uppercase text-[10px]">PS105 Multiplicative Compounding (Accurate)</span>
            <p className="text-[var(--bp-muted)] leading-relaxed">
              Compounding accounts for overlap: <span className="bp-mono font-semibold text-[var(--bp-ink)]">1 - (1 - 0.60)(1 - 0.50) = 80%</span> net risk mitigation. The second control acts only on residual unmitigated exposure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

