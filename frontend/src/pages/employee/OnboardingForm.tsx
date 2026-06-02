import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  FileText,
  Plus,
  Save, Send,
  Trash2,
  Trophy,
  Upload,
  User
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { SectionStatusBadge } from '../../components/common/StatusBadge';
import { Alert, Button, Input, Modal, Select, Spinner } from '../../components/common/UI';
import { useAuthStore } from '../../context/authStore';
import { employeeApi } from '../../services/api';
import type { SectionStatus } from '../../types';
import stateDistrictData from '../../../States-Dist.json';

// ── Zod schemas ───────────────────────────────────────────────────────────
const ALPHA_SPACE = /^[A-Za-z ]+$/;
const MOBILE_10 = /^\d{10}$/;
const AADHAAR_12 = /^\d{12}$/;
const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PINCODE_6 = /^\d{6}$/;

const addressSchema = z.object({
  houseNo: z.string().min(1, 'Required'),
  flatName: z.string().optional(),
  street: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  district: z.string().min(1, 'Required'),
  pincode: z.string().regex(PINCODE_6, 'Must be 6 digits'),
  country: z.string().default('India'),
});

const personalSchema = z.object({
  firstName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(2, 'Min 2 chars'),
  lastName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(2, 'Min 2 chars'),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Select gender' }),
  bloodGroup: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']),
  mobile: z.string().regex(MOBILE_10, 'Must be 10 digits'),
  alternatePhone: z.string().optional().refine(val => !val || MOBILE_10.test(val), 'Must be 10 digits'),
  aadhaarNumber: z.string().regex(AADHAAR_12, 'Exactly 12 numeric digits'),
  panNumber: z.string().regex(PAN_FORMAT, 'Format: ABCDE1234F').toUpperCase(),
  address: addressSchema,
  permanentAddress: addressSchema,
  sameAsCurrent: z.boolean().default(false),
  emergencyContact: z.object({
    name: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(1, 'Required'),
    relationship: z.enum(['Parent', 'Guardian', 'Friend'], { required_error: 'Required' }),
    mobile: z.string().regex(MOBILE_10, 'Must be 10 digits'),
  }),
});

const educationEntrySchema = z.object({
  level: z.enum(['UG','PG','Diploma','HSC','SSLC'], { required_error: 'Select level' }),
  degree: z.string().optional(),
  specialization: z.string().optional(),
  institution: z.string().min(1, 'Required'),
  yearOfPassing: z.number({ invalid_type_error: 'Required' }).min(1980).max(new Date().getFullYear()),
  percentage: z.number({ invalid_type_error: 'Required' }).min(0).max(100),
  cgpa: z.number({ invalid_type_error: 'Required' }).min(0).max(10),
}).refine(data => {
  if (['UG', 'PG'].includes(data.level)) {
    return !!data.degree && !!data.specialization;
  }
  return true;
}, {
  message: "Degree and specialization required for UG/PG",
  path: ["degree"]
});

const educationSchema = z.object({
  education: z.array(educationEntrySchema).min(1, 'At least one education entry required'),
});

const PREDEFINED_SKILLS = [
  'MERN Developer', 'Python Full Stack', 'Java Full Stack', 'Frontend Developer',
  'Backend Developer', 'Digital Marketing', 'Data Analyst', 'Data Scientist',
  'AI/ML Developer', 'Others'
];

const careerSchema = z.object({
  appliedPosition: z.enum(['Intern', 'Full-time'], { required_error: 'Select applied position' }),
  type: z.enum(['fresher', 'experienced'], { required_error: 'Select career type' }),
  companyName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').optional().or(z.literal('')),
  position: z.string().optional().or(z.literal('')),
  previousCTC: z.number().min(0, 'No negative values').optional(),
  expectedCTC: z.number({ invalid_type_error: 'Required' }).min(0, 'No negative values'),
  noticePeriod: z.string().min(1, 'Required'),
  skills: z.array(z.string()).min(1, 'At least one skill required'),
  customSkills: z.string().optional(),
}).refine(data => {
  if (data.type === 'experienced') {
    return !!data.companyName && !!data.position && data.previousCTC !== undefined;
  }
  return true;
}, {
  message: "Company name, position, and previous CTC required for experienced",
  path: ["companyName"]
}).refine(data => {
  let finalSkills = [...(data.skills || [])].filter((s: string) => s !== 'Others');
  if (data.skills?.includes('Others') && data.customSkills) {
    const custom = data.customSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
    finalSkills = [...finalSkills, ...custom];
  }
  finalSkills = Array.from(new Set(finalSkills));
  return finalSkills.length >= 1 && finalSkills.length <= 5;
}, {
  message: "Maximum 5 Skills only allowed!",
  path: ["skills"]
});

const bankSchema = z.object({
  accountHolderName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(1, 'Required'),
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Valid account number (9–18 digits)'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Valid IFSC required').toUpperCase(),
  bankName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(1, 'Required'),
  branchName: z.string().regex(ALPHA_SPACE, 'Only alphabets & spaces').min(1, 'Required'),
  accountType: z.enum(['savings','current']).default('savings'),
});

const steps = [
  { id: 'personal',   label: 'Personal',   icon: <User      className="w-4 h-4" /> },
  { id: 'education',  label: 'Education',  icon: <BookOpen  className="w-4 h-4" /> },
  { id: 'career',     label: 'Career',     icon: <Briefcase className="w-4 h-4" /> },
  { id: 'bank',       label: 'Bank',       icon: <CreditCard className="w-4 h-4" /> },
  { id: 'documents',  label: 'Documents',  icon: <FileText  className="w-4 h-4" /> },
];

const getLocalDraft = (key: string, userId: string) => {
  try { return JSON.parse(localStorage.getItem(`onboarding_${userId}_${key}`) || 'null'); } catch { return null; }
};
const saveLocalDraft = (key: string, userId: string, value: any) => {
  localStorage.setItem(`onboarding_${userId}_${key}`, JSON.stringify(value));
};

const processCareerData = (data: any) => {
  let finalSkills = [...(data.skills || [])].filter((s: string) => s !== 'Others');
  if (data.skills?.includes('Others') && data.customSkills) {
    const custom = data.customSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
    finalSkills = [...finalSkills, ...custom];
  }
  finalSkills = Array.from(new Set(finalSkills));
  const cleanData = { ...data, skills: finalSkills };
  delete cleanData.customSkills;
  return cleanData;
};

const indianStates = stateDistrictData.states.map(({ state }) => ({ value: state, label: state }));
const getDistrictOptions = (state?: string) =>
  (stateDistrictData.states.find((item) => item.state === state)?.districts || [])
    .map((district) => ({ value: district, label: district }));

const toTitleCase = (value: string) =>
  value
    .replace(/[^A-Za-z ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\B\w/g, (char) => char.toLowerCase());

// ── Stepper ───────────────────────────────────────────────────────────────
const Stepper: React.FC<{ current: number; statuses: SectionStatus[] }> = ({ current, statuses }) => (
  <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
    {steps.map((step, i) => {
      const isActive   = i === current;
      const isDone     = statuses[i] === 'approved';
      const isRejected = statuses[i] === 'rejected';
      return (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center min-w-[60px]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
              ${isDone     ? 'bg-emerald-500 border-emerald-500 text-white'
              : isRejected ? 'bg-red-500 border-red-500 text-white'
              : isActive   ? 'bg-primary-600 border-primary-600 text-white'
              :              'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'}`}>
              {isDone ? '✓' : isRejected ? '✗' : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium truncate ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 min-w-[20px] h-0.5 mx-1 mb-5 ${statuses[i] === 'approved' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const AddressFields: React.FC<{
  prefix: 'address' | 'permanentAddress';
  register: any;
  setValue: any;
  watch: any;
  errors?: any;
  locked: boolean;
}> = ({ prefix, register, setValue, watch, errors, locked }) => {
  const state = watch(`${prefix}.state`);
  const district = watch(`${prefix}.district`);
  const districtOptions = getDistrictOptions(state);

  useEffect(() => {
    if (district && !districtOptions.some((option) => option.value === district)) {
      setValue(`${prefix}.district`, '', { shouldValidate: true });
    }
  }, [district, districtOptions, prefix, setValue]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input label="House No." required disabled={locked} error={errors?.houseNo?.message} {...register(`${prefix}.houseNo`)} />
      <Input label="Flat Name" disabled={locked} error={errors?.flatName?.message} {...register(`${prefix}.flatName`)} />
      <Input label="Street" required disabled={locked} error={errors?.street?.message} {...register(`${prefix}.street`)} />
      <Input label="City" required disabled={locked} error={errors?.city?.message} {...register(`${prefix}.city`)} />
      <Select
        label="State"
        required
        disabled={locked}
        options={indianStates}
        placeholder="Select state"
        error={errors?.state?.message}
        {...register(`${prefix}.state`)}
      />
      <Select
        label="District"
        required
        disabled={locked || !state}
        options={districtOptions}
        placeholder={state ? 'Select district' : 'Select state first'}
        error={errors?.district?.message}
        {...register(`${prefix}.district`)}
      />
      <Input label="Pincode" required disabled={locked} maxLength={6} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} error={errors?.pincode?.message} {...register(`${prefix}.pincode`)} />
    </div>
  );
};

// ── Personal Step ─────────────────────────────────────────────────────────
const PersonalStep: React.FC<{
  defaultValues: any; onSave: (d:any)=>void; onDraft: (d:any)=>void;
  onSubmit: (d:any)=>void; saving: boolean; status: SectionStatus; userId: string;
}> = ({ defaultValues, onSave, onDraft, onSubmit, saving, status, userId }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(personalSchema), defaultValues, mode: 'onChange'
  });
  const locked = status === 'approved';
  const sameAsCurrent = watch('sameAsCurrent');
  const formErrors = errors as any;

  useEffect(() => {
    const sub = watch((value) => saveLocalDraft('personal', userId, value));
    return () => sub.unsubscribe();
  }, [watch, userId]);

  useEffect(() => {
    if (sameAsCurrent) {
      const addr = watch('address');
      setValue('permanentAddress', addr, { shouldValidate: true });
    }
  }, [sameAsCurrent, watch, setValue]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name" required disabled={locked} error={errors.firstName?.message as string}
          {...register('firstName', { onChange: (e) => { e.target.value = toTitleCase(e.target.value); } })} />
        <Input label="Last Name"  required disabled={locked} error={errors.lastName?.message as string}
          {...register('lastName', { onChange: (e) => { e.target.value = toTitleCase(e.target.value); } })} />
        <Input label="Date of Birth" type="date" required disabled={locked} error={errors.dateOfBirth?.message as string} {...register('dateOfBirth')} />
        
        <div>
          <p className="form-label">Gender <span className="text-red-500">*</span></p>
          <div className="flex gap-4 mt-2">
            {['Male','Female','Other'].map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={g} disabled={locked} {...register('gender')} className="accent-primary-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{g}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="form-error">{errors.gender.message as string}</p>}
        </div>

        <Select label="Blood Group" required disabled={locked}
          options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=>({value:v,label:v}))}
          placeholder="Select blood group" error={errors.bloodGroup?.message as string} {...register('bloodGroup')} />
        <Input label="Mobile Number" placeholder="10-digit number" required disabled={locked} error={errors.mobile?.message as string} {...register('mobile')} maxLength={10} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
        <Input label="Alternate Phone" placeholder="10-digit number" disabled={locked} error={errors.alternatePhone?.message as string} {...register('alternatePhone')} maxLength={10} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />

        <Input label="Aadhaar Number" placeholder="12-digit number" required disabled={locked}
          hint="Must be exactly 12 digits" maxLength={12} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
          error={errors.aadhaarNumber?.message as string} {...register('aadhaarNumber')} />

        <Input label="PAN Number" placeholder="ABCDE1234F" required disabled={locked}
          hint="Format: 5 letters, 4 digits, 1 letter" maxLength={10}
          error={errors.panNumber?.message as string}
          {...register('panNumber', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Current Address</h3>
        <AddressFields prefix="address" register={register} setValue={setValue} watch={watch} errors={formErrors.address} locked={locked} />
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" disabled={locked} {...register('sameAsCurrent')} className="accent-primary-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Permanent address same as current</span>
        </label>
      </div>

      {!sameAsCurrent && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Permanent Address</h3>
          <AddressFields prefix="permanentAddress" register={register} setValue={setValue} watch={watch} errors={formErrors.permanentAddress} locked={locked} />
        </div>
      )}

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Name" required disabled={locked} error={formErrors.emergencyContact?.name?.message} {...register('emergencyContact.name')} />
          <Select label="Relationship" required disabled={locked}
            options={['Parent', 'Guardian', 'Friend'].map(v=>({value:v,label:v}))}
            placeholder="Select relationship" error={formErrors.emergencyContact?.relationship?.message} {...register('emergencyContact.relationship')} />
          <Input label="Mobile" required disabled={locked} maxLength={10} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} error={formErrors.emergencyContact?.mobile?.message} {...register('emergencyContact.mobile')} />
        </div>
      </div>

      {!locked && (
        <div className="flex gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={handleSubmit(onDraft)} icon={<Save className="w-4 h-4" />}>Save Draft</Button>
          <Button type="submit" loading={saving} disabled={!isValid} variant="secondary" icon={<Save className="w-4 h-4" />}>Save</Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!isValid} icon={<Send className="w-4 h-4" />}>Submit for Review</Button>
        </div>
      )}
    </form>
  );
};

// ── Education Step ────────────────────────────────────────────────────────
const EducationStep: React.FC<{
  defaultValues: any; onSave: (d:any)=>void; onDraft: (d:any)=>void;
  onSubmit: (d:any)=>void; saving: boolean; status: SectionStatus; userId: string;
}> = ({ defaultValues, onSave, onDraft, onSubmit, saving, status, userId }) => {
  const { register, control, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(educationSchema), 
    defaultValues: { education: defaultValues?.education?.length ? defaultValues.education : [{}] },
    mode: 'onChange'
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'education' });
  const locked = status === 'approved';
  const formErrors = errors as any;

  useEffect(() => {
    const sub = watch((value) => saveLocalDraft('education', userId, value));
    return () => sub.unsubscribe();
  }, [watch, userId]);

  const levels = watch('education')?.map((e: any) => e?.level) || [];

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {fields.map((field, index) => {
        const isUGPG = ['UG', 'PG'].includes(levels[index]);
        return (
          <div key={field.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 relative">
            <h4 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200">Education {index + 1}</h4>
            {!locked && fields.length > 1 && (
              <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Education Level" required disabled={locked}
                options={['UG','PG','Diploma','HSC','SSLC'].map(v=>({value:v,label:v}))}
                placeholder="Select level" error={formErrors.education?.[index]?.level?.message} {...register(`education.${index}.level` as const)} />
              
              {isUGPG && (
                <>
                  <Input label="Degree" required disabled={locked} error={formErrors.education?.[index]?.degree?.message} {...register(`education.${index}.degree` as const)} />
                  <Input label="Specialization" required disabled={locked} error={formErrors.education?.[index]?.specialization?.message} {...register(`education.${index}.specialization` as const)} />
                </>
              )}
              
              <Input label="Institution Name" required disabled={locked} error={formErrors.education?.[index]?.institution?.message} {...register(`education.${index}.institution` as const)} />
              <Input label="Year of Passing" type="number" required disabled={locked} error={formErrors.education?.[index]?.yearOfPassing?.message} {...register(`education.${index}.yearOfPassing` as const, { valueAsNumber: true })} />
              <Input label="Percentage (out of 100)" type="number" step="0.01" min="0" max="100" required disabled={locked} error={formErrors.education?.[index]?.percentage?.message} {...register(`education.${index}.percentage` as const, { valueAsNumber: true })} />
              <Input label="CGPA (out of 10)" type="number" step="0.01" min="0" max="10" required disabled={locked} error={formErrors.education?.[index]?.cgpa?.message} {...register(`education.${index}.cgpa` as const, { valueAsNumber: true })} />
            </div>
          </div>
        );
      })}

      {!locked && (
        <Button type="button" variant="ghost" onClick={() => append({})} icon={<Plus className="w-4 h-4" />}>
          Add More Education
        </Button>
      )}

      {!locked && (
        <div className="flex gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={handleSubmit(onDraft)} icon={<Save className="w-4 h-4" />}>Save Draft</Button>
          <Button type="submit" loading={saving} disabled={!isValid} variant="secondary" icon={<Save className="w-4 h-4" />}>Save</Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!isValid} icon={<Send className="w-4 h-4" />}>Submit for Review</Button>
        </div>
      )}
    </form>
  );
};

// ── Career Step ───────────────────────────────────────────────────────────
const CareerStep: React.FC<{
  defaultValues: any; onSave: (d:any)=>void; onDraft: (d:any)=>void;
  onSubmit: (d:any)=>void; saving: boolean; status: SectionStatus; userId: string;
}> = ({ defaultValues, onSave, onDraft, onSubmit, saving, status, userId }) => {
  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(careerSchema), defaultValues, mode: 'onChange'
  });
  const locked = status === 'approved';
  const { user } = useAuthStore();
  const registrationPosition = user?.role === 'intern' ? 'Intern' : 'Full-time';
  const careerType = watch('type');
  const skillsSelected = watch('skills') || [];
  const customSkillsText = watch('customSkills') || '';

  const totalSkillsCount = (() => {
    let count = skillsSelected.filter((s: string) => s !== 'Others').length;
    if (skillsSelected.includes('Others') && customSkillsText) {
      const custom = customSkillsText.split(',').map((s: string) => s.trim()).filter(Boolean);
      count += Array.from(new Set(custom)).length;
    }
    return count;
  })();

  useEffect(() => {
    const sub = watch((value) => saveLocalDraft('career', userId, value));
    return () => sub.unsubscribe();
  }, [watch, userId]);

  useEffect(() => {
    if (defaultValues?.skills) {
      const custom = defaultValues.skills.filter((s: string) => !PREDEFINED_SKILLS.includes(s));
      if (custom.length) {
        setValue('skills', [...defaultValues.skills, 'Others']);
        setValue('customSkills', custom.join(', '));
      }
    }
  }, [defaultValues, setValue]);

  useEffect(() => {
    if (user?.role === 'intern' || user?.role === 'employee') {
      setValue('appliedPosition', registrationPosition, { shouldValidate: true });
    }
  }, [registrationPosition, setValue, user?.role]);

  return (
    <form onSubmit={handleSubmit((d) => onSave(processCareerData(d)))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Applied Position"
          required
          disabled={locked}
          options={[
            { value: 'Intern', label: 'Intern' },
            { value: 'Full-time', label: 'Full-time' },
          ]}
          placeholder="Select applied position"
          error={errors.appliedPosition?.message as string}
          {...register('appliedPosition')}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2 -mt-2">
          Pulled from registration: {registrationPosition}.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="form-label mb-0">Career Type <span className="text-red-500">*</span></p>
          {user?.role === 'intern' && (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Intern Default</span>
          )}
        </div>
        <div className="flex gap-4 mt-2">
          {['fresher','experienced'].map((t) => {
            const isDisabled = locked || (user?.role === 'intern' && t === 'experienced');
            return (
              <label key={t} className={`flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                <input type="radio" value={t} disabled={isDisabled} {...register('type')} className="accent-primary-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{t}</span>
              </label>
            );
          })}
        </div>
        {user?.role === 'intern' && (
          <p className="text-[10px] text-slate-500 mt-1.5 italic">Note: Interns are considered freshers for onboarding purposes.</p>
        )}
        {errors.type && <p className="form-error">{errors.type.message as string}</p>}
      </div>

      {careerType === 'experienced' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
          <Input label="Previous Company Name" required disabled={locked} error={errors.companyName?.message as string} {...register('companyName')} />
          <Input label="Position" required disabled={locked} error={errors.position?.message as string} {...register('position')} />
          <Input label="Previous CTC (LPA)" type="number" step="0.01" min="0" required disabled={locked} error={errors.previousCTC?.message as string} {...register('previousCTC', { valueAsNumber: true })} />
        </div>
      )}

      {(careerType === 'fresher' || careerType === 'experienced') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Expected CTC (LPA)" type="number" step="0.01" min="0" required disabled={locked} error={errors.expectedCTC?.message as string} {...register('expectedCTC', { valueAsNumber: true })} />
          <Input label="Notice Period" placeholder="e.g. 30 Days, Immediate" required disabled={locked} error={errors.noticePeriod?.message as string} {...register('noticePeriod')} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <p className="form-label">Skills (Maximum 5)<span className="text-red-500">*</span></p>
          <span className="text-xs font-medium text-slate-500">{totalSkillsCount}/5 Skills Selected</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {PREDEFINED_SKILLS.map(skill => {
            const isChecked = skillsSelected.includes(skill);
            const disabled = locked || (!isChecked && totalSkillsCount >= 5);
            return (
              <label key={skill} className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                <input type="checkbox" value={skill} disabled={disabled} {...register('skills')} className="accent-primary-600" />
                <span className="text-sm">{skill}</span>
              </label>
            );
          })}
        </div>
        {errors.skills && <p className="form-error">{errors.skills.message as string}</p>}
        
        {skillsSelected.includes('Others') && (
          <div className="mt-4">
            <Input 
              label="Custom Skills" 
              placeholder="React Native, GraphQL, etc (comma separated)" 
              disabled={locked} 
              {...register('customSkills', {
                onChange: (e) => {
                  const val = e.target.value;
                  const customList = val.split(',').map((s: string) => s.trim()).filter(Boolean);
                  const predefinedCount = skillsSelected.filter((s: string) => s !== 'Others').length;
                  if (predefinedCount + Array.from(new Set(customList)).length > 5) {
                    // Prevent entering more commas if limit reached
                    if (val.endsWith(',')) {
                      e.target.value = val.slice(0, -1);
                    }
                  }
                }
              })} 
            />
          </div>
        )}

        {skillsSelected.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Selected Skills:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set([
                ...skillsSelected.filter((s: string) => s !== 'Others'),
                ...(watch('customSkills')?.split(',').map((s: string) => s.trim()).filter(Boolean) || [])
              ])).map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 text-xs rounded-full font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {!locked && (
        <div className="flex gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={handleSubmit((d) => onDraft(processCareerData(d)))} icon={<Save className="w-4 h-4" />}>Save Draft</Button>
          <Button type="submit" loading={saving} disabled={!isValid} variant="secondary" icon={<Save className="w-4 h-4" />}>Save</Button>
          <Button type="button" onClick={handleSubmit((d) => onSubmit(processCareerData(d)))} disabled={!isValid} icon={<Send className="w-4 h-4" />}>Submit for Review</Button>
        </div>
      )}
    </form>
  );
};

// ── Bank Step ─────────────────────────────────────────────────────────────
const BankStep: React.FC<{
  defaultValues: any; onSave: (d:any)=>void; onDraft: (d:any)=>void;
  onSubmit: (d:any)=>void; saving: boolean; status: SectionStatus; userId: string;
}> = ({ defaultValues, onSave, onDraft, onSubmit, saving, status, userId }) => {
  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(bankSchema), defaultValues, mode: 'onChange'
  });
  const locked = status === 'approved';

  useEffect(() => {
    const sub = watch((value) => saveLocalDraft('bank', userId, value));
    return () => sub.unsubscribe();
  }, [watch, userId]);

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Account Holder Name" required disabled={locked} error={errors.accountHolderName?.message as string} {...register('accountHolderName')} />
        <Input label="Account Number" required disabled={locked} maxLength={18} onInput={(e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} error={errors.accountNumber?.message as string} {...register('accountNumber')} />
        <Input label="IFSC Code" placeholder="SBIN0001234" required disabled={locked} error={errors.ifscCode?.message as string}
          {...register('ifscCode', { onChange: (e) => { e.target.value = e.target.value.toUpperCase(); } })} />
        <Input label="Bank Name" required disabled={locked} error={errors.bankName?.message as string} {...register('bankName')} />
        <Input label="Branch Name" required disabled={locked} error={errors.branchName?.message as string} {...register('branchName')} />
        <Select label="Account Type" disabled={locked}
          options={[{value:'savings',label:'Savings'},{value:'current',label:'Current'}]}
          {...register('accountType')} />
      </div>
      {!locked && (
        <div className="flex gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={handleSubmit(onDraft)} icon={<Save className="w-4 h-4" />}>Save Draft</Button>
          <Button type="submit" loading={saving} disabled={!isValid} variant="secondary" icon={<Save className="w-4 h-4" />}>Save</Button>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!isValid} icon={<Send className="w-4 h-4" />}>Submit for Review</Button>
        </div>
      )}
    </form>
  );
};

// ── Documents Step ────────────────────────────────────────────────────────
const DocumentsStep: React.FC<{
  existingDocs: any; onUpload: (fd: FormData) => void;
  onSubmit: (fd?: FormData) => void; uploading: boolean; submitting: boolean; status: SectionStatus;
}> = ({ existingDocs, onUpload, onSubmit, uploading, submitting, status }) => {
  const [files, setFiles] = useState<Record<string,File|null>>({
    aadhaar: null, pan: null, passbook: null, passport: null, resume: null,
  });
  const locked = status === 'approved';

  const docFields = [
    { key: 'aadhaar',  label: 'Aadhaar Card',  required: true  },
    { key: 'pan',      label: 'PAN Card',       required: true  },
    { key: 'passbook', label: 'Bank Passbook',  required: true  },
    { key: 'passport', label: 'Passport',       required: false },
    { key: 'resume',   label: 'Resume',        required: true  },
  ];

  const handleUpload = () => {
    const fd = new FormData();
    Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
    const hasAny = Object.values(files).some(Boolean);
    if (!hasAny) { toast.error('Please select at least one file to upload'); return; }
    onUpload(fd);
  };

  const handleSubmitDocuments = () => {
    const missing = docFields
      .filter(({ key, required }) => required && !existingDocs?.[key] && !files[key])
      .map(({ label }) => label);

    if (missing.length) {
      toast.error(`Please upload ${missing.join(', ')} before submitting`);
      return;
    }

    const fd = new FormData();
    Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
    const hasSelectedFiles = Object.values(files).some(Boolean);
    onSubmit(hasSelectedFiles ? fd : undefined);
  };

  return (
    <div className="space-y-4">
      {docFields.map(({ key, label, required }) => {
        const existing  = existingDocs?.[key];
        const docStatus = existingDocs?.[`${key}Status`];
        const selected  = files[key];
        return (
          <div key={key} className={`border rounded-xl p-4 ${
            docStatus?.status === 'approved' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
            : docStatus?.status === 'rejected' ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
            : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {label} {required && <span className="text-red-500">*</span>}
                </p>
                {!required && <span className="text-xs text-slate-400 dark:text-slate-500">Optional</span>}
                {docStatus?.status === 'rejected' && docStatus?.comments && (
                  <p className="text-xs text-red-600 mt-0.5">Rejected: {docStatus.comments}</p>
                )}
              </div>
              {existing && (
                <div className="flex items-center gap-2">
                  {docStatus?.status === 'approved' && (
                    <span className="text-xs text-emerald-600 font-medium">✓ Approved</span>
                  )}
                  {docStatus?.status === 'rejected' && (
                    <span className="text-xs text-red-600 font-medium">✗ Rejected</span>
                  )}
                  <a href={existing.fileUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> View
                  </a>
                </div>
              )}
            </div>
            {!locked && (
              <label className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {selected ? selected.name : existing ? 'Replace file' : 'Click to upload'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">PDF, JPG, PNG (max 5MB)</p>
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files?.[0] || null }))} />
              </label>
            )}
          </div>
        );
      })}
      {!locked && (
        <div className="flex gap-3 pt-4 border-t mt-6">
          <Button variant="secondary" onClick={handleUpload} loading={uploading} icon={<Upload className="w-4 h-4" />}>
            Upload Selected Files
          </Button>
          <Button onClick={handleSubmitDocuments} loading={submitting} icon={<Send className="w-4 h-4" />}>Review & Submit</Button>
        </div>
      )}
    </div>
  );
};

// ── Completion screen ─────────────────────────────────────────────────────
const CompletionScreen: React.FC<{ profile: any }> = ({ profile }) => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-4">
        {profile.overallStatus === 'approved'
          ? <Trophy className="w-10 h-10 text-emerald-600" />
          : <CheckCircle className="w-10 h-10 text-emerald-600" />}
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">
        {profile.overallStatus === 'approved' ? '🎉 Onboarding Complete!' : 'Form Submitted Successfully!'}
      </h2>
      {profile.employeeId && (
        <div className="inline-block bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-6 py-3 my-4">
          <p className="text-xs text-emerald-600 uppercase tracking-widest mb-1">Your Employee ID</p>
          <p className="font-mono font-bold text-emerald-700 text-2xl">{profile.employeeId}</p>
        </div>
      )}
      <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">
        {profile.overallStatus === 'approved'
          ? 'Your profile has been fully approved. Welcome to the team!'
          : 'Your onboarding form has been submitted. Our HR team will review it and notify you via email.'}
      </p>
      <div className="mt-6 flex gap-3 justify-center">
        <Button onClick={() => navigate('/employee/dashboard')}>View Dashboard</Button>
        <Button variant="secondary" onClick={() => navigate('/employee/profile')}>View Profile</Button>
      </div>
    </div>
  );
};

const ReviewItem: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{value || '-'}</p>
  </div>
);

const FinalReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: (step: number) => void;
  submitting: boolean;
  personal: any;
  education: any;
  career: any;
  bank: any;
  documents: any;
}> = ({ isOpen, onClose, onConfirm, onEdit, submitting, personal, education, career, bank, documents }) => {
  const edu = Array.isArray(education?.education) ? education.education[0] : {};
  const docs = [
    ['Aadhaar', documents?.aadhaar],
    ['PAN', documents?.pan],
    ['Passbook', documents?.passbook],
    ['Resume', documents?.resume],
  ];

  const sectionHeader = (title: string, step: number) => (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-2">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <Button type="button" size="sm" variant="ghost" icon={<Edit3 className="w-3.5 h-3.5" />} onClick={() => onEdit(step)}>
        Edit
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Final Review"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button onClick={onConfirm} loading={submitting} icon={<Send className="w-4 h-4" />}>
            Final Submit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-3">
          {sectionHeader('Personal Details', 0)}
          <div className="grid sm:grid-cols-2 gap-4">
            <ReviewItem label="Name" value={`${personal?.firstName || ''} ${personal?.lastName || ''}`.trim()} />
            <ReviewItem label="Mobile" value={personal?.mobile} />
            <ReviewItem label="State / District" value={[personal?.address?.state, personal?.address?.district].filter(Boolean).join(', ')} />
            <ReviewItem label="PAN" value={personal?.panNumber} />
          </div>
        </div>

        <div className="space-y-3">
          {sectionHeader('Education', 1)}
          <div className="grid sm:grid-cols-2 gap-4">
            <ReviewItem label="Level" value={edu?.level} />
            <ReviewItem label="Institution" value={edu?.institution} />
            <ReviewItem label="Percentage" value={edu?.percentage !== undefined ? `${edu.percentage}/100` : undefined} />
            <ReviewItem label="CGPA" value={edu?.cgpa !== undefined ? `${edu.cgpa}/10` : undefined} />
          </div>
        </div>

        <div className="space-y-3">
          {sectionHeader('Career', 2)}
          <div className="grid sm:grid-cols-2 gap-4">
            <ReviewItem label="Applied Position" value={career?.appliedPosition} />
            <ReviewItem label="Career Type" value={career?.type} />
            <ReviewItem label="Expected CTC" value={career?.expectedCTC !== undefined ? `${career.expectedCTC} LPA` : undefined} />
            <ReviewItem label="Skills" value={Array.isArray(career?.skills) ? career.skills.join(', ') : undefined} />
          </div>
        </div>

        <div className="space-y-3">
          {sectionHeader('Bank', 3)}
          <div className="grid sm:grid-cols-2 gap-4">
            <ReviewItem label="Account Holder" value={bank?.accountHolderName} />
            <ReviewItem label="Account Number" value={bank?.accountNumber} />
            <ReviewItem label="IFSC" value={bank?.ifscCode} />
            <ReviewItem label="Bank" value={bank?.bankName} />
          </div>
        </div>

        <div className="space-y-3">
          {sectionHeader('Documents', 4)}
          <div className="grid sm:grid-cols-2 gap-3">
            {docs.map(([label, doc]) => (
              <div key={label} className="rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
                <ReviewItem label={label as string} value={(doc as any)?.originalName ? 'Uploaded' : 'Ready to submit'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Main OnboardingForm ───────────────────────────────────────────────────
export const OnboardingForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [pendingDocumentSubmit, setPendingDocumentSubmit] = useState<FormData | undefined>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const employeeProfileKey = ['employeeProfile', user?._id];
  const employeeDraftKey = ['employeeDraft', user?._id];

  const { data, isLoading } = useQuery({
    queryKey: employeeProfileKey,
    queryFn: () => employeeApi.getProfile().then((r) => r.data.data),
    enabled: !!user?._id,
  });

  const { data: draftData } = useQuery({
    queryKey: employeeDraftKey,
    queryFn: () => employeeApi.getDraft().then((r) => r.data.data),
    enabled: !!user?._id,
    staleTime: 0,
  });

  const profile   = data?.profile;
  const documents = data?.documents;
  const vs        = profile?.verificationStatus;

  const statuses: SectionStatus[] = [
    vs?.personal?.status  || 'pending',
    vs?.education?.status || 'pending',
    vs?.education?.status || 'pending', // career shares education status in backend
    vs?.bank?.status      || 'pending',
    vs?.documents?.status || 'pending',
  ];

  const isFullyApproved = profile?.overallStatus === 'approved';
  const isFormCompleted = profile?.onboardingStatus === 'completed' && profile?.overallStatus !== 'partially_rejected';

  // Navigate to first actionable step, or restore preserved navigation
  useEffect(() => {
    if (!vs) return;
    const savedStep = localStorage.getItem(`onboarding_${user?._id}_current_step`);
    if (savedStep !== null) {
      setCurrentStep(parseInt(savedStep, 10));
    } else {
      const firstActionable = statuses.findIndex((s) => s !== 'approved');
      if (firstActionable >= 0) setCurrentStep(firstActionable);
    }
  }, [data, user?._id]);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    localStorage.setItem(`onboarding_${user?._id}_current_step`, step.toString());
  };

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: employeeProfileKey });
    queryClient.invalidateQueries({ queryKey: employeeDraftKey });
  }, [queryClient, user?._id]);

  const draftMutation = useMutation({
    mutationFn: ({ section, data }: { section: string; data: any }) =>
      employeeApi.saveDraft(section, data),
    onSuccess: () => { toast.success('Draft saved!'); invalidate(); },
    onError: () => toast.error('Draft save failed'),
  });

  const saveMutation = useMutation({
    mutationFn: ({ section, data }: { section: string; data: any }) => {
      const map: Record<string, (d: any) => Promise<any>> = {
        personal:  employeeApi.savePersonalDetails,
        education: employeeApi.saveEducationDetails,
        career:    employeeApi.saveCareerDetails,
        bank:      employeeApi.saveBankDetails,
      };
      return map[section](data);
    },
    onSuccess: () => { toast.success('Saved!'); invalidate(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const submitMutation = useMutation({
    mutationFn: (section: string) => employeeApi.submitSection(section),
    onSuccess: (_, section) => {
      toast.success(`${section} submitted for review!`);
      invalidate();
      if (currentStep < 4) handleStepChange(currentStep + 1);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Submit failed'),
  });

  const saveAndSubmitSection = (section: string, formData: any) => {
    saveMutation.mutate(
      { section, data: formData },
      { onSuccess: () => submitMutation.mutate(section) },
    );
  };

  const uploadMutation = useMutation({
    mutationFn: employeeApi.uploadDocuments,
    onSuccess: () => { toast.success('Documents uploaded!'); invalidate(); },
    onError:   (e: any) => toast.error(e?.response?.data?.message || 'Upload failed'),
  });

  const confirmFinalSubmission = () => {
    setShowFinalReview(false);
    if (!pendingDocumentSubmit) {
      submitMutation.mutate('documents');
      return;
    }
    uploadMutation.mutate(pendingDocumentSubmit, {
      onSuccess: () => submitMutation.mutate('documents'),
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (isFullyApproved || (isFormCompleted && !statuses.includes('rejected'))) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="card"><CompletionScreen profile={profile} /></div>
      </div>
    );
  }

  const sectionKey = steps[currentStep].id;
  const currentStatus = statuses[currentStep];
  const mappedSectionKey = sectionKey === 'career' ? 'education' : sectionKey;
  const rejectionComment = (vs as any)?.[mappedSectionKey]?.comments;

  const getDefaults = (section: string) => {
    const profileData = (profile as any)?.[`${section}Details`] || {};
    const draft       = (draftData as any)?.draftData?.[section] || {};
    const localDraft  = getLocalDraft(section, user?._id || '') || {};
    
    if (section === 'education') {
      const eduData = Array.isArray(profileData) && profileData.length > 0 ? profileData : draft;
      return { education: (Array.isArray(eduData) && eduData.length > 0) ? eduData : (localDraft?.education || [{}]) };
    }

    if (section === 'career') {
      return {
        ...draft,
        ...profileData,
        ...localDraft,
        appliedPosition:
          localDraft?.appliedPosition ||
          draft?.appliedPosition ||
          (profileData as any)?.appliedPosition ||
          (profile as any)?.appliedPosition ||
          (user?.role === 'intern' ? 'Intern' : 'Full-time'),
      };
    }
    
    // Merge order: Backend Draft -> Local Draft -> Backend Profile (if exists)
    if (Object.keys(profileData as object).length > 2) {
        return { ...profileData, ...localDraft };
    }
    return { ...draft, ...localDraft };
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      <div className="mb-6">
        <h1 className="page-title">
          {user?.role === 'intern' ? 'Internship Onboarding' : 'Employee Onboarding'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {user?.role === 'intern' ? 'Complete your internship onboarding details.' : 'Complete all 5 sections to finish your onboarding.'}
        </p>
      </div>

      <div className="card">
        <Stepper current={currentStep} statuses={statuses} />

        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title flex items-center gap-2">
            {steps[currentStep].icon} {steps[currentStep].label} Details
          </h2>
          <SectionStatusBadge status={currentStatus} />
        </div>

        {currentStatus === 'rejected' && rejectionComment && (
          <Alert type="error" title="Section Rejected — Action Required" message={rejectionComment} className="mb-5" />
        )}
        {currentStatus === 'approved' && (
          <Alert type="success" title="Section Approved" message="This section is locked. No changes allowed." className="mb-5" />
        )}
        {currentStatus === 'submitted' && (
          <Alert type="info" title="Under Review" message="This section has been submitted and is being reviewed." className="mb-5" />
        )}

        {currentStep === 0 && (
          <PersonalStep
            defaultValues={getDefaults('personal')}
            status={currentStatus}
            saving={saveMutation.isPending}
            userId={user?._id || ''}
            onDraft={(d) => draftMutation.mutate({ section: 'personal', data: d })}
            onSave={(d) => saveMutation.mutate({ section: 'personal', data: d })}
            onSubmit={(d) => saveAndSubmitSection('personal', d)}
          />
        )}
        {currentStep === 1 && (
          <EducationStep
            defaultValues={getDefaults('education')}
            status={currentStatus}
            saving={saveMutation.isPending}
            userId={user?._id || ''}
            onDraft={(d) => draftMutation.mutate({ section: 'education', data: d })}
            onSave={(d) => saveMutation.mutate({ section: 'education', data: d })}
            onSubmit={(d) => saveAndSubmitSection('education', d)}
          />
        )}
        {currentStep === 2 && (
          <CareerStep
            defaultValues={getDefaults('career')}
            status={currentStatus}
            saving={saveMutation.isPending}
            userId={user?._id || ''}
            onDraft={(d) => draftMutation.mutate({ section: 'career', data: d })}
            onSave={(d) => saveMutation.mutate({ section: 'career', data: d })}
            onSubmit={(d) => saveAndSubmitSection('career', d)}
          />
        )}
        {currentStep === 3 && (
          <BankStep
            defaultValues={getDefaults('bank')}
            status={currentStatus}
            saving={saveMutation.isPending}
            userId={user?._id || ''}
            onDraft={(d) => draftMutation.mutate({ section: 'bank', data: d })}
            onSave={(d) => saveMutation.mutate({ section: 'bank', data: d })}
            onSubmit={(d) => saveAndSubmitSection('bank', d)}
          />
        )}
        {currentStep === 4 && (
          <DocumentsStep
            existingDocs={documents}
            status={currentStatus}
            uploading={uploadMutation.isPending}
            submitting={uploadMutation.isPending || submitMutation.isPending}
            onUpload={(fd) => uploadMutation.mutate(fd)}
            onSubmit={(fd) => {
              setPendingDocumentSubmit(fd);
              setShowFinalReview(true);
            }}
          />
        )}

        <div className="flex justify-between mt-8 pt-5 border-t border-slate-100">
          <Button variant="secondary" onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 0} icon={<ChevronLeft className="w-4 h-4" />}>
            Previous
          </Button>
          <Button variant="ghost" onClick={() => handleStepChange(currentStep + 1)} disabled={currentStep === 4}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <FinalReviewModal
        isOpen={showFinalReview}
        onClose={() => setShowFinalReview(false)}
        onConfirm={confirmFinalSubmission}
        onEdit={(step) => {
          setShowFinalReview(false);
          handleStepChange(step);
        }}
        submitting={uploadMutation.isPending || submitMutation.isPending}
        personal={getDefaults('personal')}
        education={getDefaults('education')}
        career={processCareerData(getDefaults('career'))}
        bank={getDefaults('bank')}
        documents={documents}
      />
    </div>
  );
};
