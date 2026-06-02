import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, X, Menu } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

interface NavItem { to: string; icon: React.ReactNode; label: string; badge?: number }
interface SidebarProps { navItems: NavItem[]; role: string; isOpen: boolean; onToggle: () => void }

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', employee: 'Employee', intern: 'Intern'
};

export const Sidebar: React.FC<SidebarProps> = ({ navItems, role, isOpen, onToggle }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-white dark:bg-slate-800 z-30
          flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-700
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* ── Brand ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-slate-800 dark:text-white text-sm font-semibold tracking-tight">HR Portal</p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] leading-none tracking-wide">Onboarding System</p>
            </div>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            onClick={onToggle}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Nav ───────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          <div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5">
              Menu
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => window.innerWidth < 1024 && onToggle()}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        <span
                          className={`w-0.5 h-3.5 rounded-full flex-shrink-0 transition-all duration-200 ${
                            isActive ? 'bg-primary-500' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                          }`}
                        />
                        <span className={`flex-shrink-0 opacity-inherit ${isActive ? 'text-primary-600 dark:text-primary-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-primary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* ── User footer ───────────────────────────────────────── */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0 space-y-0.5">
          {/* User identity row */}
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-700 dark:text-slate-200 text-xs font-medium truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] truncate leading-tight">
                {roleLabel[role] || role}
              </p>
            </div>
          </div>
          {/* Sign out — visually demoted, not competing with nav */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const MobileMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
  >
    <Menu className="w-5 h-5" />
  </button>
);
