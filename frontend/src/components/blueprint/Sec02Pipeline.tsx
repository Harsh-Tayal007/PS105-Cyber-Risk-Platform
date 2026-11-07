import React from 'react';
import { DiagBox, Arrow, StepList } from './DiagramPrimitives';
import { PIPELINE_NODES, DEMO_STEPS } from '../../lib/blueprintContent';

interface Sec02PipelineProps {
  onSelectTab?: (tabId: string) => void;
}

export const Sec02Pipeline: React.FC<Sec02PipelineProps> = ({ onSelectTab }) => {
  return (
    <div className="space-y-6">
      {/* Horizontal Pipeline Diagram */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--bp-muted)] uppercase tracking-wide">
            7-Stage Risk Analytics Pipeline
          </h3>
          <span className="text-xs text-[var(--bp-muted)] italic">
            Click any node to navigate to its module
          </span>
        </div>

        <div className="overflow-x-auto pb-4 pt-1">
          <div className="flex items-center gap-1.5 min-w-[1040px]">
            {PIPELINE_NODES.map((node, idx) => (
              <React.Fragment key={node.id}>
                <div className="w-[140px] shrink-0">
                  <DiagBox
                    title={node.name}
                    subtitle={node.output}
                    tag={`#0${idx + 1}`}
                    variant={idx === 0 || idx === 6 ? 'accent' : 'default'}
                    onClick={onSelectTab ? () => onSelectTab(node.tabId) : undefined}
                    className="h-[135px] flex flex-col justify-between"
                  />
                </div>
                {idx < PIPELINE_NODES.length - 1 && (
                  <Arrow direction="right" className="opacity-70" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--bp-muted)] leading-relaxed mt-1">
          Figure 2.1: Deterministic pipeline flow from enterprise asset registration to boardroom-ready consulting report compilation.
        </p>
      </div>

      {/* Guided Walkthrough Steps */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
          Step-by-Step Guided Walkthrough (ABC Financial Services Demo)
        </h3>
        <StepList steps={DEMO_STEPS} onSelectTab={onSelectTab} />
      </div>
    </div>
  );
};

