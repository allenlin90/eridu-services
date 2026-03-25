import { UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { Button, DataTable } from '@eridu/ui';

import { getMemberColumns } from '../config/member-columns';

import { AddMemberDialog } from './add-member-dialog';
import { EditMemberDialog } from './edit-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type StudioMembersTableProps = {
  studioId: string;
  members: StudioMemberResponse[];
  isLoading: boolean;
  isAdmin: boolean;
  currentUserEmail: string | undefined;
};

export function StudioMembersTable({
  studioId,
  members,
  isLoading,
  isAdmin,
  currentUserEmail,
}: StudioMembersTableProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<StudioMemberResponse | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<StudioMemberResponse | null>(null);

  const columns = useMemo(
    () => getMemberColumns({
      isAdmin,
      currentUserEmail,
      onEdit: setMemberToEdit,
      onRemove: setMemberToRemove,
    }),
    [isAdmin, currentUserEmail],
  );

  return (
    <>
      <DataTable
        data={members}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No members yet."
        getRowId={(member) => member.membership_id}
        renderToolbar={() => isAdmin
          ? (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </div>
            )
          : null}
      />

      {isAdmin && (
        <>
          <AddMemberDialog
            studioId={studioId}
            open={addOpen}
            onOpenChange={setAddOpen}
          />
          <EditMemberDialog
            studioId={studioId}
            member={memberToEdit}
            open={memberToEdit !== null}
            onOpenChange={(open) => {
              if (!open)
                setMemberToEdit(null);
            }}
          />
          <RemoveMemberDialog
            studioId={studioId}
            member={memberToRemove}
            open={memberToRemove !== null}
            onOpenChange={(open) => {
              if (!open)
                setMemberToRemove(null);
            }}
          />
        </>
      )}
    </>
  );
}
