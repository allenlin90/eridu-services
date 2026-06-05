import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import type { Membership } from '@/features/memberships/api/get-memberships';
import { useStudioMembershipsQuery } from '@/features/memberships/api/get-studio-memberships';
import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';
import type { UpdateStudioShiftPayload } from '@/features/studio-shifts/api/update-studio-shift';
import { useUpdateStudioShift } from '@/features/studio-shifts/api/update-studio-shift';
import { ShiftEditCard } from '@/features/studio-shifts/components/shift-edit-card';
import { useStudioShift } from '@/features/studio-shifts/hooks/use-studio-shifts';
import type { ShiftFormState } from '@/features/studio-shifts/types/shift-form.types';
import {
  createEditFormState,
  getShiftDisplayDate,
} from '@/features/studio-shifts/utils/shift-form.utils';
import {
  getApiErrorMessage,
  validateShiftBlocks,
} from '@/features/studio-shifts/utils/studio-shifts-table.utils';

export const Route = createFileRoute('/studios/$studioId/shifts/$shiftId/')({
  component: StudioShiftProfileTab,
});

function StudioShiftProfileTab() {
  const { studioId, shiftId } = Route.useParams();
  const { data: shift } = useStudioShift(studioId, shiftId);

  if (!shift) {
    return null;
  }

  return (
    <StudioShiftProfileForm
      key={`${shift.id}:${shift.updated_at}`}
      studioId={studioId}
      shift={shift}
    />
  );
}

function StudioShiftProfileForm({
  studioId,
  shift,
}: {
  studioId: string;
  shift: StudioShift;
}) {
  const updateShift = useUpdateStudioShift(studioId);
  const [memberSearch, setMemberSearch] = useState('');
  const [formState, setFormState] = useState<ShiftFormState>(() => createEditFormState(shift));
  const [formError, setFormError] = useState<string | null>(null);

  const { data: memberOptionsResponse, isLoading: isLoadingMembers } = useStudioMembershipsQuery(
    studioId,
    { page: 1, limit: 50, name: memberSearch || undefined },
    { enabled: Boolean(shift) },
  );

  const handleReset = useCallback(() => {
    setFormState(createEditFormState(shift));
    setFormError(null);
  }, [shift]);

  const handleSave = useCallback(async () => {
    setFormError(null);

    if (!formState.userId) {
      setFormError('Please select a studio member.');
      return;
    }

    if (!formState.date) {
      setFormError('Date is required.');
      return;
    }

    const { error: blocksError, blocks } = validateShiftBlocks(formState.date, formState.blocks);
    if (blocksError || !blocks) {
      setFormError(blocksError);
      return;
    }

    const payload: UpdateStudioShiftPayload = {
      user_id: formState.userId,
      date: formState.date,
      status: formState.status ?? 'SCHEDULED',
      is_duty_manager: formState.isDutyManager,
      blocks,
    };

    try {
      await updateShift.mutateAsync({ shiftId: shift.id, payload });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Failed to update shift. Please try again.'));
    }
  }, [formState, shift, updateShift]);

  return (
    <ShiftEditCard
      shift={shift}
      memberName={shift.user_name}
      dateLabel={getShiftDisplayDate(shift)}
      members={(memberOptionsResponse?.data ?? []) as Membership[]}
      onMemberSearch={setMemberSearch}
      isLoadingMembers={isLoadingMembers}
      formState={formState}
      formError={formError}
      isSaving={updateShift.isPending}
      onChange={setFormState}
      onSave={() => {
        void handleSave();
      }}
      onCancel={handleReset}
    />
  );
}
