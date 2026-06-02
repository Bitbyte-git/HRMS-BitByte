import { format, formatDistanceToNow } from 'date-fns';
import type { OverallStatus, SectionStatus } from '../types';

export const formatDate     = (date: string | Date, pattern = 'dd MMM yyyy') => format(new Date(date), pattern);
export const formatDateTime = (date: string | Date) => format(new Date(date), 'dd MMM yyyy, hh:mm a');
export const timeAgo        = (date: string | Date) => formatDistanceToNow(new Date(date), { addSuffix: true });
export const formatLPA      = (lpa: number) => `₹${lpa} LPA`;
export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};

export const OVERALL_STATUS_LABELS: Record<OverallStatus, string> = {
  registered:               'Registered',
  form_in_progress:         'Form In Progress',
  form_submitted:           'Form Submitted',
  under_review:             'Under Review',
  partially_rejected:       'Partially Rejected',
  admin_approved:           'Admin Approved',
  under_super_admin_review: 'Final Review',
  approved:                 'Approved',
  rejected:                 'Rejected',
};

export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  pending:      'Pending',
  submitted:    'Submitted',
  under_review: 'Under Review',
  approved:     'Approved',
  rejected:     'Rejected',
};

export const capitalize  = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
export const titleCase   = (str: string) => str.replace(/_/g,' ').replace(/\w\S*/g, capitalize);
export const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0]||''}${lastName?.[0]||''}`.toUpperCase();

export const isValidIFSC   = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
export const isValidPAN    = (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
export const isValidAadhaar= (v: string) => /^\d{12}$/.test(v);
export const isValidMobile = (v: string) => /^[6-9]\d{9}$/.test(v);

export const parseApiError = (error: any): string =>
  error?.response?.data?.message || error?.message || 'An unexpected error occurred';

export const parseApiFieldErrors = (error: any): Record<string,string> | null => {
  const errors = error?.response?.data?.errors;
  if (!errors || !Array.isArray(errors)) return null;
  return errors.reduce((acc: Record<string,string>, e: {field:string;message:string}) => {
    acc[e.field] = e.message; return acc;
  }, {});
};
