import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type { PlatformApiResponse } from '@eridu/api-types/platforms';
import { useTableUrlState } from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const platformsSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/platforms/')({
  component: PlatformsList,
  validateSearch: (search) => platformsSearchSchema.parse(search),
});

// Platform type from shared schema
type Platform = PlatformApiResponse;

// Form schema
const platformSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  api_config: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON format').optional().or(z.literal('')),
});

type PlatformFormData = z.infer<typeof platformSchema>;

function PlatformsList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/platforms/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;

  // Fetch platforms list
  const { data, isLoading } = useAdminList<Platform>('platforms', {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    name: nameFilter,
  });

  // Sync page count for auto-correction
  useEffect(() => {
    if (data?.meta?.totalPages !== undefined) {
      setPageCount(data.meta.totalPages);
    }
  }, [data?.meta?.totalPages, setPageCount]);

  // Mutations
  const createMutation = useAdminCreate<Platform, any>('platforms');
  const updateMutation = useAdminUpdate<Platform, any>('platforms');
  const deleteMutation = useAdminDelete('platforms');

  // Table columns
  const columns: ColumnDef<Platform>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated At',
      cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
    },
  ];

  const handleDelete = async () => {
    if (!deleteId)
      return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete platform:', error);
    }
  };

  const handleCreate = async (formData: PlatformFormData) => {
    const data = {
      ...formData,
      api_config: formData.api_config ? JSON.parse(formData.api_config) : {},
    };
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (formData: PlatformFormData) => {
    if (!editingPlatform)
      return;
    const data = {
      ...formData,
      api_config: formData.api_config ? JSON.parse(formData.api_config) : {},
    };
    await updateMutation.mutateAsync({ id: editingPlatform.id, data });
    setEditingPlatform(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('platforms'),
    });
  };

  return (
    <AdminLayout
      title="Platforms"
      description="Manage streaming platforms and their configurations"
      action={{
        label: 'Create Platform',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('platforms')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(platform) => setEditingPlatform(platform)}
        onDelete={(platform) => setDeleteId(platform.id)}
        emptyMessage="No platforms found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={[
          { id: 'name', title: 'Name' },
        ]}
        searchPlaceholder="Search platforms..."
        pagination={
          data?.meta
            ? {
                pageIndex: data.meta.page - 1,
                pageSize: data.meta.limit,
                total: data.meta.total,
                pageCount: data.meta.totalPages,
              }
            : undefined
        }
        onPaginationChange={onPaginationChange}
      />

      <AdminFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create Platform"
        description="Add a new platform to the system"
        schema={platformSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter platform name',
          },
          {
            name: 'api_config',
            label: 'API Config (JSON)',
            placeholder: '{"apiKey": "...", "apiSecret": "..."}',
            type: 'textarea',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingPlatform}
        onOpenChange={(open) => !open && setEditingPlatform(null)}
        title="Edit Platform"
        description="Update platform information"
        schema={platformSchema}
        defaultValues={
          editingPlatform
            ? {
                name: editingPlatform.name,
                api_config: JSON.stringify(editingPlatform.api_config, null, 2),
              }
            : undefined
        }
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter platform name',
          },
          {
            name: 'api_config',
            label: 'API Config (JSON)',
            placeholder: '{"apiKey": "...", "apiSecret": "..."}',
            type: 'textarea',
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Platform"
        description="Are you sure you want to delete this platform? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
