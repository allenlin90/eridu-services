import { RefreshCw, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { Button, DataTable, Input } from '@eridu/ui';

import { getMemberColumns } from '../config/member-columns';

import { AddMemberDialog } from './add-member-dialog';
import { EditMemberDialog } from './edit-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type StudioMembersTableProps = {
  studioId: string;
  members: StudioMemberResponse[];
  isLoading: boolean;
  isFetching: boolean;
  isAdmin: boolean;
  currentUserEmail: string | undefined;
  onRefresh: () => void;
};

type EditState = { member: StudioMemberResponse; isSelf: boolean } | null;

export function StudioMembersTable({
  studioId,
  members,
  isLoading,
  isFetching,
  isAdmin,
  currentUserEmail,
  onRefresh,
}: StudioMembersTableProps) {
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>(null);
  const [memberToRemove, setMemberToRemove] = useState<StudioMemberResponse | null>(null);

  const filteredMembers = useMemo(() => {
    if (!search.trim())
      return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => m.user_name.toLowerCase().includes(q) || m.user_email.toLowerCase().includes(q),
    );
  }, [members, search]);

  const columns = useMemo(
    () => getMemberColumns({
      isAdmin,
      currentUserEmail,
      onEdit: (member, isSelf) => setEditState({ member, isSelf }),
      onRemove: setMemberToRemove,
    }),
    [isAdmin, currentUserEmail],
  );

  return (
    <>
      <DataTable
        data={filteredMembers}
        columns={columns}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={search ? 'No members match your search.' : 'No members yet.'}
        getRowId={(member) => member.membership_id}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={onRefresh}
                disabled={isFetching}
                aria-label="Refresh members"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>
          </div>
        )}
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
            member={editState?.member ?? null}
            isSelf={editState?.isSelf ?? false}
            open={editState !== null}
            onOpenChange={(open) => {
              if (!open)
                setEditState(null);
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
