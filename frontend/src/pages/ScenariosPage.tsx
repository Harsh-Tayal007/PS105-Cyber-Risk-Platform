import React, { useEffect, useState, useMemo } from 'react';
import { getScenarios, createScenario, runOptimization } from '../lib/api/optimization';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Tooltip } from '../components/ui/Tooltip';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { BudgetUtilizationCard } from '../components/optimization/BudgetUtilizationCard';
import { OptimizationComparisonTable } from '../components/optimization/OptimizationComparisonTable';
import { EfficientFrontierChart } from '../components/charts/EfficientFrontierChart';
import type { ScenarioResponse, ScenarioCreatePayload, OptimizationResultDict } from '@/types';
import { formatINR } from '../lib/format';
import { Plus, Play, FolderGit2 } from 'lucide-react';

interface RunHistoryItem {
  scenario: ScenarioResponse;
  result: OptimizationResultDict;
  reductionPct: number;
}

export const ScenariosPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('1000000');

  // Per-scenario optimization runner
  const [runningScenario, setRunningScenario] = useState<number | null>(null);
  const [scenarioResult, setScenarioResult] = useState<{
    scenarioId: number;
    scenarioName: string;
    result: OptimizationResultDict;
  } | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // History of all scenarios run during this session
  const [runHistory, setRunHistory] = useState<Record<number, RunHistoryItem>>({});
  const [activeTab, setActiveTab] = useState<'result' | 'compare' | 'frontier'>('result');

  const fetchScenariosList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getScenarios();
      setScenarios(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch budget scenarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenariosList();
  }, []);

  const handleRunScenario = async (scenario: ScenarioResponse) => {
    try {
      setRunningScenario(scenario.scenario_id);
      setScenarioError(null);
      const res = await runOptimization({ available_budget: scenario.available_budget });

      const redPct =
        res.expected_loss_before > 0
          ? ((res.expected_loss_before - res.exact_multiplicative_loss) /
              res.expected_loss_before) *
            100
          : 0;

      setScenarioResult({
        scenarioId: scenario.scenario_id,
        scenarioName: scenario.name,
        result: res,
      });

      setRunHistory((prev) => ({
        ...prev,
        [scenario.scenario_id]: {
          scenario,
          result: res,
          reductionPct: redPct,
        },
      }));
    } catch (err: any) {
      setScenarioError(err.message || 'Scenario optimization failed.');
    } finally {
      setRunningScenario(null);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload: ScenarioCreatePayload = {
        name,
        available_budget: parseFloat(budget) || 0,
      };
      await createScenario(payload);
      setIsModalOpen(false);
      setName('');
      setBudget('1000000');
      await fetchScenariosList();
    } catch (err: any) {
      alert(`Scenario creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Efficient Frontier Chart data generated from all run scenarios
  const frontierChartData = useMemo(() => {
    const items = Object.values(runHistory);
    if (items.length === 0 && scenarioResult) {
      const res = scenarioResult.result;
      return [
        { budget: 0, residualLoss: Math.round(res.expected_loss_before / 100000), portfolioSize: 0 },
        { budget: Math.round(res.total_investment / 100000), residualLoss: Math.round(res.exact_multiplicative_loss / 100000), portfolioSize: res.selected_control_ids.length, isOptimal: true },
      ];
    }

    const points = items.map((item) => ({
      budget: Math.round(item.result.total_investment / 100000),
      residualLoss: Math.round(item.result.exact_multiplicative_loss / 100000),
      portfolioSize: item.result.selected_control_ids.length,
      isOptimal: true,
    }));

    // Sort by budget
    points.sort((a, b) => a.budget - b.budget);
    return points;
  }, [runHistory, scenarioResult]);

  // Compute diminishing returns takeaway sentence
  const frontierTakeaway = useMemo(() => {
    const items = Object.values(runHistory);
    if (items.length === 0) return 'Execute scenarios to evaluate investment return curves.';
    const sorted = [...items].sort((a, b) => a.scenario.available_budget - b.scenario.available_budget);
    const top = sorted[sorted.length - 1];
    return `Beyond ${formatINR(top.result.total_investment)} in defensive spend, risk reduction achieves ${top.reductionPct.toFixed(1)}% with diminishing marginal loss reduction per additional rupee.`;
  }, [runHistory]);

  if (loading) {
    return (
      <LoadingState
        message="Loading Budget Scenarios..."
        subtitle="Fetching organization budget constraints and optimization targets"
      />
    );
  }

  if (error) {
    return <ErrorState title="Scenarios API Error" errorDetails={error} onRetry={fetchScenariosList} />;
  }

  const runHistoryItems = Object.values(runHistory);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budget Scenarios"
        description="Compare alternative cybersecurity budget levels and evaluate their marginal risk return."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Scenario
          </Button>
        }
      />

      {/* Scenarios Table */}
      <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
        <div className="p-4 border-b border-line bg-surface-2/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink font-serif">
              Alternative Budget Configurations ({scenarios.length})
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Click "Run" on any scenario to compute the optimal control portfolio.
            </p>
          </div>
        </div>

        {scenarios.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted space-y-3">
            <p>No budget scenarios created yet. Create custom budget levels to evaluate trade-offs.</p>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              Create First Scenario
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-ink">
              <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Scenario Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Available Budget</th>
                  <th scope="col" className="px-4 py-3 font-medium">Created Date</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scenarios.map((s) => (
                  <tr key={s.scenario_id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <FolderGit2 className="w-4 h-4 text-brand shrink-0" />
                        <span>{s.name}</span>
                      </div>
                      <span className="text-[11px] text-muted font-mono block">
                        SCEN-{s.scenario_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 num font-medium text-ink">
                      {formatINR(s.available_budget)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Tooltip content="Solve the best control set for this budget">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={runningScenario === s.scenario_id ? undefined : <Play className="w-3.5 h-3.5" />}
                          isLoading={runningScenario === s.scenario_id}
                          onClick={() => handleRunScenario(s)}
                        >
                          Run
                        </Button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scenarioError && (
        <ErrorState
          title="Scenario Execution Error"
          errorDetails={scenarioError}
          onRetry={() => {
            if (scenarioResult) {
              const sc = scenarios.find((s) => s.scenario_id === scenarioResult.scenarioId);
              if (sc) handleRunScenario(sc);
            }
          }}
        />
      )}

      {/* Result Area (Shows only after a run) */}
      {scenarioResult && (
        <div className="space-y-4">
          <Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as any)}
            tabs={[
              { id: 'result', label: 'Result' },
              { id: 'compare', label: 'Compare Scenarios', badge: runHistoryItems.length },
              { id: 'frontier', label: 'Efficient Frontier' },
            ]}
          />

          {/* Tab 1: Current Result */}
          {activeTab === 'result' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface border border-line rounded-[10px]">
                <div>
                  <span className="text-xs text-muted block">Active Result:</span>
                  <h4 className="text-sm font-semibold text-ink font-serif">
                    {scenarioResult.scenarioName} ({formatINR(scenarioResult.result.available_budget)} budget)
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted block">Risk Reduction</span>
                  <span className="text-sm font-semibold text-ok num">
                    {(
                      ((scenarioResult.result.expected_loss_before - scenarioResult.result.exact_multiplicative_loss) /
                        scenarioResult.result.expected_loss_before) *
                      100
                    ).toFixed(1)}%
                  </span>
                </div>
              </div>

              <BudgetUtilizationCard
                totalBudget={scenarioResult.result.available_budget}
                allocatedInvestment={scenarioResult.result.total_investment}
                remainingBudget={scenarioResult.result.remaining_budget}
              />

              <OptimizationComparisonTable comparison={scenarioResult.result} />
            </div>
          )}

          {/* Tab 2: Compare Scenarios Table */}
          {activeTab === 'compare' && (
            <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
              <div className="p-4 border-b border-line bg-surface-2/40">
                <h4 className="text-sm font-semibold text-ink font-serif">
                  Side-by-Side Scenario Performance Benchmark
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Comparative trade-offs across all solved budget thresholds.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-ink">
                  <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Scenario Name</th>
                      <th scope="col" className="px-4 py-3 font-medium">Budget Target</th>
                      <th scope="col" className="px-4 py-3 font-medium">Actual Spend</th>
                      <th scope="col" className="px-4 py-3 font-medium">Loss Reduction</th>
                      <th scope="col" className="px-4 py-3 font-medium">Residual Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {runHistoryItems.map((item) => (
                      <tr key={item.scenario.scenario_id} className="hover:bg-surface-2/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-ink">
                          {item.scenario.name}
                        </td>
                        <td className="px-4 py-3 num">
                          {formatINR(item.scenario.available_budget)}
                        </td>
                        <td className="px-4 py-3 num font-medium text-brand">
                          {formatINR(item.result.total_investment)}
                        </td>
                        <td className="px-4 py-3 num font-semibold text-ok">
                          -{item.reductionPct.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 num text-muted">
                          {formatINR(item.result.exact_multiplicative_loss)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Efficient Frontier */}
          {activeTab === 'frontier' && (
            <div className="space-y-3">
              <div className="p-3 rounded-[8px] bg-surface-2/60 border border-line text-xs text-muted">
                {frontierTakeaway}
              </div>
              <EfficientFrontierChart data={frontierChartData} />
            </div>
          )}
        </div>
      )}

      {/* Create Scenario Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Budget Scenario"
        subtitle="Specify a custom cybersecurity budget threshold for MILP optimization"
        maxWidth="md"
      >
        <form onSubmit={handleCreateScenario} className="space-y-4">
          <Input
            label="Scenario Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Restricted Budget FY2026"
            info="Identifying title for this hypothetical budget condition."
          />
          <div className="space-y-1">
            <Input
              label="Available Cybersecurity Budget (₹)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              min="0"
              step="50000"
              info="Maximum capital available for security control selection."
            />
            <div className="text-xs text-muted flex items-center gap-1.5 px-1">
              <span>Preview:</span>
              <span className="num font-semibold text-brand">
                {formatINR(parseFloat(budget) || 0)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={submitting}>
              Create Scenario
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
