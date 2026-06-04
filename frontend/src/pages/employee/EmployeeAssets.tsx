import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Download, Eye, FileText, Package, Upload } from 'lucide-react';
import { assetApi } from '../../services/api';
import { AssetAgreementView } from '../../components/assets/AssetAgreementView';
import { Badge, Button, EmptyState, Modal, Spinner } from '../../components/common/UI';
import { Table } from '../../components/common/Table';
import { printElementAsPdf } from '../../utils/payroll';
import type { AssetAgreementPayload, AssetAssignmentRecord } from '../../types';

const statusVariant = (status?: string) => {
  if (status === 'Verified' || status === 'Returned') return 'approved';
  if (status === 'Signed Uploaded' || status === 'Assigned') return 'submitted';
  if (status === 'Rejected' || status === 'Lost' || status === 'Damaged') return 'rejected';
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
            onClick={() => printElementAsPdf('employee-asset-agreement-print', `Asset-Agreement-${query.data?.agreement.agreementNumber}`)}
          >
            Download PDF
          </Button>
        </div>
      )}
    >
      {query.isLoading || !query.data?.payload ? (
        <div className="py-20 flex justify-center"><Spinner size="lg" /></div>
      ) : (
        <AssetAgreementView elementId="employee-asset-agreement-print" payload={query.data.payload as AssetAgreementPayload} />
      )}
    </Modal>
  );
};

export const EmployeeAssets: React.FC = () => {
  const queryClient = useQueryClient();
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [uploadAssignment, setUploadAssignment] = useState<AssetAssignmentRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const assetQuery = useQuery({
    queryKey: ['employeeAssets'],
    queryFn: () => assetApi.getMine().then((res) => res.data.data?.assignments || []),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const agreement = uploadAssignment?.agreement;
      if (!agreement || !selectedFile) throw new Error('Select a signed agreement file.');
      const formData = new FormData();
      formData.append('signedAgreement', selectedFile, selectedFile.name);
      return assetApi.uploadSignedAgreement(agreement._id, formData);
    },
    onSuccess: () => {
      toast.success('Signed agreement uploaded.');
      setUploadAssignment(null);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['employeeAssets'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || error?.message || 'Upload failed'),
  });

  const assignments = assetQuery.data || [];
  const totals = useMemo(() => ({
    active: assignments.filter((row) => row.status === 'Assigned').length,
    agreements: assignments.filter((row) => row.agreement).length,
    verified: assignments.filter((row) => row.agreement?.status === 'Verified').length,
  }), [assignments]);

  if (assetQuery.isLoading) {
    return <div className="py-24 flex justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Package className="w-6 h-6 text-primary-600" /> My Assets
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View assigned company assets, download agreements, and upload signed copies.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Assets', value: totals.active },
          { label: 'Agreements', value: totals.agreements },
          { label: 'Verified', value: totals.verified },
        ].map((item) => (
          <div key={item.label} className="card px-5 py-4">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="section-title">Assigned Assets</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Only assets assigned to your employee profile are shown.</p>
        </div>

        {assignments.length ? (
          <Table
            data={assignments}
            keyExtractor={(row) => row._id}
            columns={[
              { key: 'productName', header: 'Product' },
              { key: 'serialNumber', header: 'Serial / IMEI', render: (_, row) => row.serialNumber || row.imeiNumber || '-' },
              { key: 'specification', header: 'Specification', className: 'max-w-[320px] truncate', render: (value) => <span title={String(value || '')}>{String(value || '-')}</span> },
              { key: 'assignedDate', header: 'Assigned Date', render: (value) => format(new Date(value as string), 'dd MMM yyyy') },
              { key: 'agreement', header: 'Agreement Status', render: (_, row) => row.agreement ? <Badge variant={statusVariant(row.agreement.status) as any}>{row.agreement.status}</Badge> : <Badge>No Agreement</Badge> },
              {
                key: '_id',
                header: 'Actions',
                render: (_, row) => (
                  <div className="flex items-center gap-1">
                    {row.agreement?._id && (
                      <>
                        <Button size="sm" variant="ghost" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setAgreementId(row.agreement!._id)}>View</Button>
                        <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={() => setAgreementId(row.agreement!._id)}>Download</Button>
                      </>
                    )}
                    {row.agreement && ['Pending Signature', 'Rejected'].includes(row.agreement.status) && (
                      <Button size="sm" variant="ghost" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setUploadAssignment(row)}>Upload</Button>
                    )}
                    {row.agreement?.signedPdfUrl && (
                      <a
                        href={row.agreement.signedPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <FileText className="w-3.5 h-3.5" /> Signed
                      </a>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState
            icon={<Package className="w-10 h-10" />}
            title="No assigned assets"
            description="Your company assets will appear here after HR assigns them."
          />
        )}
      </div>

      <Modal
        isOpen={Boolean(uploadAssignment)}
        onClose={() => { setUploadAssignment(null); setSelectedFile(null); }}
        title="Upload Signed Agreement"
        footer={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => { setUploadAssignment(null); setSelectedFile(null); }}>Cancel</Button>
            <Button
              icon={<Upload className="w-4 h-4" />}
              loading={uploadMutation.isPending}
              disabled={!selectedFile}
              onClick={() => uploadMutation.mutate()}
            >
              Submit
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Upload the physically signed copy for {uploadAssignment?.productName}. PDF, JPG, and PNG files up to 10 MB are supported.
          </p>
          <label className="block rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <Upload className="w-6 h-6 text-slate-400 mx-auto" />
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mt-2">
              {selectedFile ? selectedFile.name : 'Choose signed file'}
            </span>
            <span className="block text-xs text-slate-400 mt-1">PDF, JPG, PNG · Max 10 MB</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>
          {uploadAssignment?.agreement?.rejectionReason && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              Previous rejection: {uploadAssignment.agreement.rejectionReason}
            </div>
          )}
        </div>
      </Modal>

      <AgreementModal agreementId={agreementId} onClose={() => setAgreementId(null)} />
    </div>
  );
};
