import type { Organization } from "@/admin/full-organization/types";

import { EditTeamDialog } from "@/admin/full-organization/components/teams/edit-team-dialog";
import { RemoveTeamDialog } from "@/admin/full-organization/components/teams/remove-team-dialog";
import { Button } from "@eridu/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@eridu/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eridu/ui/components/table";
import { format } from "date-fns";
import { Building, MoreHorizontal } from "lucide-react";

type TeamsTableProps = {
  teams: Organization["teams"];
};

export const TeamsTable: React.FC<TeamsTableProps> = ({ teams }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No teams found
                  </TableCell>
                </TableRow>
              )
            : (
                teams.map(team => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-md">
                          <Building className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-nowrap">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-nowrap">{format(new Date(team.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-nowrap">{team.updatedAt ? format(new Date(team.updatedAt), "MMM d, yyyy") : "Never"}</TableCell>
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
                          <EditTeamDialog team={team}>
                            <DropdownMenuItem onSelect={e => e.preventDefault()}>
                              <span>
                                Edit Team
                              </span>
                            </DropdownMenuItem>
                          </EditTeamDialog>
                          <DropdownMenuSeparator />
                          <RemoveTeamDialog team={team}>
                            <DropdownMenuItem onSelect={e => e.preventDefault()}>
                              <span className="text-destructive">
                                Delete Team
                              </span>
                            </DropdownMenuItem>
                          </RemoveTeamDialog>
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

export default TeamsTable;
