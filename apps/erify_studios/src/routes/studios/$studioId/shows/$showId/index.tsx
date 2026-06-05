import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import { useUpdateStudioShow } from '@/features/studio-shows/api/update-studio-show';
import type { StudioShowFormValues } from '@/features/studio-shows/components/studio-show-management-form';
import { StudioShowManagementForm } from '@/features/studio-shows/components/studio-show-management-form';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/')({
  component: StudioShowDetailsTab,
});

function StudioShowDetailsTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });
  const [resetNonce, setResetNonce] = useState(0);

  if (!show) {
    return null;
  }

  return (
    <div className="rounded-md border bg-background p-3 sm:p-4">
      <StudioShowDetailsForm
        key={`${show.id}:${show.updated_at}:${resetNonce}`}
        studioId={studioId}
        show={show}
        onCancel={() => setResetNonce((nonce) => nonce + 1)}
      />
    </div>
  );
}

function StudioShowDetailsForm({
  studioId,
  show,
  onCancel,
}: {
  studioId: string;
  show: StudioShowDetail;
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
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
