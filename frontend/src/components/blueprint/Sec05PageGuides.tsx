import React from 'react';
import { PAGE_GUIDES } from '../../lib/blueprintContent';
import { Collapsible } from '../ui/Collapsible';
import { FormulaBlock } from './FormulaBlock';

interface Sec05PageGuidesProps {
  onSelectTab?: (tabId: string) => void;
}

export const Sec05PageGuides: React.FC<Sec05PageGuidesProps> = ({ onSelectTab }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--bp-muted)]">
          Comprehensive module guides detailing inputs, outputs, mathematical formulations, and governance interpretation.
        </p>
      </div>

      <div className="space-y-3">
        {PAGE_GUIDES.map((page, index) => {
          return (
            <Collapsible
              key={page.id}
              variant="card"
              defaultOpen={index === 0}
              label={
                <div className="flex items-center gap-3">
                  <span
                    className="bp-mono text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'var(--bp-accent-soft)', color: 'var(--bp-accent)' }}
                  >
                    Module 0{index + 1}
                  </span>
                  <span className="font-semibold text-sm text-[var(--bp-ink)]">
                    {page.title}
                  </span>
                </div>
              }
            >
              <div className="p-4 pt-0 space-y-4 text-xs border-t border-[var(--bp-line)] mt-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-[var(--bp-muted)] uppercase tracking-wider text-[10px]">
                      Primary Purpose
                    </span>
                    <p className="text-[var(--bp-ink)] leading-relaxed">{page.purpose}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-[var(--bp-muted)] uppercase tracking-wider text-[10px]">
                      Data Inputs & Telemetry
                    </span>
                    <p className="text-[var(--bp-muted)] leading-relaxed">{page.inputs}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-[var(--bp-muted)] uppercase tracking-wider text-[10px]">
                      What You See (Visual Indicators)
                    </span>
                    <p className="text-[var(--bp-ink)] leading-relaxed">{page.whatYouSee}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-[var(--bp-muted)] uppercase tracking-wider text-[10px]">
                      How to Read & Governance Action
                    </span>
                    <p className="text-[var(--bp-muted)] leading-relaxed">{page.howToRead}</p>
                  </div>
                </div>

                {/* Key Formula */}
                <div className="rounded-lg p-3 border border-[var(--bp-line)] bg-[var(--bp-surface)]">
                  <span className="font-bold text-[var(--bp-muted)] uppercase tracking-wider text-[10px] block mb-1">
                    Governing Mathematical Expression
                  </span>
                  <FormulaBlock formula={page.formula} />
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[var(--bp-muted)]">
                    <strong className="text-[var(--bp-ink)]">Recommended Next Step:</strong> {page.typicalNext}
                  </span>
                  {onSelectTab && (
                    <button
                      type="button"
                      onClick={() => onSelectTab(page.tabId)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer border border-[var(--bp-accent)] text-[var(--bp-accent)] hover:bg-[var(--bp-accent-soft)] transition-colors shrink-0"
                    >
                      Open {page.title} →
                    </button>
                  )}
                </div>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
};
