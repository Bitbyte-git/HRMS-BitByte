import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, User, CalendarRange, Wallet } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '../components/layout/Sidebar';
import { useAuthStore } from '../context/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NotificationBell } from '../components/common/NotificationBell';

const navItems = [
  { to: '/employee/dashboard',  icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard'      },
  { to: '/employee/onboarding', icon: <ClipboardList   className="w-4 h-4" />, label: 'Onboarding Form'},
  { to: '/employee/leaves',     icon: <CalendarRange   className="w-4 h-4" />, label: 'My Leaves'      },
  { to: '/employee/payroll',    icon: <Wallet          className="w-4 h-4" />, label: 'Payroll'        },
  { to: '/employee/profile',    icon: <User            className="w-4 h-4" />, label: 'My Profile'     },
];

// Page title map for the topbar
const pageTitles: Record<string, string> = {
  '/employee/dashboard':  'Dashboard',
  '/employee/onboarding': 'Onboarding Form',
  '/employee/leaves':     'My Leaves',
  '/employee/payroll':    'Payroll',
  '/employee/profile':    'My Profile',
};

export const EmployeeLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'HR Portal';

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar navItems={navItems} role="employee" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Topbar ───────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-100 dark:bg-slate-900 dark:border-slate-800 px-5 flex items-center justify-between flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            {/* Page title — visible on desktop, replaces breadcrumb-like jumble */}
            <h1 className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            {/* Real Notification Bell */}
            <NotificationBell />
            {/* User avatar */}
            <div className="ml-1 flex items-center gap-2 pl-3 border-l border-slate-100 dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-semibold select-none">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="hidden md:block text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[120px] truncate">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
