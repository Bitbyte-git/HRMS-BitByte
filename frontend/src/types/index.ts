// ── Auth ──────────────────────────────────────────────────────────────────
export type Role = 'super_admin' | 'admin' | 'employee' | 'intern';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type EmploymentPosition = 'Intern' | 'Full-time';
export type AttendanceStatus = 'present' | 'absent' | 'completed';
export type AttendanceTableStatus = AttendanceStatus | 'not_marked';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  isFirstLogin: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Verification ──────────────────────────────────────────────────────────
export type SectionStatus =
  | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export type OverallStatus =
  | 'registered' | 'form_in_progress' | 'form_submitted'
  | 'under_review' | 'partially_rejected' | 'admin_approved'
  | 'under_super_admin_review' | 'approved' | 'rejected';

export type OnboardingStatus = 'pending' | 'completed';

export interface SectionVerification {
  status: SectionStatus;
  comments?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  submittedAt?: string;
}

// FIX: per-document verification status
export interface DocVerification {
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  viewedAt?: string;
}

// ── Employee Profile ──────────────────────────────────────────────────────
export interface Address {
  houseNo?: string;
  flatName?: string;
  street: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
  country: string;
}

// FIX: gender updated to Male/Female/Other, added aadhaarNumber & panNumber
export interface PersonalDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  mobile: string;
  alternatePhone?: string;
  aadhaarNumber: string;   // FIX: 12-digit Aadhaar
  panNumber: string;        // FIX: PAN format ABCDE1234F
  address: Address;
  permanentAddress: Address;
  sameAsCurrent: boolean;
  emergencyContact: { name: string; relationship: string; mobile: string };
}

// FIX: educationLevel dropdown added
export interface EducationDetails {
  educationLevel: 'UG' | 'PG' | 'Diploma' | 'HSC' | 'SSLC';
  highestDegree: string;
  specialization: string;
  collegeName: string;
  university: string;
  yearOfPassing: number;
  percentage: number;
  cgpa: number;
  totalExperienceYears: number;
  previousEmployer?: string;
  previousDesignation?: string;
  previousCTC?: number;
  expectedCTC: number;
  noticePeriodDays: number;
  skills: string[];
}

export interface CareerDetails {
  appliedPosition?: EmploymentPosition;
  type?: 'fresher' | 'experienced';
  companyName?: string;
  position?: string;
  previousCTC?: number;
  expectedCTC?: number;
  noticePeriod?: string;
  skills?: string[];
}

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: 'savings' | 'current';
}

export interface DocumentFile {
  originalName: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

// FIX: documents now carry per-doc status
export interface DocumentRecord {
  _id: string;
  aadhaar?: DocumentFile;
  pan?: DocumentFile;
  passbook?: DocumentFile;
  passport?: DocumentFile;
  resume?: DocumentFile;
  aadhaarStatus:  DocVerification;
  panStatus:      DocVerification;
  passbookStatus: DocVerification;
  passportStatus: DocVerification;
  resumeStatus:   DocVerification;
  isMandatoryComplete: boolean;
}

export interface VerificationStatus {
  personal:  SectionVerification;
  education: SectionVerification;
  bank:      SectionVerification;
  documents: SectionVerification;
}

export interface EmployeeProfile {
  _id: string;
  userId: string | User;
  employeeId?: string;
  appliedPosition?: EmploymentPosition;
  department?: string;
  position?: EmploymentPosition;
  personalDetails:  PersonalDetails;
  educationDetails: EducationDetails;
  careerDetails?: CareerDetails;
  bankDetails:      BankDetails;
  verificationStatus: VerificationStatus;
  overallStatus:    OverallStatus;
  onboardingStatus: OnboardingStatus;  // FIX: new field
  isDraft:          boolean;           // FIX: new field
  draftData:        Record<string, any>; // FIX: new field
  forwardedBy?:     string;
  forwardedAt?:     string;
  fixedPay?: {
    amount?: number;
    status?: 'pending' | 'approved' | 'rejected';
    proposedBy?: string | User;
    proposedAt?: string;
    approvedBy?: string | User;
    approvedAt?: string;
    comments?: string;
  };
  superAdminReview?: {
    reviewedBy: string | User;
    reviewedAt: string;
    comments:   string;
    status:     'approved' | 'rejected';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  markedBy?: string;
}

export interface AttendanceRow {
  profileId: string;
  employeeId?: string;
  employeeName: string;
  email?: string;
  department?: string;
  position?: EmploymentPosition;
  appliedPosition?: EmploymentPosition;
  attendance?: AttendanceRecord;
  status: AttendanceTableStatus;
  checkInTime?: string;
  checkOutTime?: string;
}

export type GoogleAttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'On Duty';

export type GoogleAttendanceShiftResult = 'P' | 'A' | 'OD';

export interface GoogleAttendanceMappingError {
  code: string;
  message: string;
  employeeId?: string;
  attendanceLogRowNumber?: number;
}

export interface GoogleAttendanceRow {
  employeeId: string;
  name: string;
  email?: string;
  department?: string;
  position?: EmploymentPosition;
  designation?: string;
  dateOfJoining?: string;
  checkIn?: string;
  checkOut?: string;
  shift1CheckIn?: string;
  shift1CheckOut?: string;
  shift1DurationMinutes?: number | null;
  shift1WorkedHours?: string;
  shift2CheckIn?: string;
  shift2CheckOut?: string;
  shift2DurationMinutes?: number | null;
  shift2WorkedHours?: string;
  shift1Result?: GoogleAttendanceShiftResult;
  shift2Result?: GoogleAttendanceShiftResult;
  onDutyStatus?: string;
  status: GoogleAttendanceStatus;
  date?: string;
  rowNumber: number;
  mappingError?: GoogleAttendanceMappingError;
}

export interface GoogleAttendanceAnalytics {
  total: number;
  present: number;
  absent: number;
  halfDay?: number;
  onDuty?: number;
  statusCounts: Array<{ status: string; count: number }>;
  checkInTrends: Array<{ time: string; count: number }>;
}

export interface GoogleAttendanceResponse {
  records: GoogleAttendanceRow[];
  analytics: GoogleAttendanceAnalytics;
  errors?: GoogleAttendanceMappingError[];
  source: {
    spreadsheetId: string;
    range: string;
    ranges?: {
      employeeMaster: string;
      attendanceLog: string;
    };
    fetchedAt: string;
    limit?: number;
    employeeLimit?: number;
    scannedRows?: number;
    employeeScannedRows?: number;
    attendanceScannedRows?: number;
    truncated?: boolean;
    missingEmployeeCount?: number;
  };
  cached: boolean;
}

export type LeaveType =
  | 'earned_leave'
  | 'casual_leave'
  | 'sick_leave'
  | 'maternity_leave'
  | 'paternity_leave'
  | 'comp_off'
  | 'lop';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface CompOffGrant {
  _id: string;
  days: number;
  usedDays: number;
  used: boolean;
  expired: boolean;
  grantedDate: string;
  expiryDate: string;
  reason?: string;
}

export interface CompOffSummary {
  total: number;
  used: number;
  remaining: number;
  expired: number;
}

export interface EmployeeLeaveRow {
  _id: string;
  year: number;
  profileId: string;
  employeeId?: string;
  employeeName: string;
  email?: string;
  department?: string;
  position?: EmploymentPosition;
  earnedLeave: LeaveBalance;
  casualLeave: LeaveBalance;
  sickLeave: LeaveBalance;
  maternityLeave: LeaveBalance;
  paternityLeave: LeaveBalance;
  compOff: CompOffGrant[];
  compOffSummary: CompOffSummary;
  lopDays: number;
  updatedAt: string;
}

export interface LeaveRequestRow {
  _id: string;
  profileId: string;
  employeeId?: string;
  employeeName: string;
  department?: string;
  leaveType: LeaveType;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  days: number;
  payableDays: number;
  lopDays: number;
  status: LeaveRequestStatus;
  reason?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
  currentBalance?: LeaveBalance | null;
}

export interface LeavePolicy {
  earnedLeaveDays: number;
  casualLeaveDays: number;
  sickLeaveDays: number;
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  compOffValidityDays: number;
  publicHolidays: string[];
}

export interface SalaryComponent {
  _id?: string;
  key?: string;
  label: string;
  amount: number;
  formula?: string;
  systemGenerated?: boolean;
}

export type PayrollStatus = 'paid' | 'void';

export interface PayrollRecord {
  _id: string;
  employeeProfileId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  payPeriod: string;
  paidDays: number;
  lopDays: number;
  payDate: string;
  fixedSalary: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  grossEarnings: number;
  totalDeductions: number;
  netSalary: number;
  amountInWords: string;
  calculationMetadata?: {
    engine?: string;
    salaryBasis?: string;
    generatedAt?: string;
    additionalEarnings?: number;
    additionalDeductions?: number;
    rules?: Record<string, any>;
  };
  status: PayrollStatus;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEmployeeOption {
  profileId: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  email?: string;
  department?: string;
  position?: string;
  fixedPay?: number;
}

export interface PayrollCompanyDetails {
  name: string;
  address: string;
  cityPincode: string;
  logoUrl: string;
}

export interface PayslipPayload {
  company: PayrollCompanyDetails;
  payroll: PayrollRecord;
}

export interface PayrollAnalytics {
  totals: {
    totalPayrolls: number;
    employeesPaid: number;
    grossPayout: number;
    totalDeductions: number;
    netPayout: number;
    averageNetSalary: number;
  };
  monthlySummary: Array<{
    payPeriod: string;
    gross: number;
    deductions: number;
    net: number;
    payrolls: number;
  }>;
  departmentSummary: Array<{
    department: string;
    employees: number;
    net: number;
  }>;
  salaryDistribution: Array<{
    range: string;
    count: number;
  }>;
  recentPayroll: PayrollRecord | null;
}

// ── Verification Log ──────────────────────────────────────────────────────
export interface VerificationLog {
  _id: string;
  section: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  comments?: string;
  verifiedBy: User;
  verifierRole: Role;
  createdAt: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  total: number;
  totalEmployees: number;
  totalAdmins: number;
  pending: number;
  approved: number;
  rejected: number;
  underReview: number;
  inProgress: number;
}

// ── API Response ──────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  pagination?: { page: number; limit: number; total: number; pages: number };
}
