import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { superAdminApi } from '../../services/api';
import { Spinner } from '../../components/common/UI';
import { StatsCard } from '../../components/common/StatusBadge';

export const Analytics: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn:  () => superAdminApi.getDashboardStats().then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const stats       = data?.stats;
  const monthlyData = data?.monthlyData || [];

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" /> Analytics & Reports
        </h1>
        <p className="text-slate-500 text-sm mt-1">Comprehensive onboarding pipeline analytics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Employees" value={stats?.totalEmployees || 0}
          icon={<Users     className="w-5 h-5 text-blue-600"  />} iconBg="bg-blue-50"    />
        <StatsCard title="Approved"        value={stats?.approved || 0}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600"/>} iconBg="bg-emerald-50"
          change={`${stats?.totalEmployees ? Math.round((stats.approved/stats.totalEmployees)*100) : 0}% rate`}
          changeType="up" />
        <StatsCard title="In Progress"     value={stats?.inProgress || 0}
          icon={<Calendar  className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-50"   />
        <StatsCard title="Pending Review"  value={stats?.pending || 0}
          icon={<BarChart3 className="w-5 h-5 text-violet-600"/>} iconBg="bg-violet-50"  />
      </div>

      <div className="card">
        <h2 className="section-title mb-1">Monthly Registrations vs Approvals</h2>
        <p className="text-xs text-slate-400 mb-4">Last 12 months</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={v => { const [,m] = v.split('-'); return MONTHS[+m-1]; }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="total"    fill="#3b82f6" radius={[4,4,0,0]} name="Registered" />
            <Bar dataKey="approved" fill="#10b981" radius={[4,4,0,0]} name="Approved"   />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="section-title mb-1">Approval Rate Trend</h2>
        <p className="text-xs text-slate-400 mb-4">Percentage approved vs registered each month</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={monthlyData.map((d: any) => ({
              ...d,
              rate: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0,
            }))}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={v => { const [,m] = v.split('-'); return MONTHS[+m-1]; }} />
            <YAxis unit="%" tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0,100]} />
            <Tooltip formatter={(v: any) => [`${v}%`, 'Approval Rate']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="rate" stroke="#8b5cf6" fill="url(#rateGrad)"
              strokeWidth={2} name="Approval Rate" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
