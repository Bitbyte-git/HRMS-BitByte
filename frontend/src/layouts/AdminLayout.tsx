import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Building2, CalendarCheck, CalendarRange, LayoutDashboard, Package, Users, UserCircle, Wallet } from 'lucide-react';
import { Sidebar, MobileMenuButton } from '../components/layout/Sidebar';
import { useAuthStore } from '../context/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { NotificationBell } from '../components/common/NotificationBell';
import { AIChatBotWidget } from '../components/common/AIChatBotWidget';

const navItems = [
  { to: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
  { to: '/admin/employees', icon: <Users          className="w-4 h-4" />, label: 'Employees'  },
  { to: '/admin/attendance', icon: <CalendarCheck className="w-4 h-4" />, label: 'Attendance' },
  { to: '/admin/leaves', icon: <CalendarRange className="w-4 h-4" />, label: 'Leaves' },
  { to: '/admin/payroll', icon: <Wallet className="w-4 h-4" />, label: 'Payroll' },
  { to: '/admin/assets', icon: <Package className="w-4 h-4" />, label: 'Assets' },
  { to: '/admin/departments', icon: <Building2 className="w-4 h-4" />, label: 'Departments' },
  { to: '/admin/profile',   icon: <UserCircle     className="w-4 h-4" />, label: 'My Profile' },
];

const pageTitles: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/employees': 'Employees',
  '/admin/attendance': 'Attendance',
  '/admin/leaves': 'Leave Management',
  '/admin/payroll': 'Payroll Management',
  '/admin/assets': 'Asset Management',
  '/admin/departments': 'Department Management',
  '/admin/profile':   'My Profile',
};

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'HR Portal';

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar navItems={navItems} role="admin" isOpen={sidebarOpen} onToggle={() => setSidebarOpen(p => !p)} />

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
      <AIChatBotWidget />
    </div>
  );
};
