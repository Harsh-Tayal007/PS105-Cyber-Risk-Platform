import React, { useState, useMemo } from 'react';
import { downloadExecutivePdfReport } from '../lib/api/reports';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { InfoTip } from '../components/ui/InfoTip';
import { ErrorState } from '../components/ui/ErrorState';
import {
  FileText,
  Download,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SectionOption {
  key: string;
  name: string;
  description: string;
  info: string;
  approxPages: number;
  locked?: boolean;
}

const REPORT_SECTIONS_SPEC: SectionOption[] = [
  {
    key: 'cover_toc',
    name: 'Cover & Table of Contents',
    description: 'Corporate branding, reference ID, and interactive hyperlinked contents.',
    info: 'Always included. Foundation of the boardroom document structure.',
    approxPages: 2,
    locked: true,
  },
  {
    key: 'summary',
    name: '1. Executive Summary',
    description: '6 core financial KPI tiles, narrative takeaways, and decision request box.',
    info: 'Provides high-level leadership metrics including ALE baseline, residual loss, and ROSI.',
    approxPages: 1,
  },
  {
    key: 'assets',
    name: '2. Enterprise Asset Inventory',
    description: 'Hardware, software, and data repositories mapped to replacement and business values.',
    info: 'Categorization and version attribution necessary for vulnerability matching.',
    approxPages: 1,
  },
  {
    key: 'findings',
    name: '3. Vulnerability Findings & Provenance',
    description: 'Correlated CVE records, CVSS v3.1 scores, CISA KEV exploitation tags, and matched CPEs.',
    info: 'Authoritative vulnerability intelligence confirming actual asset exposure.',
    approxPages: 1,
  },
  {
    key: 'risks',
    name: '4. Quantitative Risk Register (SLE × ARO)',
    description: 'SLE × ARO = ALE calculations, 5×5 likelihood-impact heatmap, and risk ranking bar chart.',
    info: 'Deterministic financial loss expectations across all active threats.',
    approxPages: 1,
  },
  {
    key: 'simulation',
    name: '5. Monte Carlo Stochastic Loss Simulations',
    description: 'Poisson-LogNormal distributions, P10/P50/P90/P95 Value-at-Risk, and loss exceedance curve.',
    info: 'Probability modeling evaluating worst-case tail risk across simulations.',
    approxPages: 1,
  },
  {
    key: 'optimization',
    name: '6. Security Investment Optimization & ROSI',
    description: 'Knapsack/MILP optimal security portfolio, budget utilization bar, and mathematical verification.',
    info: 'Proves mathematically whether optimal loss reduction matches exhaustive search.',
    approxPages: 1,
  },
  {
    key: 'scenarios',
    name: '7. Scenario Comparison & Efficient Frontier',
    description: 'Cross-budget scenario comparison matrix and efficient frontier trade-off curve.',
    info: 'Examines diminishing returns across varied enterprise budget thresholds.',
    approxPages: 1,
  },
  {
    key: 'methodology',
    name: '8. Methodology & Mathematical Formulas',
    description: 'Mathematical formula definitions, quantitative assumptions, and solver specifications.',
    info: 'Defensible mathematical documentation supporting external audit and board scrutiny.',
    approxPages: 1,
  },
  {
    key: 'limitations',
    name: '9. Data Sources, Assumptions & Limitations',
    description: 'Analytical assumptions, data source citations, and operational model constraints.',
    info: 'Documents what the model assumes and where intelligence data originates.',
    approxPages: 1,
  },
  {
    key: 'glossary',
    name: '10. Cyber Risk Glossary',
    description: 'Authoritative definitions for executive stakeholders (CVE, CVSS, CPE, KEV, FAIR, MILP, VaR).',
    info: 'Plain-English technical translation dictionary for non-technical leadership.',
    approxPages: 1,
  },
  {
    key: 'sign_off',
    name: '11. Executive Sign-Off & Governance Attestation',
    description: 'Formal sign-off register for CISO, CFO, and Chief Executive Officer approval.',
    info: 'Always included. Final governance verification and acknowledgment block.',
    approxPages: 1,
    locked: true,
  },
];

const OPTIONAL_KEYS = REPORT_SECTIONS_SPEC.filter((s) => !s.locked).map((s) => s.key);

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All optional sections selected by default
  const [selectedKeys, setSelectedKeys] = useState<string[]>(OPTIONAL_KEYS);

  const toggleSection = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => setSelectedKeys(OPTIONAL_KEYS);
  const handleClearAll = () => setSelectedKeys([]);

  // Compute estimated total pages
  const estimatedPageCount = useMemo(() => {
    return REPORT_SECTIONS_SPEC.reduce((sum, sec) => {
      if (sec.locked || selectedKeys.includes(sec.key)) {
        return sum + sec.approxPages;
      }
      return sum;
    }, 0);
  }, [selectedKeys]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setError(null);

      // If all are selected, pass undefined to retrieve all sections cleanly
      const payloadSections =
        selectedKeys.length === OPTIONAL_KEYS.length ? undefined : selectedKeys;

      const pdfBlob = await downloadExecutivePdfReport(payloadSections);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfBlob.filename || 'PS105_Executive_Cyber_Risk_Report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download executive PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Executive Reports"
        description="Generate and export comprehensive board-ready quantitative cyber risk documentation."
        step={{ current: 6, total: 6 }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Configuration & Download Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-[10px] bg-surface border border-line space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-soft border border-brand/20 rounded-[10px] text-brand shrink-0">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink font-serif tracking-tight">
                    Executive Cyber Risk & Investment Optimization Report
                  </h3>
                  <Badge variant="primary" size="sm">
                    Board-Ready PDF
                  </Badge>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Compiles verified organization assets, active NVD/CISA vulnerabilities, quantitative SLE/ARO/ALE
                  financial exposure, and the solver-verified optimal security control portfolio.
                </p>
              </div>
            </div>

            {/* Section Selection Toolbar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand" />
                  <h4 className="text-xs font-semibold text-ink">
                    Report Sections &amp; Document Composition
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-brand hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-muted hover:text-ink hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Real Interactive Checkboxes List */}
              <div className="space-y-2">
                {REPORT_SECTIONS_SPEC.map((sec) => {
                  const isChecked = sec.locked || selectedKeys.includes(sec.key);

                  return (
                    <div
                      key={sec.key}
                      onClick={() => !sec.locked && toggleSection(sec.key)}
                      className={`p-3 rounded-[8px] border transition-all flex items-start justify-between gap-3 ${
                        sec.locked
                          ? 'bg-surface-2/60 border-line text-muted cursor-default'
                          : isChecked
                          ? 'bg-brand-soft/20 border-brand/50 cursor-pointer'
                          : 'bg-surface border-line hover:border-brand/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5 shrink-0">
                          {sec.locked ? (
                            <div className="p-1 rounded bg-surface border border-line text-muted" title="Always included">
                              <Lock className="w-3.5 h-3.5 text-muted" />
                            </div>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSection(sec.key)}
                              className="rounded border-line text-brand focus:ring-brand cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-ink font-sans">
                              {sec.name}
                            </span>
                            {sec.locked && (
                              <Badge variant="default" size="sm">
                                Always included
                              </Badge>
                            )}
                            <InfoTip content={sec.info} />
                          </div>
                          <p className="text-[11px] text-muted leading-relaxed">
                            {sec.description}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] text-muted font-mono shrink-0 whitespace-nowrap pt-0.5">
                        ~{sec.approxPages} {sec.approxPages === 1 ? 'page' : 'pages'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <ErrorState title="Report Generation Error" errorDetails={error} onRetry={handleDownloadPdf} />}

            {/* Bottom Actions Row */}
            <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Estimated Size: Approx. {estimatedPageCount} pages</span>
                </span>
                <span className="text-[11px] text-muted">
                  Vectorized ReportLab PDF • Boardroom-Ready
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handleDownloadPdf}
                isLoading={downloading}
                disabled={selectedKeys.length === 0}
                icon={<Download className="w-4 h-4" />}
              >
                {downloading ? 'Compiling PDF...' : 'Download Executive PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Col: Document Governance & Audit Specifications */}
        <div className="space-y-6">
          <div className="p-5 rounded-[10px] bg-surface border border-line space-y-4">
            <h4 className="text-sm font-semibold text-ink font-serif tracking-tight">
              Executive Briefing Standards
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Designed specifically for Board Audit Committees, Chief Financial Officers, and Enterprise Risk Officers.
            </p>

            <ul className="space-y-2.5 text-xs text-muted">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                <span>
                  <strong className="text-ink font-medium">Deterministic Transparency:</strong> Direct mathematical
                  SLE × ARO formula derivations for each enterprise asset.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                <span>
                  <strong className="text-ink font-medium">Stochastic Tail Risk:</strong> Monte Carlo 95th percentile
                  Value-at-Risk modeling based on 10,000 simulations.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-ok shrink-0 mt-0.5" />
                <span>
                  <strong className="text-ink font-medium">Optimization Audit:</strong> Integer programming solver audit
                  identifying maximum risk reduction under budget constraints.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
