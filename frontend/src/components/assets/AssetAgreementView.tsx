import React from 'react';
import { format } from 'date-fns';
import type { AssetAgreementPayload, PayrollCompanyDetails } from '../../types';

interface AssetAgreementViewProps {
  payload: AssetAgreementPayload;
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

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="payslip-field">
    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    <strong className="text-sm text-slate-900 whitespace-pre-wrap">{value || '-'}</strong>
  </div>
);

export const AssetAgreementView: React.FC<AssetAgreementViewProps> = ({ payload, elementId }) => {
  const company = { ...defaultCompany, ...payload.company };
  const agreementDate = payload.agreement.agreementDate
    ? format(new Date(payload.agreement.agreementDate), 'dd MMM yyyy')
    : '-';
  const assignedDate = payload.assignment.assignedDate
    ? format(new Date(payload.assignment.assignedDate), 'dd MMM yyyy')
    : '-';

  return (
    <div
      id={elementId}
      className="payslip-document bg-white text-slate-900 rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl mx-auto"
    >
      <div className="payslip-band bg-primary-700 text-white px-6 md:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="payslip-company flex items-center gap-4">
          <img
            src={resolveLogoUrl(company.logoUrl)}
            alt={`${company.name} logo`}
            className="payslip-logo w-14 h-14 rounded-xl bg-white object-contain p-1.5"
          />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{company.name}</h2>
            <p className="text-sm text-white/85 mt-1">{company.address}</p>
            <p className="text-sm text-white/85">{company.cityPincode}</p>
          </div>
        </div>
        <div className="payslip-period sm:text-right">
          <p className="text-sm text-white/80">Asset Agreement</p>
          <strong className="block text-2xl font-bold mt-1">{payload.agreement.agreementNumber}</strong>
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-grid grid sm:grid-cols-2 gap-x-10 gap-y-4">
          <Field label="Employee Name" value={payload.employee.employeeName} />
          <Field label="Employee ID" value={payload.employee.employeeId} />
          <Field label="Department" value={payload.employee.department} />
          <Field label="Designation" value={payload.employee.designation || payload.employee.position} />
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-grid grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Product Name" value={payload.asset.productName} />
          <Field label="Asset ID" value={payload.asset.assetId} />
          <Field label="Category" value={payload.asset.category} />
          <Field label="Serial Number" value={payload.asset.serialNumber} />
          <Field label="IMEI Number" value={payload.asset.imeiNumber} />
          <Field label="Assigned Date" value={assignedDate} />
          <Field label="Agreement Date" value={agreementDate} />
          <Field label="Agreement Status" value={payload.agreement.status} />
        </div>
      </div>

      <div className="payslip-section px-6 md:px-8 py-6 border-b border-slate-200">
        <div className="payslip-tables grid md:grid-cols-2 border border-slate-200 rounded-xl overflow-hidden">
          <div className="payslip-table">
            <h3 className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Asset Specification</h3>
            <div className="payslip-row flex items-start justify-between gap-4 px-4 py-3 border-t border-slate-100 text-sm">
              <span className="text-slate-600 whitespace-pre-wrap">{payload.asset.specification || 'No specification recorded'}</span>
            </div>
          </div>
          <div className="payslip-table md:border-l border-slate-200">
            <h3 className="bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Responsibility Terms</h3>
            {payload.terms.map((term, index) => (
              <div key={`${term}-${index}`} className="payslip-row flex items-start gap-3 px-4 py-2.5 border-t border-slate-100 text-sm">
                <strong className="text-slate-900">{index + 1}.</strong>
                <span className="text-slate-600">{term}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="payslip-net mt-5 grid sm:grid-cols-2 border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-8">
            <p className="text-sm font-semibold text-slate-800 mt-10">{payload.signatures.employee}</p>
          </div>
          <div className="px-5 py-8 bg-slate-50">
            <p className="text-sm font-semibold text-slate-800 mt-10">{payload.signatures.company}</p>
          </div>
        </div>
      </div>

      <div className="payslip-footer px-6 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
        <span>This agreement uses the existing HRMS printable document format.</span>
        <span>Generated on {agreementDate}</span>
      </div>
    </div>
  );
};
