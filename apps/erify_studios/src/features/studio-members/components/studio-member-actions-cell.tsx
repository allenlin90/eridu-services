import { useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { DataTableActions } from '@eridu/ui';

import { EditMemberDialog } from './edit-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type StudioMemberActionsCellProps = {
  member: StudioMemberResponse;
  studioId: string;
  isSelf: boolean;
};

export function StudioMemberActionsCell({ member, studioId, isSelf }: StudioMemberActionsCellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  return (
    <>
      <DataTableActions
        row={member}
        onEdit={() => setEditOpen(true)}
        onDelete={isSelf ? undefined : () => setRemoveOpen(true)}
      />
      <EditMemberDialog
        studioId={studioId}
        member={member}
        isSelf={isSelf}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <RemoveMemberDialog
        studioId={studioId}
        member={member}
        open={removeOpen}
        onOpenChange={setRemoveOpen}
      />
    </>
  );
}
