import { createFileRoute } from '@tanstack/react-router';
import { Loader2, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eridu/ui';

import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import { useAssignDutyManager } from '@/features/studio-shifts/api/assign-duty-manager';
import {
  type CreateStudioShiftPayload,
  useCreateStudioShift,
} from '@/features/studio-shifts/api/create-studio-shift';
import { useDeleteStudioShift } from '@/features/studio-shifts/api/delete-studio-shift';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import {
  useDutyManager,
  useStudioShifts,
} from '@/features/studio-shifts/hooks/use-studio-shifts';
import { useUserProfile } from '@/lib/hooks/use-user';

export const Route = createFileRoute('/studios/$studioId/shifts')({
  component: StudioShiftsPage,
});

type ShiftFormState = {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  isDutyManager: boolean;
};

const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '18:00';

function createDefaultFormState(): ShiftFormState {
  return {
    userId: '',
    date: toLocalDateInputValue(new Date()),
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
    hourlyRate: '',
    isDutyManager: false,
  };
}

function toLocalDateInputValue(value: Date): string {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function combineDateAndTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function getShiftWindowLabel(shift: StudioShift): string {
  if (shift.blocks.length === 0) {
    return 'No shift blocks';
  }

  const sortedBlocks = [...shift.blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const firstBlock = sortedBlocks[0];
  const lastBlock = sortedBlocks[sortedBlocks.length - 1];

  return `${new Date(firstBlock.start_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${new Date(lastBlock.end_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function StudioShiftsPage() {
  const { studioId } = Route.useParams();
  const { data: profile } = useUserProfile();

  const [formState, setFormState] = useState<ShiftFormState>(() => createDefaultFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);

  const { data: membersResponse, isLoading: isLoadingMembers } = useStudioMembershipsQuery(
    studioId,
    { limit: 200 },
  );
  const { data: shiftsResponse, isLoading: isLoadingShifts, isFetching: isFetchingShifts }
    = useStudioShifts(studioId, { limit: 200, page: 1 });
  const { data: dutyManager, isLoading: isLoadingDutyManager } = useDutyManager(studioId);

  const createShiftMutation = useCreateStudioShift(studioId);
  const deleteShiftMutation = useDeleteStudioShift(studioId);
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
          label: `${member.user.name} (${member.user.email})`,
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
      blocks: [
        {
          start_time: start,
          end_time: end,
        },
      ],
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

  const dutyManagerMember = dutyManager ? memberMap.get(dutyManager.user_id) : undefined;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Schedule</h1>
        <p className="text-muted-foreground">
          Studio-wide shift visibility for all members, including current duty manager.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Duty Manager</CardTitle>
          <CardDescription>
            Active duty manager right now based on the shift blocks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDutyManager
            ? (
                <p className="text-sm text-muted-foreground">Loading current duty manager...</p>
              )
            : dutyManager
              ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {dutyManagerMember?.name ?? dutyManager.user_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dutyManagerMember?.email ?? 'Member details unavailable'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(dutyManager.date)}
                        {' '}
                        |
                        {' '}
                        {getShiftWindowLabel(dutyManager)}
                      </p>
                    </div>
                    <Badge className="w-fit">On Duty</Badge>
                  </div>
                )
              : (
                  <p className="text-sm text-muted-foreground">No active duty manager.</p>
                )}
        </CardContent>
      </Card>

      {canManageShifts && (
        <Card>
          <CardHeader>
            <CardTitle>Create Shift</CardTitle>
            <CardDescription>
              Create a shift sheet entry and optionally mark it as duty manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 md:col-span-2 xl:col-span-1">
                <Label htmlFor="studio-shift-user">Member</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => setFormState((previous) => ({ ...previous, userId: value }))}
                >
                  <SelectTrigger id="studio-shift-user">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.user.id}>
                        {member.user.name}
                        {' '}
                        (
                        {member.user.email}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studio-shift-date">Date</Label>
                <Input
                  id="studio-shift-date"
                  type="date"
                  value={formState.date}
                  onChange={(event) => {
                    const { value } = event.target;
                    setFormState((previous) => ({ ...previous, date: value }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studio-shift-rate">Hourly Rate (optional)</Label>
                <Input
                  id="studio-shift-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.hourlyRate}
                  onChange={(event) => {
                    const { value } = event.target;
                    setFormState((previous) => ({ ...previous, hourlyRate: value }));
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studio-shift-start">Start Time</Label>
                <Input
                  id="studio-shift-start"
                  type="time"
                  value={formState.startTime}
                  onChange={(event) => {
                    const { value } = event.target;
                    setFormState((previous) => ({ ...previous, startTime: value }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studio-shift-end">End Time</Label>
                <Input
                  id="studio-shift-end"
                  type="time"
                  value={formState.endTime}
                  onChange={(event) => {
                    const { value } = event.target;
                    setFormState((previous) => ({ ...previous, endTime: value }));
                  }}
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formState.isDutyManager}
                    onCheckedChange={(checked) => {
                      setFormState((previous) => ({
                        ...previous,
                        isDutyManager: checked === true,
                      }));
                    }}
                  />
                  Set as duty manager
                </label>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <Button
              onClick={handleCreateShift}
              disabled={createShiftMutation.isPending || isLoadingMembers}
            >
              {createShiftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shift
            </Button>
          </CardContent>
        </Card>
      )}

      {!canManageShifts && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Shift creation and duty manager assignment are restricted to studio admins.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shifts</CardTitle>
          <CardDescription>
            All studio members can review the schedule and duty manager assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(isLoadingShifts || isFetchingShifts)
            ? (
                <p className="text-sm text-muted-foreground">Loading shifts...</p>
              )
            : shifts.length === 0
              ? (
                  <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
                )
              : (
                  <div className="space-y-3">
                    {shifts.map((shift) => {
                      const user = memberMap.get(shift.user_id);

                      return (
                        <div key={shift.id} className="rounded-lg border p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{user?.name ?? shift.user_id}</p>
                                <Badge variant="outline">{shift.status}</Badge>
                                {shift.is_duty_manager && (
                                  <Badge>
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    Duty Manager
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{user?.email ?? 'Member details unavailable'}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(shift.date)}
                                {' '}
                                |
                                {' '}
                                {getShiftWindowLabel(shift)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last updated:
                                {' '}
                                {formatDateTime(shift.updated_at)}
                              </p>
                            </div>

                            {canManageShifts && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant={shift.is_duty_manager ? 'outline' : 'default'}
                                  onClick={() => handleSetDutyManager(shift.id, !shift.is_duty_manager)}
                                  disabled={assignDutyManagerMutation.isPending}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  {shift.is_duty_manager ? 'Unset Duty Manager' : 'Set Duty Manager'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteShift(shift.id)}
                                  disabled={deleteShiftMutation.isPending}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {deleteConfirmShiftId === shift.id ? 'Confirm Delete' : 'Delete'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
        </CardContent>
      </Card>
    </div>
  );
}
