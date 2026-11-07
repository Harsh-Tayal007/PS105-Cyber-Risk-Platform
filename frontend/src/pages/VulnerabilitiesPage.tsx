import React, { useEffect, useState, useMemo } from 'react';
import { getVulnerabilityIntelligence, getVerifiedFindings } from '../lib/api/vulnerabilities';
import { getAssets } from '../lib/api/assets';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { RiskBadge } from '../components/ui/RiskBadge';
import { InfoTip } from '../components/ui/InfoTip';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import type { VulnerabilityResponse, FindingResponse, AssetResponse } from '@/types';
import {
  ShieldAlert,
  Database,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Search,
  Info,
} from 'lucide-react';

export const VulnerabilitiesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'findings' | 'intelligence'>('findings');
  const [intelligence, setIntelligence] = useState<VulnerabilityResponse[]>([]);
  const [findings, setFindings] = useState<FindingResponse[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [kevOnly, setKevOnly] = useState(false);

  // Expandable row state
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());
  const [expandedIntel, setExpandedIntel] = useState<Set<number>>(new Set());
  const [copiedCpe, setCopiedCpe] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [intelData, findingsData, assetsData] = await Promise.all([
        getVulnerabilityIntelligence(),
        getVerifiedFindings(),
        getAssets().catch(() => []),
      ]);
      setIntelligence(intelData);
      setFindings(findingsData);
      setAssets(assetsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vulnerability intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick lookup maps
  const assetMap = useMemo(() => {
    const map = new Map<number, AssetResponse>();
    assets.forEach((a) => map.set(a.asset_id, a));
    return map;
  }, [assets]);

  const vulnMap = useMemo(() => {
    const map = new Map<number, VulnerabilityResponse>();
    intelligence.forEach((v) => map.set(v.vulnerability_id, v));
    return map;
  }, [intelligence]);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const vuln = vulnMap.get(f.vulnerability_id);
      const cveId = vuln ? vuln.cve_id : '';
      const q = searchQuery.toLowerCase().trim();

      const matchesQuery =
        !q ||
        cveId.toLowerCase().includes(q) ||
        f.matched_cpe.toLowerCase().includes(q) ||
        `#find-${f.finding_id}`.includes(q);

      const cvss = vuln ? vuln.cvss_score : 5.0;
      let sev = 'LOW';
      if (cvss >= 9.0) sev = 'CRITICAL';
      else if (cvss >= 7.0) sev = 'HIGH';
      else if (cvss >= 4.0) sev = 'MEDIUM';

      const matchesSeverity =
        severityFilter === 'All Severities' || sev === severityFilter;

      const isKev = vuln ? vuln.cisa_kev_listed : false;
      const matchesKev = !kevOnly || isKev;

      return matchesQuery && matchesSeverity && matchesKev;
    });
  }, [findings, vulnMap, searchQuery, severityFilter, kevOnly]);

  // Filtered Intelligence
  const filteredIntelligence = useMemo(() => {
    return intelligence.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        v.cve_id.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q));

      let sev = 'LOW';
      if (v.cvss_score >= 9.0) sev = 'CRITICAL';
      else if (v.cvss_score >= 7.0) sev = 'HIGH';
      else if (v.cvss_score >= 4.0) sev = 'MEDIUM';

      const matchesSeverity =
        severityFilter === 'All Severities' || sev === severityFilter;

      const matchesKev = !kevOnly || v.cisa_kev_listed;

      return matchesQuery && matchesSeverity && matchesKev;
    });
  }, [intelligence, searchQuery, severityFilter, kevOnly]);

  const toggleFindingExpand = (id: number) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleIntelExpand = (id: number) => {
    setExpandedIntel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCpe(text);
    setTimeout(() => setCopiedCpe(null), 2000);
  };

  if (loading) {
    return (
      <LoadingState
        message="Loading Vulnerability Intelligence & Findings..."
        subtitle="Correlating NVD database and automated CPE applicability records"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Vulnerabilities API Error"
        errorDetails={error}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Workflow Page Header */}
      <PageHeader
        title="Vulnerabilities & Findings"
        description="Correlate enterprise software inventory against known CVEs and verified exploit databases."
        step={{ current: 2, total: 6 }}
      />

      {/* Required Callout Banner */}
      <div className="flex items-center gap-2.5 p-3 rounded-[10px] bg-surface border border-line text-xs text-muted">
        <Info className="w-4 h-4 text-brand shrink-0" />
        <span>
          A CVE only becomes a finding when the asset's product and version match. Assets without a
          version are never flagged.
        </span>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          {
            id: 'findings',
            label: 'Verified Findings',
            icon: <CheckCircle2 className="w-4 h-4" />,
            badge: findings.length,
          },
          {
            id: 'intelligence',
            label: 'Public Vulnerability Intelligence',
            icon: <Database className="w-4 h-4" />,
            badge: intelligence.length,
          },
        ]}
      />

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface border border-line rounded-[10px]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'findings' ? 'Search CVE, CPE, or ID...' : 'Search CVE ID or description...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          >
            <option value="All Severities">All Severities</option>
            <option value="CRITICAL">Critical (CVSS 9.0+)</option>
            <option value="HIGH">High (CVSS 7.0-8.9)</option>
            <option value="MEDIUM">Medium (CVSS 4.0-6.9)</option>
            <option value="LOW">Low (CVSS &lt;4.0)</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-ink">
            <input
              type="checkbox"
              checked={kevOnly}
              onChange={(e) => setKevOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-surface border-line text-brand focus:ring-0 cursor-pointer"
            />
            <span>CISA KEV only</span>
          </label>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'findings' ? (
        filteredFindings.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-line rounded-[10px]">
            <p className="text-xs text-muted">
              {findings.length === 0
                ? 'No verified vulnerability findings detected for your registered assets.'
                : 'No findings matching your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-ink">
                <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                  <tr>
                    <th scope="col" className="w-8 px-3 py-3" />
                    <th scope="col" className="px-4 py-3 font-medium">CVE & Finding</th>
                    <th scope="col" className="px-4 py-3 font-medium">Target Asset</th>
                    <th scope="col" className="px-4 py-3 font-medium">Matched CPE</th>
                    <th scope="col" className="px-4 py-3 font-medium">Installed Version</th>
                    <th scope="col" className="px-4 py-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredFindings.map((f) => {
                    const isExpanded = expandedFindings.has(f.finding_id);
                    const asset = assetMap.get(f.asset_id);
                    const vuln = vulnMap.get(f.vulnerability_id);
                    const cvss = vuln ? vuln.cvss_score : 5.0;
                    const sev = cvss >= 9.0 ? 'CRITICAL' : cvss >= 7.0 ? 'HIGH' : 'MEDIUM';

                    return (
                      <React.Fragment key={f.finding_id}>
                        <tr
                          onClick={() => toggleFindingExpand(f.finding_id)}
                          className="hover:bg-surface-2/60 transition-colors duration-150 cursor-pointer"
                        >
                          <td className="px-3 py-3 text-muted">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-brand" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-medium text-ink">
                                {vuln ? vuln.cve_id : `#FIND-${f.finding_id}`}
                              </span>
                              {vuln?.cisa_kev_listed && (
                                <Badge variant="danger" size="sm">
                                  KEV
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted font-mono block">
                              #FIND-{f.finding_id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-ink block truncate max-w-xs">
                              {asset ? asset.name : `Asset #${f.asset_id}`}
                            </span>
                            <span className="text-[11px] text-muted font-mono">
                              Asset #{f.asset_id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-muted block max-w-xs truncate">
                              {f.matched_cpe}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-ink font-medium">
                              v{f.matched_version}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="success" size="sm">
                                {f.confidence}
                              </Badge>
                              <InfoTip content="Vendor, product and version all matched an NVD version range." />
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Evidence Row */}
                        {isExpanded && (
                          <tr className="bg-surface-2/30">
                            <td colSpan={6} className="px-6 py-4 border-t border-line/60">
                              <div className="space-y-3 max-w-3xl">
                                <h4 className="text-xs font-semibold text-ink font-serif">
                                  Vulnerability Evidence & Provenance
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div className="p-3 bg-surface rounded-[8px] border border-line space-y-1.5">
                                    <div className="text-muted">Provenance Source</div>
                                    <div className="font-medium text-ink flex items-center justify-between">
                                      <span>{f.source_name}</span>
                                      {f.source_url && (
                                        <a
                                          href={f.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-brand hover:underline inline-flex items-center gap-1 text-[11px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <span>External Link</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted">
                                      Retrieved: {new Date(f.retrieved_at).toLocaleString()}
                                    </div>
                                  </div>

                                  <div className="p-3 bg-surface rounded-[8px] border border-line space-y-1.5">
                                    <div className="text-muted">CVSS Metric & Threat Score</div>
                                    <div className="flex items-center gap-2">
                                      <RiskBadge severity={sev} size="sm" />
                                      <span className="font-mono text-xs font-medium text-ink">
                                        CVSS v3.1: {cvss.toFixed(1)}
                                      </span>
                                    </div>
                                    {vuln?.description && (
                                      <p className="text-[11px] text-muted line-clamp-2 mt-1">
                                        {vuln.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 bg-surface rounded-[8px] border border-line space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted">Matched CPE Uniform Resource Name</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(f.matched_cpe);
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline cursor-pointer"
                                    >
                                      {copiedCpe === f.matched_cpe ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy CPE</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <p className="font-mono text-xs text-ink break-all select-all">
                                    {f.matched_cpe}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Intelligence Tab */
        filteredIntelligence.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-line rounded-[10px]">
            <p className="text-xs text-muted">No public vulnerability intelligence matching criteria.</p>
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-ink">
                <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                  <tr>
                    <th scope="col" className="w-8 px-3 py-3" />
                    <th scope="col" className="px-4 py-3 font-medium">CVE ID</th>
                    <th scope="col" className="px-4 py-3 font-medium">CVSS v3.1</th>
                    <th scope="col" className="px-4 py-3 font-medium">CISA KEV Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Published Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredIntelligence.map((v) => {
                    const isExpanded = expandedIntel.has(v.vulnerability_id);
                    const sev = v.cvss_score >= 9.0 ? 'CRITICAL' : v.cvss_score >= 7.0 ? 'HIGH' : 'MEDIUM';

                    return (
                      <React.Fragment key={v.vulnerability_id}>
                        <tr
                          onClick={() => toggleIntelExpand(v.vulnerability_id)}
                          className="hover:bg-surface-2/60 transition-colors duration-150 cursor-pointer"
                        >
                          <td className="px-3 py-3 text-muted">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-brand" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-ink">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-muted shrink-0" />
                              <span>{v.cve_id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <RiskBadge severity={sev} size="sm" />
                              <span className="font-mono text-xs font-medium text-ink">
                                {v.cvss_score.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {v.cisa_kev_listed ? (
                              <Badge variant="danger" size="sm">
                                Active KEV Exploit
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted">Not Listed</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            {v.published_date
                              ? new Date(v.published_date).toLocaleDateString()
                              : 'N/A'}
                          </td>
                        </tr>

                        {/* Description on Row Expand */}
                        {isExpanded && (
                          <tr className="bg-surface-2/30">
                            <td colSpan={5} className="px-6 py-4 border-t border-line/60">
                              <div className="space-y-1.5 max-w-3xl">
                                <h4 className="text-xs font-semibold text-ink font-serif">
                                  Official NVD Vulnerability Description
                                </h4>
                                <p className="text-xs text-muted leading-relaxed">
                                  {v.description || 'No detailed description available in NVD record.'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};
