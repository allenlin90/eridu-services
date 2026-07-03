import { Link, useNavigate } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { RemoveMemberDialog } from './remove-member-dialog';

import { defaultCompensationDateRange } from '@/features/studio-shifts/utils/shift-date.utils';

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
  const [removeOpen, setRemoveOpen] = useState(false);
  const navigate = useNavigate();
  const renderCompensationAction = canReviewCompensations
    ? () => (
        <DropdownMenuItem asChild>
          <Link
            to="/studios/$studioId/members/$memberId/compensations"
            params={{
              studioId,
              memberId: member.membership_id,
            }}
            search={defaultCompensationDateRange()}
          >
            <ReceiptText className="mr-2 h-4 w-4" />
            View Compensations
          </Link>
        </DropdownMenuItem>
      )
    : undefined;

  return (
    <>
      <DataTableActions
        row={member}
        onEdit={canManageMembers
          ? () => void navigate({
              to: '/studios/$studioId/members/$memberId',
              params: { studioId, memberId: member.membership_id },
            })
          : undefined}
        onDelete={canManageMembers && !isSelf ? () => setRemoveOpen(true) : undefined}
        renderExtraActions={renderCompensationAction}
      />
      {canManageMembers && (
        <RemoveMemberDialog
          studioId={studioId}
          member={member}
          open={removeOpen}
          onOpenChange={setRemoveOpen}
        />
      )}
    </>
  );
}
