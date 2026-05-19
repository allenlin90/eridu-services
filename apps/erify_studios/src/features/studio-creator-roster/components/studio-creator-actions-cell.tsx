import { Link } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

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

  return (
    <>
      <DataTableActions
        row={creator}
        onEdit={canEditRoster ? () => setEditOpen(true) : undefined}
        renderExtraActions={() => (
          <DropdownMenuItem asChild>
            <Link
              to="/studios/$studioId/creators/$creatorId/compensations"
              params={{ studioId, creatorId: creator.creator_id }}
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              Review Compensation
            </Link>
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
    </>
  );
}
