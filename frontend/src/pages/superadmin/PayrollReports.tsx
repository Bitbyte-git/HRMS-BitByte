import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Download, Eye, FileText, Search, TrendingUp, Users, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { payrollApi } from '../../services/api';
import { Button, Modal, Spinner } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { StatsCard } from '../../components/common/StatusBadge';
import { PayslipView } from '../../components/payroll/PayslipView';
import { formatCurrency, formatPayPeriod, printElementAsPdf } from '../../utils/payroll';

const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

const MoneyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{formatPayPeriod(label, 'short') || label}</p>
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color }} className="font-medium">
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
};

const useDebouncedValue = <T,>(value: T, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
};

export const PayrollReports: React.FC = () => {
  const [search, setSearch] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const payrollQuery = useQuery({
    queryKey: ['superAdminPayrollRecords', { search: debouncedSearch, payPeriod, page }],
    queryFn: () => payrollApi.getAll({
      page,
      limit: 10,
      search: debouncedSearch || undefined,
      payPeriod: payPeriod || undefined,
    }).then((res) => res.data.data),
    placeholderData: keepPreviousData,
  });

  const payslipQuery = useQuery({
    queryKey: ['superAdminPayrollPayslip', selectedPayslipId],
    queryFn: () => payrollApi.getPayslip(selectedPayslipId as string).then((res) => res.data.data?.payslip),
    enabled: Boolean(selectedPayslipId),
  });

  const analytics = payrollQuery.data?.analytics;
  const records = payrollQuery.data?.records || [];
  const pagination = payrollQuery.data?.pagination;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" /> Payroll Reports
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor salary disbursement, department payroll load, and issued payslips.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Net Payroll"
          value={formatCurrency(analytics?.totals.netPayout || 0)}
          icon={<Wallet className="w-5 h-5 text-primary-600" />}
          iconBg="bg-primary-50 dark:bg-primary-900/20"
        />
        <StatsCard
          title="Gross Payroll"
          value={formatCurrency(analytics?.totals.grossPayout || 0)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatsCard
          title="Employees Paid"
          value={analytics?.totals.employeesPaid || 0}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatsCard
          title="Payslips"
          value={analytics?.totals.totalPayrolls || 0}
          icon={<FileText className="w-5 h-5 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="card xl:col-span-2">
          <h2 className="section-title mb-1">Monthly Payroll Summary</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Gross, deductions, and net salary movement.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.monthlySummary || []} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="payPeriod" tickFormatter={(value) => formatPayPeriod(value, 'short')} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip content={<MoneyTooltip />} />
              <Bar dataKey="gross" name="Gross" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="deductions" name="Deductions" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="net" name="Net" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="section-title mb-1">Salary Distribution</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Payslip count by net range.</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics?.salaryDistribution || []}
                dataKey="count"
                nameKey="range"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={3}
              >
                {(analytics?.salaryDistribution || []).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-1">Department Salary Reports</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Net payroll by department.</p>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={analytics?.departmentSummary || []} layout="vertical" margin={{ top: 4, right: 16, left: 22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
            <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Bar dataKey="net" name="Net Payroll" fill="#0d9488" radius={[0, 5, 5, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="section-title">Payroll Register</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Read-only payroll records for audit and review.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="form-input pl-9"
                placeholder="Search employee, ID, department..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <input
              className="form-input sm:w-44"
              type="month"
              value={payPeriod}
              onChange={(event) => {
                setPayPeriod(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Table
          loading={payrollQuery.isLoading}
          data={records}
          keyExtractor={(row) => row._id}
          columns={[
            {
              key: 'employeeName',
              header: 'Employee',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.employeeName}</p>
                  <p className="text-xs text-slate-400">{row.employeeId}</p>
                </div>
              ),
            },
            { key: 'department', header: 'Department', render: (_, row) => row.department || '-' },
            { key: 'position', header: 'Position', render: (_, row) => row.position || '-' },
            { key: 'payPeriod', header: 'Month', render: (value) => formatPayPeriod(value as string) },
            { key: 'netSalary', header: 'Net Salary', render: (value) => <span className="font-semibold">{formatCurrency(value as number)}</span> },
            { key: 'payDate', header: 'Pay Date', render: (value) => value ? format(new Date(value as string), 'dd MMM yyyy') : '-' },
            {
              key: '_id',
              header: 'Action',
              render: (_, row) => (
                <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelectedPayslipId(row._id)}>
                  View
                </Button>
              ),
            },
          ]}
          emptyMessage="No payroll records available."
        />
        {pagination && pagination.total > pagination.limit && (
          <div className="px-4 border-t border-slate-100 dark:border-slate-700">
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedPayslipId)}
        onClose={() => setSelectedPayslipId(null)}
        title="Payslip Preview"
        size="xl"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setSelectedPayslipId(null)}>Close</Button>
            <Button
              icon={<Download className="w-4 h-4" />}
              disabled={!payslipQuery.data}
              onClick={() => printElementAsPdf('super-admin-payslip-print', `Payslip-${payslipQuery.data?.payroll.employeeId}`)}
            >
              Download PDF
            </Button>
          </div>
        )}
      >
        {payslipQuery.isLoading || !payslipQuery.data ? (
          <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
        ) : (
          <PayslipView
            elementId="super-admin-payslip-print"
            payroll={payslipQuery.data.payroll}
            company={payslipQuery.data.company}
          />
        )}
      </Modal>
    </div>
  );
};
