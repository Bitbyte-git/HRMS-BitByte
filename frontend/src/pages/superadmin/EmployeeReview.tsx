import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banknote, Building2, ChevronLeft, User, BookOpen, CreditCard, FileText, CheckCircle, XCircle, Trophy, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { superAdminApi } from '../../services/api';
import { Button, Modal, Spinner, Alert } from '../../components/common/UI';
import { OverallStatusBadge, SectionStatusBadge } from '../../components/common/StatusBadge';
import type { DocVerification, DocumentFile, SectionStatus } from '../../types';

const reviewSchema = z.object({
  action:   z.enum(['approved', 'rejected']),
  comments: z.string().optional(),
});
type ReviewForm = z.infer<typeof reviewSchema>;

const DetailRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex gap-2 py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 w-44 flex-shrink-0">{label}</span>
    <span className="text-sm text-slate-700 font-medium">{value ?? '—'}</span>
  </div>
);

const documentStatusClasses = (status?: DocVerification['status']) => {
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-500';
};

const DocumentPreview: React.FC<{
  label: string;
  doc?: DocumentFile;
  status?: DocVerification;
  compact?: boolean;
}> = ({ label, doc, status, compact = false }) => (
  <div className={`mt-2 rounded-lg border ${compact ? 'p-3' : 'p-4'} ${documentStatusClasses(status?.status)}`}>
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-700 truncate">
          {doc?.originalName || doc?.fileName || 'Not uploaded'}
        </p>
        {status?.status && (
          <p className="text-xs capitalize mt-0.5">{status.status}</p>
        )}
        {status?.status === 'rejected' && status.comments && (
          <p className="text-xs text-red-600 mt-1">Reason: {status.comments}</p>
        )}
      </div>
      {doc?.fileUrl ? (
        <a href={doc.fileUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline flex-shrink-0">
          <Eye className="w-3.5 h-3.5" /> View
        </a>
      ) : (
        <span className="text-xs text-slate-400 flex-shrink-0">Missing</span>
      )}
    </div>
  </div>
);

const DetailWithDocument: React.FC<{
  label: string;
  value?: string | number;
  documentLabel: string;
  doc?: DocumentFile;
  status?: DocVerification;
}> = ({ label, value, documentLabel, doc, status }) => (
  <div>
    <DetailRow label={label} value={value} />
    <DocumentPreview label={documentLabel} doc={doc} status={status} compact />
  </div>
);

const primaryEducation = (educationDetails: any) => {
  if (Array.isArray(educationDetails)) return educationDetails[0] || {};
  return educationDetails || {};
};

const personLabel = (person: any) => {
  if (!person) return undefined;
  if (typeof person === 'string') return person;
  return `${person.firstName || ''} ${person.lastName || ''}${person.role ? ` (${person.role})` : ''}`.trim();
};

const SectionBlock: React.FC<{
  title: string; icon: React.ReactNode; status: SectionStatus; children: React.ReactNode;
}> = ({ title, icon, status, children }) => (
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700">
        <span className="text-slate-400">{icon}</span>{title}
      </h3>
      <SectionStatusBadge status={status} />
    </div>
    {children}
  </div>
);

const FinalReviewModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  profileId: string; employeeName: string; onSuccess: () => void;
}> = ({ isOpen, onClose, profileId, employeeName, onSuccess }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
  });
  const action = watch('action');

  const mutation = useMutation({
    mutationFn: (data: ReviewForm) => superAdminApi.finalReview(profileId, data),
    onSuccess: res => {
      const employeeId = res.data.data?.employeeId;
      if (employeeId) toast.success(`🎉 Approved! Employee ID: ${employeeId}`);
      else            toast.success('Application rejected.');
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Action failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Final Decision — ${employeeName}`} size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={action === 'approved' ? 'success' : 'danger'} loading={mutation.isPending}
            onClick={handleSubmit(d => mutation.mutate(d))}>
            {action === 'approved' ? '✓ Approve & Generate ID' : '✗ Reject Application'}
          </Button>
        </>
      }>
      <form className="space-y-5">
        <div>
          <p className="form-label">Final Decision <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            {(['approved','rejected'] as const).map(v => (
              <label key={v} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all
                ${action === v
                  ? v === 'approved' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" value={v} className="hidden" {...register('action')} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                  ${action === v ? v === 'approved' ? 'bg-emerald-500' : 'bg-red-500' : 'bg-slate-100'}`}>
                  {v === 'approved'
                    ? <CheckCircle className={`w-5 h-5 ${action==='approved'?'text-white':'text-slate-300'}`}/>
                    : <XCircle    className={`w-5 h-5 ${action==='rejected'?'text-white':'text-slate-300'}`}/>}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{v === 'approved' ? 'Approve' : 'Reject'}</p>
                  <p className="text-xs text-slate-400">{v === 'approved' ? 'Generate Employee ID' : 'Notify employee'}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.action && <p className="form-error">Please select a decision</p>}
        </div>
        <div>
          <label className="form-label">
            Feedback / Comments {action === 'rejected' && <span className="text-red-500">*</span>}
          </label>
          <textarea className="form-input resize-none h-28"
            placeholder={action === 'approved' ? 'Optional welcome note...' : 'Explain the reason (will be emailed to employee)...'}
            {...register('comments')} />
          {action === 'approved' && (
            <p className="text-xs text-emerald-600 mt-1">
              ✓ A unique Employee ID (EMP-YYYY-XXXX) will be auto-generated and emailed to the employee.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export const EmployeeReview: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['superAdminEmployee', profileId],
    queryFn:  () => superAdminApi.getEmployeeDetail(profileId!).then(r => r.data.data),
    enabled:  !!profileId,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-500">Profile not found.</div>;

  const { profile, documents, logs } = data;
  const emp = profile.userId as any;
  const vs  = profile.verificationStatus;
  const pd  = profile.personalDetails;
  const ed  = profile.educationDetails;
  const edu = primaryEducation(ed);
  const cd  = (profile as any).careerDetails || {};
  const bd  = profile.bankDetails;
  const canReview = ['under_super_admin_review', 'admin_approved', 'under_review'].includes(profile.overallStatus);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['superAdminEmployee', profileId] });
    queryClient.invalidateQueries({ queryKey: ['superAdminPending'] });
    queryClient.invalidateQueries({ queryKey: ['superAdminDashboard'] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">{emp?.firstName} {emp?.lastName}</h1>
            <p className="text-slate-500 text-sm">{emp?.email}</p>
            {profile.employeeId && (
              <p className="text-emerald-600 font-bold font-mono text-lg mt-1">{profile.employeeId}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <OverallStatusBadge status={profile.overallStatus} />
            {canReview && (
              <Button onClick={() => setShowModal(true)} icon={<CheckCircle className="w-4 h-4" />}>
                Make Final Decision
              </Button>
            )}
          </div>
        </div>
      </div>

      {profile.overallStatus === 'approved' && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white flex items-center gap-4">
          <Trophy className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="font-bold">Application Approved</p>
            <p className="text-emerald-100 text-sm">
              Employee ID: <span className="font-mono font-bold">{profile.employeeId}</span>
            </p>
            <p className="text-emerald-100 text-xs mt-1">
              Approved by {personLabel(profile.superAdminReview?.reviewedBy) || 'Super Admin'}
              {profile.superAdminReview?.reviewedAt ? ` on ${format(new Date(profile.superAdminReview.reviewedAt), 'dd MMM yyyy, hh:mm a')}` : ''}
            </p>
            {profile.superAdminReview?.comments && (
              <p className="text-emerald-100 text-xs mt-1">{profile.superAdminReview.comments}</p>
            )}
          </div>
        </div>
      )}

      {profile.overallStatus === 'rejected' && (
        <Alert type="error" title="Application Rejected"
          message={profile.superAdminReview?.comments || 'Application was rejected.'} />
      )}

      {/* Section summary cards */}
      <div className="grid md:grid-cols-4 gap-3">
        {[
          { key:'personal',  label:'Personal',  icon:<User       className="w-4 h-4"/> },
          { key:'education', label:'Education', icon:<BookOpen   className="w-4 h-4"/> },
          { key:'bank',      label:'Bank',      icon:<CreditCard className="w-4 h-4"/> },
          { key:'documents', label:'Documents', icon:<FileText   className="w-4 h-4"/> },
        ].map(({ key, label, icon }) => (
          <div key={key} className="card text-center py-4">
            <div className="flex justify-center mb-2 text-slate-400">{icon}</div>
            <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
            <SectionStatusBadge status={(vs[key as keyof typeof vs]?.status as SectionStatus) || 'pending'} />
          </div>
        ))}
      </div>

      {/* Personal */}
      <SectionBlock title="Employment Assignment" icon={<Building2 className="w-4 h-4"/>}
        status={(vs.education?.status as SectionStatus) || 'pending'}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Applied Position" value={profile.appliedPosition || cd?.appliedPosition} />
          <DetailRow label="Confirmed Department" value={profile.department} />
          <DetailRow label="Confirmed Position" value={profile.position} />
          <DetailRow label="Career Type" value={cd?.type} />
          <DetailRow label="Forwarded By" value={personLabel(profile.forwardedBy)} />
          <DetailRow label="Forwarded At" value={profile.forwardedAt ? format(new Date(profile.forwardedAt), 'dd MMM yyyy, hh:mm a') : undefined} />
        </div>
      </SectionBlock>

      <SectionBlock title="Fixed Pay Approval" icon={<Banknote className="w-4 h-4"/>}
        status={((profile as any).fixedPay?.status === 'approved' ? 'approved' : 'pending') as SectionStatus}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Fixed Pay" value={(profile as any).fixedPay?.amount ? `₹${(profile as any).fixedPay.amount}` : undefined} />
          <DetailRow label="Status" value={(profile as any).fixedPay?.status} />
          <DetailRow label="Proposed By" value={personLabel((profile as any).fixedPay?.proposedBy)} />
          <DetailRow label="Proposed At" value={(profile as any).fixedPay?.proposedAt ? format(new Date((profile as any).fixedPay.proposedAt),'dd MMM yyyy, hh:mm a') : undefined} />
          <DetailRow label="Approved By" value={personLabel((profile as any).fixedPay?.approvedBy || profile.superAdminReview?.reviewedBy)} />
          <DetailRow label="Approved At" value={(profile as any).fixedPay?.approvedAt ? format(new Date((profile as any).fixedPay.approvedAt),'dd MMM yyyy, hh:mm a') : undefined} />
        </div>
      </SectionBlock>

      {/* Personal */}
      <SectionBlock title="Personal Details" icon={<User className="w-4 h-4"/>}
        status={(vs.personal?.status as SectionStatus) || 'pending'}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Full Name"       value={`${pd?.firstName||''} ${pd?.lastName||''}`} />
          <DetailRow label="Date of Birth"   value={pd?.dateOfBirth ? format(new Date(pd.dateOfBirth),'dd MMM yyyy') : undefined} />
          <DetailRow label="Gender"          value={pd?.gender} />
          <DetailRow label="Blood Group"     value={pd?.bloodGroup} />
          <DetailRow label="Mobile"          value={pd?.mobile} />
          <DetailWithDocument
            label="Aadhaar Number"
            value={pd?.aadhaarNumber}
            documentLabel="Aadhaar Card"
            doc={documents?.aadhaar}
            status={documents?.aadhaarStatus}
          />
          <DetailWithDocument
            label="PAN Number"
            value={pd?.panNumber}
            documentLabel="PAN Card"
            doc={documents?.pan}
            status={documents?.panStatus}
          />
          <DetailRow label="Address"         value={pd?.address ? `${pd.address.city}, ${pd.address.district || ''}, ${pd.address.state} - ${pd.address.pincode}` : undefined} />
          <DetailRow label="Emergency Contact" value={pd?.emergencyContact?.name} />
          <DetailRow label="Emergency Mobile"  value={pd?.emergencyContact?.mobile} />
        </div>
      </SectionBlock>

      {/* Education */}
      <SectionBlock title="Education & Career" icon={<BookOpen className="w-4 h-4"/>}
        status={(vs.education?.status as SectionStatus) || 'pending'}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Education Level"  value={edu?.level || edu?.educationLevel} />
          <DetailRow label="Degree"           value={edu?.degree || edu?.highestDegree} />
          <DetailRow label="Specialization"   value={edu?.specialization} />
          <DetailRow label="Institution"      value={edu?.institution || edu?.collegeName} />
          <DetailRow label="University"       value={edu?.university} />
          <DetailRow label="Year of Passing"  value={edu?.yearOfPassing} />
          <DetailRow label="Percentage"       value={edu?.percentage ? `${edu.percentage}%` : undefined} />
          <DetailRow label="CGPA"             value={edu?.cgpa ? `${edu.cgpa}/10` : undefined} />
          <DetailRow label="Previous Employer" value={cd?.companyName} />
          <DetailRow label="Previous Position" value={cd?.position} />
          <DetailRow label="Expected CTC"     value={cd?.expectedCTC ? `₹${cd.expectedCTC} LPA` : undefined} />
          <DetailRow label="Notice Period"    value={cd?.noticePeriod} />
          <DetailRow label="Skills"           value={Array.isArray(cd?.skills) ? cd.skills.join(', ') : undefined} />
        </div>
      </SectionBlock>

      {/* Bank */}
      <SectionBlock title="Bank Details" icon={<CreditCard className="w-4 h-4"/>}
        status={(vs.bank?.status as SectionStatus) || 'pending'}>
        <div className="grid md:grid-cols-2 gap-x-8">
          <DetailRow label="Account Holder"  value={bd?.accountHolderName} />
          <DetailRow label="Account Number"  value={bd?.accountNumber} />
          <DetailRow label="IFSC Code"       value={bd?.ifscCode} />
          <DetailRow label="Bank Name"       value={bd?.bankName} />
          <DetailRow label="Branch"          value={bd?.branchName} />
          <DetailRow label="Account Type"    value={bd?.accountType} />
          <div className="md:col-span-2">
            <DocumentPreview
              label="Bank Passbook"
              doc={documents?.passbook}
              status={documents?.passbookStatus}
            />
          </div>
        </div>
      </SectionBlock>

      {/* Resume */}
      <SectionBlock title="Resume" icon={<FileText className="w-4 h-4"/>}
        status={(vs.documents?.status as SectionStatus) || 'pending'}>
        <DocumentPreview
          label="Resume"
          doc={documents?.resume}
          status={documents?.resumeStatus}
        />
      </SectionBlock>

      {/* Audit trail */}
      {logs && logs.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Audit Trail</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log._id} className="flex gap-3 items-start">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0
                  ${log.action.includes('approved')||log.action==='final_approved' ? 'bg-emerald-500'
                  : log.action.includes('rejected')||log.action==='final_rejected'  ? 'bg-red-500'
                  : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-700 capitalize">
                      {log.section} — {log.action.replace(/_/g,' ')}
                    </p>
                    <span className="text-xs text-slate-400">
                      by {log.verifiedBy?.firstName} {log.verifiedBy?.lastName} ({log.verifierRole})
                    </span>
                  </div>
                  {log.comments && <p className="text-xs text-slate-500 mt-0.5 italic">"{log.comments}"</p>}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(log.createdAt),'dd MMM yyyy, hh:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <FinalReviewModal isOpen={showModal} onClose={() => setShowModal(false)}
          profileId={profileId!} employeeName={`${emp?.firstName} ${emp?.lastName}`}
          onSuccess={refresh} />
      )}
    </div>
  );
};
