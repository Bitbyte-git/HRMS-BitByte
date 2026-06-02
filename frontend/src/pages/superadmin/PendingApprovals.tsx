import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { superAdminApi } from '../../services/api';
import { Button } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { OverallStatusBadge } from '../../components/common/StatusBadge';
import type { EmployeeProfile } from '../../types';
import { getConfirmedPosition } from '../../utils/hr';

export const PendingApprovals: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ employees: EmployeeProfile[]; pagination: any } | undefined>({
    queryKey: ['superAdminPending', page],
    queryFn:  () => superAdminApi.getPendingApprovals({ page, limit: 10 }).then(r => r.data.data),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-500" /> Pending Final Approvals
        </h1>
        <p className="text-slate-500 text-sm mt-1">Profiles forwarded by Admins awaiting your final decision.</p>
      </div>

      {(data?.pagination?.total || 0) > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-bold">{data?.pagination?.total}</span> profile
            {data?.pagination?.total !== 1 ? 's' : ''} awaiting your review.
          </p>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <Table loading={isLoading} data={data?.employees || []} keyExtractor={r => r._id}
          onRowClick={r => navigate(`/super-admin/employees/${r._id}`)}
          columns={[
            { key: 'userId', header: 'Employee', render: (_, r) => (
              <div>
                <p className="font-semibold text-slate-700">{(r.userId as any)?.firstName} {(r.userId as any)?.lastName}</p>
                <p className="text-xs text-slate-400">{(r.userId as any)?.email}</p>
              </div>
            )},
            { key: 'forwardedBy', header: 'Verified By Admin', render: (_, r) =>
              r.forwardedBy ? `${(r.forwardedBy as any).firstName} ${(r.forwardedBy as any).lastName}` : '—' },
            { key: 'department', header: 'Department', render: (_, r) =>
              r.department || <span className="text-xs text-slate-400">Unassigned</span> },
            { key: 'position', header: 'Position', render: (_, r) =>
              getConfirmedPosition(r) || <span className="text-xs text-slate-400">Not set</span> },
            { key: 'fixedPay', header: 'Fixed Pay', render: (_, r) =>
              (r as any).fixedPay?.amount ? `₹${(r as any).fixedPay.amount}` : <span className="text-xs text-slate-400">Not set</span> },
            { key: 'forwardedAt', header: 'Forwarded On',
              render: v => v ? format(new Date(v as string), 'dd MMM yyyy') : '—' },
            { key: 'createdAt', header: 'Registered',
              render: v => format(new Date(v as string), 'dd MMM yyyy') },
            { key: 'overallStatus', header: 'Status', render: (_, r) => <OverallStatusBadge status={r.overallStatus} /> },
            { key: '_id', header: '', render: (_, r) => (
              <Button size="sm" onClick={e => { e.stopPropagation(); navigate(`/super-admin/employees/${r._id}`); }}>
                Review
              </Button>
            )},
          ]}
          emptyMessage="No profiles pending approval."
        />
        {data?.pagination && data.pagination.total > 10 && (
          <div className="px-4 border-t border-slate-100">
            <Pagination page={data.pagination.page} pages={data.pagination.pages}
              total={data.pagination.total} limit={10} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};
