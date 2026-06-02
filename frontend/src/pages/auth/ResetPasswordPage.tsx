import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { Button, Input, Alert } from '../../components/common/UI';
import type { Role } from '../../types';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8,'Min 8 characters')
    .regex(/[A-Z]/,'One uppercase letter')
    .regex(/[a-z]/,'One lowercase letter')
    .regex(/[0-9]/,'One number')
    .regex(/[@$!%*?&]/,'One special character'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});
type ResetForm = z.infer<typeof schema>;

const dashboardMap: Record<Role, string> = {
  employee: '/employee/dashboard', intern: '/employee/dashboard', admin: '/admin/dashboard', super_admin: '/super-admin/dashboard',
};

export const ResetPasswordPage: React.FC = () => {
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const { user, updateUser, setAuth } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(schema),
  });
  const newPwd = watch('newPassword', '');

  const rules = [
    { label: 'At least 8 characters',          test: newPwd.length >= 8 },
    { label: 'One uppercase letter',            test: /[A-Z]/.test(newPwd) },
    { label: 'One lowercase letter',            test: /[a-z]/.test(newPwd) },
    { label: 'One number',                      test: /[0-9]/.test(newPwd) },
    { label: 'One special character (@$!%*?&)', test: /[@$!%*?&]/.test(newPwd) },
  ];

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: ({ data }) => {
      updateUser({ isFirstLogin: false });
      if (data.data?.token && user) setAuth({ ...user, isFirstLogin: false }, data.data.token);
      toast.success('Password reset! Welcome aboard.');
      navigate(dashboardMap[user?.role || 'employee']);
    },
    onError: (e: any) => setApiError(e?.response?.data?.message || 'Reset failed.'),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-navy via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-blue-200 text-sm mt-1">You must reset your password before continuing.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">This is your first login. Please set a strong password.</p>
          </div>
          {apiError && <Alert type="error" message={apiError} onClose={() => setApiError('')} />}
          <form onSubmit={handleSubmit(d => { setApiError(''); mutation.mutate(d); })} className="space-y-4">
            <Input label="Current (Temporary) Password" type="password" leftIcon={<Lock className="w-4 h-4" />}
              error={errors.currentPassword?.message} required {...register('currentPassword')} />
            <div>
              <Input label="New Password" type="password" leftIcon={<Lock className="w-4 h-4" />}
                error={errors.newPassword?.message} required {...register('newPassword')} />
              {newPwd && (
                <div className="mt-2 space-y-1">
                  {rules.map(r => (
                    <div key={r.label} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${r.test ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={`text-xs ${r.test ? 'text-emerald-600' : 'text-slate-400'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input label="Confirm New Password" type="password" leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message} required {...register('confirmPassword')} />
            <Button type="submit" loading={mutation.isPending} className="w-full justify-center py-2.5 mt-2">
              Reset Password & Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
