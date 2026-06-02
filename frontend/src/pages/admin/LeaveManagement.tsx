import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CalendarRange,
  CheckCircle,
  ClipboardList,
  Gift,
  Plus,
  Search,
  Settings2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leaveApi } from '../../services/api';
import { Button, Input, Modal } from '../../components/common/UI';
import { Table } from '../../components/common/Table';
import { DEPARTMENT_OPTIONS } from '../../utils/hr';
import type { EmployeeLeaveRow, LeaveBalance, LeaveRequestRow, LeaveRequestStatus, LeaveType } from '../../types';

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'earned_leave', label: 'Earned Leave' },
  { value: 'casual_leave', label: 'Casual Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'maternity_leave', label: 'Maternity Leave' },
  { value: 'paternity_leave', label: 'Paternity Leave' },
  { value: 'comp_off', label: 'Comp Off' },
  { value: 'lop', label: 'Loss of Pay' },
];

const requestStatusConfig: Record<LeaveRequestStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

const BalanceCell: React.FC<{ balance: LeaveBalance }> = ({ balance }) => (
  <div className="min-w-[86px]">
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
      {balance.remaining}
      <span className="text-xs font-medium text-slate-400"> / {balance.total}</span>
    </p>
    <div className="mt-1 h-1.5 w-20 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary-500"
        style={{ width: `${balance.total ? Math.min((balance.used / balance.total) * 100, 100) : 0}%` }}
      />
    </div>
    <p className="text-[11px] text-slate-400 mt-1">Used {balance.used}</p>
  </div>
);

const StatusBadge: React.FC<{ status: LeaveRequestStatus }> = ({ status }) => {
  const config = requestStatusConfig[status];
  return <span className={`badge ${config.className}`}>{config.label}</span>;
};

const emptyAllocation = {
  employeeId: '',
  earnedLeave: 15,
  casualLeave: 8,
  sickLeave: 8,
  maternityLeave: 182,
  paternityLeave: 15,
};

export const LeaveManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [requestStatus, setRequestStatus] = useState<LeaveRequestStatus | ''>('pending');
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [compOffOpen, setCompOffOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [rejectRequest, setRejectRequest] = useState<LeaveRequestRow | null>(null);

  const [allocationForm, setAllocationForm] = useState(emptyAllocation);
  const [compOffForm, setCompOffForm] = useState({
    employeeId: '',
    days: 1,
    grantedDate: format(new Date(), 'yyyy-MM-dd'),
    validityDays: 30,
    reason: '',
  });
  const [markForm, setMarkForm] = useState({
    employeeId: '',
    leaveType: 'casual_leave' as LeaveType,
    date: format(new Date(), 'yyyy-MM-dd'),
    days: '',
    reason: 'Marked by admin',
  });
  const [requestForm, setRequestForm] = useState({
    employeeId: '',
    leaveType: 'earned_leave' as LeaveType,
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    days: '',
    reason: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const leavesQuery = useQuery({
    queryKey: ['adminLeaves', { year, department, search }],
    queryFn: () =>
      leaveApi
        .getAll({ year, department: department || undefined, search: search || undefined })
        .then((response) => response.data.data),
  });

  const requestsQuery = useQuery({
    queryKey: ['leaveRequests', { year, requestStatus }],
    queryFn: () =>
      leaveApi
        .getRequests({ year, status: requestStatus || undefined })
        .then((response) => response.data.data?.requests || []),
  });

  const employees = leavesQuery.data?.employees || [];
  const requests = requestsQuery.data || [];

  const metrics = useMemo(() => {
    return employees.reduce(
      (acc, row) => {
        acc.remaining += row.earnedLeave.remaining + row.casualLeave.remaining + row.sickLeave.remaining + row.compOffSummary.remaining;
        acc.lopDays += row.lopDays;
        return acc;
      },
      {
        employeeCount: employees.length,
        pendingCount: requests.filter((request) => request.status === 'pending').length,
        remaining: 0,
        lopDays: 0,
      }
    );
  }, [employees, requests]);

  const invalidateLeaves = () => {
    queryClient.invalidateQueries({ queryKey: ['adminLeaves'] });
    queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
  };

  const allocateMutation = useMutation({
    mutationFn: () =>
      leaveApi.allocate({
        employeeId: allocationForm.employeeId,
        year,
        balances: {
          earnedLeave: { total: Number(allocationForm.earnedLeave) },
          casualLeave: { total: Number(allocationForm.casualLeave) },
          sickLeave: { total: Number(allocationForm.sickLeave) },
          maternityLeave: { total: Number(allocationForm.maternityLeave) },
          paternityLeave: { total: Number(allocationForm.paternityLeave) },
        },
      }),
    onSuccess: () => {
      toast.success('Leave allocation updated.');
      setAllocationOpen(false);
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Allocation failed.'),
  });

  const compOffMutation = useMutation({
    mutationFn: () =>
      leaveApi.grantCompOff({
        employeeId: compOffForm.employeeId,
        days: Number(compOffForm.days),
        grantedDate: compOffForm.grantedDate,
        validityDays: Number(compOffForm.validityDays),
        reason: compOffForm.reason,
      }),
    onSuccess: () => {
      toast.success('Comp off granted.');
      setCompOffOpen(false);
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Comp off grant failed.'),
  });

  const markLeaveMutation = useMutation({
    mutationFn: () =>
      leaveApi.markLeave({
        employeeId: markForm.employeeId,
        leaveType: markForm.leaveType,
        fromDate: markForm.date,
        toDate: markForm.date,
        days: markForm.days ? Number(markForm.days) : undefined,
        reason: markForm.reason,
      }),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Leave marked.');
      setMarkOpen(false);
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Leave marking failed.'),
  });

  const createRequestMutation = useMutation({
    mutationFn: () =>
      leaveApi.createRequest({
        employeeId: requestForm.employeeId,
        leaveType: requestForm.leaveType,
        fromDate: requestForm.fromDate,
        toDate: requestForm.toDate,
        days: requestForm.days ? Number(requestForm.days) : undefined,
        reason: requestForm.reason,
      }),
    onSuccess: () => {
      toast.success('Leave request created.');
      setRequestOpen(false);
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Request creation failed.'),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => leaveApi.approve(requestId),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Leave approved.');
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Approval failed.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => leaveApi.reject({ requestId: rejectRequest!._id, rejectionReason }),
    onSuccess: () => {
      toast.success('Leave rejected.');
      setRejectRequest(null);
      setRejectionReason('');
      invalidateLeaves();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Rejection failed.'),
  });

  const openAllocation = (row?: EmployeeLeaveRow) => {
    setAllocationForm(row
      ? {
          employeeId: row.profileId,
          earnedLeave: row.earnedLeave.total,
          casualLeave: row.casualLeave.total,
          sickLeave: row.sickLeave.total,
          maternityLeave: row.maternityLeave.total,
          paternityLeave: row.paternityLeave.total,
        }
      : emptyAllocation);
    setAllocationOpen(true);
  };

  const openCompOff = (row?: EmployeeLeaveRow) => {
    setCompOffForm((current) => ({ ...current, employeeId: row?.profileId || current.employeeId }));
    setCompOffOpen(true);
  };

  const openMarkLeave = (row?: EmployeeLeaveRow) => {
    setMarkForm((current) => ({ ...current, employeeId: row?.profileId || current.employeeId }));
    setMarkOpen(true);
  };

  const employeeOptions = employees.map((employee) => (
    <option key={employee.profileId} value={employee.profileId}>
      {employee.employeeId || 'Pending'} - {employee.employeeName}
    </option>
  ));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-primary-600" /> Leave Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Policy-based allocation, approvals, comp off expiry, and LOP tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={<Settings2 className="w-4 h-4" />} onClick={() => openAllocation()}>
            Allocate
          </Button>
          <Button variant="success" icon={<UserCheck className="w-4 h-4" />} onClick={() => openMarkLeave()}>
            Mark Leave
          </Button>
          <Button variant="secondary" icon={<Gift className="w-4 h-4" />} onClick={() => openCompOff()}>
            Comp Off
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setRequestOpen(true)}>
            Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Employees', value: metrics.employeeCount },
          { label: 'Pending Requests', value: metrics.pendingCount },
          { label: 'Available Days', value: metrics.remaining },
          { label: 'LOP Days', value: metrics.lopDays },
        ].map((item) => (
          <div key={item.label} className="card py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by name, employee ID, email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <input
          className="form-input w-full xl:w-32"
          type="number"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        />
        <select className="form-input w-full xl:w-56" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          loading={leavesQuery.isLoading}
          data={employees}
          keyExtractor={(row) => row.profileId}
          columns={[
            {
              key: 'employeeName',
              header: 'Employee',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.employeeName}</p>
                  <p className="text-xs text-slate-400">{row.employeeId || 'Employee ID pending'} · {row.department || 'Unassigned'}</p>
                </div>
              ),
            },
            { key: 'earnedLeave', header: 'EL', render: (_, row) => <BalanceCell balance={row.earnedLeave} /> },
            { key: 'casualLeave', header: 'CL', render: (_, row) => <BalanceCell balance={row.casualLeave} /> },
            { key: 'sickLeave', header: 'SL', render: (_, row) => <BalanceCell balance={row.sickLeave} /> },
            {
              key: 'compOffSummary',
              header: 'Comp Off',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.compOffSummary.remaining}</p>
                  <p className="text-[11px] text-slate-400">Expired {row.compOffSummary.expired}</p>
                </div>
              ),
            },
            {
              key: 'lopDays',
              header: 'LOP',
              render: (_, row) => <span className={row.lopDays ? 'font-semibold text-red-600' : ''}>{row.lopDays}</span>,
            },
            {
              key: 'actions',
              header: '',
              render: (_, row) => (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openAllocation(row)}>Allocate</Button>
                  <Button size="sm" variant="ghost" onClick={() => openMarkLeave(row)}>Mark</Button>
                  <Button size="sm" variant="ghost" onClick={() => openCompOff(row)}>Comp Off</Button>
                </div>
              ),
            },
          ]}
          emptyMessage="No approved employees found for leave management."
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="section-title flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary-600" /> Leave Requests
          </h2>
          <select className="form-input w-full sm:w-44" value={requestStatus} onChange={(event) => setRequestStatus(event.target.value as LeaveRequestStatus | '')}>
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <Table
          loading={requestsQuery.isLoading}
          data={requests}
          keyExtractor={(row) => row._id}
          columns={[
            {
              key: 'employeeName',
              header: 'Employee',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.employeeName}</p>
                  <p className="text-xs text-slate-400">{row.employeeId || 'Employee ID pending'}</p>
                </div>
              ),
            },
            { key: 'leaveTypeLabel', header: 'Type' },
            {
              key: 'fromDate',
              header: 'Period',
              render: (_, row) => `${format(new Date(row.fromDate), 'dd MMM')} - ${format(new Date(row.toDate), 'dd MMM yyyy')}`,
            },
            {
              key: 'days',
              header: 'Days',
              render: (_, row) => (
                <div>
                  <p className="font-semibold">{row.days}</p>
                  {row.lopDays > 0 && <p className="text-[11px] text-red-500">LOP {row.lopDays}</p>}
                </div>
              ),
            },
            {
              key: 'currentBalance',
              header: 'Balance',
              render: (_, row) => (
                <div className="text-xs">
                  {row.currentBalance ? (
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      {row.currentBalance.remaining} <span className="text-slate-400">/ {row.currentBalance.total}</span>
                    </p>
                  ) : '-'}
                </div>
              ),
            },
            { key: 'status', header: 'Status', render: (_, row) => <StatusBadge status={row.status} /> },
            {
              key: 'actions',
              header: '',
              render: (_, row) => row.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    icon={<CheckCircle className="w-3.5 h-3.5" />}
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(row._id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() => setRejectRequest(row)}
                  >
                    Reject
                  </Button>
                </div>
              ) : <span className="text-xs text-slate-400">Reviewed</span>,
            },
          ]}
          emptyMessage="No leave requests found."
        />
      </div>

      <Modal isOpen={allocationOpen} onClose={() => setAllocationOpen(false)} title="Allocate Leave" size="lg">
        <div className="space-y-4">
          <select className="form-input" value={allocationForm.employeeId} onChange={(event) => setAllocationForm((form) => ({ ...form, employeeId: event.target.value }))}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Earned Leave" type="number" min={0} value={allocationForm.earnedLeave} onChange={(event) => setAllocationForm((form) => ({ ...form, earnedLeave: Number(event.target.value) }))} />
            <Input label="Casual Leave" type="number" min={0} value={allocationForm.casualLeave} onChange={(event) => setAllocationForm((form) => ({ ...form, casualLeave: Number(event.target.value) }))} />
            <Input label="Sick Leave" type="number" min={0} value={allocationForm.sickLeave} onChange={(event) => setAllocationForm((form) => ({ ...form, sickLeave: Number(event.target.value) }))} />
            <Input label="Maternity Leave" type="number" min={0} value={allocationForm.maternityLeave} onChange={(event) => setAllocationForm((form) => ({ ...form, maternityLeave: Number(event.target.value) }))} />
            <Input label="Paternity Leave" type="number" min={0} value={allocationForm.paternityLeave} onChange={(event) => setAllocationForm((form) => ({ ...form, paternityLeave: Number(event.target.value) }))} />
          </div>
          <Button loading={allocateMutation.isPending} disabled={!allocationForm.employeeId} onClick={() => allocateMutation.mutate()}>
            Save Allocation
          </Button>
        </div>
      </Modal>

      <Modal isOpen={markOpen} onClose={() => setMarkOpen(false)} title="Mark Leave Today" size="lg">
        <div className="space-y-4">
          <select className="form-input" value={markForm.employeeId} onChange={(event) => setMarkForm((form) => ({ ...form, employeeId: event.target.value }))}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <select className="form-input" value={markForm.leaveType} onChange={(event) => setMarkForm((form) => ({ ...form, leaveType: event.target.value as LeaveType }))}>
            {leaveTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Leave Date" type="date" value={markForm.date} onChange={(event) => setMarkForm((form) => ({ ...form, date: event.target.value }))} />
            <Input label="Days Override" type="number" min={0.5} step={0.5} value={markForm.days} onChange={(event) => setMarkForm((form) => ({ ...form, days: event.target.value }))} hint="Use 0.5 for half-day or leave blank for policy calculation." />
          </div>
          <Input label="Reason" value={markForm.reason} onChange={(event) => setMarkForm((form) => ({ ...form, reason: event.target.value }))} />
          <div className="rounded-xl border border-amber-100 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-300">
            Marking leave approves it immediately, deducts the selected leave type, and converts any shortage to LOP.
          </div>
          <Button loading={markLeaveMutation.isPending} disabled={!markForm.employeeId} onClick={() => markLeaveMutation.mutate()}>
            Mark Leave
          </Button>
        </div>
      </Modal>

      <Modal isOpen={compOffOpen} onClose={() => setCompOffOpen(false)} title="Grant Comp Off">
        <div className="space-y-4">
          <select className="form-input" value={compOffForm.employeeId} onChange={(event) => setCompOffForm((form) => ({ ...form, employeeId: event.target.value }))}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <Input label="Days" type="number" min={0.5} step={0.5} value={compOffForm.days} onChange={(event) => setCompOffForm((form) => ({ ...form, days: Number(event.target.value) }))} />
          <Input label="Granted Date" type="date" value={compOffForm.grantedDate} onChange={(event) => setCompOffForm((form) => ({ ...form, grantedDate: event.target.value }))} />
          <Input label="Validity Days" type="number" min={1} value={compOffForm.validityDays} onChange={(event) => setCompOffForm((form) => ({ ...form, validityDays: Number(event.target.value) }))} />
          <Input label="Reason" value={compOffForm.reason} onChange={(event) => setCompOffForm((form) => ({ ...form, reason: event.target.value }))} />
          <Button loading={compOffMutation.isPending} disabled={!compOffForm.employeeId} onClick={() => compOffMutation.mutate()}>
            Grant Comp Off
          </Button>
        </div>
      </Modal>

      <Modal isOpen={requestOpen} onClose={() => setRequestOpen(false)} title="Create Leave Request" size="lg">
        <div className="space-y-4">
          <select className="form-input" value={requestForm.employeeId} onChange={(event) => setRequestForm((form) => ({ ...form, employeeId: event.target.value }))}>
            <option value="">Select employee</option>
            {employeeOptions}
          </select>
          <select className="form-input" value={requestForm.leaveType} onChange={(event) => setRequestForm((form) => ({ ...form, leaveType: event.target.value as LeaveType }))}>
            {leaveTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="From Date" type="date" value={requestForm.fromDate} onChange={(event) => setRequestForm((form) => ({ ...form, fromDate: event.target.value }))} />
            <Input label="To Date" type="date" value={requestForm.toDate} onChange={(event) => setRequestForm((form) => ({ ...form, toDate: event.target.value }))} />
          </div>
          <Input label="Days Override" type="number" min={0.5} step={0.5} value={requestForm.days} onChange={(event) => setRequestForm((form) => ({ ...form, days: event.target.value }))} hint="Leave blank to calculate from dates and policy." />
          <Input label="Reason" value={requestForm.reason} onChange={(event) => setRequestForm((form) => ({ ...form, reason: event.target.value }))} />
          <Button loading={createRequestMutation.isPending} disabled={!requestForm.employeeId} onClick={() => createRequestMutation.mutate()}>
            Create Request
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!rejectRequest} onClose={() => setRejectRequest(null)} title="Reject Leave Request">
        <div className="space-y-4">
          {rejectRequest && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{rejectRequest.employeeName}</p>
              <p className="text-xs text-slate-400">{rejectRequest.leaveTypeLabel} · {rejectRequest.days} days</p>
            </div>
          )}
          <Input label="Rejection Reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
          <div className="flex items-center gap-2">
            <Button variant="danger" loading={rejectMutation.isPending} disabled={!rejectionReason.trim()} onClick={() => rejectMutation.mutate()}>
              Reject Request
            </Button>
            <Button variant="secondary" onClick={() => setRejectRequest(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
