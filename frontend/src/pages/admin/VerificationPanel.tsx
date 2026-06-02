import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft, User, BookOpen, CreditCard, FileText,
  CheckCircle, XCircle, Send, Eye, Loader2,
  Banknote,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminApi } from '../../services/api';
import { Button, Modal, Spinner, Alert } from '../../components/common/UI';
import { SectionStatusBadge, OverallStatusBadge } from '../../components/common/StatusBadge';
import type { SectionStatus } from '../../types';

const verifySchema = z.object({
  action:   z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});
type VerifyForm = z.infer<typeof verifySchema>;

// ── Detail Row ────────────────────────────────────────────────────────────
const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

const joinValues = (...values: Array<string | number | undefined | null>) => {
  const parts = values.filter(hasDisplayValue).map(String);
  return parts.length ? parts.join(', ') : undefined;
};

const formatDateValue = (value?: string | Date) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : format(date, 'dd MMM yyyy');
};

const DetailRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex gap-2 py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 w-44 flex-shrink-0">{label}</span>
    <span className="text-sm text-slate-700 font-medium">{hasDisplayValue(value) ? value : '—'}</span>
  </div>
);

const primaryEducation = (educationDetails: any) => {
  if (Array.isArray(educationDetails)) return educationDetails[0] || {};
  return educationDetails || {};
};

// ── Section verification modal ────────────────────────────────────────────
const VerifyModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  section: string; profileId: string; onSuccess: () => void;
}> = ({ isOpen, onClose, section, profileId, onSuccess }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
  });
  const action = watch('action');

  const mutation = useMutation({
    mutationFn: (data: VerifyForm) => adminApi.verifySection(profileId, section, data),
    onSuccess: () => { toast.success(`Section ${action}!`); onSuccess(); onClose(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Action failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={`Verify — ${section.charAt(0).toUpperCase() + section.slice(1)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={action === 'approved' ? 'success' : 'danger'}
            onClick={handleSubmit((d) => mutation.mutate(d))} loading={mutation.isPending}>
            Confirm {action === 'approved' ? 'Approval' : 'Rejection'}
          </Button>
        </>
      }>
      <form className="space-y-4">
        <div>
          <p className="form-label">Decision <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            {['approved','rejected'].map((v) => (
              <label key={v} className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all
                ${action === v
                  ? v === 'approved' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" value={v} {...register('action')} className="hidden" />
                {v === 'approved'
                  ? <CheckCircle className={`w-5 h-5 ${action === 'approved' ? 'text-emerald-500' : 'text-slate-300'}`} />
                  : <XCircle    className={`w-5 h-5 ${action === 'rejected' ? 'text-red-500'     : 'text-slate-300'}`} />}
                <div>
                  <p className="text-sm font-semibold text-slate-700 capitalize">{v}</p>
                  <p className="text-xs text-slate-400">{v === 'approved' ? 'Section verified' : 'Needs correction'}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.action && <p className="form-error">Please select a decision</p>}
        </div>
        <div>
          <label className="form-label">Comments {action === 'rejected' && <span className="text-red-500">*</span>}</label>
          <textarea className="form-input resize-none h-24"
            placeholder={action === 'rejected' ? 'Explain what needs correction...' : 'Optional feedback...'}
            {...register('comments')} />
        </div>
      </form>
    </Modal>
  );
};

// ── Document preview + per-doc verify ────────────────────────────────────
const DocumentReviewRow: React.FC<{
  docKey:     string;
  label:      string;
  required:   boolean;
  doc?:       any;
  docStatus?: any;
  profileId:  string;
  onRefresh:  () => void;
}> = ({ docKey, label, required, doc, docStatus, profileId, onRefresh }) => {
  const [showModal, setModal]   = useState(false);
  const [action, setAction]     = useState<'approved'|'rejected'>('approved');
  const [comment, setComment]   = useState('');

  const viewedAt = docStatus?.viewedAt;

  // Mark viewed
  const viewMutation = useMutation({
    mutationFn: () => adminApi.markDocumentViewed(profileId, docKey),
    onSuccess:  onRefresh,
  });

  // Verify document
  const verifyMutation = useMutation({
    mutationFn: () => adminApi.verifyDocument(profileId, { docType: docKey, action, comments: comment }),
    onSuccess: () => {
      toast.success(`${label} ${action}!`);
      setModal(false);
      onRefresh();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Action failed'),
  });

  const handleView = () => {
    if (doc?.fileUrl) {
      window.open(doc.fileUrl, '_blank');
      if (!viewedAt) viewMutation.mutate();
    }
  };

  const statusColor = docStatus?.status === 'approved'
    ? 'border-emerald-200 bg-emerald-50'
    : docStatus?.status === 'rejected'
    ? 'border-red-200 bg-red-50'
    : 'border-slate-200';

  return (
    <div className={`border rounded-xl p-4 ${statusColor}`}>
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {label} {required && <span className="text-red-500">*</span>}
          </p>
          {!doc && <p className="text-xs text-slate-400 mt-0.5">Not uploaded</p>}
          {docStatus?.status === 'rejected' && docStatus?.comments && (
            <p className="text-xs text-red-600 mt-0.5">Reason: {docStatus.comments}</p>
          )}
        </div>

        {doc && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* FIX: view button — must view before approve/reject */}
            <Button size="sm" variant="secondary" icon={<Eye className="w-3.5 h-3.5" />} onClick={handleView}>
              {viewMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'View'}
            </Button>

            {/* FIX: approve/reject enabled only after viewing */}
            {docStatus?.status !== 'approved' && (
              <Button size="sm" variant="success"
                disabled={!viewedAt}
                title={!viewedAt ? 'View document first' : ''}
                onClick={() => { setAction('approved'); setModal(true); }}
                icon={<CheckCircle className="w-3.5 h-3.5" />}>
                Approve
              </Button>
            )}
            {docStatus?.status !== 'rejected' && (
              <Button size="sm" variant="danger"
                disabled={!viewedAt}
                title={!viewedAt ? 'View document first' : ''}
                onClick={() => { setAction('rejected'); setModal(true); }}
                icon={<XCircle className="w-3.5 h-3.5" />}>
                Reject
              </Button>
            )}

            {docStatus?.status === 'approved' && (
              <span className="text-xs font-semibold text-emerald-600">✓ Approved</span>
            )}
            {docStatus?.status === 'rejected' && (
              <span className="text-xs font-semibold text-red-600">✗ Rejected</span>
            )}
          </div>
        )}
        
        {!doc && required && (
          <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-0">
             <Button size="sm" variant="danger"
                onClick={() => { setAction('rejected'); setModal(true); }}
                icon={<XCircle className="w-3.5 h-3.5" />}>
                Request Upload
              </Button>
          </div>
        )}
      </div>

      {doc && !viewedAt && (
        <p className="text-xs text-amber-600 mt-2">
          ⚠ View the document before approving or rejecting.
        </p>
      )}

      {/* Confirm modal */}
      <Modal isOpen={showModal} onClose={() => setModal(false)}
        title={`${action === 'approved' ? 'Approve' : 'Reject'} — ${label}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant={action === 'approved' ? 'success' : 'danger'}
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}>
              Confirm
            </Button>
          </>
        }>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {action === 'approved'
              ? `You are approving the ${label}. This cannot be undone.`
              : !doc 
                ? `You are requesting the upload of ${label}. Please provide instructions.`
                : `You are rejecting the ${label}. Please provide a reason.`}
          </p>
          {action === 'rejected' && (
            <div>
              <label className="form-label">Reason <span className="text-red-500">*</span></label>
              <textarea className="form-input resize-none h-20"
                placeholder="Explain the issue..."
                value={comment}
                onChange={(e) => setComment(e.target.value)} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

// ── Section Panel ─────────────────────────────────────────────────────────
const SectionPanel: React.FC<{
  title: string; icon: React.ReactNode; status: SectionStatus;
  comments?: string; children: React.ReactNode;
  onVerify: () => void; canVerify: boolean;
}> = ({ title, icon, status, comments, children, onVerify, canVerify }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700">
        <span className="text-slate-400">{icon}</span>{title}
      </h3>
      <div className="flex items-center gap-2">
        <SectionStatusBadge status={status} />
        {canVerify && ['submitted','under_review'].includes(status) && (
          <Button size="sm" onClick={onVerify}>Verify Section</Button>
        )}
      </div>
    </div>
    {comments && status === 'rejected' && (
      <Alert type="error" message={`Rejection reason: ${comments}`} className="mb-4" />
    )}
    {children}
  </div>
);

// ── Main VerificationPanel ────────────────────────────────────────────────
export const VerificationPanel: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [verifyModal, setVerifyModal] = useState<string | null>(null);
  const [fixedPayInput, setFixedPayInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminEmployee', profileId],
    queryFn:  () => adminApi.getEmployeeDetail(profileId!).then((r) => r.data.data),
    enabled:  !!profileId,
  });

  const forwardMutation = useMutation({
    mutationFn: () => adminApi.forwardToSuperAdmin(profileId!),
    onSuccess:  () => {
      toast.success('Profile forwarded to Super Admin!');
      queryClient.invalidateQueries({ queryKey: ['adminEmployee', profileId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Forward failed'),
  });

  const fixedPayMutation = useMutation({
    mutationFn: (fixedPay: number) => adminApi.updateFixedPay(profileId!, fixedPay),
    onSuccess: () => {
      toast.success('Fixed pay sent for Super Admin approval.');
      queryClient.invalidateQueries({ queryKey: ['adminEmployee', profileId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fixed pay update failed'),
  });

  useEffect(() => {
    const amount = (data?.profile as any)?.fixedPay?.amount;
    if (amount) setFixedPayInput(String(amount));
  }, [data?.profile?._id, (data?.profile as any)?.fixedPay?.amount]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data)     return <div className="text-center py-20 text-slate-500">Profile not found.</div>;

  const { profile, documents, logs } = data;
  const emp = profile.userId as any;
  const vs  = profile.verificationStatus;
  const pd  = profile.personalDetails;
  const ed  = profile.educationDetails;
  const edu = primaryEducation(ed);
  const cd  = (profile as any).careerDetails || {};
  const bd  = profile.bankDetails;

  const allApproved = ['personal','education','bank','documents'].every(
    (s) => vs[s as keyof typeof vs]?.status === 'approved'
  );
  const assignmentComplete = Boolean(profile.department && profile.position);
  const canForward = allApproved &&
    ['under_review', 'admin_approved'].includes(profile.overallStatus) &&
    assignmentComplete &&
    Boolean((profile as any).fixedPay?.amount);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminEmployee', profileId] });

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/admin/employees')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Employees
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">{emp?.firstName} {emp?.lastName}</h1>
            <p className="text-slate-500 text-sm">{emp?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <OverallStatusBadge status={profile.overallStatus} />
            {canForward && (
              <Button icon={<Send className="w-4 h-4" />} variant="success"
                onClick={() => forwardMutation.mutate()} loading={forwardMutation.isPending}>
                Forward to Super Admin
              </Button>
            )}
          </div>
        </div>
      </div>

      {allApproved && !assignmentComplete && (
        <Alert
          type="warning"
          title="Department and position required"
          message="Assign the employee's department and confirmed position before forwarding to Super Admin."
        />
      )}

      {allApproved && assignmentComplete && !(profile as any).fixedPay?.amount && (
        <Alert
          type="warning"
          title="Fixed pay required"
          message="Enter the fixed pay proposal before forwarding to Super Admin."
        />
      )}

      <div className="card">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-4">
          <span className="text-slate-400"><Building2 className="w-4 h-4" /></span>
          Employment Assignment
        </h3>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Applied Position" value={profile.appliedPosition || cd?.appliedPosition} />
          <DetailRow label="Confirmed Department" value={profile.department} />
          <DetailRow label="Confirmed Position" value={profile.position} />
          <DetailRow label="Career Type" value={cd?.type} />
        </div>
      </div>

      <div className="card">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-4">
          <span className="text-slate-400"><Banknote className="w-4 h-4" /></span>
          Fixed Pay Approval
        </h3>
        <div className="grid md:grid-cols-2 gap-4 items-end">
          <DetailRow label="Proposed Fixed Pay" value={(profile as any).fixedPay?.amount ? `Rs. ${(profile as any).fixedPay.amount}` : undefined} />
          <DetailRow label="Approval Status" value={(profile as any).fixedPay?.status} />
          <div className="md:col-span-2 flex gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={fixedPayInput}
              placeholder="Monthly fixed pay"
              className="form-input max-w-xs"
              onChange={(event) => setFixedPayInput(event.currentTarget.value)}
            />
            <Button
              variant="secondary"
              loading={fixedPayMutation.isPending}
              onClick={() => fixedPayMutation.mutate(Number(fixedPayInput || 0))}
            >
              Send for Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Personal */}
      <SectionPanel title="Personal Details" icon={<User className="w-4 h-4" />}
        status={vs.personal?.status as SectionStatus}
        comments={vs.personal?.comments} canVerify onVerify={() => setVerifyModal('personal')}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Full Name"       value={joinValues(pd?.firstName, pd?.lastName)?.replace(', ', ' ')} />
          <DetailRow label="Date of Birth"   value={formatDateValue(pd?.dateOfBirth)} />
          <DetailRow label="Gender"          value={pd?.gender} />
          <DetailRow label="Blood Group"     value={pd?.bloodGroup} />
          <DetailRow label="Mobile"          value={pd?.mobile} />
          <DetailRow label="Aadhaar Number"  value={pd?.aadhaarNumber} />
          <DetailRow label="PAN Number"      value={pd?.panNumber} />
          <DetailRow label="City / District / State" value={joinValues(pd?.address?.city, pd?.address?.district, pd?.address?.state)} />
          <DetailRow label="Emergency Contact" value={pd?.emergencyContact?.name} />
          <DetailRow label="Emergency Mobile"  value={pd?.emergencyContact?.mobile} />
        </div>
      </SectionPanel>

      {/* Education */}
      <SectionPanel title="Education & Career" icon={<BookOpen className="w-4 h-4" />}
        status={vs.education?.status as SectionStatus}
        comments={vs.education?.comments} canVerify onVerify={() => setVerifyModal('education')}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Education Level"   value={edu?.level || edu?.educationLevel} />
          <DetailRow label="Degree"            value={edu?.degree || edu?.highestDegree} />
          <DetailRow label="Specialization"    value={edu?.specialization} />
          <DetailRow label="Institution"       value={edu?.institution || edu?.collegeName} />
          <DetailRow label="University"        value={edu?.university} />
          <DetailRow label="Year of Passing"   value={edu?.yearOfPassing} />
          <DetailRow label="Percentage"        value={edu?.percentage ? `${edu.percentage}%` : undefined} />
          <DetailRow label="CGPA"              value={edu?.cgpa ? `${edu.cgpa}/10` : undefined} />
          <DetailRow label="Previous Employer" value={cd?.companyName} />
          <DetailRow label="Previous Position" value={cd?.position} />
          <DetailRow label="Expected CTC"      value={cd?.expectedCTC ? `Rs. ${cd.expectedCTC} LPA` : undefined} />
          <DetailRow label="Notice Period"     value={cd?.noticePeriod} />
          <DetailRow label="Skills"            value={Array.isArray(cd?.skills) ? cd.skills.join(', ') : undefined} />
        </div>
      </SectionPanel>

      {/* Bank */}
      <SectionPanel title="Bank Details" icon={<CreditCard className="w-4 h-4" />}
        status={vs.bank?.status as SectionStatus}
        comments={vs.bank?.comments} canVerify onVerify={() => setVerifyModal('bank')}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Account Holder"  value={bd?.accountHolderName} />
          <DetailRow label="Account Number"  value={bd?.accountNumber} />
          <DetailRow label="IFSC Code"       value={bd?.ifscCode} />
          <DetailRow label="Bank Name"       value={bd?.bankName} />
          <DetailRow label="Branch"          value={bd?.branchName} />
          <DetailRow label="Account Type"    value={bd?.accountType} />
        </div>
      </SectionPanel>

      {/* Documents — FIX: per-doc preview + approve/reject */}
      <SectionPanel title="Documents" icon={<FileText className="w-4 h-4" />}
        status={vs.documents?.status as SectionStatus}
        comments={vs.documents?.comments} canVerify={false} onVerify={() => {}}>
        <p className="text-xs text-slate-400 mb-4">
          View each document before approving or rejecting. All required documents must be approved to proceed.
        </p>
        <div className="space-y-3">
          {[
            { key: 'aadhaar',  label: 'Aadhaar Card',  required: true  },
            { key: 'pan',      label: 'PAN Card',       required: true  },
            { key: 'passbook', label: 'Bank Passbook',  required: true  },
            { key: 'passport', label: 'Passport',       required: false },
            { key: 'resume',   label: 'Resume',        required: true  },
          ].map(({ key, label, required }) => (
            <DocumentReviewRow
              key={key}
              docKey={key}
              label={label}
              required={required}
              doc={documents?.[key as keyof typeof documents]}
              docStatus={documents?.[`${key}Status` as keyof typeof documents]}
              profileId={profileId!}
              onRefresh={refresh}
            />
          ))}
        </div>
      </SectionPanel>

      {/* Audit trail */}
      {logs && logs.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Audit Trail</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log._id} className="flex gap-3 items-start">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  log.action.includes('approved') ? 'bg-emerald-500'
                  : log.action.includes('rejected') ? 'bg-red-500'
                  : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {log.section} — {log.action.replace(/_/g, ' ')}
                    </p>
                    <span className="text-xs text-slate-400">
                      by {log.verifiedBy?.firstName} {log.verifiedBy?.lastName}
                    </span>
                  </div>
                  {log.comments && <p className="text-xs text-slate-500 mt-0.5 italic">"{log.comments}"</p>}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section verify modal */}
      {verifyModal && (
        <VerifyModal isOpen={!!verifyModal} onClose={() => setVerifyModal(null)}
          section={verifyModal} profileId={profileId!}
          onSuccess={refresh} />
      )}
    </div>
  );
};
