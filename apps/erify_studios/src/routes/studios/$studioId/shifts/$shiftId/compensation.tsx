import { createFileRoute } from '@tanstack/react-router';

import { ShiftCompensationView } from '@/features/studio-shifts/components/shift-compensation-dialog';
import { useStudioShift } from '@/features/studio-shifts/hooks/use-studio-shifts';

export const Route = createFileRoute('/studios/$studioId/shifts/$shiftId/compensation')({
  component: StudioShiftCompensationTab,
});

function StudioShiftCompensationTab() {
  const { studioId, shiftId } = Route.useParams();
  const { data: shift } = useStudioShift(studioId, shiftId);

  if (!shift) {
    return null;
  }

  return <ShiftCompensationView studioId={studioId} shift={shift} />;
}
