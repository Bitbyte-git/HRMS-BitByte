import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Download,
  Eye,
  FileCheck,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { assetApi } from '../../services/api';
import { useAuthStore } from '../../context/authStore';
import { AssetAgreementView } from '../../components/assets/AssetAgreementView';
import { Button, EmptyState, Input, Modal, Select, Spinner, Badge } from '../../components/common/UI';
import { Pagination, Table } from '../../components/common/Table';
import { printElementAsPdf, todayInputDate } from '../../utils/payroll';
import type {
  AssetAgreementPayload,
  AssetAssignmentRecord,
  AssetEmployeeOption,
  AssetRecord,
  AssetStatus,
} from '../../types';

const CATEGORY_OPTIONS = ['Laptop', 'Charger', 'Mobile Phone', 'SIM Card', 'Tablet', 'Monitor', 'Accessory', 'Other'];
const STATUS_OPTIONS: AssetStatus[] = ['Available', 'Assigned', 'Returned', 'Damaged', 'Lost'];

const emptyForm = {
  productName: '',
  category: 'Laptop',
  brand: '',
  model: '',
  serialNumber: '',
  imeiNumber: '',
  specification: '',
  status: 'Available' as AssetStatus,
};

const statusVariant = (status?: string) => {
  if (status === 'Available' || status === 'Returned' || status === 'Verified') return 'approved';
  if (status === 'Assigned' || status === 'Signed Uploaded') return 'submitted';
  if (status === 'Damaged' || status === 'Lost' || status === 'Rejected') return 'rejected';
  return 'pending';
};

const AgreementModal: React.FC<{
  agreementId: string | null;
  onClose: () => void;
}> = ({ agreementId, onClose }) => {
  const query = useQuery({
    queryKey: ['assetAgreement', agreementId],
    queryFn: () => assetApi.getAgreement(agreementId as string).then((res) => res.data.data),
    enabled: Boolean(agreementId),
  });

  return (
    <Modal
      isOpen={Boolean(agreementId)}
      onClose={onClose}
      title="Asset Agreement"
      size="xl"
      footer={(
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button
            icon={<Download className="w-4 h-4" />}
            disabled={!query.data?.payload}
            onClick={() => printElementAsPdf('asset-agreement-print', `Asset-Agreement-${query.data?.agreement.agreementNumber}`)}
          >
            Download PDF
          </Button>
        </div>
      )}
    >
      {query.isLoading || !query.data?.payload ? (
        <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
      ) : (
        <AssetAgreementView elementId="asset-agreement-print" payload={query.data.payload as AssetAgreementPayload} />
      )}
    </Modal>
  );
};

export const AssetManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [assetPage, setAssetPage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [assigned, setAssigned] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [employeeId, setEmployeeId] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<AssetEmployeeOption | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [returnAssignment, setReturnAssignment] = useState<AssetAssignmentRecord | null>(null);
  const [returnForm, setReturnForm] = useState({ returnDate: todayInputDate(), assetCondition: 'Good' as 'Good' | 'Damaged' | 'Lost', returnNotes: '' });
  const [rejectAgreement, setRejectAgreement] = useState<AssetAssignmentRecord | null>(null);
  const [rejectComments, setRejectComments] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    queryClient.invalidateQueries({ queryKey: ['availableAssets'] });
    queryClient.invalidateQueries({ queryKey: ['assetAssignments'] });
    queryClient.invalidateQueries({ queryKey: ['employeeAssets'] });
  };

  const assetQuery = useQuery({
    queryKey: ['assets', { assetPage, search, status, category, assigned }],
    queryFn: () => assetApi.getAssets({
      page: assetPage,
      limit: 10,
      search: search || undefined,
      status: (status as AssetStatus) || undefined,
      category: category || undefined,
      assigned: (assigned as 'true' | 'false') || undefined,
    }).then((res) => res.data.data),
    placeholderData: keepPreviousData,
  });

  const availableQuery = useQuery({
    queryKey: ['availableAssets'],
    queryFn: () => assetApi.getAvailableAssets().then((res) => res.data.data?.assets || []),
  });

  const assignmentQuery = useQuery({
    queryKey: ['assetAssignments', { assignmentPage, assignmentSearch }],
    queryFn: () => assetApi.getAssignments({
      page: assignmentPage,
      limit: 10,
      search: assignmentSearch || undefined,
    }).then((res) => res.data.data),
    placeholderData: keepPreviousData,
  });

  const saveAssetMutation = useMutation({
    mutationFn: () => editingAsset
      ? assetApi.updateAsset(editingAsset._id, form)
      : assetApi.createAsset(form),
    onSuccess: () => {
      toast.success(editingAsset ? 'Asset updated.' : 'Asset created.');
      setFormOpen(false);
      setEditingAsset(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Asset save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assetApi.deleteAsset(id),
    onSuccess: () => {
      toast.success('Asset deleted.');
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Asset delete failed'),
  });

  const employeeMutation = useMutation({
    mutationFn: (id: string) => assetApi.getEmployee(id).then((res) => res.data.data?.employee),
    onSuccess: (employee) => {
      setSelectedEmployee(employee || null);
      if (!employee) toast.error('Employee not found.');
    },
    onError: (error: any) => {
      setSelectedEmployee(null);
      toast.error(error?.response?.data?.message || 'Employee lookup failed');
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => assetApi.assignAsset({ employeeId, assetId: selectedAssetId }),
    onSuccess: () => {
      toast.success('Asset assigned and agreement generated.');
      setEmployeeId('');
      setSelectedEmployee(null);
      setSelectedAssetId('');
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Asset assignment failed'),
  });

  const generateMutation = useMutation({
    mutationFn: (assignmentId: string) => assetApi.generateAgreement(assignmentId),
    onSuccess: (response) => {
      toast.success('Agreement generated.');
      const generated = response.data.data?.agreement;
      if (generated?._id) setAgreementId(generated._id);
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Agreement generation failed'),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ agreementId: id, action, comments }: { agreementId: string; action: 'approve' | 'reject'; comments?: string }) =>
      assetApi.verifyAgreement(id, { action, comments }),
    onSuccess: () => {
      toast.success('Agreement status updated.');
      setRejectAgreement(null);
      setRejectComments('');
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Agreement verification failed'),
  });

  const returnMutation = useMutation({
    mutationFn: () => assetApi.returnAsset(returnAssignment!._id, returnForm),
    onSuccess: () => {
      toast.success('Asset return recorded.');
      setReturnAssignment(null);
      setReturnForm({ returnDate: todayInputDate(), assetCondition: 'Good', returnNotes: '' });
      invalidate();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Asset return failed'),
  });

  const summary = useMemo(() => {
    const assets = assetQuery.data?.assets || [];
    return {
      listed: assets.length,
      available: assets.filter((asset) => asset.status === 'Available').length,
      assigned: assets.filter((asset) => asset.status === 'Assigned').length,
    };
  }, [assetQuery.data?.assets]);

  const openCreate = () => {
    setEditingAsset(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (asset: AssetRecord) => {
    setEditingAsset(asset);
    setForm({
      productName: asset.productName || '',
      category: asset.category || 'Laptop',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      imeiNumber: asset.imeiNumber || '',
      specification: asset.specification || '',
      status: asset.status,
    });
    setFormOpen(true);
  };

  const selectedAsset = availableQuery.data?.find((asset) => asset._id === selectedAssetId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" /> Asset Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track company assets, assignments, agreements, signed uploads, and return history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add Asset
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Listed Assets', value: summary.listed },
          { label: 'Available', value: summary.available },
          { label: 'Assigned', value: summary.assigned },
        ].map((item) => (
          <div key={item.label} className="card px-5 py-4">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="section-title">Assign Asset</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Employee information is loaded from Employee Master by Employee ID.</p>
          </div>
          <Badge variant="info">Available assets only</Badge>
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Input
            label="Employee ID"
            placeholder="EMP-26-001"
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          />
          <Select
            label="Available Asset"
            value={selectedAssetId}
            onChange={(event) => setSelectedAssetId(event.target.value)}
            placeholder="Select Asset"
            options={(availableQuery.data || []).map((asset) => ({
              value: asset._id,
              label: `${asset.assetId} - ${asset.productName}${asset.serialNumber ? ` (${asset.serialNumber})` : ''}`,
            }))}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<Search className="w-4 h-4" />}
              loading={employeeMutation.isPending}
              disabled={!employeeId.trim()}
              onClick={() => employeeMutation.mutate(employeeId.trim())}
            >
              Load
            </Button>
            <Button
              icon={<Package className="w-4 h-4" />}
              loading={assignMutation.isPending}
              disabled={!selectedEmployee || !selectedAssetId}
              onClick={() => assignMutation.mutate()}
            >
              Assign
            </Button>
          </div>
        </div>

        {(selectedEmployee || selectedAsset) && (
          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            {selectedEmployee && (
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase">Employee Details</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mt-2">{selectedEmployee.employeeName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.employeeId} · {selectedEmployee.department || 'Unassigned'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.designation || selectedEmployee.position || 'No designation'} · {selectedEmployee.email}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.phone || 'No phone number'}</p>
              </div>
            )}
            {selectedAsset && (
              <div className="rounded-xl border border-slate-100 dark:border-slate-700 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase">Asset Details</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mt-2">{selectedAsset.productName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedAsset.category} · {selectedAsset.serialNumber || selectedAsset.imeiNumber || 'No serial/IMEI'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{selectedAsset.specification || 'No specification recorded'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="form-input pl-9"
              placeholder="Search asset ID, product, serial number, or employee ID..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setAssetPage(1); }}
            />
          </div>
          <select className="form-input lg:w-44" value={category} onChange={(event) => { setCategory(event.target.value); setAssetPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="form-input lg:w-44" value={status} onChange={(event) => { setStatus(event.target.value); setAssetPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select className="form-input lg:w-44" value={assigned} onChange={(event) => { setAssigned(event.target.value); setAssetPage(1); }}>
            <option value="">All Assets</option>
            <option value="true">Assigned Assets</option>
            <option value="false">Available Pool</option>
          </select>
        </div>

        <div className="card p-0 overflow-hidden">
          <Table
            loading={assetQuery.isLoading}
            data={assetQuery.data?.assets || []}
            keyExtractor={(row) => row._id}
            columns={[
              { key: 'assetId', header: 'Asset ID', render: (value) => <span className="font-mono text-xs font-semibold">{String(value)}</span> },
              { key: 'productName', header: 'Product' },
              { key: 'category', header: 'Category' },
              { key: 'serialNumber', header: 'Serial / IMEI', render: (_, row) => row.serialNumber || row.imeiNumber || '-' },
              { key: 'specification', header: 'Specification', className: 'max-w-[260px] truncate', render: (value) => <span title={String(value || '')}>{String(value || '-')}</span> },
              { key: 'status', header: 'Status', render: (value) => <Badge variant={statusVariant(String(value)) as any}>{String(value)}</Badge> },
              { key: 'assignedEmployeeName', header: 'Assigned To', render: (_, row) => row.assignedEmployeeName ? `${row.assignedEmployeeName} (${row.assignedEmployeeId})` : '-' },
              { key: 'createdAt', header: 'Created', render: (value) => format(new Date(value as string), 'dd MMM yyyy') },
              {
                key: '_id',
                header: 'Actions',
                render: (_, row) => (
                  <div className="flex items-center gap-1">
                    {isSuperAdmin && (
                      <>
                        <Button size="sm" variant="ghost" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(row)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          disabled={row.status === 'Assigned'}
                          onClick={() => deleteMutation.mutate(row._id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
            emptyMessage="No assets found."
          />
          {assetQuery.data?.pagination && assetQuery.data.pagination.total > 10 && (
            <div className="px-4 border-t border-slate-100 dark:border-slate-700">
              <Pagination
                page={assetQuery.data.pagination.page}
                pages={assetQuery.data.pagination.pages}
                total={assetQuery.data.pagination.total}
                limit={10}
                onChange={setAssetPage}
              />
            </div>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="section-title">Assignment History & Agreements</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Review allocation status, agreement uploads, verification, and returns.</p>
          </div>
          <div className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="form-input pl-9"
              placeholder="Search assignments..."
              value={assignmentSearch}
              onChange={(event) => { setAssignmentSearch(event.target.value); setAssignmentPage(1); }}
            />
          </div>
        </div>
        <Table
          loading={assignmentQuery.isLoading}
          data={assignmentQuery.data?.assignments || []}
          keyExtractor={(row) => row._id}
          columns={[
            { key: 'assignmentId', header: 'Assignment', render: (value) => <span className="font-mono text-xs font-semibold">{String(value)}</span> },
            { key: 'employeeName', header: 'Employee', render: (_, row) => <div><p className="font-semibold">{row.employeeName}</p><p className="text-xs text-slate-400">{row.employeeId}</p></div> },
            { key: 'productName', header: 'Asset', render: (_, row) => <div><p>{row.productName}</p><p className="text-xs text-slate-400">{row.assetCode} · {row.serialNumber || row.imeiNumber || '-'}</p></div> },
            { key: 'assignedDate', header: 'Assigned', render: (value) => format(new Date(value as string), 'dd MMM yyyy') },
            { key: 'status', header: 'Assignment Status', render: (value) => <Badge variant={statusVariant(String(value)) as any}>{String(value)}</Badge> },
            { key: 'agreement', header: 'Agreement', render: (_, row) => row.agreement ? <Badge variant={statusVariant(row.agreement.status) as any}>{row.agreement.status}</Badge> : <Badge>No Agreement</Badge> },
            {
              key: '_id',
              header: 'Actions',
              render: (_, row) => (
                <div className="flex items-center gap-1">
                  {row.agreement?._id ? (
                    <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setAgreementId(row.agreement!._id)}>View</Button>
                  ) : (
                    <Button size="sm" variant="ghost" icon={<FileCheck className="w-3.5 h-3.5" />} onClick={() => generateMutation.mutate(row._id)}>Generate</Button>
                  )}
                  {row.agreement?.status === 'Signed Uploaded' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                        onClick={() => verifyMutation.mutate({ agreementId: row.agreement!._id, action: 'approve' })}
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setRejectAgreement(row)}>Reject</Button>
                    </>
                  )}
                  {row.status === 'Assigned' && (
                    <Button size="sm" variant="ghost" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setReturnAssignment(row)}>Return</Button>
                  )}
                </div>
              ),
            },
          ]}
          emptyMessage="No asset assignments found."
        />
        {assignmentQuery.data?.pagination && assignmentQuery.data.pagination.total > 10 && (
          <div className="px-4 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              page={assignmentQuery.data.pagination.page}
              pages={assignmentQuery.data.pagination.pages}
              total={assignmentQuery.data.pagination.total}
              limit={10}
              onChange={setAssignmentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingAsset ? 'Edit Asset' : 'Create Asset'}
        size="lg"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button loading={saveAssetMutation.isPending} onClick={() => saveAssetMutation.mutate()}>
              {editingAsset ? 'Save Changes' : 'Create Asset'}
            </Button>
          </div>
        )}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Product Name" required value={form.productName} onChange={(event) => setForm((prev) => ({ ...prev, productName: event.target.value }))} />
          <Select label="Category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} options={CATEGORY_OPTIONS.map((option) => ({ value: option, label: option }))} />
          <Input label="Brand" value={form.brand} onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))} />
          <Input label="Model" value={form.model} onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))} />
          <Input label="Serial Number" value={form.serialNumber} onChange={(event) => setForm((prev) => ({ ...prev, serialNumber: event.target.value }))} />
          <Input label="IMEI Number" value={form.imeiNumber} onChange={(event) => setForm((prev) => ({ ...prev, imeiNumber: event.target.value }))} />
          <Select label="Status" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as AssetStatus }))} options={STATUS_OPTIONS.map((option) => ({ value: option, label: option }))} />
          <div className="sm:col-span-2">
            <label className="form-label">Specification</label>
            <textarea
              className="form-input min-h-[110px]"
              value={form.specification}
              onChange={(event) => setForm((prev) => ({ ...prev, specification: event.target.value }))}
              placeholder="i7 / 16GB RAM / 256GB SSD / 90W Charger"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(returnAssignment)}
        onClose={() => setReturnAssignment(null)}
        title="Return Asset"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setReturnAssignment(null)}>Cancel</Button>
            <Button loading={returnMutation.isPending} onClick={() => returnMutation.mutate()}>Record Return</Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Returning {returnAssignment?.productName} assigned to {returnAssignment?.employeeName}.
          </p>
          <Input type="date" label="Return Date" value={returnForm.returnDate} onChange={(event) => setReturnForm((prev) => ({ ...prev, returnDate: event.target.value }))} />
          <Select
            label="Asset Condition"
            value={returnForm.assetCondition}
            onChange={(event) => setReturnForm((prev) => ({ ...prev, assetCondition: event.target.value as 'Good' | 'Damaged' | 'Lost' }))}
            options={[
              { value: 'Good', label: 'Good' },
              { value: 'Damaged', label: 'Damaged' },
              { value: 'Lost', label: 'Lost' },
            ]}
          />
          <div>
            <label className="form-label">Return Notes</label>
            <textarea className="form-input min-h-[90px]" value={returnForm.returnNotes} onChange={(event) => setReturnForm((prev) => ({ ...prev, returnNotes: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(rejectAgreement)}
        onClose={() => setRejectAgreement(null)}
        title="Reject Signed Agreement"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setRejectAgreement(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={verifyMutation.isPending}
              onClick={() => verifyMutation.mutate({ agreementId: rejectAgreement!.agreement!._id, action: 'reject', comments: rejectComments })}
            >
              Reject
            </Button>
          </div>
        )}
      >
        <label className="form-label">Rejection Reason</label>
        <textarea className="form-input min-h-[110px]" value={rejectComments} onChange={(event) => setRejectComments(event.target.value)} />
      </Modal>

      <AgreementModal agreementId={agreementId} onClose={() => setAgreementId(null)} />
    </div>
  );
};
