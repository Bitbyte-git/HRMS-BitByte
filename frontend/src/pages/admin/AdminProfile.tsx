import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Shield, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { adminApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { Spinner, Badge } from '../../components/common/UI';

const Field: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon, label, value,
}) => (
  <div className="flex items-start gap-3 py-3.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
    <span className="text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</div>
    </div>
  </div>
);

export const AdminProfile: React.FC = () => {
  const { user: storeUser } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn:  () => adminApi.getMyProfile().then((r) => r.data.data?.user),
  });

  const user = data || storeUser;

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <Spinner size="lg" />
    </div>
  );

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in">
      <h1 className="page-title">My Profile</h1>

      <div className="card space-y-0">
        {/* Identity block */}
        <div className="flex items-center gap-4 pb-5 mb-1 border-b border-slate-50 dark:border-slate-700/50">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 truncate mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="submitted">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
              <Badge variant={user?.status === 'active' ? 'approved' : 'rejected'}>
                {user?.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Detail fields */}
        <div>
          <Field
            icon={<Mail className="w-4 h-4" />}
            label="Email"
            value={user?.email}
          />
          <Field
            icon={<Shield className="w-4 h-4" />}
            label="Role"
            value={<span className="capitalize">{user?.role?.replace('_', ' ')}</span>}
          />
          <Field
            icon={<Shield className="w-4 h-4" />}
            label="Account Status"
            value={<span className="capitalize">{user?.status}</span>}
          />
          {user?.lastLogin && (
            <Field
              icon={<Clock className="w-4 h-4" />}
              label="Last Login"
              value={format(new Date(user.lastLogin), 'dd MMM yyyy, hh:mm a')}
            />
          )}
          {(user as any)?.createdAt && (
            <Field
              icon={<Calendar className="w-4 h-4" />}
              label="Account Created"
              value={format(new Date((user as any).createdAt), 'dd MMM yyyy')}
            />
          )}
        </div>
      </div>
    </div>
  );
};
