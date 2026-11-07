import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Server,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Sliders,
  FolderGit2,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ChevronRight,
  BookOpenText,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'overview', label: 'Executive Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'blueprint', label: 'Platform Blueprint', icon: <BookOpenText className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Assess',
    items: [
      { id: 'assets', label: 'Asset Inventory', icon: <Server className="w-5 h-5" /> },
      { id: 'vulnerabilities', label: 'Vulnerabilities & Findings', icon: <ShieldAlert className="w-5 h-5" /> },
      { id: 'risks', label: 'Risk Quantification', icon: <AlertTriangle className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Decide',
    items: [
      { id: 'simulations', label: 'Loss Simulations', icon: <Activity className="w-5 h-5" /> },
      { id: 'optimization', label: 'Investment Optimization', icon: <Sliders className="w-5 h-5" /> },
      { id: 'scenarios', label: 'Budget Scenarios', icon: <FolderGit2 className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Report',
    items: [
      { id: 'reports', label: 'Executive Reports', icon: <FileSpreadsheet className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Admin',
    items: [
      { id: 'settings', label: 'Platform Settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** Derive 1–2 letter initials (sentence case, not uppercase) from an org name */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters = words
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  // sentence case: first char uppercase, rest lowercase
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { organization } = useAuth();
  const initials = getInitials(organization?.name || 'Workspace');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-surface border-r border-line transition-all duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'w-[72px]' : 'w-[264px]'} flex flex-col`}
      >
        {/* ── Brand Header ── */}
        <div
          className={`flex items-center border-b border-line bg-surface-2/30 h-16 shrink-0 ${
            isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'
          }`}
        >
          {/* Brand icon — always visible */}
          <div className="p-1.5 rounded-[8px] bg-brand-soft text-brand shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>

          {/* Text — only when expanded */}
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-sm font-semibold tracking-tight text-ink font-serif block truncate">
                PS105 Platform
              </span>
              <span className="text-[11px] text-muted block truncate">
                Cyber Risk Quantification
              </span>
            </div>
          )}
        </div>

        {/* ── Edge toggle button (straddles the right border at header level) ── */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ top: 'calc(var(--app-header-h) / 2 - 12px)' }}
            className="hidden lg:flex absolute -right-3 z-40 w-6 h-6 rounded-full border border-line bg-surface shadow-sm items-center justify-center cursor-pointer hover:bg-surface-2 transition-colors"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
                isCollapsed ? '' : 'rotate-180'
              }`}
            />
          </button>
        )}

        {/* ── Navigation ── */}
        <nav
          className="flex-1 py-3 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--line) transparent' }}
        >
          {navGroups.map((group, groupIdx) => (
            <div key={group.title}>
              {/* Group separator / heading */}
              {isCollapsed ? (
                /* Full-width separator minus 16px total margin */
                groupIdx > 0 ? (
                  <div className="mx-2 my-3 border-t border-line" />
                ) : null
              ) : (
                <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-muted/80 tracking-normal select-none">
                  {group.title}
                </div>
              )}

              {/* Nav items */}
              <div className={`${isCollapsed ? 'flex flex-col items-center gap-1.5 px-2' : 'space-y-0.5 px-2.5'}`}>
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;

                  const btn = isCollapsed ? (
                    /* Collapsed: 44×44 centered button */
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      aria-label={item.label}
                      className={`relative w-11 h-11 flex items-center justify-center rounded-[10px] transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-brand-soft text-brand'
                          : 'text-muted hover:text-ink hover:bg-surface-2'
                      }`}
                    >
                      {/* 3px left-inset active indicator */}
                      {isActive && (
                        <span className="absolute left-[6px] top-2 bottom-2 w-[3px] bg-brand rounded-r" />
                      )}
                      {item.icon}
                    </button>
                  ) : (
                    /* Expanded: h-10 row */
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`relative w-full h-10 flex items-center gap-3 px-2.5 rounded-[8px] text-xs transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-brand-soft text-brand font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:bg-brand before:rounded-r'
                          : 'text-muted hover:text-ink hover:bg-surface-2'
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? 'text-brand' : 'text-muted'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.id} content={item.label} position="right" portal={true}>
                        {btn}
                      </Tooltip>
                    );
                  }

                  return btn;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className={`p-3 border-t border-line bg-surface-2/30 shrink-0 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            /* Collapsed: circular avatar only */
            <div
              className="w-8 h-8 rounded-full bg-brand-soft text-brand text-xs font-medium flex items-center justify-center shrink-0"
              title={organization?.name || 'Workspace'}
            >
              {initials}
            </div>
          ) : (
            /* Expanded: avatar + name + muted "Workspace" label */
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-soft text-brand text-xs font-medium flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-ink truncate block">
                  {organization?.name || 'Workspace'}
                </span>
                <span className="text-[11px] text-muted block">Workspace</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
