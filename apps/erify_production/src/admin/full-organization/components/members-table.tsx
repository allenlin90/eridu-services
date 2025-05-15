import type { FullOrganization } from "@/admin/full-organization/components/full-organization";

import { RoleBadge } from "@/admin/full-organization/components/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@eridu/ui/components/avatar";
import { Button } from "@eridu/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@eridu/ui/components/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@eridu/ui/components/table";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";

type Organization = React.ComponentProps<typeof FullOrganization>["organization"];

type MembersTableProps = {
  members: Organization["members"];
  getTeamName: (teamId?: string) => string;
};

export const MembersTable: React.FC<MembersTableProps> = ({ members, getTeamName }) => {
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem>Change Team</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">Remove from Organization</DropdownMenuItem>
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
