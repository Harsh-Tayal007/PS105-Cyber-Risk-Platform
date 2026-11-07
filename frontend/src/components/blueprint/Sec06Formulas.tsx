import React, { useState } from 'react';
import { FORMULA_GROUPS } from '../../lib/blueprintContent';
import { FormulaBlock } from './FormulaBlock';

export const Sec06Formulas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('risk');

  const currentGroup = FORMULA_GROUPS.find((g) => g.id === activeTab) || FORMULA_GROUPS[0];

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--bp-line)] pb-3">
        {FORMULA_GROUPS.map((grp) => (
          <button
            key={grp.id}
            type="button"
            onClick={() => setActiveTab(grp.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === grp.id
                ? 'bg-[var(--bp-accent)] text-white shadow-sm'
                : 'bg-[var(--bp-surface)] text-[var(--bp-muted)] hover:text-[var(--bp-ink)] border border-[var(--bp-line)]'
            }`}
          >
            {grp.label}
          </button>
        ))}
      </div>

      {/* Formula Table for Desktop, Card Stack for Mobile */}
      <div className="overflow-x-auto rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--bp-line)] bg-[var(--bp-surface-2)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--bp-muted)] w-28">Symbol</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--bp-muted)] w-44">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--bp-muted)]">Expression</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--bp-muted)]">Definition</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--bp-muted)]">ABC Bank Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bp-line)]">
            {currentGroup.formulas.map((item) => (
              <tr key={item.abbr} className="hover:bg-[var(--bp-surface-2)]/50 transition-colors">
                <td className="px-4 py-3 font-semibold text-[var(--bp-accent)] whitespace-nowrap bp-mono">
                  {item.abbr}
                </td>
                <td className="px-4 py-3 font-medium text-[var(--bp-ink)]">
                  {item.full}
                </td>
                <td className="px-4 py-3">
                  <FormulaBlock formula={item.latex} displayMode={false} />
                </td>
                <td className="px-4 py-3 text-[var(--bp-muted)] leading-relaxed">
                  {item.meaning}
                </td>
                <td className="px-4 py-3 text-[var(--bp-ink)] font-mono text-[11px] leading-relaxed">
                  {item.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Worked Mini Example */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent-soft)] text-[var(--bp-accent)] bp-mono">
            WORKED PROOF
          </span>
          <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
            End-to-End Quantitative Risk Derivation (Core Banking DB)
          </h4>
        </div>

        <div className="grid sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-1">
            <span className="text-[10px] font-bold text-[var(--bp-muted)] uppercase">1. Asset Value</span>
            <p className="font-semibold text-[var(--bp-ink)] text-sm">₹2,00,00,000</p>
            <p className="text-[11px] text-[var(--bp-muted)]">Core Banking DB</p>
          </div>
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-1">
            <span className="text-[10px] font-bold text-[var(--bp-muted)] uppercase">2. Exposure (EF)</span>
            <p className="font-semibold text-[var(--bp-ink)] text-sm">0.80 (80%)</p>
            <p className="text-[11px] text-[var(--bp-muted)]">SLE = ₹1,60,00,000</p>
          </div>
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-1">
            <span className="text-[10px] font-bold text-[var(--bp-muted)] uppercase">3. Frequency (ARO)</span>
            <p className="font-semibold text-[var(--bp-ink)] text-sm">0.695 / year</p>
            <p className="text-[11px] text-[var(--bp-muted)]">P(threat) × M(exploit)</p>
          </div>
          <div className="p-3 rounded-lg border border-[var(--bp-accent)] bg-[var(--bp-accent-soft)] space-y-1">
            <span className="text-[10px] font-bold text-[var(--bp-accent)] uppercase">4. Baseline ALE</span>
            <p className="font-semibold text-[var(--bp-ink)] text-sm">₹1,11,20,000</p>
            <p className="text-[11px] text-[var(--bp-muted)]">SLE × ARO baseline loss</p>
          </div>
        </div>

        <div className="text-xs text-[var(--bp-muted)] leading-relaxed border-t border-[var(--bp-line)] pt-3">
          <strong className="text-[var(--bp-ink)]">Multiplicative Mitigation:</strong> When Database Encryption (60% effective) and Privileged Access Management (50% effective) are applied, the residual loss is not reduced by 110%. Instead:
          <div className="my-2">
            <FormulaBlock formula="\text{Residual ALE} = \text{₹10.625 Cr} \times (1 - 0.60) \times (1 - 0.50) = \text{₹10.625 Cr} \times 0.20 = \text{₹2.125 Cr}" />
          </div>
          Net risk reduction achieved = 80.0%, preserving realistic diminishing defensive returns.
        </div>
      </div>
    </div>
  );
};
