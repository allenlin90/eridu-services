import type { ColumnDef } from '@tanstack/react-table';
import { Check, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import {
  adaptColumnFiltersChange,
  adaptPaginationChange,
  AsyncCombobox,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DataTableActions,
  DataTablePagination,
  DataTableToolbar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenuItem,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTableUrlState,
} from '@eridu/ui';

import {
  type StudioMcRosterItem,
  useCreateStudioMcRosterItem,
  useDeleteStudioMcRosterItem,
  useStudioMcCatalog,
  useStudioMcRoster,
  useUpdateStudioMcRosterItem,
} from '../api/studio-mc-roster';

type StudioMcRosterManagerProps = {
  studioId: string;
};

type EditableRosterFields = {
  default_rate_type: string | null;
  default_rate: string;
  default_commission_rate: string;
};

function toEditableDefaults(item: StudioMcRosterItem): EditableRosterFields {
  return {
    default_rate_type: item.default_rate_type,
    default_rate: item.default_rate ?? '',
    default_commission_rate: item.default_commission_rate ?? '',
  };
}

function formatCompensationType(value: string | null): string {
  return value ?? 'NONE';
}

export function StudioMcRosterManager({ studioId }: StudioMcRosterManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogMcId, setSelectedCatalogMcId] = useState('');
  const [editingItem, setEditingItem] = useState<StudioMcRosterItem | null>(null);
  const [editableFields, setEditableFields] = useState<EditableRosterFields>({
    default_rate_type: null,
    default_rate: '',
    default_commission_rate: '',
  });
  const {
    pagination,
    onPaginationChange,
    setPageCount,
    columnFilters,
    onColumnFiltersChange,
  } = useTableUrlState({
    from: '/studios/$studioId/creators/',
    searchColumnId: 'mc_name',
    paramNames: {
      search: 'search',
    },
  });

  const rosterSearch = (columnFilters.find((filter) => filter.id === 'mc_name')?.value as string | undefined) || undefined;
  const statusFilter = columnFilters.find((filter) => filter.id === 'is_active')?.value as string | undefined;
  const compensationTypeFilter = columnFilters.find((filter) => filter.id === 'default_rate_type')?.value as string | undefined;
  const rosterIsActiveFilter = statusFilter === 'true' ? true : statusFilter === 'false' ? false : undefined;

  const rosterQuery = useStudioMcRoster(studioId, {
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: rosterSearch,
    is_active: rosterIsActiveFilter,
    default_rate_type: compensationTypeFilter,
  });
  const catalogQuery = useStudioMcCatalog(studioId, catalogSearch);
  const createRosterItem = useCreateStudioMcRosterItem(studioId);
  const updateRosterItem = useUpdateStudioMcRosterItem(studioId);
  const deleteRosterItem = useDeleteStudioMcRosterItem(studioId);

  const rosterItems = useMemo(() => rosterQuery.data?.data ?? [], [rosterQuery.data?.data]);
  const rosterPagination = rosterQuery.data?.meta
    ? {
        pageIndex: rosterQuery.data.meta.page - 1,
        pageSize: rosterQuery.data.meta.limit,
        total: rosterQuery.data.meta.total,
        pageCount: rosterQuery.data.meta.totalPages,
      }
    : {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        total: 0,
        pageCount: 0,
      };

  useEffect(() => {
    if (rosterQuery.data?.meta?.totalPages !== undefined) {
      setPageCount(rosterQuery.data.meta.totalPages);
    }
  }, [rosterQuery.data?.meta?.totalPages, setPageCount]);

  const catalogOptions = useMemo(
    () =>
      (catalogQuery.data ?? []).map((mc) => ({
        value: mc.id,
        label: mc.alias_name ? `${mc.name} (${mc.alias_name})` : mc.name,
      })),
    [catalogQuery.data],
  );
  const selectedCatalogOption = useMemo(
    () => catalogOptions.find((option) => option.value === selectedCatalogMcId),
    [catalogOptions, selectedCatalogMcId],
  );
  const totalFilteredCreators = rosterQuery.data?.meta?.total ?? 0;
  const isSearchingRoster = Boolean(rosterSearch?.trim());
  const rosterEmptyMessage = isSearchingRoster
    ? `No creators found for "${rosterSearch}".`
    : 'No creators in this studio roster yet.';

  const openEditDialog = (item: StudioMcRosterItem) => {
    setEditingItem(item);
    setEditableFields(toEditableDefaults(item));
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditableFields({
      default_rate_type: null,
      default_rate: '',
      default_commission_rate: '',
    });
  };

  const handleAddToRoster = () => {
    if (!selectedCatalogMcId) {
      return;
    }
    createRosterItem.mutate(
      { mc_id: selectedCatalogMcId, is_active: true },
      {
        onSuccess: () => {
          setIsAddDialogOpen(false);
          setSelectedCatalogMcId('');
          setCatalogSearch('');
        },
      },
    );
  };

  const handleToggleActive = (item: StudioMcRosterItem) => {
    updateRosterItem.mutate({
      mcId: item.mc_id,
      payload: { is_active: !item.is_active },
    });
  };

  const handleSaveDefaults = () => {
    if (!editingItem) {
      return;
    }

    const defaultRate = editableFields.default_rate.trim();
    const defaultCommissionRate = editableFields.default_commission_rate.trim();

    updateRosterItem.mutate(
      {
        mcId: editingItem.mc_id,
        payload: {
          default_rate_type: editableFields.default_rate_type ?? null,
          default_rate: defaultRate ? Number(defaultRate) : null,
          default_commission_rate: defaultCommissionRate
            ? Number(defaultCommissionRate)
            : null,
        },
      },
      { onSuccess: () => closeEditDialog() },
    );
  };

  const columns: ColumnDef<StudioMcRosterItem>[] = [
    {
      accessorKey: 'mc_name',
      header: 'Creator',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.mc_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.mc_alias_name || '—'}</div>
        </div>
      ),
    },
    {
      id: 'is_active',
      accessorFn: (row) => (row.is_active ? 'true' : 'false'),
      header: 'Status',
      cell: ({ row }) => (
        row.original.is_active
          ? <Badge variant="default">Active</Badge>
          : <Badge variant="secondary">Inactive</Badge>
      ),
      size: 140,
    },
    {
      id: 'default_rate_type',
      accessorFn: (row) => formatCompensationType(row.default_rate_type),
      header: 'Compensation Type',
      cell: ({ row }) => (
        <Badge variant="outline">{formatCompensationType(row.original.default_rate_type)}</Badge>
      ),
      size: 180,
    },
    {
      accessorKey: 'default_rate',
      header: 'Default Rate',
      cell: ({ row }) => row.original.default_rate ?? '—',
      size: 140,
    },
    {
      accessorKey: 'default_commission_rate',
      header: 'Default Commission (%)',
      cell: ({ row }) => row.original.default_commission_rate ?? '—',
      size: 170,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DataTableActions
          row={row.original}
          onEdit={(item) => openEditDialog(item)}
          renderExtraActions={(item) => (
            <>
              <DropdownMenuItem
                onClick={() => handleToggleActive(item)}
                disabled={updateRosterItem.isPending}
              >
                {item.is_active
                  ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    )
                  : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteRosterItem.mutate(item.mc_id)}
                disabled={deleteRosterItem.isPending}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from roster
              </DropdownMenuItem>
            </>
          )}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Creator to Studio Roster</CardTitle>
          <CardDescription>
            Search from global creators and onboard them into this studio roster before mapping.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {totalFilteredCreators}
            {' '}
            creators
          </div>
          <Button type="button" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Creator
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Studio Creator Roster</CardTitle>
          <CardDescription>
            Manage activation and studio-specific compensation defaults used by creator mapping and economics fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rosterItems}
            columns={columns}
            isLoading={rosterQuery.isLoading}
            isFetching={rosterQuery.isFetching}
            emptyMessage={rosterEmptyMessage}
            manualPagination
            manualFiltering
            pageCount={rosterPagination.pageCount}
            paginationState={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            }}
            onPaginationChange={adaptPaginationChange(rosterPagination, onPaginationChange)}
            columnFilters={columnFilters}
            onColumnFiltersChange={adaptColumnFiltersChange(columnFilters, onColumnFiltersChange)}
            renderToolbar={(table) => (
              <DataTableToolbar
                table={table}
                searchColumn="mc_name"
                searchPlaceholder="Search creators by name or alias..."
                searchableColumns={[
                  { id: 'mc_name', title: 'Creator', type: 'text' },
                  {
                    id: 'is_active',
                    title: 'Status',
                    type: 'select',
                    options: [
                      { label: 'Active', value: 'true' },
                      { label: 'Inactive', value: 'false' },
                    ],
                  },
                  {
                    id: 'default_rate_type',
                    title: 'Compensation Type',
                    type: 'select',
                    options: [
                      { label: 'FIXED', value: CREATOR_COMPENSATION_TYPE.FIXED },
                      { label: 'COMMISSION', value: CREATOR_COMPENSATION_TYPE.COMMISSION },
                      { label: 'HYBRID', value: CREATOR_COMPENSATION_TYPE.HYBRID },
                      { label: 'None', value: 'NONE' },
                    ],
                  },
                ]}
              >
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => void rosterQuery.refetch()}
                  disabled={rosterQuery.isFetching}
                  aria-label="Refresh creator roster"
                >
                  <RefreshCw className={`h-4 w-4 ${rosterQuery.isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </DataTableToolbar>
            )}
            renderFooter={() => (
              <DataTablePagination
                pagination={{
                  pageIndex: pagination.pageIndex,
                  pageSize: pagination.pageSize,
                  total: rosterPagination.total,
                  pageCount: rosterPagination.pageCount,
                }}
                onPaginationChange={onPaginationChange}
              />
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={editingItem !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Creator Defaults</DialogTitle>
            <DialogDescription>
              Update studio-specific compensation defaults for this creator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Compensation Type</Label>
              <Select
                value={editableFields.default_rate_type ?? 'NONE'}
                onValueChange={(value) => setEditableFields((prev) => ({
                  ...prev,
                  default_rate_type: value === 'NONE' ? null : value,
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value={CREATOR_COMPENSATION_TYPE.FIXED}>FIXED</SelectItem>
                  <SelectItem value={CREATOR_COMPENSATION_TYPE.COMMISSION}>COMMISSION</SelectItem>
                  <SelectItem value={CREATOR_COMPENSATION_TYPE.HYBRID}>HYBRID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Rate</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 1200"
                value={editableFields.default_rate}
                onChange={(event) => setEditableFields((prev) => ({
                  ...prev,
                  default_rate: event.target.value,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Commission Rate (%)</Label>
              <Input
                inputMode="decimal"
                placeholder="e.g. 15"
                value={editableFields.default_commission_rate}
                onChange={(event) => setEditableFields((prev) => ({
                  ...prev,
                  default_commission_rate: event.target.value,
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleSaveDefaults} disabled={updateRosterItem.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setSelectedCatalogMcId('');
            setCatalogSearch('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Creator to Studio Roster</DialogTitle>
            <DialogDescription>
              Search creators from the global catalog and onboard them into this studio roster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <AsyncCombobox
              value={selectedCatalogMcId}
              onChange={setSelectedCatalogMcId}
              onSearch={setCatalogSearch}
              options={catalogOptions}
              isLoading={catalogQuery.isLoading || catalogQuery.isFetching}
              placeholder="Search creators to add..."
              emptyMessage="No matching creators found."
              disabled={createRosterItem.isPending}
            />

            {selectedCatalogOption && (
              <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="truncate">
                  Selected:
                  {' '}
                  <span className="font-medium">{selectedCatalogOption.label}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCatalogMcId('')}
                  disabled={createRosterItem.isPending}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setSelectedCatalogMcId('');
                setCatalogSearch('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToRoster}
              disabled={!selectedCatalogMcId || createRosterItem.isPending}
            >
              {createRosterItem.isPending ? 'Adding...' : 'Add to Roster'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
