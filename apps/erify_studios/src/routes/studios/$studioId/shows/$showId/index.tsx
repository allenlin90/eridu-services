import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { STUDIO_ROLE } from '@eridu/api-types/memberships';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { useUpdateStudioShow } from '@/features/studio-shows/api/update-studio-show';
import { ScheduleResumeNoticeBanner } from '@/features/studio-shows/components/schedule-resume-notice-banner';
import { ShowCancellationResolutionPanel } from '@/features/studio-shows/components/show-cancellation-resolution-panel';
import type { StudioShowFormValues } from '@/features/studio-shows/components/studio-show-management-form';
import { StudioShowManagementForm } from '@/features/studio-shows/components/studio-show-management-form';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { useStudioAccess } from '@/lib/hooks/use-studio-access';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/')({
  component: StudioShowDetailsTab,
});

function StudioShowDetailsTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });
  const [resetNonce, setResetNonce] = useState(0);
  const { role } = useStudioAccess(studioId);

  if (!show) {
    return null;
  }

  const isReadOnly = role === STUDIO_ROLE.ACCOUNT_MANAGER;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-background p-3 sm:p-4">
        <StudioShowDetailsForm
          key={`${show.id}:${show.updated_at}:${resetNonce}`}
          studioId={studioId}
          show={show}
          isReadOnly={isReadOnly}
          onCancel={() => setResetNonce((nonce) => nonce + 1)}
        />
      </div>
      <ScheduleResumeNoticeBanner show={show} />
      <ShowCancellationResolutionPanel studioId={studioId} show={show} isReadOnly={isReadOnly} />
    </div>
  );
}

function StudioShowDetailsForm({
  studioId,
  show,
  isReadOnly,
  onCancel,
}: {
  studioId: string;
  show: StudioShowDetail;
  isReadOnly: boolean;
  onCancel: () => void;
}) {
  const updateShow = useUpdateStudioShow(studioId);

  const handleSubmit = (values: StudioShowFormValues) => {
    // Mirror the list Edit dialog transform: external_id is create-only (dropped on edit);
    // schedule_id empty string → explicit unlink (null), undefined → leave unchanged. The
    // mutation keeps us on the page (it updates the detail cache, invalidates the list, toasts).
    const { schedule_id, external_id: _externalId, ...rest } = values;
    updateShow.mutate({
      showId: show.id,
      data: { ...rest, ...(schedule_id !== undefined && { schedule_id: schedule_id || null }) },
    });
  };

  return (
    <StudioShowManagementForm
      studioId={studioId}
      show={show}
      isSubmitting={updateShow.isPending}
      isReadOnly={isReadOnly}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
