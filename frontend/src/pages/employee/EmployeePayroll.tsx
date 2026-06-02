import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText, Wallet, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { payrollApi } from '../../services/api';
import { Button, EmptyState, Modal, Spinner } from '../../components/common/UI';
import { Table } from '../../components/common/Table';
import { StatsCard } from '../../components/common/StatusBadge';
import { PayslipView } from '../../components/payroll/PayslipView';
import { formatCurrency, formatPayPeriod, printElementAsPdf } from '../../utils/payroll';

export const EmployeePayroll: React.FC = () => {
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null);

  const payrollQuery = useQuery({
    queryKey: ['employeePayroll'],
    queryFn: () => payrollApi.getMine().then((res) => res.data.data?.records || []),
  });

  const payslipQuery = useQuery({
    queryKey: ['employeePayslip', selectedPayslipId],
    queryFn: () => payrollApi.getPayslip(selectedPayslipId as string).then((res) => res.data.data?.payslip),
    enabled: Boolean(selectedPayslipId),
  });

  const records = payrollQuery.data || [];
  const latest = records[0];
  const totals = useMemo(() => ({
    payslips: records.length,
    totalNet: records.reduce((sum, row) => sum + row.netSalary, 0),
    latestNet: latest?.netSalary || 0,
  }), [records, latest]);

  if (payrollQuery.isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary-600" /> Payroll
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View your salary history, open monthly payslips, and download payroll documents.
          </p>
        </div>
        {latest && (
          <Button
            icon={<Download className="w-4 h-4" />}
            onClick={() => setSelectedPayslipId(latest._id)}
          >
            Latest Payslip
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Latest Net Salary"
          value={formatCurrency(totals.latestNet)}
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <StatsCard
          title="Payslips Available"
          value={totals.payslips}
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatsCard
          title="Total Net Paid"
          value={formatCurrency(totals.totalNet)}
          icon={<Calendar className="w-5 h-5 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-900/20"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="section-title">Payslip History</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Monthly payroll records issued by HR.</p>
        </div>

        {records.length ? (
          <Table
            data={records}
            keyExtractor={(row) => row._id}
            columns={[
              { key: 'payPeriod', header: 'Month', render: (value) => formatPayPeriod(value as string) },
              { key: 'payDate', header: 'Pay Date', render: (value) => value ? format(new Date(value as string), 'dd MMM yyyy') : '-' },
              { key: 'grossEarnings', header: 'Gross', render: (value) => formatCurrency(value as number) },
              { key: 'totalDeductions', header: 'Deductions', render: (value) => formatCurrency(value as number) },
              { key: 'netSalary', header: 'Net Salary', render: (value) => <span className="font-semibold">{formatCurrency(value as number)}</span> },
              {
                key: 'status',
                header: 'Status',
                render: () => (
                  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Paid</span>
                ),
              },
              {
                key: '_id',
                header: 'Action',
                render: (_, row) => (
                  <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setSelectedPayslipId(row._id)}>
                    View PDF
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="No payslips yet"
            description="Your payroll history will appear here after HR processes your salary."
          />
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedPayslipId)}
        onClose={() => setSelectedPayslipId(null)}
        title="Payslip"
        size="xl"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setSelectedPayslipId(null)}>Close</Button>
            <Button
              icon={<Download className="w-4 h-4" />}
              disabled={!payslipQuery.data}
              onClick={() => printElementAsPdf('employee-payslip-print', `Payslip-${payslipQuery.data?.payroll.payPeriod}`)}
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
            elementId="employee-payslip-print"
            payroll={payslipQuery.data.payroll}
            company={payslipQuery.data.company}
          />
        )}
      </Modal>
    </div>
  );
};
