import {
  type CalendarEvent,
  viewDay,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { useNextCalendarApp } from '@schedule-x/react';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronDown, Filter, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  AsyncCombobox,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  DatePickerWithRange,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import '@schedule-x/theme-default/dist/index.css';

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { useAssignDutyManager } from '@/features/studio-shifts/api/assign-duty-manager';
import {
  type CreateStudioShiftPayload,
  useCreateStudioShift,
} from '@/features/studio-shifts/api/create-studio-shift';
import { useDeleteStudioShift } from '@/features/studio-shifts/api/delete-studio-shift';
import {
  type UpdateStudioShiftPayload,
  useUpdateStudioShift,
} from '@/features/studio-shifts/api/update-studio-shift';
import { ShiftCalendarCard } from '@/features/studio-shifts/components/shift-calendar-card';
import { ShiftFormFields } from '@/features/studio-shifts/components/shift-form-fields';
import { ShiftRosterCard } from '@/features/studio-shifts/components/shift-roster-card';
import { useStudioShifts } from '@/features/studio-shifts/hooks/use-studio-shifts';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import { toScheduleXDateTime } from '@/features/studio-shifts/utils/schedule-x.utils';
import {
  combineDateAndTime,
  createDefaultFormState,
  createEditFormState,
  formatDate,
  formatDateTime,
  getShiftWindowLabel,
} from '@/features/studio-shifts/utils/shift-form.utils';
import { useUserProfile } from '@/lib/hooks/use-user';

const shiftsSearchSchema = z.object({
  view: z.enum(['calendar', 'table']).catch('calendar'),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(10).max(100).catch(20),
  user_id: z.string().optional().catch(undefined),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional().catch(undefined),
  duty: z.enum(['YES', 'NO']).optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/studios/$studioId/shifts')({
  validateSearch: (search) => shiftsSearchSchema.parse(search),
  component: StudioShiftsPage,
});

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const viewMode = search.view;
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);
  const [tableMemberSearch, setTableMemberSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(
    Boolean(search.status || search.duty || search.date_from || search.date_to),
  );

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [createFormState, setCreateFormState] = useState<ShiftFormState>(() => createDefaultFormState());
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const [editDialogState, setEditDialogState] = useState<{
    shiftId: string;
    formState: ShiftFormState;
    error: string | null;
  } | null>(null);
  const [editMemberSearch, setEditMemberSearch] = useState('');

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const isStudioAdmin = activeMembership?.role === STUDIO_ROLE.ADMIN;
  const hasAnyFilters = Boolean(
    search.user_id
    || search.status
    || search.duty
    || search.date_from
    || search.date_to,
  );

  const updateSearch = useCallback((
    updater: (previous: typeof search) => typeof search,
    options?: { replace?: boolean },
  ) => {
    void navigate({
      to: '/studios/$studioId/shifts',
      params: { studioId },
      search: updater,
      replace: options?.replace ?? true,
    });
  }, [navigate, studioId]);

  const tableDateRange = useMemo<DateRange | undefined>(() => {
    if (!search.date_from && !search.date_to) {
      return undefined;
    }
    return {
      from: search.date_from ? new Date(`${search.date_from}T00:00:00`) : undefined,
      to: search.date_to ? new Date(`${search.date_to}T00:00:00`) : undefined,
    };
  }, [search.date_from, search.date_to]);

  const { data: displayMembersResponse } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 200 },
    { enabled: isStudioAdmin },
  );
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
    { enabled: isStudioAdmin && viewMode === 'table' },
  );

  const {
    data: calendarShiftsResponse,
    isLoading: isLoadingCalendarShifts,
    isFetching: isFetchingCalendarShifts,
  } = useStudioShifts(studioId, { page: 1, limit: 500 }, { enabled: isStudioAdmin });

  const tableQueryParams = useMemo(() => {
    return {
      page: search.page,
      limit: search.limit,
      ...(search.user_id ? { user_id: search.user_id } : {}),
      ...(search.date_from ? { date_from: search.date_from } : {}),
      ...(search.date_to ? { date_to: search.date_to } : {}),
      ...(search.status ? { status: search.status } : {}),
      ...(search.duty === 'YES' ? { is_duty_manager: true } : {}),
      ...(search.duty === 'NO' ? { is_duty_manager: false } : {}),
    } as const;
  }, [
    search.date_from,
    search.date_to,
    search.duty,
    search.limit,
    search.page,
    search.status,
    search.user_id,
  ]);

  const {
    data: tableShiftsResponse,
    isLoading: isLoadingTableShifts,
    isFetching: isFetchingTableShifts,
  } = useStudioShifts(studioId, tableQueryParams, { enabled: isStudioAdmin });

  const createShiftMutation = useCreateStudioShift(studioId);
  const deleteShiftMutation = useDeleteStudioShift(studioId);
  const updateShiftMutation = useUpdateStudioShift(studioId);
  const assignDutyManagerMutation = useAssignDutyManager(studioId);

  const displayMembers = useMemo(() => displayMembersResponse?.data ?? [], [displayMembersResponse?.data]);
  const tableMemberOptions = useMemo(() => {
    const rows = tableMemberOptionsResponse?.data ?? [];
    return rows.map((member) => ({
      value: member.user.id,
      label: `${member.user.name} (${member.user.email})`,
    }));
  }, [tableMemberOptionsResponse?.data]);

  const memberMap = useMemo(() => {
    return new Map(
      displayMembers.map((member) => [
        member.user.id,
        {
          name: member.user.name,
          email: member.user.email,
        },
      ]),
    );
  }, [displayMembers]);

  const calendarShifts = useMemo(() => {
    const rows = calendarShiftsResponse?.data ?? [];
    return [...rows].sort((a, b) => {
      const timeA = a.blocks[0] ? new Date(a.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.blocks[0] ? new Date(b.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [calendarShiftsResponse?.data]);

  const tableShifts = useMemo(() => {
    const rows = tableShiftsResponse?.data ?? [];
    return [...rows].sort((a, b) => {
      const timeA = a.blocks[0] ? new Date(a.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.blocks[0] ? new Date(b.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
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

  const editingShift = editDialogState
    ? tableShifts.find((shift) => shift.id === editDialogState.shiftId)
    ?? calendarShifts.find((shift) => shift.id === editDialogState.shiftId)
    ?? null
    : null;

  const calendarEvents = useMemo(() => {
    return calendarShifts.flatMap((shift) => {
      const user = memberMap.get(shift.user_id);
      const memberName = user?.name ?? shift.user_id;
      const sortedBlocks = [...shift.blocks].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
      const firstBlock = sortedBlocks[0];
      const lastBlock = sortedBlocks[sortedBlocks.length - 1];
      if (!firstBlock || !lastBlock) {
        return [];
      }

      return [{
        id: shift.id,
        title: shift.is_duty_manager ? `Duty: ${memberName}` : memberName,
        start: toScheduleXDateTime(firstBlock.start_time),
        end: toScheduleXDateTime(lastBlock.end_time),
        calendarId: shift.is_duty_manager ? 'duty-manager' : 'shift',
        description: `${formatDate(shift.date)} | ${shift.status}`,
      }];
    });
  }, [calendarShifts, memberMap]);

  const calendarApp = useNextCalendarApp({
    views: [viewMonthGrid, viewWeek, viewDay],
    defaultView: viewWeek.name,
    events: calendarEvents as unknown as CalendarEvent[],
    calendars: {
      'shift': {
        colorName: 'shift',
        lightColors: {
          main: '#1d4ed8',
          container: '#dbeafe',
          onContainer: '#1e3a8a',
        },
      },
      'duty-manager': {
        colorName: 'duty',
        lightColors: {
          main: '#b45309',
          container: '#fef3c7',
          onContainer: '#78350f',
        },
      },
    },
  });

  const handleCreateShift = async () => {
    setCreateFormError(null);

    if (!createFormState.userId) {
      setCreateFormError('Please select a studio member.');
      return;
    }

    if (!createFormState.date || !createFormState.startTime || !createFormState.endTime) {
      setCreateFormError('Date, start time, and end time are required.');
      return;
    }

    const start = combineDateAndTime(createFormState.date, createFormState.startTime);
    const end = combineDateAndTime(createFormState.date, createFormState.endTime);

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setCreateFormError('End time must be later than start time.');
      return;
    }

    const payload: CreateStudioShiftPayload = {
      user_id: createFormState.userId,
      date: createFormState.date,
      blocks: [{ start_time: start, end_time: end }],
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
    } catch {
      setCreateFormError('Failed to create shift. Please try again.');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (deleteConfirmShiftId !== shiftId) {
      setDeleteConfirmShiftId(shiftId);
      return;
    }

    await deleteShiftMutation.mutateAsync(shiftId);
    setDeleteConfirmShiftId(null);
  };

  const handleSetDutyManager = async (shiftId: string, isDutyManager: boolean) => {
    await assignDutyManagerMutation.mutateAsync({ shiftId, isDutyManager });
  };

  const handleStartEdit = (shift: (typeof tableShifts)[number]) => {
    setEditDialogState({
      shiftId: shift.id,
      formState: createEditFormState(shift),
      error: null,
    });
    setEditMemberSearch('');
  };

  const handleUpdateShift = async () => {
    if (!editDialogState || !editingShift) {
      return;
    }

    const { formState } = editDialogState;
    setEditDialogState((previous) => (previous ? { ...previous, error: null } : null));

    if (!formState.userId) {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'Please select a studio member.' } : null));
      return;
    }

    if (!formState.date || !formState.startTime || !formState.endTime) {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'Date, start time, and end time are required.' } : null));
      return;
    }

    const start = combineDateAndTime(formState.date, formState.startTime);
    const end = combineDateAndTime(formState.date, formState.endTime);

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'End time must be later than start time.' } : null));
      return;
    }

    const payload: UpdateStudioShiftPayload = {
      user_id: formState.userId,
      date: formState.date,
      status: formState.status ?? 'SCHEDULED',
      is_duty_manager: formState.isDutyManager,
      blocks: [{ start_time: start, end_time: end }],
    };

    if (formState.hourlyRate.trim()) {
      payload.hourly_rate = Number(formState.hourlyRate);
    }

    try {
      await updateShiftMutation.mutateAsync({ shiftId: editingShift.id, payload });
      setEditDialogState(null);
    } catch {
      setEditDialogState((previous) => (previous ? { ...previous, error: 'Failed to update shift. Please try again.' } : null));
    }
  };

  const handleResetFilters = () => {
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
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checking access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isStudioAdmin) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Shift Management Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only studio admins can access shift management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Studio Shift Schedule</h1>
        <p className="text-muted-foreground">
          Manage all studio shifts with calendar and table views.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
        <div className="inline-flex rounded-md border bg-background p-1">
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() =>
              updateSearch((previous) => ({
                ...previous,
                view: 'calendar',
              }), { replace: false })}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() =>
              updateSearch((previous) => ({
                ...previous,
                view: 'table',
              }), { replace: false })}
          >
            Table
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Shift
        </Button>
      </div>

      {viewMode === 'calendar'
        ? (
            <div className="grid gap-4">
              <ShiftCalendarCard
                isLoading={isLoadingCalendarShifts}
                isFetching={isFetchingCalendarShifts}
                shiftCount={calendarShifts.length}
                calendarApp={calendarApp}
              />
            </div>
          )
        : (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full space-y-2 lg:max-w-md">
                    <Label>Member</Label>
                    <AsyncCombobox
                      value={search.user_id ?? ''}
                      onChange={(value) => {
                        updateSearch((previous) => ({
                          ...previous,
                          page: 1,
                          user_id: value || undefined,
                        }));
                      }}
                      onSearch={setTableMemberSearch}
                      options={tableMemberOptions}
                      isLoading={isLoadingTableMemberOptions}
                      placeholder="Search and select a studio member..."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFilterOpen((previous) => !previous)}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Advanced Filters
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetFilters}
                      disabled={!hasAnyFilters}
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <CollapsibleContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Shift Status</Label>
                        <Select
                          value={search.status ?? 'ALL'}
                          onValueChange={(value) => {
                            updateSearch((previous) => ({
                              ...previous,
                              page: 1,
                              status: value === 'ALL' ? undefined : value as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED',
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Duty Manager</Label>
                        <Select
                          value={search.duty ?? 'ALL'}
                          onValueChange={(value) => {
                            updateSearch((previous) => ({
                              ...previous,
                              page: 1,
                              duty: value === 'ALL' ? undefined : value as 'YES' | 'NO',
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="YES">Duty Manager Only</SelectItem>
                            <SelectItem value="NO">Non Duty Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2 lg:col-span-1">
                        <Label>Date Range</Label>
                        <DatePickerWithRange
                          date={tableDateRange}
                          setDate={(range) => {
                            updateSearch((previous) => ({
                              ...previous,
                              page: 1,
                              date_from: range?.from ? toLocalDateInputValue(range.from) : undefined,
                              date_to: range?.to ? toLocalDateInputValue(range.to) : undefined,
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Status tracks operational lifecycle: scheduled, completed, or cancelled.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>

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
                formatDate={formatDate}
                formatDateTime={formatDateTime}
                getShiftWindowLabel={getShiftWindowLabel}
                onToggleDutyManager={handleSetDutyManager}
                onEdit={handleStartEdit}
                onDelete={handleDeleteShift}
                onPreviousPage={() =>
                  updateSearch((previous) => ({ ...previous, page: Math.max(1, previous.page - 1) }), { replace: false })}
                onNextPage={() =>
                  updateSearch((previous) => ({
                    ...previous,
                    page: Math.min(tableTotalPages, previous.page + 1),
                  }), { replace: false })}
                onLimitChange={(limit) => {
                  updateSearch((previous) => ({
                    ...previous,
                    page: 1,
                    limit,
                  }));
                }}
              />
            </div>
          )}

      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateFormError(null);
          }
          setIsCreateDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Shift</DialogTitle>
            <DialogDescription>
              Create a shift and optionally assign duty manager immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <ShiftFormFields
              idPrefix="studio-shift-create"
              members={createMemberOptionsResponse?.data ?? []}
              onMemberSearch={setCreateMemberSearch}
              isLoadingMembers={isLoadingCreateMemberOptions}
              formState={createFormState}
              onChange={setCreateFormState}
            />
            {createFormError && <p className="text-sm text-destructive">{createFormError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createShiftMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateShift} disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editDialogState)}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogState(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>
              Update shift details, status, and duty manager assignment.
            </DialogDescription>
          </DialogHeader>

          {editDialogState && (
            <div className="space-y-4 py-2">
              <ShiftFormFields
                idPrefix="studio-shift-edit"
                members={editMemberOptionsResponse?.data ?? []}
                onMemberSearch={setEditMemberSearch}
                isLoadingMembers={isLoadingEditMemberOptions}
                formState={editDialogState.formState}
                onChange={(nextFormState) =>
                  setEditDialogState((previous) => (previous ? { ...previous, formState: nextFormState } : null))}
                includeStatus
              />
              {editDialogState.error && <p className="text-sm text-destructive">{editDialogState.error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogState(null)} disabled={updateShiftMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpdateShift} disabled={updateShiftMutation.isPending}>
              {updateShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
