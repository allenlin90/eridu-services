import type { Organization } from "@/admin/full-organization/types";

import { RoleBadge } from "@/components/role-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@eridu/ui/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@eridu/ui/components/table";
import { format } from "date-fns";
import { Mail } from "lucide-react";

type InvitationsTableProps = {
  invitations: Organization["invitations"];
  getTeamName: (teamId?: string) => string;
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
          {invitations.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invitations found
                  </TableCell>
                </TableRow>
              )
            : (
                invitations.map(invitation => (
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
                      {invitation.status === "canceled"
                        ? (
                            <Button variant="outline" size="sm" disabled>
                              Canceled
                            </Button>
                          )
                        : invitation.status === "accepted"
                          ? (
                              <Button variant="outline" size="sm" disabled>
                                Accepted
                              </Button>
                            )
                          : (
                              <Button variant="outline" size="sm">
                                Resend
                              </Button>
                            )}
                    </TableCell>
                  </TableRow>
                ))
              )}
        </TableBody>
      </Table>
    </div>
  );
};
