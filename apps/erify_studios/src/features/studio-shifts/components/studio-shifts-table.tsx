import { useCallback, useEffect, useMemo, useState } from 'react';

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { useAssignDutyManager } from '@/features/studio-shifts/api/assign-duty-manager';
import {
  type CreateStudioShiftPayload,
  useCreateStudioShift,
} from '@/features/studio-shifts/api/create-studio-shift';
import { useDeleteStudioShift } from '@/features/studio-shifts/api/delete-studio-shift';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import {
  type UpdateStudioShiftPayload,
  useUpdateStudioShift,
} from '@/features/studio-shifts/api/update-studio-shift';
import { ShiftRosterCard } from '@/features/studio-shifts/components/shift-roster-card';
import { ShiftToolbar } from '@/features/studio-shifts/components/shift-toolbar';
import { StudioShiftFormDialog } from '@/features/studio-shifts/components/studio-shift-form-dialog';
import { useStudioMemberMap } from '@/features/studio-shifts/hooks/use-studio-member-map';
import { useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import {
  createDefaultFormState,
  createEditFormState,
  formatDateTime,
  getShiftBlockLabels,
  getShiftDisplayDate,
  getShiftWindowLabel,
} from '@/features/studio-shifts/utils/shift-form.utils';
import {
  buildStudioShiftsQueryParams,
  getApiErrorMessage,
  type ShiftListDutyFilter,
  type ShiftListStatus,
  sortShiftsByFirstBlockStart,
  validateShiftBlocks,
} from '@/features/studio-shifts/utils/studio-shifts-table.utils';

export type StudioShiftsTableSearch = {
  view: 'calendar' | 'table';
  page: number;
  limit: number;
  user_id?: string;
  status?: ShiftListStatus;
  duty?: ShiftListDutyFilter;
  date_from?: string;
  date_to?: string;
};

export type StudioShiftsTableSearchUpdater = (previous: StudioShiftsTableSearch) => StudioShiftsTableSearch;

export type StudioShiftsTableProps = {
  studioId: string;
  isStudioAdmin: boolean;
  search: StudioShiftsTableSearch;
  updateSearch: (updater: StudioShiftsTableSearchUpdater, options?: { replace?: boolean }) => void;
};

type EditDialogState = {
  shiftId: string;
  formState: ShiftFormState;
  error: string | null;
};

type ToolbarSearchParams = {
  user_id?: string;
  status?: ShiftListStatus;
  duty?: ShiftListDutyFilter;
  date_from?: string;
  date_to?: string;
};

export function StudioShiftsTable({ studioId, isStudioAdmin, search, updateSearch }: StudioShiftsTableProps) {
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);
  const [tableMemberSearch, setTableMemberSearch] = useState('');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [createFormState, setCreateFormState] = useState<ShiftFormState>(() => createDefaultFormState());
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const [editDialogState, setEditDialogState] = useState<EditDialogState | null>(null);
  const [editMemberSearch, setEditMemberSearch] = useState('');

  const hasAnyFilters = Boolean(
    search.user_id
    || search.status
    || search.duty
    || search.date_from
    || search.date_to,
  );

  const { memberMap } = useStudioMemberMap(studioId, { enabled: isStudioAdmin });
  const { data: createMemberOptionsResponse, isLoading: isLoadingCreateMemberOptions } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: createMemberSearch || undefined },
    { enabled: isStudioAdmin && isCreateDialogOpen },
  );
  const { data: editMemberOptionsResponse, isLoading: isLoadingEditMemberOptions } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: editMemberSearch || undefined },
    { enabled: isStudioAdmin && Boolean(editDialogState) },
  );
  const { data: tableMemberOptionsResponse, isLoading: isLoadingTableMemberOptions } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: tableMemberSearch || undefined },
    { enabled: isStudioAdmin },
  );

  const tableQueryParams = useMemo(() => buildStudioShiftsQueryParams(search), [search]);

  const {
    data: tableShiftsResponse,
    isLoading: isLoadingTableShifts,
    isFetching: isFetchingTableShifts,
    refetch: refetchTableShifts,
  } = useStudioShifts(studioId, tableQueryParams, { enabled: isStudioAdmin });

  const createShiftMutation = useCreateStudioShift(studioId);
  const deleteShiftMutation = useDeleteStudioShift(studioId);
  const updateShiftMutation = useUpdateStudioShift(studioId);
  const assignDutyManagerMutation = useAssignDutyManager(studioId);

  const tableMemberOptions = useMemo(() => {
    const rows = tableMemberOptionsResponse?.data ?? [];
    return rows.map((member) => ({
      value: member.user.id,
      label: `${member.user.name} (${member.user.email})`,
    }));
  }, [tableMemberOptionsResponse?.data]);

  const tableShifts = useMemo(() => {
    return sortShiftsByFirstBlockStart(tableShiftsResponse?.data ?? []);
  }, [tableShiftsResponse?.data]);
  const tableTotalPages = tableShiftsResponse?.meta?.totalPages ?? 1;

  useEffect(() => {
    if (search.page > tableTotalPages && tableTotalPages > 0) {
      updateSearch((previous) => ({
        ...previous,
        page: tableTotalPages,
      }));
    }
  }, [search.page, tableTotalPages, updateSearch]);

  const editingShift = useMemo(() => {
    if (!editDialogState) {
      return null;
    }

    return tableShifts.find((shift) => shift.id === editDialogState.shiftId) ?? null;
  }, [editDialogState, tableShifts]);

  const handleCreateShift = useCallback(async () => {
    setCreateFormError(null);

    if (!createFormState.userId) {
      setCreateFormError('Please select a studio member.');
      return;
    }

    if (!createFormState.date) {
      setCreateFormError('Date is required.');
      return;
    }

    const { error: blocksError, blocks } = validateShiftBlocks(createFormState.date, createFormState.blocks);
    if (blocksError || !blocks) {
      setCreateFormError(blocksError);
      return;
    }

    const payload: CreateStudioShiftPayload = {
      user_id: createFormState.userId,
      date: createFormState.date,
      blocks,
      is_duty_manager: createFormState.isDutyManager,
    };

    if (createFormState.hourlyRate.trim()) {
      payload.hourly_rate = Number(createFormState.hourlyRate);
    }

    try {
      await createShiftMutation.mutateAsync(payload);
      setIsCreateDialogOpen(false);
      setCreateFormState((previous) => ({
        ...createDefaultFormState(),
        userId: previous.userId,
      }));
      setCreateMemberSearch('');
    } catch (error) {
      setCreateFormError(getApiErrorMessage(error, 'Failed to create shift. Please try again.'));
    }
  }, [createFormState, createShiftMutation]);

  const handleDeleteShift = useCallback(async (shiftId: string) => {
    if (deleteConfirmShiftId !== shiftId) {
      setDeleteConfirmShiftId(shiftId);
      return;
    }

    await deleteShiftMutation.mutateAsync(shiftId);
    setDeleteConfirmShiftId(null);
  }, [deleteConfirmShiftId, deleteShiftMutation]);

  const handleSetDutyManager = useCallback(async (shiftId: string, isDutyManager: boolean) => {
    await assignDutyManagerMutation.mutateAsync({ shiftId, isDutyManager });
  }, [assignDutyManagerMutation]);

  const handleStartEdit = useCallback((shift: StudioShift) => {
    setEditDialogState({
      shiftId: shift.id,
      formState: createEditFormState(shift),
      error: null,
    });
    setEditMemberSearch('');
  }, []);

  const handleUpdateShift = useCallback(async () => {
    if (!editDialogState || !editingShift) {
      return;
    }

    const { formState } = editDialogState;
    setEditDialogState((previous) => (previous ? { ...previous, error: null } : null));

    if (!formState.userId) {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'Please select a studio member.' } : null));
      return;
    }

    if (!formState.date) {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'Date is required.' } : null));
      return;
    }

    const { error: blocksError, blocks } = validateShiftBlocks(formState.date, formState.blocks);
    if (blocksError || !blocks) {
      setEditDialogState((previous) => (previous ? { ...previous, error: blocksError } : null));
      return;
    }

    const payload: UpdateStudioShiftPayload = {
      user_id: formState.userId,
      date: formState.date,
      status: formState.status ?? 'SCHEDULED',
      is_duty_manager: formState.isDutyManager,
      blocks,
    };

    if (formState.hourlyRate.trim()) {
      payload.hourly_rate = Number(formState.hourlyRate);
    }

    try {
      await updateShiftMutation.mutateAsync({ shiftId: editingShift.id, payload });
      setEditDialogState(null);
    } catch (error) {
      setEditDialogState((previous) => (
        previous
          ? { ...previous, error: getApiErrorMessage(error, 'Failed to update shift. Please try again.') }
          : null
      ));
    }
  }, [editDialogState, editingShift, updateShiftMutation]);

  const handleResetFilters = useCallback(() => {
    setTableMemberSearch('');
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      user_id: undefined,
      status: undefined,
      duty: undefined,
      date_from: undefined,
      date_to: undefined,
    }));
  }, [updateSearch]);

  const handleSearchChange = useCallback((updates: Partial<ToolbarSearchParams>) => {
    updateSearch((previous) => ({ ...previous, page: 1, ...updates }));
  }, [updateSearch]);

  const handleOpenCreateDialog = useCallback(() => setIsCreateDialogOpen(true), []);

  const handleRefresh = useCallback(() => {
    void refetchTableShifts();
  }, [refetchTableShifts]);

  const handlePreviousPage = useCallback(() => {
    updateSearch((previous) => ({ ...previous, page: Math.max(1, previous.page - 1) }), { replace: false });
  }, [updateSearch]);

  const handleNextPage = useCallback(() => {
    updateSearch((previous) => ({
      ...previous,
      page: Math.min(tableTotalPages, previous.page + 1),
    }), { replace: false });
  }, [tableTotalPages, updateSearch]);

  const handleLimitChange = useCallback((limit: number) => {
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      limit,
    }));
  }, [updateSearch]);

  const handleCreateDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setCreateFormState(createDefaultFormState());
      setCreateMemberSearch('');
      setCreateFormError(null);
    }
  }, []);

  const handleCloseCreateDialog = useCallback(() => {
    handleCreateDialogOpenChange(false);
  }, [handleCreateDialogOpenChange]);

  const handleEditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditDialogState(null);
      setEditMemberSearch('');
    }
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    handleEditDialogOpenChange(false);
  }, [handleEditDialogOpenChange]);

  return (
    <div className="space-y-4">
      <ShiftToolbar
        searchParams={{
          user_id: search.user_id,
          status: search.status,
          duty: search.duty,
          date_from: search.date_from,
          date_to: search.date_to,
        }}
        onSearchChange={handleSearchChange}
        onResetFilters={handleResetFilters}
        hasAnyFilters={hasAnyFilters}
        memberOptions={tableMemberOptions}
        isLoadingMembers={isLoadingTableMemberOptions}
        onMemberSearch={setTableMemberSearch}
        onCreateClick={handleOpenCreateDialog}
        onRefresh={handleRefresh}
        isRefreshing={isFetchingTableShifts}
      />

      <ShiftRosterCard
        shifts={tableShifts}
        isLoading={isLoadingTableShifts}
        isFetching={isFetchingTableShifts}
        page={search.page}
        totalPages={tableTotalPages}
        total={tableShiftsResponse?.meta?.total ?? 0}
        limit={search.limit}
        canManageShifts
        memberMap={memberMap}
        deleteConfirmShiftId={deleteConfirmShiftId}
        isMutating={
          assignDutyManagerMutation.isPending
          || updateShiftMutation.isPending
          || deleteShiftMutation.isPending
        }
        getShiftDisplayDate={getShiftDisplayDate}
        getShiftBlockLabels={getShiftBlockLabels}
        formatDateTime={formatDateTime}
        getShiftWindowLabel={getShiftWindowLabel}
        onToggleDutyManager={handleSetDutyManager}
        onEdit={handleStartEdit}
        onDelete={handleDeleteShift}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onLimitChange={handleLimitChange}
      />

      <StudioShiftFormDialog
        open={isCreateDialogOpen}
        title="Create Shift"
        description="Schedule a new shift for a studio member."
        idPrefix="create"
        members={createMemberOptionsResponse?.data ?? []}
        onMemberSearch={setCreateMemberSearch}
        isLoadingMembers={isLoadingCreateMemberOptions}
        formState={createFormState}
        onFormChange={setCreateFormState}
        formError={createFormError}
        isSubmitting={createShiftMutation.isPending}
        submitLabel="Create Shift"
        onSubmit={() => {
          void handleCreateShift();
        }}
        onOpenChange={handleCreateDialogOpenChange}
        onCancel={handleCloseCreateDialog}
      />

      <StudioShiftFormDialog
        open={Boolean(editDialogState)}
        title="Edit Shift"
        description="Update an existing shift."
        idPrefix="edit"
        members={editMemberOptionsResponse?.data ?? []}
        onMemberSearch={setEditMemberSearch}
        isLoadingMembers={isLoadingEditMemberOptions}
        formState={editDialogState?.formState ?? createFormState}
        onFormChange={(next) => {
          setEditDialogState((previous) => (previous ? { ...previous, formState: next } : null));
        }}
        includeStatus
        formError={editDialogState?.error ?? null}
        isSubmitting={updateShiftMutation.isPending}
        submitLabel="Save Changes"
        onSubmit={() => {
          void handleUpdateShift();
        }}
        onOpenChange={handleEditDialogOpenChange}
        onCancel={handleCloseEditDialog}
      />
    </div>
  );
}
