import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Building2, Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/api';
import { Button } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { OverallStatusBadge } from '../../components/common/StatusBadge';
import type { EmployeeProfile, EmploymentPosition } from '../../types';
import { DEPARTMENT_OPTIONS, POSITION_OPTIONS, getEmployeeName } from '../../utils/hr';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'form_submitted', label: 'Form Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'admin_approved', label: 'Admin Approved' },
  { value: 'under_super_admin_review', label: 'Final Review' },
  { value: 'approved', label: 'Approved' },
];

export const DepartmentManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const queryKey = ['adminEmployees', { page, status, search, module: 'department-management' }];

  const { data, isLoading } = useQuery<{ employees: EmployeeProfile[]; pagination: any } | undefined>({
    queryKey,
    queryFn: () => adminApi.getEmployeeList({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined,
    }).then((response) => response.data.data),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
    queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
    queryClient.invalidateQueries({ queryKey: ['superAdminDashboard'] });
  };

  const departmentMutation = useMutation({
    mutationFn: ({ profileId, department }: { profileId: string; department: string }) =>
      adminApi.updateDepartment({ profileId, department }),
    onSuccess: () => {
      toast.success('Department updated.');
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Department update failed'),
  });

  const positionMutation = useMutation({
    mutationFn: ({ profileId, position }: { profileId: string; position: EmploymentPosition }) =>
      adminApi.updatePosition({ profileId, position }),
    onSuccess: () => {
      toast.success('Position updated.');
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Position update failed'),
  });

  const summary = useMemo(() => {
    const employees = data?.employees || [];
    return {
      total: employees.length,
      assignedDepartment: employees.filter((employee) => employee.department).length,
      assignedPosition: employees.filter((employee) => employee.position).length,
    };
  }, [data?.employees]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" /> Department Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Confirm employee departments and job positions after onboarding review.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Listed', value: summary.total },
            { label: 'Departments', value: summary.assignedDepartment },
            { label: 'Positions', value: summary.assignedPosition },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 min-w-[86px]">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by name, email or employee ID..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-input w-full sm:w-56"
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          loading={isLoading}
          data={data?.employees || []}
          keyExtractor={(row) => row._id}
          columns={[
            {
              key: 'employeeId',
              header: 'Employee ID',
              render: (_, row) => row.employeeId
                ? <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{row.employeeId}</span>
                : <span className="text-xs text-slate-400">Pending</span>,
            },
            {
              key: 'userId',
              header: 'Employee Name',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{getEmployeeName(row)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{(row.userId as any)?.email}</p>
                </div>
              ),
            },
            {
              key: 'appliedPosition',
              header: 'Applied Position',
              render: (_, row) => row.appliedPosition || <span className="text-xs text-slate-400">Not provided</span>,
            },
            {
              key: 'department',
              header: 'Department',
              render: (_, row) => (
                <select
                  className="form-input min-w-[170px]"
                  value={row.department || ''}
                  disabled={departmentMutation.isPending}
                  onChange={(event) => departmentMutation.mutate({ profileId: row._id, department: event.target.value })}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'position',
              header: 'Position',
              render: (_, row) => (
                <select
                  className="form-input min-w-[150px]"
                  value={row.position || ''}
                  disabled={positionMutation.isPending}
                  onChange={(event) => positionMutation.mutate({
                    profileId: row._id,
                    position: event.target.value as EmploymentPosition,
                  })}
                >
                  <option value="">Select Position</option>
                  {POSITION_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ),
            },
            {
              key: 'overallStatus',
              header: 'Status',
              render: (_, row) => <OverallStatusBadge status={row.overallStatus} />,
            },
            {
              key: '_id',
              header: '',
              render: (_, row) => (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/admin/employees/${row._id}`)}
                >
                  View
                </Button>
              ),
            },
          ]}
          emptyMessage="No employee profiles found."
        />

        {data?.pagination && data.pagination.total > 10 && (
          <div className="px-4 border-t border-slate-100 dark:border-slate-700">
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
