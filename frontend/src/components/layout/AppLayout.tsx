import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export interface AppLayoutProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ps105_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const mainRef = React.useRef<HTMLElement>(null);

  // Scroll to top of main scroller on tab navigation
  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ps105_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="h-screen bg-bg text-ink flex overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Shell — follows sidebar 72px / 264px */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-200 ${
          isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[264px]'
        }`}
      >
        <Header
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main
          ref={mainRef}
          id="app-main-scroller"
          className="flex-1 w-full overflow-y-auto overflow-x-hidden focus:outline-none"
        >
          {activeTab === 'blueprint' ? (
            children
          ) : (
            <div className="w-full max-w-[1200px] mx-auto p-6 flex flex-col gap-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
