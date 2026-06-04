import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, Users, UserCog, BarChart3, CalendarCheck, Package, Wallet } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '../components/layout/Sidebar';
import { useAuthStore } from '../context/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NotificationBell } from '../components/common/NotificationBell';

const navItems = [
  { to: '/super-admin/dashboard',  icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard'        },
  { to: '/super-admin/pending',    icon: <ClipboardCheck  className="w-4 h-4" />, label: 'Pending Approvals' },
  { to: '/super-admin/employees',  icon: <Users           className="w-4 h-4" />, label: 'All Employees'     },
  { to: '/super-admin/admins',     icon: <UserCog         className="w-4 h-4" />, label: 'Admin Management'  },
  { to: '/super-admin/attendance', icon: <CalendarCheck   className="w-4 h-4" />, label: 'Attendance'        },
  { to: '/super-admin/payroll',    icon: <Wallet          className="w-4 h-4" />, label: 'Payroll Reports'   },
  { to: '/super-admin/assets',     icon: <Package         className="w-4 h-4" />, label: 'Assets'            },
  { to: '/super-admin/analytics',  icon: <BarChart3       className="w-4 h-4" />, label: 'Analytics'         },
];

const pageTitles: Record<string, string> = {
  '/super-admin/dashboard': 'Dashboard',
  '/super-admin/pending':   'Pending Approvals',
  '/super-admin/employees': 'All Employees',
  '/super-admin/admins':    'Admin Management',
  '/super-admin/attendance': 'Attendance',
  '/super-admin/payroll': 'Payroll Reports',
  '/super-admin/assets': 'Asset Management',
  '/super-admin/analytics': 'Analytics',
};

export const SuperAdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'HR Portal';

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar navItems={navItems} role="super_admin" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Topbar ───────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-100 dark:bg-slate-900 dark:border-slate-800 px-5 flex items-center justify-between flex-shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <MobileMenuButton onClick={() => setSidebarOpen(true)} />
            <h1 className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <div className="ml-1 flex items-center gap-2 pl-3 border-l border-slate-100 dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold select-none">
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
