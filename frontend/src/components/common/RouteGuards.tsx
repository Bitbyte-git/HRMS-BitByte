import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import type { Role } from '../../types';

export const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.isFirstLogin && location.pathname !== '/reset-password')
    return <Navigate to="/reset-password" replace />;
  return <Outlet />;
};

interface RoleRouteProps { allowedRoles: Role[] }
export const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    const dashboardMap: Record<Role, string> = {
      employee:    '/employee/dashboard',
      intern:      '/employee/dashboard',
      admin:       '/admin/dashboard',
      super_admin: '/super-admin/dashboard',
    };
    return <Navigate to={dashboardMap[user?.role || 'employee']} replace />;
  }
  return <Outlet />;
};

export const PublicRoute = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    const dashboardMap: Record<Role, string> = {
      employee:    '/employee/dashboard',
      intern:      '/employee/dashboard',
      admin:       '/admin/dashboard',
      super_admin: '/super-admin/dashboard',
    };
    return <Navigate to={dashboardMap[user.role]} replace />;
  }
  return <Outlet />;
};
