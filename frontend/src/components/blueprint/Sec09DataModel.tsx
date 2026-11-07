import React from 'react';
import { Collapsible } from '../ui/Collapsible';

export const Sec09DataModel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Note */}
      <p className="text-xs text-[var(--bp-muted)] leading-relaxed">
        The PS105 database schema enforces strict relational integrity in Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF), isolating organizations into multi-tenant partition spaces with deterministic foreign key linkages.
      </p>

      {/* Relational Entity Grid */}
      <div className="rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] p-5 space-y-4">
        <h4 className="font-semibold text-sm text-[var(--bp-ink)]">
          Core Relational Entities & Cardinality Schema
        </h4>

        <div className="grid md:grid-cols-3 gap-3 text-xs">
          {/* Identity & Scope */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">MULTI-TENANCY</span>
            <div className="font-semibold text-[var(--bp-ink)]">Organization</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>PK: organization_id</div>
              <div>name, industry, revenue</div>
              <div>cyber_budget</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              1 : N → Users, Assets, Scenarios
            </div>
          </div>

          {/* Assets & Software */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">TELEMETRY</span>
            <div className="font-semibold text-[var(--bp-ink)]">Asset</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>PK: asset_id | FK: org_id</div>
              <div>name, asset_type, criticality</div>
              <div>business_value, cpe_vendor, cpe_product, installed_version</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              1 : N → Findings, Risks
            </div>
          </div>

          {/* Vulnerability Dict */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">PUBLIC INTEL</span>
            <div className="font-semibold text-[var(--bp-ink)]">Vulnerability &amp; CPE</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>PK: vulnerability_id (cve_id)</div>
              <div>cvss_score, cisa_kev_listed</div>
              <div>VulnerabilityCPE: version bounds</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              1 : N → Findings
            </div>
          </div>

          {/* Findings */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">CORRELATION</span>
            <div className="font-semibold text-[var(--bp-ink)]">AssetVulnerabilityFinding</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>PK: finding_id</div>
              <div>FK: asset_id, vulnerability_id</div>
              <div>confidence, source, retrieved_at</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              1 : N → Risks (or XOR Asset)
            </div>
          </div>

          {/* Risk Models */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">QUANTIFICATION</span>
            <div className="font-semibold text-[var(--bp-ink)]">Risk &amp; Threat</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>PK: risk_id | FK: org_id</div>
              <div>FK: finding_id (XOR asset_id)</div>
              <div>exposure_factor, threat_frequency</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              M : N → SecurityControls
            </div>
          </div>

          {/* Controls & Scenarios */}
          <div className="p-3 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface-2)] space-y-2">
            <span className="bp-mono text-[10px] font-bold text-[var(--bp-accent)]">DECISION</span>
            <div className="font-semibold text-[var(--bp-ink)]">SecurityControl &amp; Scenarios</div>
            <div className="bp-mono text-[11px] text-[var(--bp-muted)] space-y-0.5">
              <div>SecurityControl: cost, effectiveness</div>
              <div>RiskControl: mitigation_rate</div>
              <div>Scenario: available_budget, org_id</div>
            </div>
            <div className="text-[10px] text-[var(--bp-accent)] font-semibold border-t border-[var(--bp-line)] pt-1">
              Output: Knapsack Portfolios
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible: Why XOR? */}
      <Collapsible
        variant="card"
        label={
          <div className="flex items-center gap-2">
            <span className="bp-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent-soft)] text-[var(--bp-accent)]">
              SCHEMA RULE
            </span>
            <span className="font-semibold text-sm text-[var(--bp-ink)]">
              Why the Risk finding_id XOR asset_id Constraint?
            </span>
          </div>
        }
      >
        <div className="p-4 pt-1 space-y-3 text-xs border-t border-[var(--bp-line)] mt-3">
          <p className="text-[var(--bp-ink)] leading-relaxed">
            In enterprise risk management, risks stem from two distinct sources:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-[var(--bp-muted)]">
            <li>
              <strong className="text-[var(--bp-ink)]">Specific Verified CVE Findings:</strong> A risk directly associated with a known software flaw (e.g., CVE-2022-1552 on PostgreSQL). Here, <span className="bp-mono font-semibold">finding_id</span> is set, which transitively connects to the underlying asset.
            </li>
            <li>
              <strong className="text-[var(--bp-ink)]">Asset Baseline Risks:</strong> Systemic threats that exist independent of known CVEs (e.g., insider threat, physical data center fire, credential theft). Here, <span className="bp-mono font-semibold">asset_id</span> is set directly, and <span className="bp-mono font-semibold">finding_id</span> is null.
            </li>
          </ol>
          <p className="text-[var(--bp-muted)] leading-relaxed">
            The database enforces <span className="bp-mono font-semibold text-[var(--bp-accent)]">(finding_id IS NOT NULL AND asset_id IS NULL) OR (finding_id IS NULL AND asset_id IS NOT NULL)</span> to ensure no risk is double-counted or ambiguous during monetary aggregation.
          </p>
        </div>
      </Collapsible>
    </div>
  );
};
