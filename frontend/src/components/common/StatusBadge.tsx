import React from 'react';
import type { SectionStatus, OverallStatus } from '../../types';

const sectionStatusMap: Record<SectionStatus, { label: string; classes: string }> = {
  pending:      { label: 'Pending',      classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'   },
  submitted:    { label: 'Submitted',    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'     },
  under_review: { label: 'Under Review', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  approved:     { label: 'Approved',     classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'},
  rejected:     { label: 'Rejected',     classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'       },
};

const overallStatusMap: Record<OverallStatus, { label: string; classes: string }> = {
  registered:               { label: 'Registered',          classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'    },
  form_in_progress:         { label: 'In Progress',         classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'  },
  form_submitted:           { label: 'Submitted',           classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'      },
  under_review:             { label: 'Under Review',        classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'  },
  partially_rejected:       { label: 'Partially Rejected',  classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'  },
  admin_approved:           { label: 'Admin Approved',      classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'      },
  under_super_admin_review: { label: 'Final Review',        classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'  },
  approved:                 { label: 'Approved ✓',          classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'},
  rejected:                 { label: 'Rejected',            classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'        },
};

export const SectionStatusBadge: React.FC<{ status: SectionStatus }> = ({ status }) => {
  const config = sectionStatusMap[status] || sectionStatusMap.pending;
  return <span className={`badge ${config.classes}`}>{config.label}</span>;
};

export const OverallStatusBadge: React.FC<{ status: OverallStatus }> = ({ status }) => {
  const config = overallStatusMap[status] || overallStatusMap.registered;
  return <span className={`badge ${config.classes}`}>{config.label}</span>;
};

// ── Stats Card ────────────────────────────────────────────────────────────
interface StatsCardProps {
  title: string; value: number | string; icon: React.ReactNode;
  iconBg: string; change?: string; changeType?: 'up'|'down'|'neutral';
}
export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, iconBg, change, changeType }) => (
  <div className="card flex items-start gap-4 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
    <div className={`p-3.5 rounded-2xl ${iconBg} flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>{icon}</div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{value}</p>
      {change && (
        <p className={`text-xs mt-1 font-medium ${
          changeType === 'up' ? 'text-emerald-600 dark:text-emerald-400' : changeType === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
        }`}>{change}</p>
      )}
    </div>
  </div>
);

// ── Section Progress Row ──────────────────────────────────────────────────
export const SectionProgressRow: React.FC<{
  label: string; status: SectionStatus; icon: React.ReactNode;
}> = ({ label, status, icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
    <div className="flex items-center gap-3">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </div>
    <SectionStatusBadge status={status} />
  </div>
);
