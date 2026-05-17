import { ReceiptText } from 'lucide-react';
import { useState } from 'react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { CreatorCompensationReviewDialog } from './creator-compensation-review-dialog';
import { EditStudioCreatorDialog } from './edit-studio-creator-dialog';

type StudioCreatorActionsCellProps = {
  creator: StudioCreatorRosterItem;
  studioId: string;
  canEditRoster: boolean;
};

export function StudioCreatorActionsCell({
  creator,
  studioId,
  canEditRoster,
}: StudioCreatorActionsCellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <>
      <DataTableActions
        row={creator}
        onEdit={canEditRoster ? () => setEditOpen(true) : undefined}
        renderExtraActions={() => (
          <DropdownMenuItem onClick={() => setReviewOpen(true)}>
            <ReceiptText className="mr-2 h-4 w-4" />
            Review Compensation
          </DropdownMenuItem>
        )}
      />
      {canEditRoster && (
        <EditStudioCreatorDialog
          studioId={studioId}
          creator={creator}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      <CreatorCompensationReviewDialog
        studioId={studioId}
        creator={creator}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </>
  );
}
