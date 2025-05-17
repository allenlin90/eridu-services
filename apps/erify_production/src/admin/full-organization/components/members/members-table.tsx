import type { Organization } from "@/admin/full-organization/types";
import type { Role } from "@eridu/auth-service/types";

import { useChangeMemberRole } from "@/admin/full-organization/hooks/use-change-member-role";
import { RoleBadge } from "@/components/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@eridu/ui/components/avatar";
import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@eridu/ui/components/table";
import { format } from "date-fns";
import { MoreHorizontal, Shield, User } from "lucide-react";
import { useCallback } from "react";

import RemoveMemberDialog from "./remove-member-dialog";

type MembersTableProps = {
  organization: Organization;
  getTeamName: (teamId?: string) => string;
};

export const MembersTable: React.FC<MembersTableProps> = ({ organization, getTeamName }) => {
  const { members } = organization;
  const { mutateAsync: changeMemberRole } = useChangeMemberRole();

  const onRoleChange = useCallback((memberId: string, role: Exclude<Role, "user">) =>
    async (_e: React.MouseEvent<HTMLDivElement>) => {
      await changeMemberRole({
        organizationId: organization.id,
        memberId,
        role,
      });
    }, [organization.id, changeMemberRole]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              )
            : (
                members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.image || ""} alt={member.user.name} />
                          <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.user.name}</div>
                          <div className="text-sm text-muted-foreground">{member.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={member.role} /></TableCell>
                    <TableCell className="text-nowrap">{getTeamName(member.teamId)}</TableCell>
                    <TableCell className="text-nowrap">{format(new Date(member.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Change Role</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={onRoleChange(member.id, "admin")}
                                disabled={member.role === "admin"}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={onRoleChange(member.id, "member")}
                                disabled={member.role === "member"}
                              >
                                <User className="h-4 w-4 mr-2" />
                                Member
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <RemoveMemberDialog member={member}>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); }}>
                              <span className="text-destructive">
                                Remove from Organization
                              </span>
                            </DropdownMenuItem>
                          </RemoveMemberDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MembersTable;
