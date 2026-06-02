import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';
import type { Role } from '../types';

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutHandler = useCallback(() => {
    queryClient.clear();
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate, queryClient]);
  const dashboardMap: Record<Role, string> = {
    employee: '/employee/dashboard', intern: '/employee/dashboard', admin: '/admin/dashboard', super_admin: '/super-admin/dashboard',
  };
  return {
    user, token, isAuthenticated, setAuth,
    logout: logoutHandler,
    dashboardPath: user ? dashboardMap[user.role] : '/login',
    isEmployee:    user?.role === 'employee',
    isAdmin:       user?.role === 'admin',
    isSuperAdmin:  user?.role === 'super_admin',
  };
};

export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page,  setPage]  = useState(initialPage);
  const [limit]           = useState(initialLimit);
  const goToPage = useCallback((p: number) => setPage(p), []);
  const reset    = useCallback(() => setPage(1), []);
  return { page, limit, setPage: goToPage, reset };
};

export const useDebounce = <T>(value: T, delay = 400): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
};

export const useDisclosure = (initial = false) => {
  const [isOpen, setIsOpen] = useState(initial);
  return {
    isOpen,
    open:   useCallback(() => setIsOpen(true), []),
    close:  useCallback(() => setIsOpen(false), []),
    toggle: useCallback(() => setIsOpen(p => !p), []),
  };
};

export const useApiMutation = <TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: any) => void;
    successMessage?: string;
    invalidateKeys?: string[][];
  }
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (options?.successMessage) toast.success(options.successMessage);
      options?.invalidateKeys?.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Something went wrong');
      options?.onError?.(error);
    },
  });
};
