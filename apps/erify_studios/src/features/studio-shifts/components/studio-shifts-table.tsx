import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DeleteConfirmDialog } from '@/features/admin/components';
import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { useAssignDutyManager } from '@/features/studio-shifts/api/assign-duty-manager';
import {
  type CreateStudioShiftPayload,
  useCreateStudioShift,
} from '@/features/studio-shifts/api/create-studio-shift';
import { useDeleteStudioShift } from '@/features/studio-shifts/api/delete-studio-shift';
import {
  getAllStudioShiftsForExport,
  SHIFT_EXPORT_MAX_RECORDS,
  ShiftExportTooLargeError,
} from '@/features/studio-shifts/api/get-studio-shifts';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import { ShiftRosterCard } from '@/features/studio-shifts/components/shift-roster-card';
import { ShiftToolbar } from '@/features/studio-shifts/components/shift-toolbar';
import { StudioShiftFormDialog } from '@/features/studio-shifts/components/studio-shift-form-dialog';
import { useStudioMemberMap } from '@/features/studio-shifts/hooks/use-studio-member-map';
import { useStudioShiftsPageController } from '@/features/studio-shifts/hooks/use-studio-shifts-page-controller';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import {
  createDefaultFormState,
  formatDateTime,
  getShiftBlockLabels,
  getShiftDisplayDate,
  getShiftWindowLabel,
} from '@/features/studio-shifts/utils/shift-form.utils';
import {
  buildStudioShiftExportFilename,
  buildStudioShiftExportRows,
  createStudioShiftExportContent,
  type StudioShiftExportFormat,
} from '@/features/studio-shifts/utils/studio-shifts-export.utils';
import type { StudioShiftsRouteSearch } from '@/features/studio-shifts/utils/studio-shifts-route-search.utils';
import {
  getApiErrorMessage,
  type ShiftListDutyFilter,
  type ShiftListStatus,
  validateShiftBlocks,
} from '@/features/studio-shifts/utils/studio-shifts-table.utils';
import { triggerBrowserDownload } from '@/lib/file-download';

export type StudioShiftsTableSearch = StudioShiftsRouteSearch;

export type StudioShiftsTableSearchUpdater = (previous: StudioShiftsTableSearch) => StudioShiftsTableSearch;

export type StudioShiftsTableProps = {
  studioId: string;
  isStudioAdmin: boolean;
  search: StudioShiftsTableSearch;
  updateSearch: (updater: StudioShiftsTableSearchUpdater, options?: { replace?: boolean }) => void;
};

type ToolbarSearchParams = {
  user_id?: string;
  status?: ShiftListStatus;
  duty?: ShiftListDutyFilter;
};

export function StudioShiftsTable({ studioId, isStudioAdmin, search, updateSearch }: StudioShiftsTableProps) {
  const navigate = useNavigate();
  const [deleteDialogShiftId, setDeleteDialogShiftId] = useState<string | null>(null);
  const [tableMemberSearch, setTableMemberSearch] = useState('');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [createFormState, setCreateFormState] = useState<ShiftFormState>(() => createDefaultFormState());
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const exportAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      exportAbortRef.current?.abort();
    };
  }, []);

  const hasAnyFilters = Boolean(
    search.user_id
    || search.status
    || search.duty,
  );

  const { memberMap } = useStudioMemberMap(studioId, { enabled: isStudioAdmin });
  const { data: createMemberOptionsResponse, isLoading: isLoadingCreateMemberOptions } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: createMemberSearch || undefined },
    { enabled: isStudioAdmin && isCreateDialogOpen },
  );
  const { data: tableMemberOptionsResponse, isLoading: isLoadingTableMemberOptions } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: tableMemberSearch || undefined },
    { enabled: isStudioAdmin },
  );

  const {
    isLoading: isLoadingTableShifts,
    isFetching: isFetchingTableShifts,
    refetch: refetchTableShifts,
    pagination,
    onPaginationChange,
    shifts: tableShifts,
    data: tableData,
  } = useStudioShiftsPageController({
    studioId,
    search,
    enabled: isStudioAdmin,
  });

  const createShiftMutation = useCreateStudioShift(studioId);
  const deleteShiftMutation = useDeleteStudioShift(studioId);
  const assignDutyManagerMutation = useAssignDutyManager(studioId);

  const tableMemberOptions = useMemo(() => {
    const rows = tableMemberOptionsResponse?.data ?? [];
    return rows.map((member) => ({
      value: member.user.id,
      label: `${member.user.name} (${member.user.email})`,
    }));
  }, [tableMemberOptionsResponse?.data]);

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

  const handleDeleteClick = useCallback((shiftId: string) => {
    setDeleteDialogShiftId(shiftId);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteDialogShiftId(null);
    }
  }, []);

  const handleDeleteShift = useCallback(async () => {
    if (!deleteDialogShiftId) {
      return;
    }

    await deleteShiftMutation.mutateAsync(deleteDialogShiftId);
    setDeleteDialogShiftId(null);
  }, [deleteDialogShiftId, deleteShiftMutation]);

  const handleSetDutyManager = useCallback(async (shiftId: string, isDutyManager: boolean) => {
    await assignDutyManagerMutation.mutateAsync({ shiftId, isDutyManager });
  }, [assignDutyManagerMutation]);

  const handleStartEdit = useCallback((shift: StudioShift) => {
    void navigate({
      to: '/studios/$studioId/shifts/$shiftId',
      params: { studioId, shiftId: shift.id },
    });
  }, [navigate, studioId]);

  const handleManageCompensation = useCallback((shift: StudioShift) => {
    void navigate({
      to: '/studios/$studioId/shifts/$shiftId/compensation',
      params: { studioId, shiftId: shift.id },
    });
  }, [navigate, studioId]);

  const handleResetFilters = useCallback(() => {
    setTableMemberSearch('');
    updateSearch((previous) => ({
      ...previous,
      page: 1,
      user_id: undefined,
      status: undefined,
      duty: undefined,
    }));
  }, [updateSearch]);

  const handleSearchChange = useCallback((updates: Partial<ToolbarSearchParams>) => {
    updateSearch((previous) => ({ ...previous, page: 1, ...updates }));
  }, [updateSearch]);

  const handleOpenCreateDialog = useCallback(() => setIsCreateDialogOpen(true), []);

  const handleRefresh = useCallback(() => {
    void refetchTableShifts();
  }, [refetchTableShifts]);

  const handleExport = useCallback(async (format: StudioShiftExportFormat) => {
    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;

    const exportParams = {
      ...(search.user_id ? { user_id: search.user_id } : {}),
      ...(search.date_from ? { date_from: search.date_from } : {}),
      ...(search.date_to ? { date_to: search.date_to } : {}),
      ...(search.status ? { status: search.status } : {}),
      ...(search.duty ? { is_duty_manager: search.duty === 'true' } : {}),
    };
    setIsExporting(true);

    try {
      const exportShifts = await getAllStudioShiftsForExport(studioId, exportParams, { signal: controller.signal });
      if (controller.signal.aborted) {
        return;
      }
      const exportResult = buildStudioShiftExportRows({
        shifts: exportShifts,
        memberMap,
        getShiftDisplayDate,
        getShiftWindowLabel,
        formatDateTime,
      });
      triggerBrowserDownload({
        content: createStudioShiftExportContent(exportResult, format),
        mimeType: format === 'json' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;',
        filename: buildStudioShiftExportFilename({
          format,
          dateFrom: search.date_from,
          dateTo: search.date_to,
        }),
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      if (error instanceof ShiftExportTooLargeError) {
        toast.error(`Selection exceeds the ${SHIFT_EXPORT_MAX_RECORDS.toLocaleString()}-shift export limit (${error.totalRecords.toLocaleString()} matched). Narrow the date range or filters and retry.`);
        return;
      }
      toast.error(getApiErrorMessage(error, 'Failed to export shifts. Please try again.'));
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setIsExporting(false);
      }
    }
  }, [memberMap, search, studioId]);

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

  return (
    <div className="space-y-4">
      <ShiftToolbar
        searchParams={{
          user_id: search.user_id,
          status: search.status,
          duty: search.duty,
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
        onExport={handleExport}
        canExport={!isExporting && ((tableData?.meta.total ?? tableShifts.length) > 0)}
      />

      <ShiftRosterCard
        shifts={tableShifts}
        isLoading={isLoadingTableShifts}
        isFetching={isFetchingTableShifts}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        canManageShifts
        memberMap={memberMap}
        isMutating={
          assignDutyManagerMutation.isPending
          || deleteShiftMutation.isPending
        }
        getShiftDisplayDate={getShiftDisplayDate}
        getShiftBlockLabels={getShiftBlockLabels}
        formatDateTime={formatDateTime}
        getShiftWindowLabel={getShiftWindowLabel}
        onToggleDutyManager={handleSetDutyManager}
        onEdit={handleStartEdit}
        onManageCompensation={handleManageCompensation}
        onDelete={handleDeleteClick}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteDialogShiftId)}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={() => {
          void handleDeleteShift();
        }}
        title="Delete Shift"
        description="This action cannot be undone. This will permanently delete this shift."
        isLoading={deleteShiftMutation.isPending}
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

    </div>
  );
}
