import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";
import React, { useEffect } from "react";
import { useThemeStore } from "./context/themeStore";
import { AstroPlexusBackground } from "./components/common/AstroPlexus";
import { NotificationBell } from "./components/common/NotificationBell";

import {
  ProtectedRoute,
  PublicRoute,
  RoleRoute,
} from "./components/common/RouteGuards";

// Layouts
import { AdminLayout } from "./layouts/AdminLayout";
import { EmployeeLayout } from "./layouts/EmployeeLayout";
import { SuperAdminLayout } from "./layouts/SuperAdminLayout";

// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

// Employee Pages
import { EmployeeDashboard } from "./pages/employee/EmployeeDashboard";
import { EmployeeLeaves } from "./pages/employee/EmployeeLeaves";
import { EmployeePayroll } from "./pages/employee/EmployeePayroll";
import { EmployeeProfile } from "./pages/employee/EmployeeProfile";
import { OnboardingForm } from "./pages/employee/OnboardingForm";

// Admin Pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminProfile } from "./pages/admin/AdminProfile";
import { AdminAttendance } from "./pages/admin/AdminAttendance";
import { DepartmentManagement } from "./pages/admin/DepartmentManagement";
import { EmployeeList } from "./pages/admin/EmployeeList";
import { LeaveManagement } from "./pages/admin/LeaveManagement";
import { PayrollManagement } from "./pages/admin/PayrollManagement";
import { VerificationPanel } from "./pages/admin/VerificationPanel";

// Super Admin Pages
import { AdminManagement } from "./pages/superadmin/AdminManagement";
import { AllEmployees } from "./pages/superadmin/AllEmployees";
import { Analytics } from "./pages/superadmin/Analytics";
import { EmployeeReview } from "./pages/superadmin/EmployeeReview";
import { PendingApprovals } from "./pages/superadmin/PendingApprovals";
import { PayrollReports } from "./pages/superadmin/PayrollReports";
import { SuperAdminDashboard } from "./pages/superadmin/SuperAdminDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        if ([401, 403, 404].includes(error?.response?.status)) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function App() {
  const { initializeTheme, isDarkMode } = useThemeStore((state) => ({
    initializeTheme: state.initializeTheme,
    isDarkMode: state.isDarkMode
  }));

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Employee & Intern */}
          <Route element={<RoleRoute allowedRoles={["employee", "intern"]} />}>
            <Route element={<EmployeeLayout />}>
              <Route
                path="/employee/dashboard"
                element={<EmployeeDashboard />}
              />
              <Route path="/employee/onboarding" element={<OnboardingForm />} />
              <Route path="/employee/leaves" element={<EmployeeLeaves />} />
              <Route path="/employee/payroll" element={<EmployeePayroll />} />
              <Route path="/employee/profile" element={<EmployeeProfile />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<RoleRoute allowedRoles={["admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<EmployeeList />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/leaves" element={<LeaveManagement />} />
              <Route path="/admin/payroll" element={<PayrollManagement />} />
              <Route path="/admin/departments" element={<DepartmentManagement />} />
              <Route
                path="/admin/employees/:profileId"
                element={<VerificationPanel />}
              />
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>
          </Route>

          {/* Super Admin */}
          <Route element={<RoleRoute allowedRoles={["super_admin"]} />}>
            <Route element={<SuperAdminLayout />}>
              <Route
                path="/super-admin/dashboard"
                element={<SuperAdminDashboard />}
              />
              <Route
                path="/super-admin/pending"
                element={<PendingApprovals />}
              />
              <Route path="/super-admin/employees" element={<AllEmployees />} />
              <Route
                path="/super-admin/employees/:profileId"
                element={<EmployeeReview />}
              />
              <Route path="/super-admin/admins" element={<AdminManagement />} />
              <Route path="/super-admin/attendance" element={<AdminAttendance />} />
              <Route path="/super-admin/payroll" element={<PayrollReports />} />
              <Route path="/super-admin/analytics" element={<Analytics />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <AstroPlexusBackground isDark={isDarkMode} />
      <NotificationBell />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            fontSize: "14px",
            borderRadius: "8px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </QueryClientProvider>
  );
}
