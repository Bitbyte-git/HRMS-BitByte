import React from 'react';
import { format } from 'date-fns';
import type { PayrollCompanyDetails, PayrollRecord, SalaryComponent } from '../../types';
import { formatCurrency, formatPayPeriod } from '../../utils/payroll';

interface PayslipViewProps {
  payroll: PayrollRecord;
  company?: PayrollCompanyDetails;
  elementId?: string;
}

const defaultCompany: PayrollCompanyDetails = {
  name: 'BitByte Tech',
  address: 'Corporate Office',
  cityPincode: 'India',
  logoUrl: '/logo.png',
};

const resolveLogoUrl = (logoUrl?: string) => {
  const source = logoUrl || defaultCompany.logoUrl;
  if (source.startsWith('http') || source.startsWith('data:')) return source;
  return new URL(source, window.location.origin).href;
};

const PayrollLine: React.FC<{ item: SalaryComponent }> = ({ item }) => (
  <div className="payslip-row flex items-center justify-between gap-4 px-4 py-2.5 border-t border-slate-100 text-sm">
    <span className="text-slate-600">{item.label}</span>
    <strong className="text-slate-900 font-semibold">{formatCurrency(item.amount)}</strong>
  </div>
);

const EmptyLine: React.FC = () => (
  <div className="payslip-row flex items-center justify-between gap-4 px-4 py-2.5 border-t border-slate-100 text-sm">
    <span className="text-slate-400">No component</span>
    <strong className="text-slate-400 font-semibold">{formatCurrency(0)}</strong>
  </div>
);

export const PayslipView: React.FC<PayslipViewProps> = ({ payroll, company = defaultCompany, elementId }) => {
  const details = { ...defaultCompany, ...company };
  const payDate = payroll.payDate ? format(new Date(payroll.payDate), 'dd MMM yyyy') : '-';

  return (
    <div
      id={elementId}
      className="payslip-document bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl mx-auto"
    >
      <div className="payslip-band bg-primary-700 text-white px-6 md:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="payslip-company flex items-center gap-4">
          <img
            src={resolveLogoUrl(details.logoUrl)}
            alt={`${details.name} logo`}
            className="payslip-logo w-14 h-14 rounded-xl bg-white object-contain p-1.5"
          />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{details.name}</h2>
            <p className="text-sm text-white/85 mt-1">{details.address}</p>
            <p className="text-sm text-white/85">{details.cityPincode}</p>
          </div>
        </div>
        <div className="payslip-period sm:text-right">
          <p className="text-sm text-white/80">Payslip for the Month</p>
          <strong className="block text-2xl font-bold mt-1">{formatPayPeriod(payroll.payPeriod)}</strong>
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-grid grid sm:grid-cols-2 gap-x-10 gap-y-4">
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Employee Name</span>
            <strong className="text-sm text-slate-900">{payroll.employeeName}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Employee ID</span>
            <strong className="text-sm text-slate-900">{payroll.employeeId}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Department</span>
            <strong className="text-sm text-slate-900">{payroll.department || '-'}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Position</span>
            <strong className="text-sm text-slate-900">{payroll.position || '-'}</strong>
          </div>
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pay Period</span>
            <strong className="text-sm text-slate-900">{formatPayPeriod(payroll.payPeriod)}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fixed Salary</span>
            <strong className="text-sm text-slate-900">{formatCurrency(payroll.fixedSalary || payroll.grossEarnings)}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paid Days</span>
            <strong className="text-sm text-slate-900">{payroll.paidDays}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">LOP Days</span>
            <strong className="text-sm text-slate-900">{payroll.lopDays}</strong>
          </div>
          <div className="payslip-field">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pay Date</span>
            <strong className="text-sm text-slate-900">{payDate}</strong>
          </div>
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-tables grid md:grid-cols-2 border border-slate-200 rounded-xl overflow-hidden">
          <div className="payslip-table">
            <h3 className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Earnings</h3>
            {payroll.earnings.length ? payroll.earnings.map((item, index) => (
              <PayrollLine key={item._id || `${item.label}-${index}`} item={item} />
            )) : <EmptyLine />}
            <div className="payslip-row total flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm">
              <span className="font-bold text-slate-800">Gross Earnings</span>
              <strong className="font-bold text-slate-900">{formatCurrency(payroll.grossEarnings)}</strong>
            </div>
          </div>

          <div className="payslip-table md:border-l border-slate-200">
            <h3 className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Deductions</h3>
            {payroll.deductions.length ? payroll.deductions.map((item, index) => (
              <PayrollLine key={item._id || `${item.label}-${index}`} item={item} />
            )) : <EmptyLine />}
            <div className="payslip-row total flex items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm">
              <span className="font-bold text-slate-800">Total Deductions</span>
              <strong className="font-bold text-slate-900">{formatCurrency(payroll.totalDeductions)}</strong>
            </div>
          </div>
        </div>

        <div className="payslip-net mt-5 grid sm:grid-cols-[1.5fr_.8fr] border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">Total Net Payable</p>
            <p className="text-xs text-slate-500 mt-1">Gross Earnings - Total Deductions</p>
          </div>
          <div className="px-5 py-4 bg-slate-50 sm:text-right">
            <strong className="text-2xl font-bold text-slate-900">{formatCurrency(payroll.netSalary)}</strong>
          </div>
        </div>

        <div className="payslip-words mt-4 rounded-xl bg-primary-50 text-primary-800 px-4 py-3 text-sm font-semibold">
          {payroll.amountInWords}
        </div>
      </div>

      <div className="payslip-footer px-6 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
        <span>This is a system generated payslip and does not require a physical signature.</span>
        <span>Generated on {format(new Date(payroll.createdAt || new Date()), 'dd MMM yyyy')}</span>
      </div>
    </div>
  );
};
