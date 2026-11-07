import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { ShieldCheck, UserPlus, Lock, Mail, User, Building, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register, loading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [organizationSize, setOrganizationSize] = useState('Mid-Market');
  const [annualRevenue, setAnnualRevenue] = useState('10000000');
  const [cybersecurityBudget, setCybersecurityBudget] = useState('500000');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register({
        name,
        email: email.trim(),
        password,
        organization_name: organizationName || undefined,
        industry,
        organization_size: organizationSize,
        annual_revenue: annualRevenue ? parseFloat(annualRevenue) : 0,
        cybersecurity_budget: cybersecurityBudget ? parseFloat(cybersecurityBudget) : 0,
      });
    } catch {
      // Handled in context
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink grid grid-cols-1 lg:grid-cols-2">
      {/* Left Value Proposition Panel */}
      <div className="bg-brand text-brand-ink p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[10px] bg-brand-soft/20 border border-brand-ink/20">
              <ShieldCheck className="w-6 h-6 text-brand-ink" />
            </div>
            <span className="font-serif font-semibold text-lg tracking-tight">
              PS105 Platform
            </span>
          </div>

          <div className="mt-12 lg:mt-20 max-w-lg">
            <h1 className="text-3xl lg:text-4xl font-semibold font-serif leading-tight tracking-tight text-brand-ink">
              Establish your organization's cyber risk profile.
            </h1>
            <p className="mt-4 text-sm text-brand-soft/90 leading-relaxed">
              Create an enterprise workspace with baseline revenue and security budget metrics to initialize FAIR financial loss simulations.
            </p>

            <ul className="mt-8 space-y-4 text-xs sm:text-sm text-brand-soft/95">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Calibrated against Indian currency scales (₹ Lakh and ₹ Crore).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Tenant-isolated SQLite databases with strict data boundary enforcement.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Pre-configured NIST SP 800-53 and CIS Controls mitigation factors.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-brand-ink/15 text-xs text-brand-soft/75">
          Enterprise Multi-Tenant Security Platform • NIST CSF & FAIR Aligned
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-surface overflow-y-auto">
        <div className="w-full max-w-lg space-y-5">
          <div>
            <h2 className="text-2xl font-semibold text-ink font-serif tracking-tight">
              Register New Organization
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Set up your administrator profile and enterprise financial parameters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-danger-soft border border-danger/30 text-danger rounded-[10px]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                icon={<User className="w-4 h-4" />}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Work Email"
                type="email"
                placeholder="jane@company.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Input
              label="Organization Name"
              type="text"
              placeholder="Acme Enterprises Ltd"
              icon={<Building className="w-4 h-4" />}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Industry Sector"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
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
                options={[
                  { label: 'Small (<100 Employees)', value: 'Small (<100)' },
                  { label: 'Mid-Market (100 - 1,000)', value: 'Mid-Market' },
                  { label: 'Enterprise (1,000 - 5,000)', value: 'Enterprise' },
                  { label: 'Large Enterprise (5,000+)', value: 'Large Enterprise' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Annual Revenue (₹)"
                type="number"
                placeholder="10000000"
                value={annualRevenue}
                onChange={(e) => setAnnualRevenue(e.target.value)}
                min="0"
                step="1000"
              />

              <Input
                label="Security Budget (₹)"
                type="number"
                placeholder="500000"
                value={cybersecurityBudget}
                onChange={(e) => setCybersecurityBudget(e.target.value)}
                min="0"
                step="1000"
              />
            </div>

            <Input
              label="Password (Min 8 characters)"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-ink focus:outline-none transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Create Account & Initialize Workspace
              </Button>
            </div>
          </form>

          <div className="pt-4 border-t border-line text-center text-xs text-muted">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-brand hover:underline font-medium cursor-pointer"
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
