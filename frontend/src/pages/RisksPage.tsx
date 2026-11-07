import React, { useEffect, useState, useMemo } from 'react';
import {
  getRiskAssessment,
  calculateRiskResiduals,
  getThreats,
  createRisk,
  autoMapRisks,
} from '../lib/api/risks';
import { getSecurityControls } from '../lib/api/controls';
import { getVerifiedFindings } from '../lib/api/vulnerabilities';
import { getAssets } from '../lib/api/assets';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { InfoTip } from '../components/ui/InfoTip';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { FinancialLossCard } from '../components/risk/FinancialLossCard';
import { RiskMatrix5x5 } from '../components/risk/RiskMatrix5x5';
import type {
  RiskQuantificationDict,
  SecurityControlResponse,
  ThreatResponse,
  FindingResponse,
  AssetResponse,
  RiskCreatePayload,
} from '@/types';
import { formatINR } from '../lib/format';
import { Sparkles, Plus, RefreshCw, CheckCircle2, ChevronDown, ArrowRight } from 'lucide-react';

export interface RisksPageProps {
  onSelectTab?: (tabId: string) => void;
}

export const RisksPage: React.FC<RisksPageProps> = ({ onSelectTab }) => {
  const [risks, setRisks] = useState<RiskQuantificationDict[]>([]);
  const [controls, setControls] = useState<SecurityControlResponse[]>([]);
  const [threats, setThreats] = useState<ThreatResponse[]>([]);
  const [findings, setFindings] = useState<FindingResponse[]>([]);
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('all');
  const [selectedControlIds, setSelectedControlIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'what-if'>('overview');
  const [showFormulas, setShowFormulas] = useState(false);

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<'finding' | 'asset'>('finding');
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [selectedThreatId, setSelectedThreatId] = useState<number | null>(null);
  const [likelihood, setLikelihood] = useState<number>(4);
  const [impact, setImpact] = useState<number>(4);
  const [exposureFactor, setExposureFactor] = useState<number>(0.85);

  const fetchRisksData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [risksData, controlsData, threatsData, findingsData, assetsData] = await Promise.all([
        getRiskAssessment(),
        getSecurityControls(),
        getThreats(),
        getVerifiedFindings().catch(() => []),
        getAssets().catch(() => []),
      ]);
      setRisks(risksData);
      setControls(controlsData);
      setThreats(threatsData);
      setFindings(findingsData);
      setAssets(assetsData);

      if (findingsData.length > 0) setSelectedFindingId(findingsData[0].finding_id);
      if (assetsData.length > 0) setSelectedAssetId(assetsData[0].asset_id);
      if (threatsData.length > 0) setSelectedThreatId(threatsData[0].threat_id);
    } catch (err: any) {
      setError(err.message || 'Failed to load organization risk assessment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisksData();
  }, []);

  // Filter risks by selected asset dropdown
  const filteredRisks = useMemo(() => {
    if (selectedAssetFilter === 'all') return risks;
    const targetAssetId = Number(selectedAssetFilter);
    return risks.filter((r) => r.asset_id === targetAssetId);
  }, [risks, selectedAssetFilter]);

  // Aggregate metrics for top StatCards
  const { totalSle, avgAro, totalAle } = useMemo(() => {
    if (filteredRisks.length === 0) {
      return { totalSle: 0, avgAro: 0, totalAle: 0 };
    }
    const sleSum = filteredRisks.reduce((sum, r) => sum + (r.sle || 0), 0);
    const aroAvg = filteredRisks.reduce((sum, r) => sum + (r.aro || 0), 0) / filteredRisks.length;
    const aleSum = filteredRisks.reduce((sum, r) => sum + (r.ale_baseline || 0), 0);
    return { totalSle: sleSum, avgAro: aroAvg, totalAle: aleSum };
  }, [filteredRisks]);

  // What-If Selected Controls calculation
  const selectedControlsCost = useMemo(() => {
    return controls
      .filter((c) => selectedControlIds.includes(c.control_id))
      .reduce((sum, c) => sum + c.implementation_cost, 0);
  }, [controls, selectedControlIds]);

  const totalBaselineALE = useMemo(() => risks.reduce((sum, r) => sum + r.ale_baseline, 0), [risks]);
  const totalResidualALE = useMemo(() => risks.reduce((sum, r) => sum + r.ale_residual, 0), [risks]);
  const riskReductionPct = useMemo(() => {
    return totalBaselineALE > 0 ? ((totalBaselineALE - totalResidualALE) / totalBaselineALE) * 100 : 0;
  }, [totalBaselineALE, totalResidualALE]);

  const handleToggleControl = (controlId: number) => {
    setSelectedControlIds((prev) =>
      prev.includes(controlId) ? prev.filter((id) => id !== controlId) : [...prev, controlId]
    );
  };

  const handleCalculateResiduals = async () => {
    try {
      setCalculating(true);
      const updatedRisks = await calculateRiskResiduals(selectedControlIds);
      setRisks(updatedRisks);
    } catch (err: any) {
      alert(`Calculation error: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleAutoMap = async () => {
    try {
      setIsAutoMapping(true);
      await autoMapRisks();
      await fetchRisksData();
    } catch (err: any) {
      alert(`Auto-mapping failed: ${err.message}`);
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThreatId) return;

    try {
      setIsCreating(true);
      const payload: RiskCreatePayload = {
        threat_id: Number(selectedThreatId),
        finding_id: targetType === 'finding' ? Number(selectedFindingId) : null,
        asset_id: targetType === 'asset' ? Number(selectedAssetId) : null,
        likelihood: Number(likelihood),
        impact: Number(impact),
        exposure_factor: Number(exposureFactor),
      };
      await createRisk(payload);
      setIsModalOpen(false);
      await fetchRisksData();
    } catch (err: any) {
      alert(`Failed to create risk: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const matrixRisks = useMemo(
    () =>
      filteredRisks.map((r) => ({
        id: r.risk_id,
        name: `${r.asset_name} - ${r.threat_name}`,
        likelihood: r.likelihood_score,
        impact: r.impact_score,
        score: r.risk_score,
      })),
    [filteredRisks]
  );

  const topRisk = filteredRisks.length > 0 ? filteredRisks[0] : null;

  if (loading) {
    return (
      <LoadingState
        message="Loading Quantitative Risk Models..."
        subtitle="Evaluating Single Loss Expectancy (SLE), Annualized Occurrence (ARO), and Annualized Loss (ALE)"
      />
    );
  }

  if (error) {
    return <ErrorState title="Risks API Error" errorDetails={error} onRetry={fetchRisksData} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Risk Quantification"
        description="Model deterministic single-event (SLE) and annual (ALE) monetary risk exposures."
        step={{ current: 3, total: 6 }}
      />

      {/* Top Filter Bar + Formula Disclosure */}
      <div className="space-y-2">
        {/* Filter bar — clean flex row without layout shift */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface border border-line rounded-[10px]">
          <div className="flex items-center gap-2">
            <label htmlFor="asset-select" className="text-xs font-medium text-ink">
              Filter by Asset:
            </label>
            <select
              id="asset-select"
              value={selectedAssetFilter}
              onChange={(e) => setSelectedAssetFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-line rounded-[8px] text-ink focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
            >
              <option value="all">All Assets ({risks.length} Scenarios)</option>
              {assets.map((a) => {
                const count = risks.filter((r) => r.asset_id === a.asset_id).length;
                return (
                  <option key={a.asset_id} value={a.asset_id}>
                    {a.name} ({count} scenarios)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Inline trigger button */}
          <button
            type="button"
            onClick={() => setShowFormulas(!showFormulas)}
            aria-expanded={showFormulas}
            aria-controls="risk-formula-panel"
            className="flex items-center gap-1.5 text-xs text-brand hover:underline cursor-pointer select-none self-start sm:self-auto"
          >
            <span>How is this calculated?</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 motion-reduce:transition-none ${
                showFormulas ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Animated full-width formula panel below filter bar */}
        <div
          id="risk-formula-panel"
          style={{ gridTemplateRows: showFormulas ? '1fr' : '0fr' }}
          className="grid transition-[grid-template-rows] duration-250 ease-in-out motion-reduce:transition-none"
        >
          <div
            className="overflow-hidden min-h-0"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...(!showFormulas ? { inert: '' as any } : {})}
          >
            <div className="p-4 bg-surface border border-line rounded-[10px] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-[8px] bg-surface-2/60 border border-line">
                  <div className="font-mono text-xs text-ink font-semibold">
                    SLE = Asset Value × Exposure Factor
                  </div>
                  <div className="text-xs text-muted mt-1 leading-relaxed">
                    Single Loss Expectancy: Expected monetary loss from a single security incident.
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-surface-2/60 border border-line">
                  <div className="font-mono text-xs text-ink font-semibold">
                    ARO = Threat Prob × Exploitability
                  </div>
                  <div className="text-xs text-muted mt-1 leading-relaxed">
                    Annualized Rate of Occurrence: Estimated frequency of threat occurrences per year.
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-surface-2/60 border border-line">
                  <div className="font-mono text-xs text-ink font-semibold">
                    ALE = SLE × ARO
                  </div>
                  <div className="text-xs text-muted mt-1 leading-relaxed">
                    Annual Loss Expectancy: Total baseline expected monetary loss per calendar year.
                  </div>
                </div>

                <div className="p-3 rounded-[8px] bg-surface-2/60 border border-line">
                  <div className="font-mono text-xs text-ink font-semibold">
                    Mitigated ALE = Baseline ALE × ∏(1 − E × x)
                  </div>
                  <div className="text-xs text-muted mt-1 leading-relaxed">
                    Multiplicative compounding of independent defensive control effectiveness factors.
                  </div>
                </div>
              </div>

              {onSelectTab && (
                <div className="pt-2 border-t border-line flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectTab('blueprint')}
                    className="text-xs text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full explanation in Platform Blueprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core StatCards: SLE, ARO, ALE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Single Loss Expectancy (SLE)"
          value={formatINR(totalSle)}
          info="Single Loss Expectancy: Expected financial loss whenever a single threat event occurs."
        />
        <StatCard
          title="Annualized Rate (ARO)"
          value={`${avgAro.toFixed(4)} / yr`}
          info="Annualized Rate of Occurrence: Estimated frequency of threat occurrences per year."
        />
        <StatCard
          title="Annual Loss Expectancy (ALE)"
          value={formatINR(totalAle)}
          tone="danger"
          info="Annualized Loss Expectancy: Expected annual monetary loss (SLE × ARO)."
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'scenarios', label: 'Risk Scenarios', badge: filteredRisks.length },
          { id: 'what-if', label: 'What-If Controls', badge: selectedControlIds.length },
        ]}
      />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {topRisk ? (
            <FinancialLossCard
              sle={topRisk.sle}
              aro={topRisk.aro}
              ale={topRisk.ale_baseline}
              assetName={topRisk.asset_name}
              assetValue={topRisk.business_value}
              exposureFactor={topRisk.exposure_factor}
            />
          ) : (
            <div className="p-8 text-center bg-surface border border-line rounded-[10px] text-xs text-muted">
              No quantified risk records for this selection.
            </div>
          )}
          <RiskMatrix5x5 risks={matrixRisks} />
        </div>
      )}

      {/* Tab 2: Risk Scenarios */}
      {activeTab === 'scenarios' && (
        <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
          <div className="p-4 border-b border-line bg-surface-2/40 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink font-serif">
                Quantified Risk Scenarios ({filteredRisks.length})
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Deterministic SLE × ARO = ALE baseline loss exposure register.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoMap}
                isLoading={isAutoMapping}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Auto-Map
              </Button>
              <InfoTip content="Automatically generates risk mappings for all verified findings based on asset criticality." />

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Scenario
              </Button>
              <InfoTip content="Manually configure a threat scenario against an asset or verified finding." />
            </div>
          </div>

          {filteredRisks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No risk scenarios configured. Click "Auto-Map" to seed from findings or "Add Scenario" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-ink">
                <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Risk ID</th>
                    <th scope="col" className="px-4 py-3 font-medium">Target Asset</th>
                    <th scope="col" className="px-4 py-3 font-medium">Threat Scenario</th>
                    <th scope="col" className="px-4 py-3 font-medium">SLE</th>
                    <th scope="col" className="px-4 py-3 font-medium">ARO</th>
                    <th scope="col" className="px-4 py-3 font-medium">Baseline ALE</th>
                    <th scope="col" className="px-4 py-3 font-medium">Residual ALE</th>
                    <th scope="col" className="px-4 py-3 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredRisks.map((r) => (
                    <tr key={r.risk_id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-brand">
                        R-{r.risk_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {r.asset_name}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {r.threat_name}
                      </td>
                      <td className="px-4 py-3 num font-medium">
                        {formatINR(r.sle)}
                      </td>
                      <td className="px-4 py-3 num text-brand font-medium">
                        {r.aro.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 num text-danger font-semibold">
                        {formatINR(r.ale_baseline)}
                      </td>
                      <td className="px-4 py-3 num text-ok font-semibold">
                        {formatINR(r.ale_residual)}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge severity={r.qualitative_rating} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: What-If Controls */}
      {activeTab === 'what-if' && (
        <div className="space-y-6">
          <div className="p-4 bg-surface border border-line rounded-[10px] space-y-1">
            <h3 className="text-sm font-semibold text-ink font-serif">
              Selectable Security Controls Portfolio
            </h3>
            <p className="text-xs text-muted">
              Toggle defensive controls to observe multiplicative risk mitigation compounding across active risks.
            </p>
          </div>

          {/* 2-3 Column Grid of Selectable Control Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {controls.map((c) => {
              const isSelected = selectedControlIds.includes(c.control_id);
              return (
                <div
                  key={c.control_id}
                  onClick={() => handleToggleControl(c.control_id)}
                  className={`p-4 rounded-[10px] border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-brand-soft/30 border-brand ring-1 ring-brand'
                      : 'bg-surface border-line hover:border-brand/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted">{c.nist_function || `#CTRL-${c.control_id}`}</span>
                      {isSelected ? (
                        <span className="text-xs text-brand font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">Click to test</span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-ink font-serif">{c.name}</h4>
                    <p className="text-xs text-muted line-clamp-2 mt-1">
                      {c.category || 'Enterprise defensive security control.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                    <span className="text-muted">Cost:</span>
                    <span className="num font-semibold text-ink">
                      {formatINR(c.implementation_cost)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Summary Bar at the Bottom */}
          <div className="sticky bottom-4 z-20 p-4 rounded-[10px] bg-surface border border-line shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-muted block">Selected Controls:</span>
                <span className="font-semibold text-ink font-serif text-sm">
                  {selectedControlIds.length} Controls
                </span>
              </div>
              <div className="h-6 w-px bg-line hidden sm:block" />
              <div>
                <span className="text-muted block">Total Investment Cost:</span>
                <span className="num font-semibold text-ink text-sm">
                  {formatINR(selectedControlsCost)}
                </span>
              </div>
              <div className="h-6 w-px bg-line hidden sm:block" />
              <div>
                <span className="text-muted block">Residual Loss:</span>
                <span className="num font-semibold text-ok text-sm">
                  {formatINR(totalResidualALE)}
                </span>
              </div>
              <div className="h-6 w-px bg-line hidden sm:block" />
              <div>
                <span className="text-muted block">Risk Reduction:</span>
                <span className="num font-semibold text-ok text-sm">
                  -{riskReductionPct.toFixed(1)}%
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCalculateResiduals}
              isLoading={calculating}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Re-Calculate Residuals
            </Button>
          </div>
        </div>
      )}

      {/* Add Risk Scenario Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Risk Scenario"
        subtitle="Associate an asset or verified finding with an authoritative threat"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRisk} className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-line text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                checked={targetType === 'finding'}
                onChange={() => setTargetType('finding')}
                className="text-brand"
              />
              <span>Link to Verified Finding</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="targetType"
                checked={targetType === 'asset'}
                onChange={() => setTargetType('asset')}
                className="text-brand"
              />
              <span>Link to Direct Asset</span>
            </label>
          </div>

          {targetType === 'finding' ? (
            <Select
              label="Verified Finding"
              value={selectedFindingId || ''}
              onChange={(e) => setSelectedFindingId(Number(e.target.value))}
              options={findings.map((f) => ({
                label: `#FIND-${f.finding_id}: ${f.matched_cpe} (v${f.matched_version})`,
                value: f.finding_id,
              }))}
            />
          ) : (
            <Select
              label="Enterprise Asset"
              value={selectedAssetId || ''}
              onChange={(e) => setSelectedAssetId(Number(e.target.value))}
              options={assets.map((a) => ({
                label: `${a.name} (${formatINR(a.business_value)})`,
                value: a.asset_id,
              }))}
            />
          )}

          <Select
            label="Threat Scenario"
            value={selectedThreatId || ''}
            onChange={(e) => setSelectedThreatId(Number(e.target.value))}
            options={threats.map((t) => ({
              label: `${t.name} [${t.category}]`,
              value: t.threat_id,
            }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Likelihood (1 to 5)"
              type="number"
              min="1"
              max="5"
              value={likelihood}
              onChange={(e) => setLikelihood(Number(e.target.value))}
            />
            <Input
              label="Impact (1 to 5)"
              type="number"
              min="1"
              max="5"
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
            />
          </div>

          <Input
            label="Exposure Factor (0.0 to 1.0)"
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={exposureFactor}
            onChange={(e) => setExposureFactor(Number(e.target.value))}
          />

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create Scenario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
