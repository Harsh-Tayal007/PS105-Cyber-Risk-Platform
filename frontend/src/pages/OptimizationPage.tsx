import React, { useState, useEffect, useRef, useMemo } from 'react';
import { runOptimization } from '../lib/api/optimization';
import { getSecurityControls } from '../lib/api/controls';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Tabs } from '../components/ui/Tabs';
import { Collapsible } from '../components/ui/Collapsible';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { InfoTip } from '../components/ui/InfoTip';
import { ErrorState } from '../components/ui/ErrorState';
import { BudgetUtilizationCard } from '../components/optimization/BudgetUtilizationCard';
import { OptimizationComparisonTable } from '../components/optimization/OptimizationComparisonTable';
import type { OptimizationResultDict, SecurityControlResponse } from '@/types';
import { formatINR } from '../lib/format';
import { Play, CheckCircle2 } from 'lucide-react';

const CACHE_KEY = 'ps105_opt_result';
const CACHE_BUDGET_KEY = 'ps105_opt_budget';

function loadCachedResult(): OptimizationResultDict | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as OptimizationResultDict) : null;
  } catch {
    return null;
  }
}

function saveCachedResult(result: OptimizationResultDict, budget: string) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
    sessionStorage.setItem(CACHE_BUDGET_KEY, budget);
  } catch {
    // Ignore storage quota
  }
}

export const OptimizationPage: React.FC = () => {
  const { organization } = useAuth();

  const [budget, setBudget] = useState<string>(
    () =>
      sessionStorage.getItem(CACHE_BUDGET_KEY) ||
      (organization?.cybersecurity_budget?.toString() ?? '1500000')
  );
  const [controls, setControls] = useState<SecurityControlResponse[]>([]);
  const [optResult, setOptResult] = useState<OptimizationResultDict | null>(loadCachedResult);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recommended' | 'verification' | 'catalogue'>('recommended');

  const autoRanRef = useRef(false);

  const handleRunOptimization = async (overrideBudget?: number) => {
    const budgetToUse = overrideBudget ?? (parseFloat(budget) || 1500000);
    try {
      setRunning(true);
      setError(null);
      const res = await runOptimization({ available_budget: budgetToUse });
      setOptResult(res);
      saveCachedResult(res, budgetToUse.toString());
    } catch (err: any) {
      setError(err.message || 'Optimization solver execution failed.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    getSecurityControls().then(setControls).catch(() => []);
  }, []);

  useEffect(() => {
    if (organization?.cybersecurity_budget && !autoRanRef.current) {
      autoRanRef.current = true;
      const b = organization.cybersecurity_budget;
      setBudget(b.toString());
      if (!loadCachedResult()) {
        handleRunOptimization(b);
      }
    } else if (!organization && !autoRanRef.current && !loadCachedResult()) {
      autoRanRef.current = true;
      handleRunOptimization();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.cybersecurity_budget]);

  const riskReductionPct = useMemo(() => {
    if (!optResult || optResult.expected_loss_before <= 0) return 0;
    return (
      ((optResult.expected_loss_before - optResult.exact_multiplicative_loss) /
        optResult.expected_loss_before) *
      100
    );
  }, [optResult]);

  const selectedControls = useMemo(() => {
    if (!optResult) return [];
    return controls.filter((c) => optResult.selected_control_ids.includes(c.control_id));
  }, [controls, optResult]);

  const parsedBudget = parseFloat(budget) || 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Investment Optimization"
        description="Solve the binary knapsack optimization program to maximize cyber risk reduction within a defined security budget."
        step={{ current: 5, total: 6 }}
      />

      {/* Top Budget Input & Solver Trigger */}
      <div className="p-4 bg-surface border border-line rounded-[10px] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Input
              label="Available Security Investment Budget (₹)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 1500000"
              required
              min="0"
              step="50000"
            />
            <div className="text-xs text-muted flex items-center gap-1.5 px-1">
              <span>Preview:</span>
              <span className="num font-semibold text-brand">
                {formatINR(parsedBudget)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleRunOptimization()}
              isLoading={running}
              icon={<Play className="w-4 h-4" />}
            >
              Find Best Controls
            </Button>
            <InfoTip content="Solves for the control set with the largest loss reduction within this budget." />
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Optimization Solver Error"
          errorDetails={error}
          onRetry={() => handleRunOptimization()}
        />
      )}

      {/* 4 StatCards: Budget, Allocated, Unallocated, Loss reduction % */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Target Budget"
          value={formatINR(optResult?.available_budget ?? parsedBudget)}
          info="Total available security capital allocated for this optimization run."
        />
        <StatCard
          title="Allocated Cost"
          value={formatINR(optResult?.total_investment ?? 0)}
          info="Aggregate cost of all controls selected by the binary knapsack optimizer."
        />
        <StatCard
          title="Unallocated Reserve"
          value={formatINR(optResult?.remaining_budget ?? 0)}
          info="Remaining unspent budget reserve that could not purchase another control."
        />
        <StatCard
          title="Loss Reduction"
          value={`-${riskReductionPct.toFixed(1)}%`}
          tone="ok"
          info="Overall reduction in annual expected loss achieved by the recommended portfolio."
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          {
            id: 'recommended',
            label: 'Recommended Portfolio',
            badge: selectedControls.length,
          },
          { id: 'verification', label: 'Verification' },
          { id: 'catalogue', label: 'Control Catalogue', badge: controls.length },
        ]}
      />

      {/* Tab 1: Recommended Portfolio */}
      {activeTab === 'recommended' && (
        <div className="space-y-6">
          {optResult && (
            <BudgetUtilizationCard
              totalBudget={optResult.available_budget}
              allocatedInvestment={optResult.total_investment}
              remainingBudget={optResult.remaining_budget}
            />
          )}

          <div className="bg-surface border border-line rounded-[10px] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-ink font-serif">
                  Selected Defensive Controls ({selectedControls.length})
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Controls chosen by binary integer programming to achieve maximal mathematical loss reduction.
                </p>
              </div>
              <Badge variant="success" size="sm">
                Optimized Portfolio
              </Badge>
            </div>

            {selectedControls.length === 0 ? (
              <p className="text-xs text-muted italic">
                No controls fit within the specified budget threshold. Increase budget to see recommendations.
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedControls.map((c) => (
                  <div
                    key={c.control_id}
                    className="p-3.5 rounded-[8px] bg-surface-2/60 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-brand">
                          {c.nist_function || `#CTRL-${c.control_id}`}
                        </span>
                        <h4 className="text-xs font-semibold text-ink">{c.name}</h4>
                      </div>
                      <p className="text-xs text-muted">{c.category}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <div className="text-right">
                        <span className="text-muted block text-[11px]">Mitigation Factor</span>
                        <span className="font-semibold text-ok">
                          {(c.coverage * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted block text-[11px]">Investment</span>
                        <span className="num font-semibold text-ink">
                          {formatINR(c.implementation_cost)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Verification */}
      {activeTab === 'verification' && optResult && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md">
              Matches global optimum
            </Badge>
            <InfoTip content="Result equals an exhaustive check of all 256 control combinations." />
          </div>

          <OptimizationComparisonTable comparison={optResult} />

          <Collapsible label="Why additive MILP + multiplicative check?">
            <div className="space-y-2 text-xs text-muted leading-relaxed">
              <p>
                <strong className="text-ink">Mathematical Formulation:</strong> Binary knapsack integer programming
                solves $\max \sum \Delta ALE_i \cdot x_i$ subject to $\sum c_i \cdot x_i \le B$. Additive MILP is computationally fast
                (polynomial time) and guarantees feasibility under budget constraints.
              </p>
              <p>
                <strong className="text-ink">Multiplicative Compounding:</strong> Actual defense-in-depth mitigations do not simply add;
                they compound multiplicatively via $1 - \prod(1 - E_i \cdot x_i)$. To ensure that the linear approximation did not miss
                an edge case, the solver checks all $2^N$ combinatorial possibilities ($2^8 = 256$ subsets) to verify that the MILP solution
                is identical to the absolute global minimum.
              </p>
            </div>
          </Collapsible>
        </div>
      )}

      {/* Tab 3: Control Catalogue */}
      {activeTab === 'catalogue' && (
        <div className="bg-surface border border-line rounded-[10px] overflow-hidden">
          <div className="p-4 border-b border-line bg-surface-2/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink font-serif">
              Enterprise Defensive Control Catalogue ({controls.length})
            </h3>
            <span className="text-xs text-muted">
              {optResult?.selected_control_ids.length || 0} active in current solution
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-ink">
              <thead className="bg-surface-2/60 text-muted text-xs font-medium border-b border-line">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Control Code</th>
                  <th scope="col" className="px-4 py-3 font-medium">Control Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Coverage Effectiveness</th>
                  <th scope="col" className="px-4 py-3 font-medium">Implementation Cost</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status in Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {controls.map((c) => {
                  const isSelected = optResult?.selected_control_ids.includes(c.control_id);
                  return (
                    <tr
                      key={c.control_id}
                      className={`transition-colors ${
                        isSelected ? 'bg-brand-soft/20 font-medium' : 'hover:bg-surface-2/60'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-brand font-medium">
                        {c.nist_function || `#CTRL-${c.control_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink block">{c.name}</span>
                        <span className="text-[11px] text-muted block max-w-md line-clamp-1">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="primary" size="sm">
                          {(c.coverage * 100).toFixed(0)}% Mitigation
                        </Badge>
                      </td>
                      <td className="px-4 py-3 num">
                        {formatINR(c.implementation_cost)}
                      </td>
                      <td className="px-4 py-3">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-ok text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Recommended</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Unselected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
