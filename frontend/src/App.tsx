import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewPage } from './pages/OverviewPage';
import { AssetsPage } from './pages/AssetsPage';
import { VulnerabilitiesPage } from './pages/VulnerabilitiesPage';
import { RisksPage } from './pages/RisksPage';
import { SimulationsPage } from './pages/SimulationsPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BlueprintPage } from './pages/BlueprintPage';
import { LoadingState } from './components/ui/LoadingState';

const VALID_TABS = [
  'overview', 'assets', 'vulnerabilities', 'risks',
  'simulations', 'optimization', 'scenarios', 'reports', 'settings', 'blueprint',
];

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Restore last-visited tab from sessionStorage or hash so refresh/deep links work
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#sec-') || hash === '#blueprint') {
        return 'blueprint';
      }
    }
    const saved = sessionStorage.getItem('ps105_active_tab') || 'overview';
    return VALID_TABS.includes(saved) ? saved : 'overview';
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <LoadingState
          message="Authenticating Application Session..."
          subtitle="Verifying JWT bearer token with FastAPI backend"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  const handleSelectTab = (tab: string) => {
    if (tab !== 'blueprint' && typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setActiveTab(tab);
    sessionStorage.setItem('ps105_active_tab', tab);
  };

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'overview':        return <OverviewPage onSelectTab={handleSelectTab} />;
      case 'assets':          return <AssetsPage />;
      case 'vulnerabilities': return <VulnerabilitiesPage />;
      case 'risks':           return <RisksPage />;
      case 'simulations':     return <SimulationsPage />;
      case 'optimization':    return <OptimizationPage />;
      case 'scenarios':       return <ScenariosPage />;
      case 'reports':         return <ReportsPage />;
      case 'settings':        return <SettingsPage />;
      case 'blueprint':       return <BlueprintPage onSelectTab={handleSelectTab} />;
      default:                return <OverviewPage />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onSelectTab={handleSelectTab}>
      {renderActiveModule()}
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
