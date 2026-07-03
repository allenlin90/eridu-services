import { Link, useNavigate } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';

import type { StudioCreatorRosterItem } from '@eridu/api-types/studio-creators';
import { DataTableActions, DropdownMenuItem } from '@eridu/ui';

import { defaultCompensationDateRange } from '@/features/studio-shifts/utils/shift-date.utils';

type StudioCreatorActionsCellProps = {
  creator: StudioCreatorRosterItem;
  studioId: string;
  canEditRoster: boolean;
  canReviewCompensation: boolean;
};

export function StudioCreatorActionsCell({
  creator,
  studioId,
  canEditRoster,
  canReviewCompensation,
}: StudioCreatorActionsCellProps) {
  const navigate = useNavigate();

  return (
    <DataTableActions
      row={creator}
      onEdit={canEditRoster
        ? () => void navigate({
            to: '/studios/$studioId/creators/$creatorId',
            params: { studioId, creatorId: creator.creator_id },
          })
        : undefined}
      renderExtraActions={() =>
        canReviewCompensation
          ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/studios/$studioId/creators/$creatorId/compensations"
                  params={{ studioId, creatorId: creator.creator_id }}
                  search={defaultCompensationDateRange()}
                >
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Review Compensation
                </Link>
              </DropdownMenuItem>
            )
          : null}
    />
  );
}
