import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, User, BookOpen, CreditCard, FileText,
  ArrowRight, Trophy, AlertCircle, CheckCircle2, Clock, Circle,
} from 'lucide-react';
import { employeeApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { Spinner, Button, Modal } from '../../components/common/UI';
import { OverallStatusBadge } from '../../components/common/StatusBadge';
import type { SectionStatus } from '../../types';

const sectionMeta = [
  { key: 'personal',  label: 'Personal Details',  icon: <User       className="w-4 h-4" /> },
  { key: 'education', label: 'Education & Career', icon: <BookOpen   className="w-4 h-4" /> },
  { key: 'bank',      label: 'Bank Details',       icon: <CreditCard className="w-4 h-4" /> },
  { key: 'documents', label: 'Documents',          icon: <FileText   className="w-4 h-4" /> },
];

const statusIcon = (status: SectionStatus) => {
  if (status === 'approved') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === 'rejected') return <AlertCircle  className="w-4 h-4 text-red-500" />;
  if (status === 'submitted' || status === 'under_review') return <Clock className="w-4 h-4 text-amber-500" />;
  return <Circle className="w-4 h-4 text-slate-300" />;
};

const statusLabel: Record<SectionStatus, string> = {
  pending:      'Not started',
  submitted:    'Under review',
  under_review: 'Under review',
  approved:     'Approved',
  rejected:     'Needs update',
};

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['employeeProfile', user?._id],
    queryFn:  () => employeeApi.getProfile().then(r => r.data.data),
    enabled: !!user?._id,
  });

  const profile    = data?.profile;
  const vs         = profile?.verificationStatus;
  const isApproved = profile?.overallStatus === 'approved';

  const completedSections = vs
    ? sectionMeta.filter(s => vs[s.key as keyof typeof vs]?.status === 'approved').length
    : 0;

  const hasRejection = vs
    ? sectionMeta.some(s => vs[s.key as keyof typeof vs]?.status === 'rejected')
    : false;

  useEffect(() => {
    if (!profile?.employeeId || profile?.overallStatus !== 'approved') return;
    const approvedAt = profile.superAdminReview?.reviewedAt || profile.updatedAt;
    const approvedDate = approvedAt ? new Date(approvedAt) : null;
    const isWithin30Days = approvedDate
      ? Date.now() - approvedDate.getTime() <= 30 * 24 * 60 * 60 * 1000
      : true;
    const dismissedKey = `employee_welcome_${user?._id}_${profile.employeeId}`;
    if (isWithin30Days && localStorage.getItem(dismissedKey) !== 'closed') {
      setShowWelcome(true);
    }
  }, [profile?.employeeId, profile?.overallStatus, profile?.superAdminReview?.reviewedAt, profile?.updatedAt, user?._id]);

  const closeWelcome = () => {
    if (profile?.employeeId) {
      localStorage.setItem(`employee_welcome_${user?._id}_${profile.employeeId}`, 'closed');
    }
    setShowWelcome(false);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <Spinner size="lg" />
    </div>
  );

  const progressPct = Math.round((completedSections / sectionMeta.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your onboarding progress below.
          </p>
        </div>
        {profile?.overallStatus && (
          <OverallStatusBadge status={profile.overallStatus} />
        )}
      </div>

      {/* ── Approved banner ──────────────────────────────────────────── */}
      {isApproved && (
        <div className="card border-l-4 border-l-emerald-500 flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Onboarding Complete
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your Employee ID:{' '}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {profile?.employeeId}
              </span>
            </p>
          </div>
        </div>
      )}

      <Modal
        isOpen={showWelcome}
        onClose={closeWelcome}
        title="Welcome"
        footer={<Button onClick={closeWelcome}>Close</Button>}
      >
        <div className="text-center py-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Welcome to the team, {user?.firstName}.</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Your Employee ID is</p>
          <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-2xl mt-1">{profile?.employeeId}</p>
        </div>
      </Modal>

      {/* ── Rejection alert ──────────────────────────────────────────── */}
      {hasRejection && (
        <div className="card border-l-4 border-l-red-400 flex items-center gap-4 p-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Action Required</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              One or more sections were rejected. Please review and resubmit.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => navigate('/employee/onboarding')}>
            Update & Resubmit
          </Button>
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Progress card — 2/3 width */}
        <div className="card md:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Onboarding Progress</h2>
            <span className="text-xs font-medium text-slate-400">
              {completedSections}/{sectionMeta.length} sections
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>{progressPct}% complete</span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Section rows */}
          <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-700/50">
            {sectionMeta.map(s => {
              const sectionStatus = (vs?.[s.key as keyof typeof vs]?.status as SectionStatus) || 'pending';
              return (
                <div key={s.key} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 dark:text-slate-500">{s.icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                      {statusLabel[sectionStatus]}
                    </span>
                    {statusIcon(sectionStatus)}
                  </div>
                </div>
              );
            })}
          </div>

          {!isApproved && (
            <Button
              className="w-full justify-center"
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/employee/onboarding')}
            >
              {completedSections === 0 ? 'Start Onboarding' : 'Continue Onboarding'}
            </Button>
          )}
        </div>

        {/* Account info — 1/3 */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 className="section-title">Account</h3>

            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 select-none">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 pt-1 border-t border-slate-50 dark:border-slate-700/50">
              {profile?.employeeId && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                    Employee ID
                  </p>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {profile.employeeId}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">
                  Email
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="card space-y-1 p-4">
            <h3 className="section-title mb-3">Quick Links</h3>
            {[
              { icon: <ClipboardList className="w-3.5 h-3.5" />, label: 'Onboarding Form', path: '/employee/onboarding' },
              { icon: <Clock         className="w-3.5 h-3.5" />, label: 'My Leaves',        path: '/employee/leaves' },
              { icon: <User          className="w-3.5 h-3.5" />, label: 'My Profile',       path: '/employee/profile' },
            ].map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-150 text-left"
              >
                <span className="text-slate-400 dark:text-slate-500">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
