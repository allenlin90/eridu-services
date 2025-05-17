import type { Organization } from "@/admin/full-organization/types";

import { RoleBadge } from "@/components/role-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@eridu/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@eridu/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@eridu/ui/components/table";
import { format } from "date-fns";
import { Mail, MoreHorizontal } from "lucide-react";
import { useCallback } from "react";

import { useCancelInvitation } from "../../hooks/use-cancel-invitation";
import { useInviteMember } from "../../hooks/use-invite-member";

type Invitations = Organization["invitations"];

type InvitationsTableProps = {
  invitations: Invitations;
  getTeamName: (teamId?: string) => string;
};

const Actions: React.FC<{ invitation: Invitations[0] }> = ({ invitation }) => {
  const { isPending: isResending, mutateAsync: resendInvitation } = useInviteMember();
  const { isPending: isCancelling, mutateAsync: cancelInvitation } = useCancelInvitation();

  const onResend = useCallback(async () => {
    await resendInvitation({
      ...invitation,
      resend: true,
    });
  }, [invitation, resendInvitation]);

  const onCancel = useCallback(async () => {
    await cancelInvitation({
      invitationId: invitation.id,
    });
  }, [invitation, cancelInvitation]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={onResend} disabled={isResending}>
          <span>Resend</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCancel} disabled={isCancelling}>
          <span>Cancel</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Content: React.FC<InvitationsTableProps> = ({ invitations, getTeamName }) => {
  if (!invitations.length) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
          No invitations found
        </TableCell>
      </TableRow>
    );
  }

  return invitations.map(invitation => (
    <TableRow key={invitation.id}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{invitation.email || "No email provided"}</span>
        </div>
      </TableCell>
      <TableCell><RoleBadge role={invitation.role} /></TableCell>
      <TableCell className="text-nowrap">{getTeamName(invitation.teamId)}</TableCell>
      <TableCell><StatusBadge status={invitation.status} /></TableCell>
      <TableCell className="text-nowrap">{format(new Date(invitation.expiresAt), "MMM d, yyyy")}</TableCell>
      <TableCell className="text-right">
        {invitation.status === "pending" && (
          <Actions invitation={invitation} />
        )}
      </TableCell>
    </TableRow>
  ));
};

export const InvitationsTable: React.FC<InvitationsTableProps> = ({ invitations, getTeamName }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <Content invitations={invitations} getTeamName={getTeamName} />
        </TableBody>
      </Table>
    </div>
  );
};
