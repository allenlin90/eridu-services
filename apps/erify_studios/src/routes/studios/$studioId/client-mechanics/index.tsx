import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import type { ClientMechanicApiResponse } from '@eridu/api-types/client-mechanics';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  AsyncCombobox,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTablePagination,
  DataTableToolbar,
} from '@eridu/ui';

import { PageLayout } from '@/components/layouts/page-layout';
import {
  MechanicCreateDialog,
  MechanicDeleteDialog,
  MechanicRetireDialog,
  MechanicUpdateDialog,
} from '@/features/client-mechanics/components/mechanic-dialogs';
import {
  getMechanicColumns,
  mechanicSearchableColumns,
} from '@/features/client-mechanics/config/mechanic-columns';
import { useClientMechanics } from '@/features/client-mechanics/hooks/use-client-mechanics';
import { getClients } from '@/features/clients/api/get-clients';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

const clientMechanicsRouteApi = getRouteApi('/studios/$studioId/client-mechanics/');

const clientMechanicsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).catch(10),
  search: z.string().optional().catch(undefined),
  status: z.enum(['active', 'retired']).optional().catch(undefined),
  client_id: z.string().optional().catch(undefined),
});

type Mechanic = ClientMechanicApiResponse;

function ClientMechanicsPage() {
  const { studioId } = clientMechanicsRouteApi.useParams();
  const search = clientMechanicsRouteApi.useSearch();
  const navigate = clientMechanicsRouteApi.useNavigate();
  const { role } = useStudioAccess(studioId);
  const canDelete = role === STUDIO_ROLE.ADMIN;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMechanic, setEditingMechanic] = useState<Mechanic | null>(null);
  const [retiringMechanic, setRetiringMechanic] = useState<Mechanic | null>(null);
  const [deletingMechanic, setDeletingMechanic] = useState<Mechanic | null>(null);

  const [clientSearch, setClientSearch] = useState('');
  const clientsQuery = useQuery({
    queryKey: ['studio-clients', studioId, clientSearch],
    queryFn: ({ signal }) => getClients({ name: clientSearch || undefined, limit: 50 }, studioId, { signal }),
    enabled: Boolean(studioId),
  });

  const clients = useMemo(() => clientsQuery.data?.data ?? [], [clientsQuery.data]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === search.client_id),
    [clients, search.client_id],
  );

  const clientOptions = useMemo(() => {
    const fetched = clients.map((c) => ({ value: c.id, label: c.name }));
    if (selectedClient && !fetched.some((opt) => opt.value === selectedClient.id)) {
      fetched.unshift({ value: selectedClient.id, label: selectedClient.name });
    }
    return fetched;
  }, [clients, selectedClient]);

  // Default to the first client if none is selected in URL state.
  useEffect(() => {
    if (!search.client_id && clients.length > 0 && clients[0]?.id) {
      void navigate({
        to: '/studios/$studioId/client-mechanics',
        params: { studioId },
        search: (prev) => ({
          ...prev,
          client_id: clients[0].id,
        }),
        replace: true,
      });
    }
  }, [search.client_id, clients, navigate, studioId]);

  const {
    data: mechanics,
    isLoading,
    isFetching,
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    createMutation,
    updateMutation,
    deleteMutation,
    handleRefresh,
  } = useClientMechanics({
    studioId,
    clientId: search.client_id,
  });

  const handleCreate = async (formData: any) => {
    await createMutation.mutateAsync(formData);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (formData: any) => {
    if (!editingMechanic)
      return;
    await updateMutation.mutateAsync({
      mechanicId: editingMechanic.id,
      data: formData,
    });
    setEditingMechanic(null);
  };

  const handleRetire = async () => {
    if (!retiringMechanic)
      return;
    await updateMutation.mutateAsync({
      mechanicId: retiringMechanic.id,
      data: {
        status: 'retired',
        version: retiringMechanic.version,
      },
    });
    setRetiringMechanic(null);
  };

  const handleDelete = async () => {
    if (!deletingMechanic)
      return;
    await deleteMutation.mutateAsync(deletingMechanic.id);
    setDeletingMechanic(null);
  };

  const handleReactivate = useCallback(async (mechanic: Mechanic) => {
    await updateMutation.mutateAsync({
      mechanicId: mechanic.id,
      data: {
        status: 'active',
        version: mechanic.version,
      },
    });
  }, [updateMutation]);

  const columns = useMemo(() => {
    return getMechanicColumns({
      onEdit: (mech) => setEditingMechanic(mech),
      onRetire: (mech) => setRetiringMechanic(mech),
      onReactivate: handleReactivate,
      onDelete: (mech) => setDeletingMechanic(mech),
      onViewCoverage: (mech) => {
        void navigate({
          to: '/studios/$studioId/client-mechanics/$mechanicId/coverage',
          params: { studioId, mechanicId: mech.id },
          search: (prev) => ({ ...prev, client_id: search.client_id }),
        });
      },
      isActionPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
      canDelete,
    });
  }, [createMutation.isPending, updateMutation.isPending, deleteMutation.isPending, handleReactivate, canDelete, navigate, studioId, search.client_id]);

  return (
    <PageLayout
      title="Client Mechanics"
      description="Manage client-specific reusable moderation rules and speaking instructions."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Client</CardTitle>
            <CardDescription>
              Select a client to manage their reusable moderation cues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <AsyncCombobox
                className="w-[300px]"
                value={search.client_id || ''}
                onChange={(val) => {
                  void navigate({
                    to: '/studios/$studioId/client-mechanics',
                    params: { studioId },
                    search: (prev) => ({ ...prev, client_id: val || undefined, page: 1 }),
                  });
                }}
                onSearch={setClientSearch}
                options={clientOptions}
                isLoading={clientsQuery.isLoading}
                placeholder="Choose a client..."
              />
            </div>
          </CardContent>
        </Card>

        {search.client_id
          ? (
              <DataTable
                data={mechanics}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyMessage="No mechanics found. Create one to get started."
                manualPagination
                manualFiltering
                pageCount={pagination.pageCount}
                paginationState={{
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                }}
                onPaginationChange={adaptPaginationChange(pagination, onPaginationChange)}
                columnFilters={columnFilters}
                onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
                renderToolbar={(table) => (
                  <DataTableToolbar
                    table={table}
                    searchColumn="title"
                    searchableColumns={mechanicSearchableColumns}
                    searchPlaceholder="Search mechanics..."
                    featuredFilterColumns={['status']}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRefresh}
                      disabled={isFetching}
                      aria-label="Refresh mechanics"
                    >
                      <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      onClick={() => setIsCreateOpen(true)}
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Mechanic
                    </Button>
                  </DataTableToolbar>
                )}
                renderFooter={() => (
                  <DataTablePagination
                    pagination={pagination}
                    onPaginationChange={onPaginationChange}
                  />
                )}
              />
            )
          : (
              !clientsQuery.isLoading && clients.length === 0 && (
                <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No clients found for this studio.
                </div>
              )
            )}
      </div>

      <MechanicCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        clientName={selectedClient?.name}
      />

      <MechanicUpdateDialog
        mechanic={editingMechanic}
        onOpenChange={(open) => !open && setEditingMechanic(null)}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        clientName={selectedClient?.name}
      />

      <MechanicRetireDialog
        open={!!retiringMechanic}
        onOpenChange={(open) => !open && setRetiringMechanic(null)}
        onConfirm={handleRetire}
        isLoading={updateMutation.isPending}
        title={retiringMechanic?.title}
      />

      <MechanicDeleteDialog
        open={!!deletingMechanic}
        onOpenChange={(open) => !open && setDeletingMechanic(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title={deletingMechanic?.title}
      />
    </PageLayout>
  );
}

export const Route = createFileRoute('/studios/$studioId/client-mechanics/')({
  validateSearch: (search) => clientMechanicsSearchSchema.parse(search),
  component: ClientMechanicsPage,
});
