import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCog, Plus, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { superAdminApi } from '../../services/api';
import { Button, Input, Modal, Spinner, Select, Badge } from '../../components/common/UI';
import { Table } from '../../components/common/Table';

// FIX: role field added to schema so admin/super_admin can be selected
const createUserSchema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName:  z.string().min(2, 'Min 2 characters'),
  email:     z.string().email('Valid email required'),
  role:      z.enum(['admin', 'super_admin']).default('admin'),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export const AdminManagement: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminList'],
    queryFn:  () => superAdminApi.getAdminList().then((r) => r.data.data?.admins || []),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'admin' },
  });

  const createMutation = useMutation({
    mutationFn: superAdminApi.createAdmin,
    onSuccess: () => {
      toast.success('User created! Login credentials sent via email.');
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
      setShowModal(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create user'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      superAdminApi.updateAdminStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated.');
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
    },
    onError: () => toast.error('Status update failed'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary-600" /> Admin Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage Admin and Super Admin accounts.</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Create User
        </Button>
      </div>

      <div className="card p-0 overflow-hidden">
        <Table
          loading={isLoading}
          data={data || []}
          keyExtractor={(r) => r._id}
          columns={[
            {
              key: 'name', header: 'User',
              render: (_, r) => (
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
                    ${r.role === 'super_admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.firstName?.[0]}{r.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-slate-400">{r.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'role', header: 'Role',
              render: (_, r) => (
                <Badge variant={r.role === 'super_admin' ? 'review' : 'submitted'}>
                  {r.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </Badge>
              ),
            },
            {
              key: 'status', header: 'Status',
              render: (_, r) => (
                <Badge variant={r.status === 'active' ? 'approved' : r.status === 'suspended' ? 'rejected' : 'info'}>
                  {r.status}
                </Badge>
              ),
            },
            {
              key: 'lastLogin', header: 'Last Login',
              render: (v) => v ? format(new Date(v as string), 'dd MMM yyyy') : 'Never',
            },
            {
              key: 'createdAt', header: 'Created',
              render: (v) => format(new Date(v as string), 'dd MMM yyyy'),
            },
            {
              key: '_id', header: 'Actions',
              render: (_, r) => (
                <div className="flex gap-2">
                  {r.status === 'active'
                    ? <Button size="sm" variant="danger"
                        onClick={() => statusMutation.mutate({ id: r._id, status: 'suspended' })}>
                        Suspend
                      </Button>
                    : <Button size="sm" variant="success"
                        onClick={() => statusMutation.mutate({ id: r._id, status: 'active' })}>
                        Activate
                      </Button>}
                </div>
              ),
            },
          ]}
          emptyMessage="No admins found. Create one to get started."
        />
      </div>

      {/* FIX: role dropdown in create modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }}
        title="Create New Admin / Super Admin"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowModal(false); reset(); }}>Cancel</Button>
            <Button loading={createMutation.isPending}
              onClick={handleSubmit((d) => createMutation.mutate(d))}>
              Create User
            </Button>
          </>
        }>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            A temporary password will be generated and emailed to the user.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" leftIcon={<User className="w-4 h-4" />}
              error={errors.firstName?.message} required {...register('firstName')} />
            <Input label="Last Name" error={errors.lastName?.message} required {...register('lastName')} />
          </div>
          <Input label="Email Address" type="email" leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message} required {...register('email')} />
          {/* FIX: role selection dropdown */}
          <Select label="Role" required
            options={[
              { value: 'admin',       label: 'Admin'       },
              { value: 'super_admin', label: 'Super Admin' },
            ]}
            error={errors.role?.message}
            hint="Admin can verify sections. Super Admin can give final approval."
            {...register('role')} />
        </div>
      </Modal>
    </div>
  );
};
