import { useNavigate } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { EditMemberDialog } from './edit-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type StudioMemberActionsCellProps = {
  member: StudioMemberResponse;
  studioId: string;
  isSelf: boolean;
  canManageMembers: boolean;
  canReviewCompensations: boolean;
};

export function StudioMemberActionsCell({
  member,
  studioId,
  isSelf,
  canManageMembers,
  canReviewCompensations,
}: StudioMemberActionsCellProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const navigate = useNavigate();
  const renderCompensationAction = canReviewCompensations
    ? () => (
        <DropdownMenuItem
          onClick={() =>
            void navigate({
              to: '/studios/$studioId/members/$memberId/compensations',
              params: {
                studioId,
                memberId: member.membership_id,
              },
            })}
        >
          <ReceiptText className="mr-2 h-4 w-4" />
          View Compensations
        </DropdownMenuItem>
      )
    : undefined;

  return (
    <>
      <DataTableActions
        row={member}
        onEdit={canManageMembers ? () => setEditOpen(true) : undefined}
        onDelete={canManageMembers && !isSelf ? () => setRemoveOpen(true) : undefined}
        renderExtraActions={renderCompensationAction}
      />
      {canManageMembers && (
        <>
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
      )}
    </>
  );
}
