import type { AttendanceTableStatus, EmploymentPosition, EmployeeProfile } from '../types';

export const DEPARTMENT_OPTIONS = [
  'Development',
  'Marketing',
  'DevOps',
  'Human Resources',
  'Finance',
  'Sales',
  'Design',
  'Quality Assurance',
];

export const POSITION_OPTIONS: EmploymentPosition[] = ['Intern', 'Full-time'];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceTableStatus, string> = {
  not_marked: 'Not Marked',
  present: 'Present',
  absent: 'Absent',
  completed: 'Completed',
};

export const getEmployeeName = (profile: EmployeeProfile) => {
  const user = profile.userId as any;
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employee';
};

export const getConfirmedPosition = (profile: EmployeeProfile) =>
  profile.position || profile.appliedPosition || '';
