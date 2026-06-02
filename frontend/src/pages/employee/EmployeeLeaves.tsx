import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Clock, Info, Plus, History, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { leaveApi } from '../../services/api';
import { Button, Input, Modal, Spinner } from '../../components/common/UI';
import { Table } from '../../components/common/Table';
import type { EmployeeLeaveRow, LeaveBalance, LeaveRequestRow, LeaveRequestStatus, LeaveType } from '../../types';

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'earned_leave', label: 'Earned Leave' },
  { value: 'casual_leave', label: 'Casual Leave' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'comp_off', label: 'Comp Off' },
  { value: 'lop', label: 'Loss of Pay (LOP)' },
];

const requestStatusConfig: Record<LeaveRequestStatus, { label: string; className: string; icon: any }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: XCircle,
  },
};

const LeaveBalanceCard: React.FC<{ label: string; code: string; balance: LeaveBalance }> = ({ label, code, balance }) => {
  const usedPct = balance.total ? Math.min((balance.used / balance.total) * 100, 100) : 0;

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{code}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-600">Balance</span>
      </div>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-3">
        {balance.remaining}
        <span className="text-sm font-medium text-slate-400 ml-1">/ {balance.total}</span>
      </p>
      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div 
          className="h-full rounded-full bg-primary-500 transition-all duration-500" 
          style={{ width: `${usedPct}%` }} 
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>Used: {balance.used}</span>
        <span>Remaining: {balance.remaining}</span>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: LeaveRequestStatus }> = ({ status }) => {
  const config = requestStatusConfig[status];
  const Icon = config.icon;
  return (
    <span className={`badge ${config.className} flex items-center gap-1 w-fit`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export const EmployeeLeaves: React.FC = () => {
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | ''>('');

  const [form, setForm] = useState({
    leaveType: 'casual_leave' as LeaveType,
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  // Queries
  const { data: leave, isLoading: isLeaveLoading, error: leaveError } = useQuery({
    queryKey: ['employeeLeaveBalance', year],
    queryFn: () => leaveApi.getMyLeave({ year }).then((res) => res.data.data),
    retry: false,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['employeeLeaveHistory', { year, status: statusFilter }],
    queryFn: () => leaveApi.getMyRequests({ year, status: statusFilter || undefined }).then((res) => res.data.data?.requests || []),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => leaveApi.createRequest(payload),
    onSuccess: () => {
      toast.success('Leave request submitted successfully.');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveHistory'] });
      setForm({
        leaveType: 'casual_leave',
        fromDate: format(new Date(), 'yyyy-MM-dd'),
        toDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit leave request.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (new Date(form.fromDate) > new Date(form.toDate)) {
      toast.error('End date cannot be before start date.');
      return;
    }

    // Check balance (only for non-LOP)
    if (leave && form.leaveType !== 'lop' && form.leaveType !== 'comp_off') {
      const balanceKey = form.leaveType === 'earned_leave' ? 'earnedLeave' : 
                         form.leaveType === 'casual_leave' ? 'casualLeave' : 'sickLeave';
      const balance = leave[balanceKey as keyof EmployeeLeaveRow] as LeaveBalance;
      
      // Simple warning if requesting more than available (though backend handles LOP auto-conversion)
      // We'll let the user proceed but warn them.
    }

    createMutation.mutate(form);
  };

  const getBalanceForType = (type: LeaveType) => {
    if (!leave) return 0;
    if (type === 'earned_leave') return leave.earnedLeave.remaining;
    if (type === 'casual_leave') return leave.casualLeave.remaining;
    if (type === 'sick_leave') return leave.sickLeave.remaining;
    if (type === 'comp_off') return leave.compOffSummary.remaining;
    return Infinity;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-primary-600" /> My Leave Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your leave balances, request time off, and view your history.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            YEAR {year}
          </span>
          <Button 
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            className="shadow-lg shadow-primary-500/20"
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLeaveLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-50 dark:bg-slate-800/50" />
          ))
        ) : leaveError ? (
          <div className="col-span-full card p-6 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Leave balance will be available after your onboarding is approved.</p>
          </div>
        ) : leave && (
          <>
            <LeaveBalanceCard label="Earned Leave" code="EL" balance={leave.earnedLeave} />
            <LeaveBalanceCard label="Casual Leave" code="CL" balance={leave.casualLeave} />
            <LeaveBalanceCard label="Sick Leave" code="SL" balance={leave.sickLeave} />
            <div className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Comp Off</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Expires in 30 days</p>
                </div>
                <Clock className="w-4 h-4 text-primary-500" />
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-3">
                {leave.compOffSummary.remaining}
                <span className="text-sm font-medium text-slate-400 ml-1">/ {leave.compOffSummary.total}</span>
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Used: {leave.compOffSummary.used}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> Expired: {leave.compOffSummary.expired}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* LOP Alert */}
      {leave && leave.lopDays > 0 && (
        <div className="card bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Loss of Pay (LOP) Detected</p>
            <p className="text-xs text-red-700/70 dark:text-red-400/70">You have {leave.lopDays} days marked as LOP. These were deducted because your paid leave balances were exhausted.</p>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <h2 className="section-title flex items-center gap-2">
            <History className="w-4 h-4 text-primary-600" /> Leave History
          </h2>
          <div className="flex items-center gap-2">
            <select 
              className="form-input text-xs py-1.5 w-32"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <Table
          loading={isHistoryLoading}
          data={history || []}
          keyExtractor={(row) => row._id}
          columns={[
            {
              key: 'leaveTypeLabel',
              header: 'Leave Type',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.leaveTypeLabel}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Applied: {format(new Date(row.createdAt), 'dd MMM')}</p>
                </div>
              )
            },
            {
              key: 'fromDate',
              header: 'Duration',
              render: (_, row) => (
                <div className="text-sm">
                  <p className="text-slate-600 dark:text-slate-300">
                    {format(new Date(row.fromDate), 'dd MMM')} - {format(new Date(row.toDate), 'dd MMM')}
                  </p>
                  <p className="text-[11px] text-slate-400">{format(new Date(row.fromDate), 'yyyy')}</p>
                </div>
              )
            },
            {
              key: 'days',
              header: 'Days',
              render: (_, row) => (
                <div className="text-center sm:text-left">
                  <p className="font-bold text-slate-700 dark:text-slate-200">{row.days}</p>
                  {row.lopDays > 0 && <span className="text-[10px] text-red-500 font-medium">({row.lopDays} LOP)</span>}
                </div>
              )
            },
            {
              key: 'status',
              header: 'Status',
              render: (_, row) => (
                <div className="space-y-1">
                  <StatusBadge status={row.status} />
                  {row.status === 'rejected' && row.rejectionReason && (
                    <p className="text-[10px] text-red-400 italic max-w-[150px] truncate" title={row.rejectionReason}>
                      Reason: {row.rejectionReason}
                    </p>
                  )}
                </div>
              )
            },
            {
              key: 'reason',
              header: 'Reason',
              render: (_, row) => (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] line-clamp-1" title={row.reason}>
                  {row.reason || '-'}
                </p>
              )
            }
          ]}
          emptyMessage="No leave requests found for the selected criteria."
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
        <Info className="w-3.5 h-3.5" />
        <p>Weekends and configured public holidays are automatically excluded from your leave deductions.</p>
      </div>

      {/* Leave Request Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Apply for Leave"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
              <select 
                className="form-input"
                required
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
              >
                {leaveTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (Bal: {getBalanceForType(opt.value)})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1" />
            
            <Input 
              label="From Date" 
              type="date" 
              required
              min={format(new Date(), 'yyyy-MM-dd')}
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })}
            />
            <Input 
              label="To Date" 
              type="date" 
              required
              min={form.fromDate}
              value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
            <textarea 
              className="form-input min-h-[100px] py-2"
              placeholder="Please provide a brief reason for your leave request..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-2">
            <Info className="w-4 h-4 text-primary-500 mt-0.5" />
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              <p className="font-semibold text-slate-600 dark:text-slate-300">Policy Note:</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Overlapping requests are not allowed.</li>
                <li>Leave requests go to Admin for approval.</li>
                <li>If balance is insufficient, remaining days will be marked as LOP.</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1"
              loading={createMutation.isPending}
            >
              Submit Request
            </Button>
            <Button 
              variant="secondary" 
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
