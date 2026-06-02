import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, User, BookOpen, CreditCard, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { employeeApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { Spinner } from '../../components/common/UI';
import { OverallStatusBadge, SectionStatusBadge } from '../../components/common/StatusBadge';
import type { SectionStatus } from '../../types';

const DetailRow: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex gap-2 py-2 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 w-40 flex-shrink-0">{label}</span>
    <span className="text-sm text-slate-700 font-medium">{value || '—'}</span>
  </div>
);

const primaryEducation = (educationDetails: any) => {
  if (Array.isArray(educationDetails)) return educationDetails[0] || {};
  return educationDetails || {};
};

export const EmployeeProfile: React.FC = () => {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['employeeProfile', user?._id],
    queryFn:  () => employeeApi.getProfile().then(r => r.data.data),
    enabled: !!user?._id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const profile = data?.profile;
  const pd = profile?.personalDetails;
  const ed = primaryEducation(profile?.educationDetails);
  const cd = (profile as any)?.careerDetails || {};
  const bd = profile?.bankDetails;
  const vs = profile?.verificationStatus;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{user?.firstName} {user?.lastName}</h1>
              <OverallStatusBadge status={profile?.overallStatus || 'registered'} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
            {profile?.employeeId && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span className="font-mono font-bold text-emerald-700 text-sm">{profile.employeeId}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'personal',  label: 'Personal',  icon: <User       className="w-4 h-4" /> },
          { key: 'education', label: 'Education', icon: <BookOpen   className="w-4 h-4" /> },
          { key: 'bank',      label: 'Bank',      icon: <CreditCard className="w-4 h-4" /> },
          { key: 'documents', label: 'Documents', icon: <User       className="w-4 h-4" /> },
        ].map(({ key, label, icon }) => (
          <div key={key} className="card text-center py-4">
            <div className="flex justify-center mb-2 text-slate-400">{icon}</div>
            <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
            <SectionStatusBadge status={(vs?.[key as keyof typeof vs]?.status as SectionStatus) || 'pending'} />
          </div>
        ))}
      </div>

      {profile && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-4"><Building2 className="w-4 h-4 text-slate-400" /> Employment</h2>
          <div className="grid md:grid-cols-2 gap-x-8">
            <DetailRow label="Applied Position" value={profile.appliedPosition || cd?.appliedPosition} />
            <DetailRow label="Department" value={profile.department} />
            <DetailRow label="Confirmed Position" value={profile.position} />
            <DetailRow label="Career Type" value={cd?.type} />
          </div>
        </div>
      )}

      {pd && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-4"><User className="w-4 h-4 text-slate-400" /> Personal Details</h2>
          <div className="grid md:grid-cols-2 gap-x-8">
            <DetailRow label="First Name"       value={pd.firstName} />
            <DetailRow label="Last Name"        value={pd.lastName} />
            <DetailRow label="Date of Birth"    value={pd.dateOfBirth ? format(new Date(pd.dateOfBirth),'dd MMM yyyy') : undefined} />
            <DetailRow label="Gender"           value={pd.gender} />
            <DetailRow label="Blood Group"      value={pd.bloodGroup} />
            <DetailRow label="Mobile"           value={pd.mobile} />
            <DetailRow label="Aadhaar Number"   value={pd.aadhaarNumber} />
            <DetailRow label="PAN Number"       value={pd.panNumber} />
            <DetailRow label="City / District / State" value={pd.address ? `${pd.address.city}, ${pd.address.district || ''}, ${pd.address.state}` : undefined} />
            <DetailRow label="Emergency Contact"value={pd.emergencyContact?.name} />
          </div>
        </div>
      )}

      {ed && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4 text-slate-400" /> Education & Career</h2>
          <div className="grid md:grid-cols-2 gap-x-8">
            <DetailRow label="Education Level"  value={ed.level || ed.educationLevel} />
            <DetailRow label="Degree"           value={ed.degree || ed.highestDegree} />
            <DetailRow label="Specialization"   value={ed.specialization} />
            <DetailRow label="Institution"       value={ed.institution || ed.collegeName} />
            <DetailRow label="Year of Passing"  value={ed.yearOfPassing} />
            <DetailRow label="Percentage"       value={ed.percentage ? `${ed.percentage}%` : undefined} />
            <DetailRow label="CGPA"             value={ed.cgpa ? `${ed.cgpa}/10` : undefined} />
            <DetailRow label="Expected CTC"     value={cd?.expectedCTC ? `₹${cd.expectedCTC} LPA` : undefined} />
            <DetailRow label="Notice Period"    value={cd?.noticePeriod} />
            <DetailRow label="Skills"           value={cd?.skills?.join(', ')} />
          </div>
        </div>
      )}

      {bd && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-4"><CreditCard className="w-4 h-4 text-slate-400" /> Bank Details</h2>
          <div className="grid md:grid-cols-2 gap-x-8">
            <DetailRow label="Account Holder" value={bd.accountHolderName} />
            <DetailRow label="Account Number" value={bd.accountNumber} />
            <DetailRow label="IFSC Code"      value={bd.ifscCode} />
            <DetailRow label="Bank Name"      value={bd.bankName} />
            <DetailRow label="Branch"         value={bd.branchName} />
            <DetailRow label="Account Type"   value={bd.accountType} />
          </div>
        </div>
      )}
    </div>
  );
};
