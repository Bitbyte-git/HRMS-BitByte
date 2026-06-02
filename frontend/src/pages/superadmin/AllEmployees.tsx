import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { superAdminApi } from '../../services/api';
import { Button } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { OverallStatusBadge } from '../../components/common/StatusBadge';
import type { EmployeeProfile } from '../../types';
import { getConfirmedPosition } from '../../utils/hr';

const STATUS_OPTIONS = [
  { value: '',                          label: 'All Statuses'              },
  { value: 'registered',                label: 'Registered'                },
  { value: 'form_in_progress',          label: 'Form In Progress'          },
  { value: 'form_submitted',            label: 'Form Submitted'            },
  { value: 'under_review',              label: 'Under Review'              },
  { value: 'partially_rejected',        label: 'Partially Rejected'        },
  { value: 'under_super_admin_review',  label: 'Awaiting Final Approval'   },
  { value: 'approved',                  label: 'Approved'                  },
  { value: 'rejected',                  label: 'Rejected'                  },
];

export const AllEmployees: React.FC = () => {
  const navigate    = useNavigate();
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);

  const { data, isLoading } = useQuery<{ employees: EmployeeProfile[]; pagination: any } | undefined>({
    queryKey: ['superAdminAllEmployees', { page, status, search }],
    queryFn:  () =>
      superAdminApi.getAllEmployees({
        page,
        limit:  10,
        status: status  || undefined,
        search: search  || undefined,
      }).then((r) => r.data.data),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" /> All Employees
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete employee registry across all onboarding stages.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-input w-full sm:w-56"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Summary bar */}
      {data?.pagination && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg">
          <span className="text-sm text-slate-500">
            Total: <strong className="text-slate-700">{data.pagination.total}</strong> employees
          </span>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <Table
          loading={isLoading}
          data={data?.employees || []}
          keyExtractor={(r) => r._id}
          onRowClick={(r) => navigate(`/super-admin/employees/${r._id}`)}
          columns={[
            {
              key: 'userId',
              header: 'Employee',
              render: (_, r) => (
                <div>
                  <p className="font-semibold text-slate-700">
                    {(r.userId as any)?.firstName} {(r.userId as any)?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{(r.userId as any)?.email}</p>
                </div>
              ),
            },
            {
              key: 'employeeId',
              header: 'Employee ID',
              render: (_, r) =>
                r.employeeId
                  ? <span className="font-mono text-sm font-bold text-emerald-600">{r.employeeId}</span>
                  : <span className="text-slate-300 text-xs">Not assigned</span>,
            },
            {
              key: 'overallStatus',
              header: 'Status',
              render: (_, r) => <OverallStatusBadge status={r.overallStatus} />,
            },
            {
              key: 'department',
              header: 'Department',
              render: (_, r) => r.department || <span className="text-xs text-slate-400">Unassigned</span>,
            },
            {
              key: 'position',
              header: 'Position',
              render: (_, r) => getConfirmedPosition(r) || <span className="text-xs text-slate-400">Not set</span>,
            },
            {
              key: 'verificationStatus',
              header: 'Sections',
              render: (_, r) => {
                const vs       = r.verificationStatus;
                const approved = ['personal','education','bank','documents'].filter(
                  (s) => vs[s as keyof typeof vs]?.status === 'approved'
                ).length;
                return (
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(approved / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{approved}/4</span>
                  </div>
                );
              },
            },
            {
              key: 'createdAt',
              header: 'Registered',
              render: (v) => format(new Date(v as string), 'dd MMM yyyy'),
            },
            {
              key: '_id',
              header: '',
              render: (_, r) => (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/employees/${r._id}`); }}
                >
                  View
                </Button>
              ),
            },
          ]}
          emptyMessage="No employees found."
        />

        {data?.pagination && data.pagination.total > 10 && (
          <div className="px-4 border-t border-slate-100">
            <Pagination
              page={data.pagination.page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              limit={10}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
