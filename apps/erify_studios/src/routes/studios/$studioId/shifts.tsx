import {
  type CalendarEvent,
  viewDay,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { useNextCalendarApp } from '@schedule-x/react';
import { createFileRoute } from '@tanstack/react-router';
import { Filter, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  AsyncCombobox,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
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

export const Route = createFileRoute('/studios/$studioId/shifts')({
  component: StudioShiftsPage,
});

type ShiftStatusFilter = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
type DutyManagerFilter = 'ALL' | 'YES' | 'NO';

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const { data: profile, isLoading: isLoadingProfile } = useUserProfile();

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);

  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(20);
  const [tableUserIdFilter, setTableUserIdFilter] = useState('');
  const [tableMemberSearch, setTableMemberSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<ShiftStatusFilter>('ALL');
  const [tableDutyFilter, setTableDutyFilter] = useState<DutyManagerFilter>('ALL');
  const [tableDateFrom, setTableDateFrom] = useState('');
  const [tableDateTo, setTableDateTo] = useState('');

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
      page: tablePage,
      limit: tableLimit,
      ...(tableUserIdFilter ? { user_id: tableUserIdFilter } : {}),
      ...(tableDateFrom ? { date_from: tableDateFrom } : {}),
      ...(tableDateTo ? { date_to: tableDateTo } : {}),
      ...(tableStatusFilter !== 'ALL' ? { status: tableStatusFilter } : {}),
      ...(tableDutyFilter === 'YES' ? { is_duty_manager: true } : {}),
      ...(tableDutyFilter === 'NO' ? { is_duty_manager: false } : {}),
    } as const;
  }, [
    tableDateFrom,
    tableDateTo,
    tableDutyFilter,
    tableLimit,
    tablePage,
    tableStatusFilter,
    tableUserIdFilter,
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
    setTableUserIdFilter('');
    setTableStatusFilter('ALL');
    setTableDutyFilter('ALL');
    setTableDateFrom('');
    setTableDateTo('');
    setTableLimit(20);
    setTableMemberSearch('');
    setTablePage(1);
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
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            onClick={() => setViewMode('table')}
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Search and Filters
                  </CardTitle>
                  <CardDescription>
                    Search shifts by member and use advanced filters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Member</Label>
                      <AsyncCombobox
                        value={tableUserIdFilter}
                        onChange={(value) => {
                          setTableUserIdFilter(value);
                          setTablePage(1);
                        }}
                        onSearch={setTableMemberSearch}
                        options={tableMemberOptions}
                        isLoading={isLoadingTableMemberOptions}
                        placeholder="Search a studio member..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={tableStatusFilter}
                        onValueChange={(value) => {
                          setTableStatusFilter(value as ShiftStatusFilter);
                          setTablePage(1);
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
                        value={tableDutyFilter}
                        onValueChange={(value) => {
                          setTableDutyFilter(value as DutyManagerFilter);
                          setTablePage(1);
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

                    <div className="space-y-2">
                      <Label>Date From</Label>
                      <DatePicker
                        value={tableDateFrom}
                        onChange={(value) => {
                          setTableDateFrom(value);
                          setTablePage(1);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date To</Label>
                      <DatePicker
                        value={tableDateTo}
                        onChange={(value) => {
                          setTableDateTo(value);
                          setTablePage(1);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                      Reset Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <ShiftRosterCard
                shifts={tableShifts}
                isLoading={isLoadingTableShifts}
                isFetching={isFetchingTableShifts}
                page={tablePage}
                totalPages={tableShiftsResponse?.meta?.totalPages ?? 1}
                total={tableShiftsResponse?.meta?.total ?? 0}
                limit={tableLimit}
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
                onPreviousPage={() => setTablePage((previous) => Math.max(1, previous - 1))}
                onNextPage={() => setTablePage((previous) =>
                  Math.min(tableShiftsResponse?.meta?.totalPages ?? previous, previous + 1))}
                onLimitChange={(limit) => {
                  setTableLimit(limit);
                  setTablePage(1);
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
