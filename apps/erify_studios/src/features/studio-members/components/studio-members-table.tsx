import { Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { StudioMemberResponse } from '@eridu/api-types/memberships';
import { STUDIO_ROLE } from '@eridu/api-types/memberships';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { useUpdateStudioMember } from '../api/members';

import { AddMemberDialog } from './add-member-dialog';
import { RemoveMemberDialog } from './remove-member-dialog';

type StudioMembersTableProps = {
  studioId: string;
  members: StudioMemberResponse[];
  isLoading: boolean;
  isAdmin: boolean;
  currentUserEmail?: string;
};

const ROLE_LABELS: Record<string, string> = {
  [STUDIO_ROLE.ADMIN]: 'Admin',
  [STUDIO_ROLE.MANAGER]: 'Manager',
  [STUDIO_ROLE.TALENT_MANAGER]: 'Talent Manager',
  [STUDIO_ROLE.DESIGNER]: 'Designer',
  [STUDIO_ROLE.MODERATION_MANAGER]: 'Moderation Manager',
  [STUDIO_ROLE.MEMBER]: 'Member',
};

const ROLE_OPTIONS = [
  { value: STUDIO_ROLE.ADMIN, label: 'Admin' },
  { value: STUDIO_ROLE.MANAGER, label: 'Manager' },
  { value: STUDIO_ROLE.TALENT_MANAGER, label: 'Talent Manager' },
  { value: STUDIO_ROLE.DESIGNER, label: 'Designer' },
  { value: STUDIO_ROLE.MODERATION_MANAGER, label: 'Moderation Manager' },
  { value: STUDIO_ROLE.MEMBER, label: 'Member' },
] as const;

export function StudioMembersTable({
  studioId,
  members,
  isLoading,
  isAdmin,
  currentUserEmail,
}: StudioMembersTableProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<StudioMemberResponse | null>(null);

  const updateMutation = useUpdateStudioMember(studioId);

  const handleRoleChange = async (member: StudioMemberResponse, newRole: string) => {
    try {
      await updateMutation.mutateAsync({
        membershipId: member.membership_id,
        payload: { role: newRole },
      });
      toast.success(`Role updated to ${ROLE_LABELS[newRole] ?? newRole}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message ?? 'Failed to update role';
      toast.error(message);
    }
  };

  const handleRateChange = async (member: StudioMemberResponse, rawValue: string) => {
    const rate = Number.parseFloat(rawValue);
    if (Number.isNaN(rate) || rate < 0)
      return;

    try {
      await updateMutation.mutateAsync({
        membershipId: member.membership_id,
        payload: { base_hourly_rate: rate },
      });
      toast.success('Hourly rate updated');
    } catch {
      toast.error('Failed to update hourly rate');
    }
  };

  const isSelf = (member: StudioMemberResponse) =>
    Boolean(currentUserEmail) && currentUserEmail === member.user_email;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Studio Members</CardTitle>
          <CardDescription>
            Manage team members, roles, and hourly rates for this studio.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading members...</p>
        )}
        {!isLoading && members.length === 0 && (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No members yet. Add the first member to get started.
          </div>
        )}
        {!isLoading && members.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hourly Rate</TableHead>
                {isAdmin && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.membership_id}>
                  <TableCell className="font-medium">{member.user_name}</TableCell>
                  <TableCell className="text-muted-foreground">{member.user_email}</TableCell>
                  <TableCell>
                    {isAdmin && !isSelf(member)
                      ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => void handleRoleChange(member, value)}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      : (
                          <Badge variant="outline">
                            {ROLE_LABELS[member.role] ?? member.role}
                          </Badge>
                        )}
                  </TableCell>
                  <TableCell>
                    {isAdmin
                      ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={member.base_hourly_rate ?? 0}
                            className="w-24 rounded border px-2 py-1 text-sm"
                            onBlur={(e) => void handleRateChange(member, e.target.value)}
                            disabled={updateMutation.isPending}
                            aria-label={`Hourly rate for ${member.user_name}`}
                          />
                        )
                      : (
                          <span className="text-sm">
                            {member.base_hourly_rate !== null
                              ? `$${member.base_hourly_rate.toFixed(2)}`
                              : '—'}
                          </span>
                        )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {!isSelf(member) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setMemberToRemove(member)}
                          aria-label={`Remove ${member.user_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {isAdmin && (
        <>
          <AddMemberDialog
            studioId={studioId}
            open={addDialogOpen}
            onOpenChange={setAddDialogOpen}
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
    </Card>
  );
}
