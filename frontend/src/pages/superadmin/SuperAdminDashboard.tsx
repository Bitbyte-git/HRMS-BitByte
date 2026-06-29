import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, Clock, CheckCircle, UserCog, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { superAdminApi } from '../../services/api';
import { Spinner, Button } from '../../components/common/UI';
import { StatsCard, OverallStatusBadge } from '../../components/common/StatusBadge';
import { Table } from '../../components/common/Table';
import { getConfirmedPosition } from '../../utils/hr';

// Restrained, professional palette — not rainbow
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

// Recharts tooltip — clean, no heavy border
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn:  () => superAdminApi.getDashboardStats().then(r => r.data.data),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pendingApprovals', { page: 1, limit: 5 }],
    queryFn:  () => superAdminApi.getPendingApprovals({ page: 1, limit: 5 }).then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="flex justify-center items-center py-24"><Spinner size="lg" /></div>
  );

  const stats       = data?.stats;
  const monthlyData = data?.monthlyData || [];
  const statusDist  = data?.statusDistribution || [];

  const pieData = statusDist
    .map((s: any) => ({ name: s._id.replace(/_/g, ' '), value: s.count }))
    .filter((d: any) => d.value > 0);

  const pendingCount = pendingData?.pagination?.total || 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Complete onboarding overview across the organisation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary" size="sm"
            icon={<UserCog className="w-3.5 h-3.5" />}
            onClick={() => navigate('/super-admin/admins')}
          >
            Manage Admins
          </Button>
          <Button
            size="sm"
            icon={<Clock className="w-3.5 h-3.5" />}
            onClick={() => navigate('/super-admin/pending')}
          >
            Pending Approvals
            {pendingCount > 0 && (
              <span className="ml-0.5 bg-white/20 rounded-full px-1.5 py-px text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees" value={stats?.totalEmployees || 0}
          icon={<Users className="w-4 h-4 text-primary-600" />} iconBg="bg-primary-50 dark:bg-primary-900/20"
        />
        <StatsCard
          title="Fully Approved" value={stats?.approved || 0}
          icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-900/20"
          change={`${stats?.totalEmployees ? Math.round((stats.approved / stats.totalEmployees) * 100) : 0}% rate`}
          changeType="up"
        />
        <StatsCard
          title="Pending Review" value={stats?.pending || 0}
          icon={<Clock className="w-4 h-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatsCard
          title="Total Admins" value={stats?.totalAdmins || 0}
          icon={<UserCog className="w-4 h-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title">Monthly Trend</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Onboarding registrations & approvals</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.8} />
              <XAxis
                dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => {
                  const [y, m] = v.split('-');
                  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} '${y.slice(2)}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total"    stroke="#6366f1" fill="url(#totalGrad)"    strokeWidth={1.5} name="Total"    dot={false} />
              <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#approvedGrad)" strokeWidth={1.5} name="Approved" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="card">
          <h2 className="section-title mb-1">Status Breakdown</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Current employee statuses</p>
          {pieData.length > 0
            ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="42%"
                    innerRadius={52} outerRadius={72}
                    paddingAngle={2} dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconSize={6} iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: '#94a3b8' }}
                    formatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )
            : (
              <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
                No data yet
              </div>
            )
          }
        </div>
      </div>

      {/* ── Pending approvals table ──────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="section-title">Awaiting Final Approval</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Profiles verified by Admin, pending your review.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/pending')}>
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Table
          data={pendingData?.employees || []}
          keyExtractor={r => r._id}
          onRowClick={r => navigate(`/super-admin/employees/${r._id}`)}
          columns={[
            {
              key: 'userId', header: 'Employee',
              render: (_, r) => (
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                    {(r.userId as any)?.firstName} {(r.userId as any)?.lastName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{(r.userId as any)?.email}</p>
                </div>
              ),
            },
            {
              key: 'forwardedBy', header: 'Verified By',
              render: (_, r) => r.forwardedBy
                ? `${(r.forwardedBy as any).firstName} ${(r.forwardedBy as any).lastName}`
                : '—',
            },
            {
              key: 'department', header: 'Department',
              render: (_, r) => r.department || <span className="text-xs text-slate-400">Unassigned</span>,
            },
            {
              key: 'position', header: 'Position',
              render: (_, r) => getConfirmedPosition(r) || <span className="text-xs text-slate-400">Not set</span>,
            },
            {
              key: 'forwardedAt', header: 'Forwarded',
              render: v => v ? format(new Date(v as string), 'dd MMM yyyy') : '—',
            },
            {
              key: 'overallStatus', header: 'Status',
              render: (_, r) => <OverallStatusBadge status={r.overallStatus} />,
            },
            {
              key: '_id', header: '',
              render: (_, r) => (
                <Button
                  size="sm"
                  onClick={e => { e.stopPropagation(); navigate(`/super-admin/employees/${r._id}`); }}
                >
                  Review
                </Button>
              ),
            },
          ]}
          emptyMessage="No profiles awaiting approval."
        />
      </div>
    </div>
  );
};
