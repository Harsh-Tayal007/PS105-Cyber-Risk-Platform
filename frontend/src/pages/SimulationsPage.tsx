import React, { useState, useEffect, useRef, useMemo } from 'react';
import { runMonteCarloSimulation } from '../lib/api/simulations';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Tabs } from '../components/ui/Tabs';
import { Collapsible } from '../components/ui/Collapsible';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { ErrorState } from '../components/ui/ErrorState';
import { LossPercentileChart } from '../components/charts/LossPercentileChart';
import { ExceedanceCurveChart } from '../components/charts/ExceedanceCurveChart';
import type { SimulationResultDict } from '@/types';
import { formatINR } from '../lib/format';
import { Play } from 'lucide-react';

const CACHE_KEY = 'ps105_sim_result';

function loadCachedResult(): SimulationResultDict | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SimulationResultDict) : null;
  } catch {
    return null;
  }
}

function saveCachedResult(result: SimulationResultDict) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // Storage quota ignore
  }
}

export const SimulationsPage: React.FC = () => {
  const [numSimulations, setNumSimulations] = useState('10000');
  const [seed, setSeed] = useState('42');
  const [distribution, setDistribution] = useState('lognormal');
  const [useResidual, setUseResidual] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'distribution' | 'exceedance' | 'method'>('summary');

  const [simResult, setSimResult] = useState<SimulationResultDict | null>(loadCachedResult);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRanRef = useRef(false);

  const handleRunSimulation = async (
    simCount = parseInt(numSimulations) || 10000,
    seedVal = seed ? parseInt(seed) : undefined,
    dist = distribution,
    residual = useResidual
  ) => {
    try {
      setRunning(true);
      setError(null);
      const res = await runMonteCarloSimulation({
        number_of_simulations: simCount,
        random_seed: seedVal,
        severity_distribution: dist,
        use_residual: residual,
      });
      setSimResult(res);
      saveCachedResult(res);
    } catch (err: any) {
      setError(err.message || 'Monte Carlo simulation failed.');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!autoRanRef.current && !loadCachedResult()) {
      autoRanRef.current = true;
      handleRunSimulation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const percentileChartData = useMemo(() => {
    if (!simResult) return undefined;
    return [
      { percentile: 'Min', loss: simResult.min_loss / 100000 },
      { percentile: 'P10', loss: simResult.p10 / 100000 },
      { percentile: 'P50 (Median)', loss: simResult.p50 / 100000 },
      { percentile: 'Mean', loss: simResult.mean_loss / 100000 },
      { percentile: 'P90', loss: simResult.p90 / 100000 },
      { percentile: 'P95 (VaR)', loss: simResult.p95 / 100000 },
      { percentile: 'Max', loss: simResult.max_loss / 100000 },
    ];
  }, [simResult]);

  const exceedanceChartData = useMemo(() => {
    const rawCurve = simResult?.loss_exceedance_curve || simResult?.exceedance_curve;
    if (!rawCurve || rawCurve.length === 0) return undefined;
    return rawCurve.map((point: any) => ({
      loss: Math.round((point.loss_threshold ?? point.loss ?? 0) / 100000),
      probability: point.exceedance_probability ?? point.probability ?? 0,
    }));
  }, [simResult]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Loss Simulations"
        description="Execute stochastic Monte Carlo models to compute Value at Risk and annualized loss exceedance curves."
        step={{ current: 4, total: 6 }}
      />

      {/* Compact Parameter Row */}
      <div className="p-4 bg-surface border border-line rounded-[10px] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Select
            label="Simulations Count"
            value={numSimulations}
            onChange={(e) => setNumSimulations(e.target.value)}
            options={[
              { label: '1,000 Iterations', value: '1000' },
              { label: '5,000 Iterations', value: '5000' },
              { label: '10,000 Iterations', value: '10000' },
            ]}
          />

          <Select
            label="Severity Model"
            value={distribution}
            onChange={(e) => setDistribution(e.target.value)}
            options={[
              { label: 'LogNormal Distribution', value: 'lognormal' },
              { label: 'PERT Distribution', value: 'pert' },
            ]}
          />

          <Select
            label="Portfolio Target"
            value={useResidual ? 'residual' : 'baseline'}
            onChange={(e) => setUseResidual(e.target.value === 'residual')}
            options={[
              { label: 'Baseline Exposure', value: 'baseline' },
              { label: 'Residual (Mitigated)', value: 'residual' },
            ]}
          />

          <Button
            variant="primary"
            onClick={() => handleRunSimulation()}
            isLoading={running}
            icon={<Play className="w-4 h-4" />}
            className="w-full"
          >
            Run Simulation
          </Button>
        </div>

        {/* Seed lives in Collapsible Advanced */}
        <Collapsible label="Advanced Parameters" className="mt-2">
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="w-full sm:w-64">
              <Input
                label="PRNG Random Seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                info="Fixed random seed so results are reproducible across runs."
              />
            </div>
            <p className="text-xs text-muted self-end pb-2">
              Frequency: Poisson(ARO) • Severity: E[X]=SLE • Vectorized NumPy array routines
            </p>
          </div>
        </Collapsible>
      </div>

      {error && (
        <ErrorState
          title="Simulation Execution Error"
          errorDetails={error}
          onRetry={() => handleRunSimulation()}
        />
      )}

      {/* 4 StatCards: Mean, P50, P95, Maximum */}
      {simResult && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Mean Loss"
            value={formatINR(simResult.mean_loss)}
            info="Expected mathematical average loss over simulated annual iterations."
          />
          <StatCard
            title="P50 (Median)"
            value={formatINR(simResult.p50)}
            info="Median year: In 50% of simulated years, loss is less than or equal to this figure."
          />
          <StatCard
            title="P95 (Value at Risk)"
            value={formatINR(simResult.p95)}
            tone="danger"
            info="Loss exceeded in only 5% of years (Value at Risk)."
          />
          <StatCard
            title="Maximum Loss"
            value={formatINR(simResult.max_loss)}
            info="Worst-case catastrophic single-year loss encountered in the simulation."
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'summary', label: 'Summary' },
          { id: 'distribution', label: 'Distribution' },
          { id: 'exceedance', label: 'Loss Exceedance Curve' },
          { id: 'method', label: 'Method' },
        ]}
      />

      {/* Tab Panels */}
      {activeTab === 'summary' && simResult && (
        <div className="space-y-6">
          <div className="p-4 bg-surface border border-line rounded-[10px] space-y-2">
            <h3 className="text-sm font-semibold text-ink font-serif">
              Executive Stochastic Overview
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Based on {simResult.number_of_simulations?.toLocaleString() || '10,000'} Monte Carlo iterations,
              expected mean loss is <strong className="text-ink font-semibold">{formatINR(simResult.mean_loss)}</strong>.
              There is a 5% chance (1-in-20 year event) that annual losses will exceed{' '}
              <strong className="text-danger font-semibold">{formatINR(simResult.p95)}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-xs text-muted font-medium px-1">
                Average annual loss is {formatINR(simResult.mean_loss)}, with 50% of simulated years under {formatINR(simResult.p50)}.
              </div>
              <LossPercentileChart data={percentileChartData} title="Stochastic Loss Distribution Percentiles" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted font-medium px-1">
                There is a 5% chance that yearly losses exceed {formatINR(simResult.p95)}.
              </div>
              <ExceedanceCurveChart data={exceedanceChartData} title="Annual Loss Exceedance Curve (LEC)" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'distribution' && simResult && (
        <div className="space-y-3">
          <div className="text-xs text-muted font-medium px-1">
            Empirical loss distribution shows median year loss at {formatINR(simResult.p50)} with long-tail tail risk reaching {formatINR(simResult.max_loss)}.
          </div>
          <LossPercentileChart data={percentileChartData} title="Monte Carlo Loss Percentiles" />
        </div>
      )}

      {activeTab === 'exceedance' && simResult && (
        <div className="space-y-3">
          <div className="text-xs text-muted font-medium px-1">
            There is a 5% chance that yearly losses exceed {formatINR(simResult.p95)}.
          </div>
          <ExceedanceCurveChart data={exceedanceChartData} title="Loss Exceedance Curve (LEC)" />
        </div>
      )}

      {activeTab === 'method' && (
        <div className="p-6 bg-surface border border-line rounded-[10px] space-y-4 max-w-3xl">
          <h3 className="text-base font-semibold text-ink font-serif tracking-tight">
            FAIR Monte Carlo Simulation Methodology
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            The PS105 simulation engine implements standard Factor Analysis of Information Risk (FAIR) principles:
          </p>
          <ul className="space-y-2 text-xs text-muted list-disc pl-4">
            <li>
              <strong className="text-ink">Threat Frequency Modeling:</strong> Annual threat occurrence counts are generated via Poisson(ARO) distributions.
            </li>
            <li>
              <strong className="text-ink">Loss Magnitude Modeling:</strong> For every realized event, loss severity is sampled from LogNormal or PERT distributions calibrated to Single Loss Expectancy (SLE).
            </li>
            <li>
              <strong className="text-ink">Vectorized Aggregation:</strong> Annual losses are compounded across all asset-threat pairs for each simulated year to generate the empirical CDF and Value-at-Risk (VaR).
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
