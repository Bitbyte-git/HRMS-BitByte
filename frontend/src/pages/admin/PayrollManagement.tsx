import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Calculator,
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { payrollApi } from '../../services/api';
import { Button, Input, Modal, Spinner } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { StatsCard } from '../../components/common/StatusBadge';
import { PayslipView } from '../../components/payroll/PayslipView';
import type { PayrollEmployeeOption, PayrollRecord } from '../../types';
import {
  currentPayPeriod,
  formatCurrency,
  formatPayPeriod,
  printElementAsPdf,
  safeNumberInput,
  todayInputDate,
} from '../../utils/payroll';
import {
  calculatePayrollPreview,
  payrollComponentKeys,
} from '../../utils/payrollCalculator';

type ComponentRow = {
  id: string;
  label: string;
  amount: string;
  locked?: boolean;
  key?: string;
  formula?: string;
  systemGenerated?: boolean;
};

const createId = () => Math.random().toString(36).slice(2, 10);

const toNumber = (value: string) => Number(value || 0);
const mapComponents = (rows: ComponentRow[]) =>
  rows
    .filter((row) => row.label.trim())
    .map((row) => ({
      key: row.key,
      label: row.label.trim(),
      amount: toNumber(row.amount),
      formula: row.formula,
      systemGenerated: Boolean(row.systemGenerated),
    }));

const rowsFromComponents = (components: PayrollRecord['earnings'], prefix: string): ComponentRow[] =>
  components.map((component, index) => ({
    id: `${prefix}-${component.key || index}`,
    key: component.key,
    label: component.label,
    amount: String(component.amount),
    locked: Boolean(component.systemGenerated),
    formula: component.formula,
    systemGenerated: component.systemGenerated,
  }));

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-card border border-slate-100 dark:border-slate-700 px-3 py-2 text-xs">
      <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">{formatPayPeriod(label, 'short')}</p>
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color }} className="font-medium">
          {item.name}: {item.dataKey === 'payrolls' || item.name === 'Employees' ? item.value : formatCurrency(item.value)}
        </p>
      ))}
    </div>
  );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
    {status === 'void' ? 'Void' : 'Paid'}
  </span>
);

const useDebouncedValue = <T,>(value: T, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
};

export const PayrollManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployeeOption | null>(null);
  const [payPeriod, setPayPeriod] = useState(currentPayPeriod());
  const [paidDays, setPaidDays] = useState('30');
  const [lopDays, setLopDays] = useState('0');
  const [payDate, setPayDate] = useState(todayInputDate());
  const [fixedSalary, setFixedSalary] = useState('');
  const [additionalEarnings, setAdditionalEarnings] = useState<ComponentRow[]>([]);
  const [additionalDeductions, setAdditionalDeductions] = useState<ComponentRow[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tablePayPeriod, setTablePayPeriod] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);
  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch.trim(), 350);
  const debouncedTableSearch = useDebouncedValue(tableSearch.trim(), 350);

  const employeeQuery = useQuery({
    queryKey: ['payrollEmployees', debouncedEmployeeSearch],
    queryFn: () => payrollApi.searchEmployees({ search: debouncedEmployeeSearch, limit: 12 }).then((res) => res.data.data?.employees || []),
    enabled: debouncedEmployeeSearch.length >= 2 && !selectedEmployee,
    staleTime: 60 * 1000,
  });

  const payrollQuery = useQuery({
    queryKey: ['payrollRecords', { page, tableSearch: debouncedTableSearch, tablePayPeriod }],
    queryFn: () => payrollApi.getAll({
      page,
      limit: 8,
      search: debouncedTableSearch || undefined,
      payPeriod: tablePayPeriod || undefined,
    }).then((res) => res.data.data),
    placeholderData: keepPreviousData,
  });

  const payslipQuery = useQuery({
    queryKey: ['payrollPayslip', selectedPayslipId],
    queryFn: () => payrollApi.getPayslip(selectedPayslipId as string).then((res) => res.data.data?.payslip),
    enabled: Boolean(selectedPayslipId),
  });

  const payrollPreview = useMemo(() => calculatePayrollPreview({
    fixedSalary: toNumber(fixedSalary),
    additionalEarnings: mapComponents(additionalEarnings),
    additionalDeductions: mapComponents(additionalDeductions),
  }), [fixedSalary, additionalEarnings, additionalDeductions]);
  const earnings = useMemo(() => [
    ...rowsFromComponents(payrollPreview.earnings.filter((row) => row.systemGenerated), 'earning'),
    ...additionalEarnings,
  ], [payrollPreview.earnings, additionalEarnings]);
  const deductions = useMemo(() => [
    ...rowsFromComponents(payrollPreview.deductions.filter((row) => row.systemGenerated), 'deduction'),
    ...additionalDeductions,
  ], [payrollPreview.deductions, additionalDeductions]);
  const grossEarnings = payrollPreview.grossEarnings;
  const totalDeductions = payrollPreview.totalDeductions;
  const netSalary = payrollPreview.netSalary;
  const netAmountWords = payrollPreview.amountInWords;
  const fixedSalaryAmount = payrollPreview.fixedSalary;
  const componentAmounts = useMemo(() => (
    [...payrollPreview.earnings, ...payrollPreview.deductions].reduce<Record<string, number>>((acc, component) => {
      if (component.key) acc[component.key] = component.amount;
      return acc;
    }, {})
  ), [payrollPreview.earnings, payrollPreview.deductions]);
  const draftPayroll = useMemo<PayrollRecord>(() => ({
    _id: 'draft',
    employeeProfileId: selectedEmployee?.profileId || 'draft',
    userId: selectedEmployee?.userId || 'draft',
    employeeId: selectedEmployee?.employeeId || '-',
    employeeName: selectedEmployee?.employeeName || 'Select employee',
    department: selectedEmployee?.department || '',
    position: selectedEmployee?.position || '',
    payPeriod,
    paidDays: toNumber(paidDays),
    lopDays: toNumber(lopDays),
    payDate,
    fixedSalary: fixedSalaryAmount,
    earnings: payrollPreview.earnings,
    deductions: payrollPreview.deductions,
    grossEarnings,
    totalDeductions,
    netSalary,
    amountInWords: netAmountWords,
    calculationMetadata: payrollPreview.calculationMetadata,
    status: 'paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [
    selectedEmployee,
    payPeriod,
    paidDays,
    lopDays,
    payDate,
    fixedSalaryAmount,
    payrollPreview,
    grossEarnings,
    totalDeductions,
    netSalary,
    netAmountWords,
  ]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedEmployee) throw new Error('Select an employee before creating payroll.');
      if (!fixedSalaryAmount) throw new Error('Enter a fixed salary amount before generating payroll.');
      if (totalDeductions > grossEarnings) throw new Error('Total deductions cannot exceed gross earnings.');

      return payrollApi.create({
        employeeId: selectedEmployee.employeeId,
        payPeriod,
        paidDays: toNumber(paidDays),
        lopDays: toNumber(lopDays),
        payDate,
        fixedSalary: fixedSalaryAmount,
        earnings: payrollPreview.earnings,
        deductions: payrollPreview.deductions,
      });
    },
    onSuccess: (res) => {
      const payroll = res.data.data?.payroll;
      toast.success('Payroll saved and payslip generated.');
      queryClient.invalidateQueries({ queryKey: ['payrollRecords'] });
      queryClient.invalidateQueries({ queryKey: ['payrollPayslip'] });
      if (payroll?._id) setSelectedPayslipId(payroll._id);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to create payroll.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollApi.remove(id),
    onSuccess: () => {
      toast.success('Payroll record deleted.');
      queryClient.invalidateQueries({ queryKey: ['payrollRecords'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Unable to delete payroll.'),
  });

  const updateComponent = (
    type: 'earnings' | 'deductions',
    id: string,
    key: 'label' | 'amount',
    value: string,
  ) => {
    const setter = type === 'earnings' ? setAdditionalEarnings : setAdditionalDeductions;
    setter((rows) => rows.map((row) => (
      row.id === id ? { ...row, [key]: key === 'amount' ? safeNumberInput(value) : value } : row
    )));
  };

  const addComponent = (type: 'earnings' | 'deductions') => {
    const setter = type === 'earnings' ? setAdditionalEarnings : setAdditionalDeductions;
    setter((rows) => [...rows, { id: createId(), label: '', amount: '' }]);
  };

  const deleteComponent = (type: 'earnings' | 'deductions', id: string) => {
    const setter = type === 'earnings' ? setAdditionalEarnings : setAdditionalDeductions;
    setter((rows) => rows.filter((row) => row.id !== id || row.locked));
  };

  const selectEmployee = (employee: PayrollEmployeeOption) => {
    setSelectedEmployee(employee);
    setEmployeeSearch(`${employee.employeeId} - ${employee.employeeName}`);
    if (employee.fixedPay) {
      setFixedSalary(String(employee.fixedPay));
    }
  };

  const handleDelete = (record: PayrollRecord) => {
    if (window.confirm(`Delete payroll for ${record.employeeName} (${formatPayPeriod(record.payPeriod)})?`)) {
      deleteMutation.mutate(record._id);
    }
  };

  const analytics = payrollQuery.data?.analytics;
  const records = payrollQuery.data?.records || [];
  const pagination = payrollQuery.data?.pagination;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary-600" /> Payroll Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Process employee salaries, generate payslips, and track monthly payroll spend.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Printer className="w-3.5 h-3.5" />}
          disabled={!payslipQuery.data}
          onClick={() => printElementAsPdf('admin-payslip-print', 'Payslip')}
        >
          Print Latest Preview
        </Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Net Payroll"
          value={formatCurrency(analytics?.totals.netPayout || 0)}
          icon={<Banknote className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatsCard
          title="Employees Paid"
          value={analytics?.totals.employeesPaid || 0}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatsCard
          title="Deductions"
          value={formatCurrency(analytics?.totals.totalDeductions || 0)}
          icon={<Calculator className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-900/20"
        />
        <StatsCard
          title="Avg Net Salary"
          value={formatCurrency(analytics?.totals.averageNetSalary || 0)}
          icon={<FileText className="w-5 h-5 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      <div className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
          className="card space-y-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="section-title">Create Payroll</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Employee details are fetched from approved profiles.</p>
            </div>
            <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
              {formatPayPeriod(payPeriod)}
            </span>
          </div>

          <div className="space-y-3">
            <label className="form-label">Employee ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="form-input pl-9"
                placeholder="Search employee ID, name, department..."
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setSelectedEmployee(null);
                }}
              />
            </div>
            {!selectedEmployee && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                {debouncedEmployeeSearch.length < 2 ? (
                  <p className="px-4 py-4 text-sm text-slate-400">Type at least 2 characters to search approved employees.</p>
                ) : employeeQuery.isLoading ? (
                  <div className="py-4 flex justify-center"><Spinner /></div>
                ) : employeeQuery.data?.length ? (
                  employeeQuery.data.map((employee) => (
                    <button
                      type="button"
                      key={employee.employeeId}
                      onClick={() => selectEmployee(employee)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{employee.employeeName}</p>
                          <p className="text-xs text-slate-400">{employee.employeeId} · {employee.department || 'Unassigned'}</p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{employee.position || '-'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-4 text-sm text-slate-400">No approved employees found.</p>
                )}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Employee Name', selectedEmployee?.employeeName || '-'],
              ['Department', selectedEmployee?.department || '-'],
              ['Position', selectedEmployee?.position || '-'],
              ['Employee ID', selectedEmployee?.employeeId || '-'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              label="Fixed Salary"
              type="number"
              min="0"
              step="0.01"
              required
              value={fixedSalary}
              onChange={(event) => setFixedSalary(safeNumberInput(event.target.value))}
              hint="Monthly salary"
            />
            <Input label="Pay Period" type="month" required value={payPeriod} onChange={(event) => setPayPeriod(event.target.value)} />
            <Input label="Paid Days" type="number" min="0" max="31" required value={paidDays} onChange={(event) => setPaidDays(safeNumberInput(event.target.value))} />
            <Input label="LOP Days" type="number" min="0" max="31" required value={lopDays} onChange={(event) => setLopDays(safeNumberInput(event.target.value))} />
            <Input label="Pay Date" type="date" required value={payDate} onChange={(event) => setPayDate(event.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <FormulaCard label="Basic Pay" value={formatCurrency(componentAmounts[payrollComponentKeys.basicPay] || 0)} detail="50% of fixed salary" tone="blue" />
            <FormulaCard label="HRA" value={formatCurrency(componentAmounts[payrollComponentKeys.hra] || 0)} detail="40% of basic pay" tone="emerald" />
            <FormulaCard label="DA" value={formatCurrency(componentAmounts[payrollComponentKeys.da] || 0)} detail="20% of basic pay" tone="amber" />
            <FormulaCard label="Other Allowance" value={formatCurrency(componentAmounts[payrollComponentKeys.otherAllowance] || 0)} detail="Remaining balance" tone="violet" />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <SalarySection
              title="Earnings"
              rows={earnings}
              type="earnings"
              onChange={updateComponent}
              onAdd={addComponent}
              onDelete={deleteComponent}
            />
            <SalarySection
              title="Deductions"
              rows={deductions}
              type="deductions"
              onChange={updateComponent}
              onAdd={addComponent}
              onDelete={deleteComponent}
            />
          </div>

          <div className="grid lg:grid-cols-4 gap-3">
            <SummaryTile label="Gross Earnings" value={formatCurrency(grossEarnings)} />
            <SummaryTile label="Total Deductions" value={formatCurrency(totalDeductions)} />
            <SummaryTile label="Net Salary" value={formatCurrency(netSalary)} strong />
            <div className="lg:col-span-1 rounded-xl border border-primary-100 dark:border-primary-900/40 bg-primary-50 dark:bg-primary-900/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">Amount in Words</p>
              <p className="text-sm font-semibold text-primary-900 dark:text-primary-100 mt-1 leading-relaxed">{netAmountWords}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFixedSalary('');
                setAdditionalEarnings([]);
                setAdditionalDeductions([]);
              }}
            >
              Clear Salary
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending}
              icon={<FileText className="w-4 h-4" />}
              disabled={!selectedEmployee || !fixedSalaryAmount || totalDeductions > grossEarnings}
            >
              Generate Payslip
            </Button>
          </div>
        </form>

        <div className="space-y-5">
          <LivePayslipPreview payroll={draftPayroll} />

          <div className="card">
            <h2 className="section-title mb-1">Monthly Payroll Summary</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Net payout trend across processed months.</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics?.monthlySummary || []} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminPayrollNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="payPeriod" tickFormatter={(value) => formatPayPeriod(value, 'short')} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="net" name="Net Payroll" stroke="#0d9488" fill="url(#adminPayrollNet)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="section-title mb-1">Salary Distribution</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Payslip count by net salary range.</p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={analytics?.salaryDistribution || []} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" name="Payslips" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="section-title">Payroll Records</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Search, filter, view, and maintain processed payroll history.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="form-input pl-9"
                placeholder="Search payroll..."
                value={tableSearch}
                onChange={(event) => {
                  setTableSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <input
              className="form-input sm:w-44"
              type="month"
              value={tablePayPeriod}
              onChange={(event) => {
                setTablePayPeriod(event.target.value);
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
            { key: 'payPeriod', header: 'Month', render: (value) => formatPayPeriod(value as string) },
            { key: 'grossEarnings', header: 'Gross', render: (value) => formatCurrency(value as number) },
            { key: 'totalDeductions', header: 'Deductions', render: (value) => formatCurrency(value as number) },
            { key: 'netSalary', header: 'Net Salary', render: (value) => <span className="font-semibold">{formatCurrency(value as number)}</span> },
            { key: 'status', header: 'Status', render: (value) => <StatusPill status={String(value)} /> },
            {
              key: 'payDate',
              header: 'Pay Date',
              render: (value) => value ? format(new Date(value as string), 'dd MMM yyyy') : '-',
            },
            {
              key: '_id',
              header: 'Action',
              render: (_, row) => (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelectedPayslipId(row._id)}>
                    View
                  </Button>
                  <button
                    type="button"
                    title="Delete payroll"
                    onClick={() => handleDelete(row)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
          emptyMessage="No payroll records found."
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
              onClick={() => printElementAsPdf('admin-payslip-print', `Payslip-${payslipQuery.data?.payroll.employeeId}`)}
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
            elementId="admin-payslip-print"
            payroll={payslipQuery.data.payroll}
            company={payslipQuery.data.company}
          />
        )}
      </Modal>
    </div>
  );
};

const SalarySection: React.FC<{
  title: string;
  rows: ComponentRow[];
  type: 'earnings' | 'deductions';
  onChange: (type: 'earnings' | 'deductions', id: string, key: 'label' | 'amount', value: string) => void;
  onAdd: (type: 'earnings' | 'deductions') => void;
  onDelete: (type: 'earnings' | 'deductions', id: string) => void;
}> = ({ title, rows, type, onChange, onAdd, onDelete }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <Button type="button" size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => onAdd(type)}>
        Add
      </Button>
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_140px_36px] gap-2 px-3 py-3 items-center">
          <div>
            <input
              className={`form-input ${row.locked ? 'bg-slate-50 dark:bg-slate-900/30' : ''}`}
              placeholder={`${title.slice(0, -1)} Type`}
              value={row.label}
              readOnly={row.locked}
              onChange={(event) => onChange(type, row.id, 'label', event.target.value)}
            />
            {row.formula && <p className="mt-1 text-[11px] font-medium text-slate-400">{row.formula}</p>}
          </div>
          <input
            className={`form-input text-right ${row.locked ? 'bg-slate-50 font-semibold text-slate-700 dark:bg-slate-900/30 dark:text-slate-200' : ''}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={row.amount}
            readOnly={row.locked}
            onChange={(event) => onChange(type, row.id, 'amount', event.target.value)}
          />
          {!row.locked ? (
            <button
              type="button"
              title="Delete component"
              onClick={() => onDelete(type, row.id)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <span className="w-9 h-9" />
          )}
        </div>
      ))}
    </div>
  </div>
);

const formulaTones = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
  amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
  violet: 'border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300',
};

const FormulaCard: React.FC<{ label: string; value: string; detail: string; tone: keyof typeof formulaTones }> = ({
  label,
  value,
  detail,
  tone,
}) => (
  <div className={`rounded-xl border px-4 py-3 transition-all duration-300 ${formulaTones[tone]}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
    <p key={value} className="mt-1 text-lg font-bold animate-value-update">{value}</p>
    <p className="mt-1 text-xs font-medium opacity-75">{detail}</p>
  </div>
);

const PreviewLine: React.FC<{ item: PayrollRecord['earnings'][number] }> = ({ item }) => (
  <div className="flex items-center justify-between gap-3 py-2 text-xs border-b border-slate-100 last:border-0 dark:border-slate-700/60">
    <span className="text-slate-500 dark:text-slate-400 truncate">{item.label}</span>
    <strong className="text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatCurrency(item.amount)}</strong>
  </div>
);

const LivePayslipPreview: React.FC<{ payroll: PayrollRecord }> = ({ payroll }) => (
  <div className="card p-0 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
      <div>
        <h2 className="section-title">Live Payslip Preview</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatPayPeriod(payroll.payPeriod)}</p>
      </div>
      <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">Draft</span>
    </div>
    <div className="px-5 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Employee</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{payroll.employeeName}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fixed Salary</p>
          <p key={payroll.fixedSalary} className="text-sm font-semibold text-slate-700 dark:text-slate-200 animate-value-update">{formatCurrency(payroll.fixedSalary)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryTile label="Gross" value={formatCurrency(payroll.grossEarnings)} />
        <SummaryTile label="Deductions" value={formatCurrency(payroll.totalDeductions)} />
        <SummaryTile label="Net" value={formatCurrency(payroll.netSalary)} strong />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Earnings</h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-800">
            {payroll.earnings.map((item, index) => <PreviewLine key={item.key || `${item.label}-${index}`} item={item} />)}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Deductions</h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-800">
            {payroll.deductions.map((item, index) => <PreviewLine key={item.key || `${item.label}-${index}`} item={item} />)}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">Amount in Words</p>
        <p className="mt-1 text-sm font-semibold text-primary-900 dark:text-primary-100 leading-relaxed">{payroll.amountInWords}</p>
      </div>
    </div>
  </div>
);

const SummaryTile: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    <p key={value} className={`mt-1 animate-value-update ${strong ? 'text-xl text-primary-700 dark:text-primary-300' : 'text-base text-slate-800 dark:text-slate-100'} font-bold`}>
      {value}
    </p>
  </div>
);
