import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { InfoTip } from '../components/ui/InfoTip';
import { ShieldCheck, LogIn, Lock, Mail, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login, demoLogin, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Clean any legacy saved credentials from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('ps105_saved_creds');
      localStorage.removeItem('ps105_save_credentials');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const cleanEmail = email.trim();
    try {
      await login({ email: cleanEmail, password });
    } catch {
      // Handled in context
    }
  };

  const handleDemoLogin = async () => {
    clearError();
    try {
      await demoLogin();
    } catch {
      // Handled in context
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink grid grid-cols-1 lg:grid-cols-2">
      {/* Left Value Proposition Panel (Brand Background on >= lg) */}
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
              Board-level cyber risk quantification & investment optimization.
            </h1>
            <p className="mt-4 text-sm text-brand-soft/90 leading-relaxed">
              Translate security posture and technical vulnerabilities into actuarial loss distributions and mathematically optimal defense budgets.
            </p>

            <ul className="mt-8 space-y-4 text-xs sm:text-sm text-brand-soft/95">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Deterministic FAIR models convert threats into annual financial loss exposure in rupees.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Automated NVD & CISA KEV exploit correlation mapped directly to verified asset software.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                <span>
                  Monte Carlo loss simulations and Knapsack integer programming for maximum risk reduction.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-brand-ink/15 text-xs text-brand-soft/75">
          Executive Decision Support System • NIST CSF Aligned
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-surface">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-ink font-serif tracking-tight">
              Sign in to your organization
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Enter your credentials to access the risk management dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-danger-soft border border-danger/30 text-danger rounded-[10px]">
                {error}
              </div>
            )}

            <Input
              label="Work Email Address"
              type="email"
              placeholder="analyst@yourcompany.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
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
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
                icon={<LogIn className="w-4 h-4" />}
              >
                Sign In to Dashboard
              </Button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-2 text-muted">Or Quick Access</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs"
              onClick={handleDemoLogin}
              isLoading={loading}
            >
              Explore Demo Organization (ABC Financial)
            </Button>
            <InfoTip content="Loads the synthetic ABC Financial Services dataset. No real company data." />
          </div>

          <div className="pt-4 border-t border-line text-center text-xs text-muted">
            <span>Don't have an account? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-brand hover:underline font-medium cursor-pointer"
            >
              Register New Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
