import React from 'react';

interface LayerProps {
  label: string;
  color: string;
  items: { name: string; detail?: string }[];
}

const Layer: React.FC<LayerProps> = ({ label, color, items }) => (
  <div className="rounded-xl border border-[var(--bp-line)] overflow-hidden">
    <div
      className="px-4 py-2 text-xs font-semibold uppercase tracking-widest"
      style={{ background: color, color: 'var(--bp-ink)' }}
    >
      {label}
    </div>
    <div className="flex flex-wrap gap-2 p-3 bg-[var(--bp-surface)]">
      {items.map((it) => (
        <div
          key={it.name}
          className="flex flex-col rounded-lg border border-[var(--bp-line)] px-3 py-2 text-xs"
        >
          <span className="font-semibold text-[var(--bp-ink)]">{it.name}</span>
          {it.detail && (
            <span className="text-[var(--bp-muted)] text-[11px] mt-0.5">{it.detail}</span>
          )}
        </div>
      ))}
    </div>
  </div>
);

const VerticalArrow: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center my-1 select-none">
    {label && (
      <span className="text-[10px] text-[var(--bp-muted)] mb-0.5" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
        {label}
      </span>
    )}
    <svg className="w-4 h-5 text-[var(--bp-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m0 0l-5-5m5 5l5-5" />
    </svg>
  </div>
);

export const Sec03Architecture: React.FC = () => (
  <div className="space-y-6">
    <div className="grid xl:grid-cols-[1fr_220px] gap-4 items-start">
      {/* Main stack */}
      <div className="space-y-1 overflow-x-auto">
        <Layer
          label="Presentation layer — React 19 SPA"
          color="var(--bp-accent-soft)"
          items={[
            { name: 'BlueprintPage', detail: 'This page' },
            { name: 'OverviewPage', detail: 'Dashboard' },
            { name: 'AssetsPage' },
            { name: 'VulnerabilitiesPage' },
            { name: 'RisksPage' },
            { name: 'SimulationsPage' },
            { name: 'OptimizationPage' },
            { name: 'ReportsPage' },
          ]}
        />
        <VerticalArrow label="fetch() REST / JSON" />

        <Layer
          label="API gateway — FastAPI + JWT auth"
          color="#E8F4EE"
          items={[
            { name: '/api/assets', detail: 'CRUD endpoints' },
            { name: '/api/vulnerabilities' },
            { name: '/api/risks' },
            { name: '/api/simulations' },
            { name: '/api/optimization' },
            { name: '/api/reports', detail: 'PDF generation' },
            { name: '/api/settings' },
          ]}
        />
        <VerticalArrow label="SQLAlchemy ORM" />

        <div className="grid sm:grid-cols-2 gap-2">
          <Layer
            label="Analytic engine layer — Python"
            color="#F0F4E8"
            items={[
              { name: 'RiskQuantificationEngine', detail: 'FAIR FLET model' },
              { name: 'MonteCarloEngine', detail: 'Poisson × LogNormal' },
              { name: 'OptimizationEngine', detail: 'PuLP CBC MILP' },
              { name: 'CPEMatcherService', detail: 'NVD version ranges' },
              { name: 'ReportService', detail: 'ReportLab PDF' },
            ]}
          />
          <Layer
            label="Data layer — SQLite / PostgreSQL"
            color="#F4F0E8"
            items={[
              { name: 'Organization' },
              { name: 'Asset' },
              { name: 'Vulnerability / CPE' },
              { name: 'Finding' },
              { name: 'Risk / Threat' },
              { name: 'SecurityControl' },
              { name: 'Scenario' },
            ]}
          />
        </div>
      </div>

      {/* External feeds panel */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-4 space-y-3">
        <h4 className="text-xs font-semibold text-[var(--bp-muted)] uppercase tracking-wide">
          External intelligence feeds
        </h4>
        {[
          { name: 'NIST NVD', desc: 'CVE records & CVSS v3.1 scores', url: 'nvd.nist.gov' },
          { name: 'CISA KEV', desc: 'Known exploited vulnerabilities catalog', url: 'cisa.gov/kev' },
          { name: 'MITRE ATT&CK', desc: 'Enterprise threat tactic matrix', url: 'attack.mitre.org' },
          { name: 'NIST CPE 2.3', desc: 'Software platform enumeration dictionary', url: 'nvd.nist.gov/products/cpe' },
        ].map((f) => (
          <div key={f.name} className="border-b border-[var(--bp-line)] pb-2 last:border-0 last:pb-0">
            <p className="text-xs font-semibold text-[var(--bp-ink)]">{f.name}</p>
            <p className="text-[11px] text-[var(--bp-muted)]">{f.desc}</p>
            <p
              className="text-[10px] mt-0.5 text-[var(--bp-muted)]"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {f.url}
            </p>
          </div>
        ))}

        <div
          className="rounded-lg p-3 text-xs text-[var(--bp-muted)] mt-2"
          style={{ background: 'var(--bp-accent-soft)' }}
        >
          <p className="font-semibold text-[var(--bp-ink)] mb-1">Passive only</p>
          <p className="leading-relaxed">
            All intelligence data is fetched and cached. PS105 performs no active network scanning or probing of monitored infrastructure.
          </p>
        </div>
      </div>
    </div>

    {/* Key design decisions */}
    <div>
      <h3 className="text-sm font-semibold text-[var(--bp-muted)] mb-3 uppercase tracking-wide">
        Architectural decisions
      </h3>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {[
          ['Modular monolith', 'Engines are plain Python classes, not microservices — zero infrastructure overhead for a 5-person security team.'],
          ['Stateless JWT auth', 'No server-side sessions. Each request carries a signed bearer token, enabling horizontal scale-out.'],
          ['SQLite default → Postgres ready', 'Ships with SQLite for zero-config evaluation. The SQLAlchemy ORM switches to Postgres by changing one env var.'],
          ['SPA + REST', 'The frontend is a fully decoupled SPA. The API can serve mobile, CLI, or Jupyter notebook clients identically.'],
        ].map(([title, body]) => (
          <div
            key={title as string}
            className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-4"
          >
            <p className="font-semibold text-[var(--bp-ink)] mb-1">{title}</p>
            <p className="text-[var(--bp-muted)] leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

