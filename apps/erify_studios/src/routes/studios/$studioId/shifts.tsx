import {
  type CalendarEvent,
  viewDay,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar';
import { useNextCalendarApp } from '@schedule-x/react';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Card,
  CardContent,
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
import { CurrentDutyManagerCard } from '@/features/studio-shifts/components/current-duty-manager-card';
import { ShiftCalendarCard } from '@/features/studio-shifts/components/shift-calendar-card';
import { ShiftCreateCard } from '@/features/studio-shifts/components/shift-create-card';
import { ShiftEditCard } from '@/features/studio-shifts/components/shift-edit-card';
import { ShiftRosterCard } from '@/features/studio-shifts/components/shift-roster-card';
import {
  useDutyManager,
  useStudioShifts,
} from '@/features/studio-shifts/hooks/use-studio-shifts';
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

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const { data: profile } = useUserProfile();

  const [formState, setFormState] = useState<ShiftFormState>(() => createDefaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{
    shiftId: string;
    formState: ShiftFormState;
    error: string | null;
  } | null>(null);

  const { data: membersResponse, isLoading: isLoadingMembers } = useStudioMembershipsQuery(
    studioId,
    { limit: 200 },
  );
  const { data: shiftsResponse, isLoading: isLoadingShifts, isFetching: isFetchingShifts }
    = useStudioShifts(studioId, { limit: 200, page: 1 });
  const { data: dutyManager, isLoading: isLoadingDutyManager } = useDutyManager(studioId);

  const createShiftMutation = useCreateStudioShift(studioId);
  const deleteShiftMutation = useDeleteStudioShift(studioId);
  const updateShiftMutation = useUpdateStudioShift(studioId);
  const assignDutyManagerMutation = useAssignDutyManager(studioId);

  const activeMembership = useMemo(
    () => profile?.studio_memberships?.find((membership) => membership.studio.uid === studioId),
    [profile?.studio_memberships, studioId],
  );
  const canManageShifts = activeMembership?.role === STUDIO_ROLE.ADMIN;

  const members = useMemo(() => membersResponse?.data ?? [], [membersResponse?.data]);
  const selectedUserId = formState.userId || members[0]?.user.id || '';

  const memberMap = useMemo(() => {
    return new Map(
      members.map((member) => [
        member.user.id,
        {
          name: member.user.name,
          email: member.user.email,
        },
      ]),
    );
  }, [members]);

  const shifts = useMemo(() => {
    const rows = shiftsResponse?.data ?? [];
    return [...rows].sort((a, b) => {
      const timeA = a.blocks[0] ? new Date(a.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.blocks[0] ? new Date(b.blocks[0].start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [shiftsResponse?.data]);

  const editingShift = draftState
    ? shifts.find((shift) => shift.id === draftState.shiftId) ?? null
    : null;

  const currentDraft = editingShift ? draftState : null;

  const calendarEvents = useMemo(() => {
    return shifts.flatMap((shift) => {
      const user = memberMap.get(shift.user_id);
      const memberName = user?.name ?? shift.user_id;

      return shift.blocks.map((block) => ({
        id: `${shift.id}-${block.id}`,
        title: shift.is_duty_manager ? `Duty: ${memberName}` : memberName,
        start: toScheduleXDateTime(block.start_time),
        end: toScheduleXDateTime(block.end_time),
        calendarId: shift.is_duty_manager ? 'duty-manager' : 'shift',
        description: `${formatDate(shift.date)} | ${shift.status}`,
      }));
    });
  }, [memberMap, shifts]);

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
    setFormError(null);

    if (!selectedUserId) {
      setFormError('Please select a studio member.');
      return;
    }

    if (!formState.date || !formState.startTime || !formState.endTime) {
      setFormError('Date, start time, and end time are required.');
      return;
    }

    const start = combineDateAndTime(formState.date, formState.startTime);
    const end = combineDateAndTime(formState.date, formState.endTime);

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setFormError('End time must be later than start time.');
      return;
    }

    const payload: CreateStudioShiftPayload = {
      user_id: selectedUserId,
      date: formState.date,
      blocks: [{ start_time: start, end_time: end }],
      is_duty_manager: formState.isDutyManager,
    };

    if (formState.hourlyRate.trim()) {
      payload.hourly_rate = Number(formState.hourlyRate);
    }

    try {
      await createShiftMutation.mutateAsync(payload);
      setFormState((previous) => ({
        ...createDefaultFormState(),
        userId: previous.userId,
      }));
    } catch {
      setFormError('Failed to create shift. Please try again.');
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

  const handleStartEdit = (shift: (typeof shifts)[number]) => {
    setDraftState({
      shiftId: shift.id,
      formState: createEditFormState(shift),
      error: null,
    });
  };

  const handleCancelEdit = () => {
    setDraftState(null);
  };

  const handleUpdateShift = async () => {
    if (!currentDraft)
      return;

    setDraftState((prev) => (prev ? { ...prev, error: null } : null));

    if (!currentDraft.formState.userId) {
      setDraftState((prev) => (prev ? { ...prev, error: 'Please select a studio member.' } : null));
      return;
    }

    if (!currentDraft.formState.date || !currentDraft.formState.startTime || !currentDraft.formState.endTime) {
      setDraftState((prev) => (prev ? { ...prev, error: 'Date, start time, and end time are required.' } : null));
      return;
    }

    const start = combineDateAndTime(currentDraft.formState.date, currentDraft.formState.startTime);
    const end = combineDateAndTime(currentDraft.formState.date, currentDraft.formState.endTime);

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      setDraftState((prev) => (prev ? { ...prev, error: 'End time must be later than start time.' } : null));
      return;
    }

    const payload: UpdateStudioShiftPayload = {
      user_id: currentDraft.formState.userId,
      date: currentDraft.formState.date,
      status: currentDraft.formState.status ?? 'SCHEDULED',
      is_duty_manager: currentDraft.formState.isDutyManager,
      blocks: [{ start_time: start, end_time: end }],
    };

    if (currentDraft.formState.hourlyRate.trim()) {
      payload.hourly_rate = Number(currentDraft.formState.hourlyRate);
    }

    try {
      await updateShiftMutation.mutateAsync({ shiftId: currentDraft.shiftId, payload });
      handleCancelEdit();
    } catch {
      setDraftState((prev) => (prev ? { ...prev, error: 'Failed to update shift. Please try again.' } : null));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="rounded-xl border bg-linear-to-r from-slate-50 via-white to-slate-50 p-4">
        <h1 className="text-2xl font-bold tracking-tight">Shift Schedule</h1>
        <p className="text-muted-foreground">
          Studio-wide calendar for all members, with admin controls for shift management.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ShiftCalendarCard
          isLoading={isLoadingShifts}
          isFetching={isFetchingShifts}
          shiftCount={shifts.length}
          calendarApp={calendarApp}
        />

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <CurrentDutyManagerCard
            isLoading={isLoadingDutyManager}
            dutyManager={dutyManager}
            memberName={dutyManager ? memberMap.get(dutyManager.user_id)?.name : undefined}
            memberEmail={dutyManager ? memberMap.get(dutyManager.user_id)?.email : undefined}
            dateLabel={dutyManager ? formatDate(dutyManager.date) : undefined}
            shiftLabel={dutyManager ? getShiftWindowLabel(dutyManager) : undefined}
          />

          {canManageShifts
            ? (
                <ShiftCreateCard
                  members={members}
                  formState={{ ...formState, userId: selectedUserId }}
                  formError={formError}
                  isCreating={createShiftMutation.isPending}
                  isLoadingMembers={isLoadingMembers}
                  onChange={setFormState}
                  onCreate={handleCreateShift}
                />
              )
            : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      Shift creation and assignments are restricted to studio admins.
                    </p>
                  </CardContent>
                </Card>
              )}

          {canManageShifts && currentDraft && editingShift && (
            <ShiftEditCard
              shift={editingShift}
              memberName={memberMap.get(editingShift.user_id)?.name}
              dateLabel={formatDate(editingShift.date)}
              members={members}
              formState={currentDraft.formState}
              formError={currentDraft.error}
              isSaving={updateShiftMutation.isPending}
              onChange={(nextFormState) =>
                setDraftState((prev) => (prev ? { ...prev, formState: nextFormState } : null))}
              onSave={handleUpdateShift}
              onCancel={handleCancelEdit}
            />
          )}
        </div>
      </div>

      <ShiftRosterCard
        shifts={shifts}
        isLoading={isLoadingShifts}
        isFetching={isFetchingShifts}
        canManageShifts={canManageShifts}
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
      />
    </div>
  );
}
