import { useState } from 'react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import { DataTableActions } from '@eridu/ui';

import { EditStudioCreatorDialog } from './edit-studio-creator-dialog';

type StudioCreatorActionsCellProps = {
  creator: StudioCreatorRosterItem;
  studioId: string;
};

export function StudioCreatorActionsCell({
  creator,
  studioId,
}: StudioCreatorActionsCellProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DataTableActions
        row={creator}
        onEdit={() => setEditOpen(true)}
      />
      <EditStudioCreatorDialog
        studioId={studioId}
        creator={creator}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
