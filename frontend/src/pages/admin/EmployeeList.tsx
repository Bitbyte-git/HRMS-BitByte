import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { adminApi } from '../../services/api';
import { Button } from '../../components/common/UI';
import { Table, Pagination } from '../../components/common/Table';
import { OverallStatusBadge } from '../../components/common/StatusBadge';
import type { EmployeeProfile } from '../../types';
import { getConfirmedPosition } from '../../utils/hr';

const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses'       },
  { value: 'form_in_progress',   label: 'In Progress'        },
  { value: 'form_submitted',     label: 'Form Submitted'     },
  { value: 'under_review',       label: 'Under Review'       },
  { value: 'partially_rejected', label: 'Partially Rejected' },
  { value: 'admin_approved',     label: 'Admin Approved'     },
];

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery<{ employees: EmployeeProfile[]; pagination: any } | undefined>({
    queryKey: ['adminEmployees', { page, status, search }],
    queryFn:  () => adminApi.getEmployeeList({ page, limit: 10, status: status||undefined, search: search||undefined })
                    .then(r => r.data.data),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Employee Submissions</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review and verify employee onboarding submissions.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input className="form-input pl-9" placeholder="Search by name or email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-input w-full sm:w-48" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        <Table loading={isLoading} data={data?.employees||[]} keyExtractor={r=>r._id}
          onRowClick={r => navigate(`/admin/employees/${r._id}`)}
          columns={[
            { key:'userId', header:'Employee', render:(_,r)=>(
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{(r.userId as any)?.firstName} {(r.userId as any)?.lastName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{(r.userId as any)?.email}</p>
              </div>
            )},
            { key:'department', header:'Department', render:(_,r)=>r.department || <span className="text-xs text-slate-400">Unassigned</span> },
            { key:'position', header:'Position', render:(_,r)=>getConfirmedPosition(r) || <span className="text-xs text-slate-400">Not set</span> },
            { key:'overallStatus', header:'Status', render:(_,r)=><OverallStatusBadge status={r.overallStatus}/> },
            { key:'verificationStatus', header:'Sections', render:(_,r)=>{
              const vs=r.verificationStatus;
              const approved=['personal','education','bank','documents'].filter(s=>vs[s as keyof typeof vs]?.status==='approved').length;
              return (
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${(approved/4)*100}%`}} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{approved}/4</span>
                </div>
              );
            }},
            { key:'createdAt', header:'Submitted', render:v=>format(new Date(v as string),'dd MMM yyyy') },
            { key:'_id', header:'', render:(_,r)=>(
              <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5"/>}
                onClick={e=>{e.stopPropagation();navigate(`/admin/employees/${r._id}`);}}>
                Review
              </Button>
            )},
          ]}
          emptyMessage="No employee submissions found."
        />
        {data?.pagination && data.pagination.total>10 && (
          <div className="px-4 border-t border-slate-100 dark:border-slate-700">
            <Pagination page={data.pagination.page} pages={data.pagination.pages}
              total={data.pagination.total} limit={10} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};
