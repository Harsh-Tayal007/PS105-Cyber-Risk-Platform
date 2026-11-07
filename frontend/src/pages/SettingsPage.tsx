import React, { useEffect, useState, useMemo } from 'react';
import { getOrganizationMe, updateOrganizationMe } from '../lib/api/organizations';
import { getRiskAssessment } from '../lib/api/risks';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import type { OrganizationResponse } from '@/types';
import { formatINR, getCurrencyPref } from '../lib/format';
import { getTheme, toggleTheme } from '../lib/theme';
import { Save, CheckCircle2, Sun, Moon, AlertTriangle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [org, setOrg] = useState<OrganizationResponse | null>(null);
  const [totalAle, setTotalAle] = useState<number>(0);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [organizationSize, setOrganizationSize] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('0');
  const [cybersecurityBudget, setCybersecurityBudget] = useState('0');

  // Display preferences
  const [theme, setCurrentTheme] = useState<'light' | 'dark'>(() => getTheme());
  const [currencyPref, setCurrencyPref] = useState<'auto' | 'lakh' | 'crore'>(() => getCurrencyPref());

  const [activeTab, setActiveTab] = useState<'organization' | 'financials' | 'display'>('organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrganizationMe();
      setOrg(data);
      setName(data.name || '');
      setIndustry(data.industry || 'Technology');
      setOrganizationSize(data.organization_size || 'Mid-Market');
      setAnnualRevenue(data.annual_revenue?.toString() || '0');
      setCybersecurityBudget(data.cybersecurity_budget?.toString() || '0');

      try {
        const risks = await getRiskAssessment();
        const aleSum = risks.reduce((sum, r) => sum + (r.ale_baseline || 0), 0);
        setTotalAle(aleSum);
      } catch {
        // Fallback if risks endpoint fails
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organization settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrg();
  }, []);

  // Determine if fields have changed from the server-fetched organization
  const isDirty = useMemo(() => {
    if (!org) return false;
    return (
      name !== (org.name || '') ||
      industry !== (org.industry || '') ||
      organizationSize !== (org.organization_size || '') ||
      annualRevenue !== (org.annual_revenue?.toString() || '0') ||
      cybersecurityBudget !== (org.cybersecurity_budget?.toString() || '0')
    );
  }, [org, name, industry, organizationSize, annualRevenue, cybersecurityBudget]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      const updated = await updateOrganizationMe({
        name,
        industry: industry || undefined,
        organization_size: organizationSize || undefined,
        annual_revenue: parseFloat(annualRevenue) || 0,
        cybersecurity_budget: parseFloat(cybersecurityBudget) || 0,
      });
      setOrg(updated);
      setSuccessMsg('Organization profile and budget parameters updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update organization profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeToggle = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  const handleCurrencyChange = (newPref: 'auto' | 'lakh' | 'crore') => {
    setCurrencyPref(newPref);
    try {
      localStorage.setItem('ps105_currency_pref', newPref);
      setSuccessMsg(`Currency formatting preference set to "${newPref.toUpperCase()}".`);
    } catch {
      // Storage error
    }
  };

  if (loading) {
    return (
      <LoadingState
        message="Loading Platform Settings..."
        subtitle="Retrieving tenant configurations and financial thresholds"
      />
    );
  }

  if (error && !org) {
    return <ErrorState title="Settings API Error" errorDetails={error} onRetry={fetchOrg} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform Settings"
        description="Manage organizational identity, financial benchmarks, and visual preferences."
      />

      <Tabs
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
        tabs={[
          { id: 'organization', label: 'Organization' },
          { id: 'financials', label: 'Financials' },
          { id: 'display', label: 'Display & Preferences' },
        ]}
      />

      {successMsg && (
        <div className="p-3 text-xs bg-ok-soft border border-ok/30 text-ok rounded-[10px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs bg-danger-soft border border-danger/30 text-danger rounded-[10px]">
          {error}
        </div>
      )}

      {activeTab === 'organization' && (
        <div className="p-6 bg-surface border border-line rounded-[10px] max-w-2xl">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-base font-semibold text-ink font-serif pb-2 border-b border-line">
              Enterprise Profile
            </h3>

            <Input
              label="Organization Legal Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Financial Services"
              info="Primary enterprise tenant identity displayed in headers and executive reports."
              required
            />

            <Select
              label="Industry Sector"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              info="Industry classification used to calibrate baseline threat probabilities."
              options={[
                { label: 'Financial Services', value: 'Financial Services' },
                { label: 'Technology / SaaS', value: 'Technology' },
                { label: 'Healthcare & Life Sciences', value: 'Healthcare' },
                { label: 'Manufacturing & Industrial', value: 'Manufacturing' },
                { label: 'Energy & Infrastructure', value: 'Energy' },
                { label: 'Retail & E-Commerce', value: 'Retail' },
                { label: 'Aerospace & Defense', value: 'Aerospace & Defense' },
                { label: 'Government & Public Sector', value: 'Government' },
              ]}
            />

            <Select
              label="Organization Scale"
              value={organizationSize}
              onChange={(e) => setOrganizationSize(e.target.value)}
              info="Employee scale tier used in peer risk benchmarking."
              options={[
                { label: 'Small (<100 Employees)', value: 'Small (<100)' },
                { label: 'Mid-Market (100 - 1,000)', value: 'Mid-Market' },
                { label: 'Enterprise (1,000 - 5,000)', value: 'Enterprise' },
                { label: 'Large Enterprise (5,000+)', value: 'Large Enterprise' },
              ]}
            />

            <div className="pt-4 border-t border-line flex items-center justify-end">
              <Button
                variant="primary"
                type="submit"
                isLoading={saving}
                disabled={!isDirty || saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Organization Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="p-6 bg-surface border border-line rounded-[10px] max-w-2xl">
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <h3 className="text-base font-semibold text-ink font-serif pb-2 border-b border-line">
              Financial Risk Parameters
            </h3>

            {parseFloat(annualRevenue) > 0 && parseFloat(cybersecurityBudget) > parseFloat(annualRevenue) && (
              <div className="p-3 text-xs bg-warn-soft border border-warn/30 text-warn rounded-[8px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <div>
                  <strong>Budget Warning:</strong> Annual cybersecurity budget ({formatINR(parseFloat(cybersecurityBudget))}) exceeds annual enterprise revenue ({formatINR(parseFloat(annualRevenue))}). Please verify fiscal allocation.
                </div>
              </div>
            )}

            {parseFloat(annualRevenue) > 0 && totalAle > parseFloat(annualRevenue) && (
              <div className="p-3 text-xs bg-danger-soft border border-danger/30 text-danger rounded-[8px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <div>
                  <strong>Sanity Warning:</strong> Modelled loss ({formatINR(totalAle)}) exceeds annual enterprise revenue ({formatINR(parseFloat(annualRevenue))}). Modelled loss exceeds annual revenue; review asset values and exposure factors.
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Input
                label="Annual Enterprise Revenue (₹)"
                type="number"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                info="Total annual gross revenue used to evaluate aggregate operational risk tolerance."
                required
                min="0"
                step="100000"
              />
              <div className="text-xs text-muted flex items-center gap-1.5 px-1">
                <span>Revenue Preview:</span>
                <span className="num font-semibold text-brand">
                  {formatINR(parseFloat(annualRevenue) || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Input
                label="Annual Cybersecurity Investment Budget (₹)"
                type="number"
                value={cybersecurityBudget}
                onChange={(e) => setCybersecurityBudget(e.target.value)}
                info="Dedicated capital ceiling for defensive control allocation in investment optimization."
                required
                min="0"
                step="50000"
              />
              <div className="text-xs text-muted flex items-center gap-1.5 px-1">
                <span>Budget Preview:</span>
                <span className="num font-semibold text-brand">
                  {formatINR(parseFloat(cybersecurityBudget) || 0)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-end">
              <Button
                variant="primary"
                type="submit"
                isLoading={saving}
                disabled={!isDirty || saving}
                icon={<Save className="w-4 h-4" />}
              >
                Save Financial Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'display' && (
        <div className="p-6 bg-surface border border-line rounded-[10px] max-w-2xl space-y-6">
          <h3 className="text-base font-semibold text-ink font-serif pb-2 border-b border-line">
            Display & Preferences
          </h3>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-surface-2 rounded-[8px] border border-line">
            <div>
              <h4 className="text-sm font-semibold text-ink">Theme Mode</h4>
              <p className="text-xs text-muted mt-0.5">
                Toggle between light publication mode and dark executive mode.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleThemeToggle}
              icon={theme === 'dark' ? <Sun className="w-4 h-4 text-warn" /> : <Moon className="w-4 h-4 text-muted" />}
            >
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Button>
          </div>

          {/* Currency Display Preference */}
          <div className="p-4 bg-surface-2 rounded-[8px] border border-line space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">Currency Display Preference</h4>
              <p className="text-xs text-muted mt-0.5">
                Controls how financial numbers are converted and displayed across dashboards and charts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleCurrencyChange('auto')}
                className={`p-3 rounded-[8px] border text-left text-xs transition-all cursor-pointer ${
                  currencyPref === 'auto'
                    ? 'bg-brand-soft border-brand text-brand font-medium'
                    : 'bg-surface border-line text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold">Auto (Recommended)</div>
                <div className="text-[11px] opacity-80 mt-1">Converts &lt;1L to ₹, 1L–99L to Lakh, 1Cr+ to Cr</div>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('lakh')}
                className={`p-3 rounded-[8px] border text-left text-xs transition-all cursor-pointer ${
                  currencyPref === 'lakh'
                    ? 'bg-brand-soft border-brand text-brand font-medium'
                    : 'bg-surface border-line text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold">Prefer Lakhs</div>
                <div className="text-[11px] opacity-80 mt-1">Shows up to 99 Lakh before scaling to Crore</div>
              </button>

              <button
                type="button"
                onClick={() => handleCurrencyChange('crore')}
                className={`p-3 rounded-[8px] border text-left text-xs transition-all cursor-pointer ${
                  currencyPref === 'crore'
                    ? 'bg-brand-soft border-brand text-brand font-medium'
                    : 'bg-surface border-line text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold">Prefer Crores</div>
                <div className="text-[11px] opacity-80 mt-1">Displays large exposures in ₹X.XX Cr</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
