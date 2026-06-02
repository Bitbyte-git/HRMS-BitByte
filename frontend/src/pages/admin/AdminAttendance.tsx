import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BarChart3, Building2, CalendarCheck, Clock3, FileSpreadsheet, RefreshCw, Search, UserRound } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { attendanceApi } from '../../services/api';
import { Alert, Button, Modal } from '../../components/common/UI';
import { Pagination, Table } from '../../components/common/Table';
import type { GoogleAttendanceResponse, GoogleAttendanceRow, GoogleAttendanceShiftResult, GoogleAttendanceStatus } from '../../types';

const PAGE_SIZE = 25;
const SHEET_ROW_LIMIT = 500;

const STATUS_FILTERS: { value: GoogleAttendanceStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'Present', label: 'Present' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'On Duty', label: 'On Duty' },
  { value: 'Absent', label: 'Absent' },
];

const statusLabels: Record<GoogleAttendanceStatus, string> = {
  Present: 'Present',
  'Half Day': 'Half Day',
  'On Duty': 'On Duty',
  Absent: 'Absent',
};

const statusClasses: Record<GoogleAttendanceStatus, string> = {
  Present: 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Half Day': 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-500/30 dark:bg-amber-900/30 dark:text-amber-300',
  'On Duty': 'bg-sky-100 text-sky-700 shadow-sm shadow-sky-500/30 dark:bg-sky-900/30 dark:text-sky-300',
  Absent: 'bg-red-100 text-red-700 shadow-sm shadow-red-500/30 dark:bg-red-900/30 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  Present: '#059669',
  'Half Day': '#d97706',
  'On Duty': '#0284c7',
  Absent: '#dc2626',
};

const AttendanceBadge: React.FC<{ status: GoogleAttendanceStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
    {statusLabels[status]}
  </span>
);

const shiftResultConfig: Record<GoogleAttendanceShiftResult, { label: string; dot: string; text: string }> = {
  P: { label: 'Present', dot: 'bg-emerald-500 shadow-emerald-500/40', text: 'text-emerald-700 dark:text-emerald-300' },
  A: { label: 'Absent', dot: 'bg-red-500 shadow-red-500/40', text: 'text-red-700 dark:text-red-300' },
  OD: { label: 'On Duty', dot: 'bg-sky-500 shadow-sky-500/40', text: 'text-sky-700 dark:text-sky-300' },
};

const ShiftResultBadge: React.FC<{ result?: GoogleAttendanceShiftResult }> = ({ result }) => {
  if (!result) return <span className="text-xs text-slate-400">-</span>;
  const config = shiftResultConfig[result];
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${config.text}`}>
      <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${config.dot}`} />
      {config.label}
    </span>
  );
};

const isEmptyValue = (value?: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || ['-', '--', 'na', 'n/a', 'null', 'undefined'].includes(normalized);
};

const formatSheetTime = (value?: string) => {
  if (isEmptyValue(value)) return '-';
  const text = String(value).trim();
  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{1,2}-\d{1,2}|T/.test(text)) {
    return format(parsed, 'hh:mm a');
  }

  return text;
};

const formatFetchedAt = (value?: string) => {
  if (!value) return 'Waiting for sync';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : `Updated ${format(parsed, 'dd MMM, hh:mm a')}`;
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message || 'Unable to fetch Google Sheets attendance data.';

const getAnalyticsFallback = (records: GoogleAttendanceRow[]) => {
  const totals = records.reduce(
    (acc, record) => {
      acc.total += 1;
      if (record.status === 'Present') acc.present += 1;
      if (record.status === 'Absent') acc.absent += 1;
      if (record.status === 'Half Day') acc.halfDay += 1;
      if (record.status === 'On Duty') acc.onDuty += 1;
      return acc;
    },
    { total: 0, present: 0, absent: 0, halfDay: 0, onDuty: 0 }
  );

  return {
    ...totals,
    statusCounts: [
      { status: 'Present', count: totals.present },
      { status: 'Half Day', count: totals.halfDay },
      { status: 'On Duty', count: totals.onDuty },
      { status: 'Absent', count: totals.absent },
    ],
    checkInTrends: [],
  };
};

const detailValue = (value?: string | number | null) => (
  value === undefined || value === null || value === '' ? '-' : String(value)
);

const DetailItem: React.FC<{ label: string; value?: string | number | null; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/30">
    <p className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
      {icon}
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{detailValue(value)}</p>
  </div>
);

const ShiftDetailCard: React.FC<{
  title: string;
  checkIn?: string;
  checkOut?: string;
  workedHours?: string;
  result?: GoogleAttendanceShiftResult;
}> = ({ title, checkIn, checkOut, workedHours, result }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <ShiftResultBadge result={result} />
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <DetailItem label="Check-In" value={formatSheetTime(checkIn)} />
      <DetailItem label="Check-Out" value={formatSheetTime(checkOut)} />
      <DetailItem label="Worked Hours" value={workedHours || '-'} />
    </div>
  </div>
);

export const AdminAttendance: React.FC = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sheetName, setSheetName] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<GoogleAttendanceStatus | ''>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<GoogleAttendanceRow | null>(null);
  const deferredSearch = useDeferredValue(search);

  const normalizedSheetName = sheetName.trim();
  const queryKey = ['googleAttendance', date, normalizedSheetName] as const;

  const { data, error, isFetching, isLoading } = useQuery<GoogleAttendanceResponse | undefined, any>({
    queryKey,
    queryFn: () =>
      attendanceApi
        .getGoogleSheet({
          date: date || undefined,
          sheet: normalizedSheetName || undefined,
          limit: SHEET_ROW_LIMIT,
        })
        .then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const records = data?.records || [];
  const analytics = data?.analytics || getAnalyticsFallback(records);

  const filteredRecords = useMemo(() => {
    const searchText = deferredSearch.trim().toLowerCase();

    return records.filter((row) => {
      const matchesStatus = !status || row.status === status;
      const matchesSearch = !searchText || [
        row.employeeId,
        row.name,
        row.email,
        row.department,
        row.position,
      ].some((value) => String(value || '').toLowerCase().includes(searchText));

      return matchesStatus && matchesSearch;
    });
  }, [records, deferredSearch, status]);

  useEffect(() => {
    setPage(1);
  }, [date, normalizedSheetName, search, status]);

  const totalFiltered = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const visiblePage = Math.min(page, totalPages);
  const visibleRecords = filteredRecords.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  const statusChartData = analytics.statusCounts.map((item) => ({
    label: item.status,
    count: item.count,
    fill: statusColors[item.status] || '#64748b',
  }));

  const refreshFromSheet = async () => {
    setIsRefreshing(true);
    try {
      const response = await attendanceApi.getGoogleSheet({
        date: date || undefined,
        sheet: normalizedSheetName || undefined,
        refresh: true,
        limit: SHEET_ROW_LIMIT,
      });
      queryClient.setQueryData(queryKey, response.data.data);
      toast.success('Google Sheet data refreshed.');
    } catch (refreshError: any) {
      toast.error(getErrorMessage(refreshError));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary-600" /> Google Attendance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Attendance dashboard sourced from Google Sheets.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>{formatFetchedAt(data?.source?.fetchedAt)}</span>
          {data?.cached && <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">Cached</span>}
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          title="Google Sheets sync failed"
          message={getErrorMessage(error)}
        />
      )}

      {data?.source?.truncated && (
        <Alert
          type="info"
          title="Attendance list is capped for performance"
          message={`Showing the first ${data.source.limit || SHEET_ROW_LIMIT} matching sheet rows. Use the Date or Sheet tab filter, or raise GOOGLE_ATTENDANCE_MAX_RECORDS if your server can handle more.`}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Present Count', value: analytics.present, tone: 'text-emerald-600 dark:text-emerald-300' },
          { label: 'Half Day Count', value: analytics.halfDay || 0, tone: 'text-amber-600 dark:text-amber-300' },
          { label: 'Absent Count', value: analytics.absent, tone: 'text-red-600 dark:text-red-300' },
          { label: 'On Duty Count', value: analytics.onDuty || 0, tone: 'text-sky-600 dark:text-sky-300' },
        ].map((item) => (
          <div key={item.label} className="card py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="section-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600" /> Attendance Count
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="section-title flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600" /> Overall Status Mix
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Pie
                  data={statusChartData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="form-input pl-9"
            placeholder="Search by name, employee ID, department..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <input
          className="form-input w-full xl:w-44"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <input
          className="form-input w-full xl:w-48"
          placeholder="Sheet tab"
          value={sheetName}
          onChange={(event) => setSheetName(event.target.value)}
        />
        <select
          className="form-input w-full xl:w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value as GoogleAttendanceStatus | '')}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button
          variant="secondary"
          icon={<RefreshCw className={`w-4 h-4 ${isFetching || isRefreshing ? 'animate-spin' : ''}`} />}
          loading={isRefreshing}
          onClick={refreshFromSheet}
          className="w-full xl:w-auto"
        >
          Refresh
        </Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          loading={isLoading}
          data={visibleRecords}
          keyExtractor={(row) => `${row.employeeId || 'sheet-row'}-${row.rowNumber}`}
          onRowClick={(row) => setSelectedRecord(row)}
          columns={[
            {
              key: 'employeeId',
              header: 'Employee ID',
              render: (_, row) => row.employeeId
                ? <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{row.employeeId}</span>
                : <span className="text-xs text-slate-400">Missing</span>,
            },
            {
              key: 'name',
              header: 'Name',
              render: (_, row) => (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{row.name || 'Unnamed employee'}</p>
                  {row.email && <p className="text-xs text-slate-400 dark:text-slate-500">{row.email}</p>}
                </div>
              ),
            },
            {
              key: 'shift1CheckIn',
              header: 'Shift1 In',
              render: (_, row) => formatSheetTime(row.shift1CheckIn),
            },
            {
              key: 'shift1CheckOut',
              header: 'Shift1 Out',
              render: (_, row) => formatSheetTime(row.shift1CheckOut),
            },
            {
              key: 'shift1Result',
              header: 'Shift1 Result',
              render: (_, row) => <ShiftResultBadge result={row.shift1Result} />,
            },
            {
              key: 'shift2CheckIn',
              header: 'Shift2 In',
              render: (_, row) => formatSheetTime(row.shift2CheckIn),
            },
            {
              key: 'shift2CheckOut',
              header: 'Shift2 Out',
              render: (_, row) => formatSheetTime(row.shift2CheckOut),
            },
            {
              key: 'shift2Result',
              header: 'Shift2 Result',
              render: (_, row) => <ShiftResultBadge result={row.shift2Result} />,
            },
            {
              key: 'status',
              header: 'Overall Status',
              render: (_, row) => <AttendanceBadge status={row.status} />,
            },
          ]}
          emptyMessage="No Data Available"
        />
        {totalFiltered > PAGE_SIZE && (
          <div className="px-4 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              page={visiblePage}
              pages={totalPages}
              total={totalFiltered}
              limit={PAGE_SIZE}
              onChange={setPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Attendance Details"
        size="xl"
      >
        {selectedRecord && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-900/40 dark:bg-primary-950/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Employee Information</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                    {selectedRecord.name || 'Unnamed employee'}
                  </h3>
                </div>
                <AttendanceBadge status={selectedRecord.status} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <DetailItem label="Employee ID" value={selectedRecord.employeeId} icon={<UserRound className="h-3.5 w-3.5" />} />
                <DetailItem label="Department" value={selectedRecord.department || 'Unassigned'} icon={<Building2 className="h-3.5 w-3.5" />} />
                <DetailItem label="Date" value={selectedRecord.date} icon={<CalendarCheck className="h-3.5 w-3.5" />} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ShiftDetailCard
                title="Shift 1"
                checkIn={selectedRecord.shift1CheckIn}
                checkOut={selectedRecord.shift1CheckOut}
                workedHours={selectedRecord.shift1WorkedHours}
                result={selectedRecord.shift1Result}
              />
              <ShiftDetailCard
                title="Shift 2"
                checkIn={selectedRecord.shift2CheckIn}
                checkOut={selectedRecord.shift2CheckOut}
                workedHours={selectedRecord.shift2WorkedHours}
                result={selectedRecord.shift2Result}
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Overall Attendance
                  </p>
                </div>
                <AttendanceBadge status={selectedRecord.status} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
