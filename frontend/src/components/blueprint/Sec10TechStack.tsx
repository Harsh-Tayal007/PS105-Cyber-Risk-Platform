import React from 'react';
import { TECH_STACK } from '../../lib/blueprintContent';

export const Sec10TechStack: React.FC = () => {
  return (
    <div className="space-y-6">
      <p className="text-xs text-[var(--bp-muted)] leading-relaxed">
        PS105 is built using modern production-grade primitives across presentation, backend web services, mathematical optimization, and public intelligence telemetry.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {TECH_STACK.map((category) => (
          <div
            key={category.category}
            className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--bp-line)] pb-2">
              <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
                {category.category}
              </h4>
              <span className="bp-mono text-[10px] text-[var(--bp-accent)] font-semibold uppercase">
                {category.techs.length} components
              </span>
            </div>

            <div className="space-y-2">
              {category.techs.map((tech) => (
                <div
                  key={tech.name}
                  className="p-2.5 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[var(--bp-ink)]">
                      {tech.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--bp-muted)] leading-relaxed">
                    {tech.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

