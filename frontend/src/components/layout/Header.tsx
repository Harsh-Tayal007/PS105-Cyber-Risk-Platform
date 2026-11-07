import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';
import { getTheme, toggleTheme } from '../../lib/theme';
import { formatINR } from '../../lib/format';

export interface HeaderProps {
  onToggleMobileSidebar: () => void;
  activeModuleTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
}) => {
  const { organization, logout } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => getTheme());

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (e.detail) {
        setCurrentTheme(e.detail);
      } else {
        setCurrentTheme(getTheme());
      }
    };

    window.addEventListener('ps105_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('ps105_theme_change', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = toggleTheme();
    setCurrentTheme(next);
  };

  const budget = organization?.cybersecurity_budget || 0;

  return (
    <header className="shrink-0 h-[var(--app-header-h)] bg-surface border-b border-line z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Mobile toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-[8px] text-muted hover:text-ink hover:bg-surface-2 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Header Actions: Org Name + Annual Budget, Theme Toggle, User/Logout */}
      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        <div className="text-right">
          <div className="text-xs font-medium text-ink leading-tight">
            {organization?.name || 'Workspace'}
          </div>
          <div className="text-[11px] text-muted leading-tight mt-0.5">
            Annual budget: <span className="num font-medium text-ink">{formatINR(budget)}</span>
          </div>
        </div>

        <div className="h-5 w-px bg-line" />

        {/* Theme Toggle (Sun/Moon) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleTheme}
          aria-label={currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-2 text-muted hover:text-ink"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-warn" />
          ) : (
            <Moon className="w-4 h-4 text-muted" />
          )}
        </Button>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          aria-label="Sign out"
          className="p-2 text-muted hover:text-danger hover:bg-danger-soft transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
