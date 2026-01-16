import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import type {
  CreateShowTypeInput,
  ShowTypeApiResponse,
  UpdateShowTypeInput,
} from '@eridu/api-types/show-types';
import {
  createShowTypeInputSchema,
  updateShowTypeInputSchema,
} from '@eridu/api-types/show-types';
import { useTableUrlState } from '@eridu/ui';

import {
  AdminFormDialog,
  AdminLayout,
  AdminTable,
  DeleteConfirmDialog,
} from '@/features/admin/components';
import { CopyIdCell } from '@/features/admin/components/copy-id-cell';
import { queryKeys } from '@/lib/api/query-keys';
import {
  useAdminCreate,
  useAdminDelete,
  useAdminList,
  useAdminUpdate,
} from '@/lib/hooks/use-admin-crud';

const showTypesSearchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().min(10).max(100).catch(10),
  name: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/system/show-types/')({
  component: ShowTypesList,
  validateSearch: (search) => showTypesSearchSchema.parse(search),
});

// ShowType type from shared schema
type ShowType = ShowTypeApiResponse;

function ShowTypesList() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShowType, setEditingShowType] = useState<ShowType | null>(null);

  const queryClient = useQueryClient();

  // URL state
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/system/show-types/',
    paramNames: {
      search: 'name',
    },
  });

  const nameFilter = columnFilters.find((filter) => filter.id === 'name')
    ?.value as string | undefined;

  // Fetch show types list
  const { data, isLoading } = useAdminList<ShowType>('show-types', {
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
  const createMutation = useAdminCreate<ShowType, CreateShowTypeInput>('show-types');
  const updateMutation = useAdminUpdate<ShowType, UpdateShowTypeInput>('show-types');
  const deleteMutation = useAdminDelete('show-types');

  // Table columns
  const columns: ColumnDef<ShowType>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <CopyIdCell id={row.original.id} />,
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
      console.error('Failed to delete show type:', error);
    }
  };

  const handleCreate = async (data: CreateShowTypeInput) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: UpdateShowTypeInput) => {
    if (!editingShowType)
      return;
    await updateMutation.mutateAsync({ id: editingShowType.id, data });
    setEditingShowType(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.lists('show-types'),
    });
  };

  return (
    <AdminLayout
      title="Show Types"
      description="Manage different types of shows"
      action={{
        label: 'Create Show Type',
        onClick: () => setIsCreateDialogOpen(true),
      }}
      onRefresh={handleRefresh}
      refreshQueryKey={queryKeys.admin.lists('show-types')}
    >
      <AdminTable
        data={data?.data || []}
        columns={columns}
        isLoading={isLoading}
        onEdit={(type) => setEditingShowType(type)}
        onDelete={(type) => setDeleteId(type.id)}
        emptyMessage="No show types found. Create one to get started."
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        searchableColumns={[
          { id: 'name', title: 'Name' },
        ]}
        searchPlaceholder="Search show types..."
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
        title="Create Show Type"
        description="Add a new show type to the system"
        schema={createShowTypeInputSchema}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter show type name',
          },
        ]}
      />

      <AdminFormDialog
        open={!!editingShowType}
        onOpenChange={(open) => !open && setEditingShowType(null)}
        title="Edit Show Type"
        description="Update show type information"
        schema={updateShowTypeInputSchema}
        defaultValues={editingShowType ? { name: editingShowType.name } : undefined}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        fields={[
          {
            name: 'name',
            label: 'Name',
            placeholder: 'Enter show type name',
          },
          {
            name: 'id' as any, // Virtual field for display
            label: 'ID',
            render: () => (
              <div className="flex flex-col gap-2">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={editingShowType?.id || ''}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    navigator.clipboard.writeText(editingShowType?.id || '');
                  }}
                  title="Click to copy ID"
                />
              </div>
            ),
          },
        ]}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Show Type"
        description="Are you sure you want to delete this show type? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
