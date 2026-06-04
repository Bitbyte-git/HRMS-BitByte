import apiClient from './client';
import type {
  ApiResponse, User, EmployeeProfile,
  PersonalDetails, EducationDetails, BankDetails,
  VerificationLog, DashboardStats, AttendanceRow, EmploymentPosition,
  GoogleAttendanceResponse,
  EmployeeLeaveRow, LeavePolicy, LeaveRequestRow, LeaveType,
  PayrollAnalytics, PayrollEmployeeOption, PayrollRecord, PayslipPayload, SalaryComponent,
  AssetAgreementPayload, AssetAgreementRecord, AssetAssignmentRecord, AssetEmployeeOption, AssetRecord, AssetStatus,
} from '../../types';

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ token: string; user: User }>>('/auth/login', data),

  register: (data: { email: string; firstName: string; lastName: string; role: string }) =>
    apiClient.post<ApiResponse<{ user: User }>>('/auth/register', data),

  resetPassword: (data: {
    currentPassword: string; newPassword: string; confirmPassword: string;
  }) => apiClient.patch<ApiResponse<{ token: string }>>('/auth/reset-password', data),

  getMe: () => apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),
};

// ── Employee ──────────────────────────────────────────────────────────────
export const employeeApi = {
  getProfile: () =>
    apiClient.get<ApiResponse<{ profile: EmployeeProfile; documents: any }>>('/employee/profile'),

  // FIX: onboarding status to block re-entry
  getOnboardingStatus: () =>
    apiClient.get<ApiResponse<any>>('/employee/status'),

  // FIX: draft save/restore — preserves form state across steps
  saveDraft: (section: string, data: Record<string, any>) =>
    apiClient.post<ApiResponse<{ profile: EmployeeProfile }>>(`/employee/draft/${section}`, data),

  getDraft: () =>
    apiClient.get<ApiResponse<any>>('/employee/draft'),

  savePersonalDetails: (data: PersonalDetails) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/personal', data),

  saveEducationDetails: (data: any) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/education', data),

  saveCareerDetails: (data: any) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/career', data),

  saveBankDetails: (data: BankDetails) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/bank', data),

  uploadDocuments: (formData: FormData) =>
    apiClient.post<ApiResponse<{ profile: EmployeeProfile }>>(
      '/employee/documents', formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),

  submitSection: (section: string) =>
    apiClient.patch<ApiResponse>(`/employee/submit/${section}`),

  getAuditTrail: () =>
    apiClient.get<ApiResponse<{ logs: VerificationLog[] }>>('/employee/audit-trail'),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  getEmployeeList: (params?: {
    status?: string; page?: number; limit?: number; search?: string;
  }) =>
    apiClient.get<ApiResponse<{ employees: EmployeeProfile[]; pagination: any }>>(
      '/admin/employees', { params }
    ),

  getEmployeeDetail: (profileId: string) =>
    apiClient.get<ApiResponse<{ profile: EmployeeProfile; documents: any; logs: any[] }>>(
      `/admin/employees/${profileId}`
    ),

  verifySection: (
    profileId: string, section: string,
    data: { action: 'approved' | 'rejected'; comments?: string }
  ) => apiClient.patch<ApiResponse>(`/admin/employees/${profileId}/verify/${section}`, data),

  // FIX: per-document verification
  verifyDocument: (
    profileId: string,
    data: { docType: string; action: 'approved' | 'rejected'; comments?: string }
  ) => apiClient.patch<ApiResponse>(`/admin/employees/${profileId}/verify-document`, data),

  // FIX: mark document as viewed before enabling approve/reject
  markDocumentViewed: (profileId: string, docType: string) =>
    apiClient.patch<ApiResponse>(`/admin/employees/${profileId}/view-document/${docType}`),

  updateFixedPay: (profileId: string, fixedPay: number) =>
    apiClient.patch<ApiResponse<{ profile: EmployeeProfile }>>(
      `/admin/employees/${profileId}/fixed-pay`,
      { fixedPay }
    ),

  forwardToSuperAdmin: (profileId: string) =>
    apiClient.patch<ApiResponse>(`/admin/employees/${profileId}/forward`),

  updateDepartment: (data: { profileId: string; department: string }) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/update-department', data),

  updatePosition: (data: { profileId: string; position: EmploymentPosition }) =>
    apiClient.put<ApiResponse<{ profile: EmployeeProfile }>>('/employee/update-position', data),

  getDashboardStats: () =>
    apiClient.get<ApiResponse<{ stats: DashboardStats; chartData: any }>>('/admin/dashboard'),

  // FIX: admin own profile
  getMyProfile: () =>
    apiClient.get<ApiResponse<{ user: User }>>('/admin/me'),
};

// ── Attendance ───────────────────────────────────────────────────────────
export const attendanceApi = {
  getToday: () =>
    apiClient.get<ApiResponse<{ date: string; employees: AttendanceRow[] }>>('/attendance/today'),

  getGoogleSheet: (params?: {
    date?: string;
    sheet?: string;
    employeeSheet?: string;
    attendanceSheet?: string;
    refresh?: boolean;
    limit?: number;
  }) =>
    apiClient.get<ApiResponse<GoogleAttendanceResponse>>('/attendance/google-sheet', { params }),

  checkIn: (employeeId: string) =>
    apiClient.post<ApiResponse>('/attendance/check-in', { employeeId }),

  checkOut: (employeeId: string) =>
    apiClient.post<ApiResponse>('/attendance/check-out', { employeeId }),

  markAbsent: (employeeId: string) =>
    apiClient.post<ApiResponse>('/attendance/absent', { employeeId }),
};

// ── Leaves ───────────────────────────────────────────────────────────────
export const leaveApi = {
  getAll: (params?: { year?: number; department?: string; search?: string }) =>
    apiClient.get<ApiResponse<{ year: number; employees: EmployeeLeaveRow[]; policy: LeavePolicy }>>(
      '/leaves/all', { params }
    ),

  getMyLeave: (params?: { year?: number }) =>
    apiClient.get<ApiResponse<EmployeeLeaveRow>>('/leaves/me', { params }),

  getRequests: (params?: { year?: number; status?: string; employeeId?: string }) =>
    apiClient.get<ApiResponse<{ requests: LeaveRequestRow[] }>>('/leaves/requests', { params }),

  getMyRequests: (params?: { year?: number; status?: string }) =>
    apiClient.get<ApiResponse<{ requests: LeaveRequestRow[] }>>('/leaves/my-requests', { params }),

  allocate: (data: {
    employeeId: string;
    year?: number;
    balances: Partial<Record<'earnedLeave' | 'casualLeave' | 'sickLeave' | 'maternityLeave' | 'paternityLeave', {
      total?: number;
      used?: number;
    }>>;
  }) => apiClient.post<ApiResponse<EmployeeLeaveRow>>('/leaves/allocate', data),

  createRequest: (data: {
    employeeId?: string;
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    days?: number;
    reason?: string;
  }) => apiClient.post<ApiResponse<LeaveRequestRow>>('/leaves/request', data),

  markLeave: (data: {
    employeeId: string;
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    days?: number;
    reason?: string;
  }) => apiClient.post<ApiResponse<{ request: LeaveRequestRow; leave: EmployeeLeaveRow }>>('/leaves/mark', data),

  approve: (requestId: string) =>
    apiClient.put<ApiResponse<LeaveRequestRow>>('/leaves/approve', { requestId }),

  reject: (data: { requestId: string; rejectionReason: string }) =>
    apiClient.put<ApiResponse<LeaveRequestRow>>('/leaves/reject', data),

  grantCompOff: (data: {
    employeeId: string;
    days: number;
    grantedDate?: string;
    validityDays?: number;
    reason?: string;
  }) => apiClient.post<ApiResponse<EmployeeLeaveRow>>('/leaves/comp-off', data),
};

// ── Payroll ─────────────────────────────────────────────────────────────
export const payrollApi = {
  searchEmployees: (params?: { search?: string; limit?: number }) =>
    apiClient.get<ApiResponse<{ employees: PayrollEmployeeOption[] }>>(
      '/payroll/employees', { params }
    ),

  create: (data: {
    employeeId: string;
    payPeriod: string;
    paidDays: number;
    lopDays: number;
    payDate: string;
    fixedSalary?: number;
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
  }) => apiClient.post<ApiResponse<{ payroll: PayrollRecord }>>('/payroll/create', data),

  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    payPeriod?: string;
    department?: string;
    status?: string;
  }) =>
    apiClient.get<ApiResponse<{
      records: PayrollRecord[];
      analytics: PayrollAnalytics;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>>('/payroll/all', { params }),

  getAnalytics: (params?: { search?: string; payPeriod?: string; department?: string; status?: string }) =>
    apiClient.get<ApiResponse<{ analytics: PayrollAnalytics }>>('/payroll/analytics', { params }),

  getByEmployeeId: (employeeId: string) =>
    apiClient.get<ApiResponse<{ records: PayrollRecord[] }>>(`/payroll/${employeeId}`),

  getMine: () =>
    apiClient.get<ApiResponse<{ records: PayrollRecord[] }>>('/payroll/me'),

  getPayslip: (id: string) =>
    apiClient.get<ApiResponse<{ payslip: PayslipPayload }>>(`/payroll/payslip/${id}`),

  remove: (id: string) =>
    apiClient.delete<ApiResponse>(`/payroll/${id}`),
};

// ── Assets ───────────────────────────────────────────────────────────────
export const assetApi = {
  getAssets: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: AssetStatus | '';
    assigned?: 'true' | 'false' | '';
  }) =>
    apiClient.get<ApiResponse<{
      assets: AssetRecord[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>>('/assets', { params }),

  createAsset: (data: Partial<AssetRecord>) =>
    apiClient.post<ApiResponse<{ asset: AssetRecord }>>('/assets', data),

  updateAsset: (id: string, data: Partial<AssetRecord>) =>
    apiClient.patch<ApiResponse<{ asset: AssetRecord }>>(`/assets/${id}`, data),

  deleteAsset: (id: string) =>
    apiClient.delete<ApiResponse>(`/assets/${id}`),

  getAvailableAssets: () =>
    apiClient.get<ApiResponse<{ assets: AssetRecord[] }>>('/assets/available'),

  searchEmployees: (params?: { search?: string; limit?: number }) =>
    apiClient.get<ApiResponse<{ employees: AssetEmployeeOption[] }>>('/assets/employees/search', { params }),

  getEmployee: (employeeId: string) =>
    apiClient.get<ApiResponse<{ employee: AssetEmployeeOption }>>(`/assets/employees/${employeeId}`),

  assignAsset: (data: { employeeId: string; assetId: string }) =>
    apiClient.post<ApiResponse<{
      assignment: AssetAssignmentRecord;
      asset: AssetRecord;
      agreement: AssetAgreementRecord;
    }>>('/assets/assign', data),

  getAssignments: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get<ApiResponse<{
      assignments: AssetAssignmentRecord[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>>('/assets/assignments', { params }),

  getMine: () =>
    apiClient.get<ApiResponse<{
      assignments: AssetAssignmentRecord[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>>('/assets/mine'),

  generateAgreement: (assignmentId: string) =>
    apiClient.post<ApiResponse<{ agreement: AssetAgreementRecord }>>(`/assets/assignments/${assignmentId}/agreement`, {}),

  getAgreement: (agreementId: string) =>
    apiClient.get<ApiResponse<{ agreement: AssetAgreementRecord; payload: AssetAgreementPayload }>>(
      `/assets/agreements/${agreementId}`
    ),

  uploadSignedAgreement: (agreementId: string, formData: FormData) =>
    apiClient.post<ApiResponse<{ agreement: AssetAgreementRecord }>>(
      `/assets/agreements/${agreementId}/upload-signed`,
      formData
    ),

  verifyAgreement: (agreementId: string, data: { action: 'approve' | 'reject'; comments?: string }) =>
    apiClient.patch<ApiResponse<{ agreement: AssetAgreementRecord }>>(
      `/assets/agreements/${agreementId}/verify`,
      data
    ),

  returnAsset: (assignmentId: string, data: {
    returnDate?: string;
    assetCondition: 'Good' | 'Damaged' | 'Lost';
    returnNotes?: string;
  }) =>
    apiClient.patch<ApiResponse<{ assignment: AssetAssignmentRecord; asset: AssetRecord }>>(
      `/assets/assignments/${assignmentId}/return`,
      data
    ),
};

// ── Super Admin ───────────────────────────────────────────────────────────
export const superAdminApi = {
  getPendingApprovals: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<{ employees: EmployeeProfile[]; pagination: any }>>(
      '/super-admin/pending', { params }
    ),

  getEmployeeDetail: (profileId: string) =>
    apiClient.get<ApiResponse<{ profile: EmployeeProfile; documents: any; logs: any[] }>>(
      `/super-admin/employees/${profileId}`
    ),

  finalReview: (
    profileId: string,
    data: { action: 'approved' | 'rejected'; comments?: string }
  ) =>
    apiClient.patch<ApiResponse<{ profile: EmployeeProfile; employeeId?: string }>>(
      `/super-admin/employees/${profileId}/review`, data
    ),

  // FIX: all employees endpoint
  getAllEmployees: (params?: {
    status?: string; page?: number; limit?: number; search?: string;
  }) =>
    apiClient.get<ApiResponse<{ employees: EmployeeProfile[]; pagination: any }>>(
      '/super-admin/employees', { params }
    ),

  getDashboardStats: () =>
    apiClient.get<ApiResponse<{ stats: DashboardStats; chartData: any; monthlyData: any[]; statusDistribution: any[] }>>(
      '/super-admin/dashboard'
    ),

  getAdminList: () =>
    apiClient.get<ApiResponse<{ admins: User[] }>>('/super-admin/admins'),

  // FIX: role is now passed through so admin gets correct role
  createAdmin: (data: { email: string; firstName: string; lastName: string; role: string }) =>
    apiClient.post<ApiResponse<{ user: User }>>('/super-admin/admins', data),

  updateAdminStatus: (adminId: string, status: string) =>
    apiClient.patch<ApiResponse>(`/super-admin/admins/${adminId}/status`, { status }),
};

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationApi = {
  getNotifications: () =>
    apiClient.get<ApiResponse<{ notifications: any[] }>>('/notifications'),
  markAsRead: (id: string) =>
    apiClient.patch<ApiResponse>(`/notifications/${id}/read`),
  createTestNotification: () =>
    apiClient.post<ApiResponse>(`/notifications/manual`, {}),
};
