import { MoreVertical, ShieldCheck } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';

type MemberInfo = { name: string; email: string };

type ShiftRosterCardProps = {
  shifts: StudioShift[];
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  canManageShifts: boolean;
  memberMap: Map<string, MemberInfo>;
  deleteConfirmShiftId: string | null;
  isMutating: boolean;
  getShiftDisplayDate: (shift: StudioShift) => string;
  getShiftBlockLabels: (shift: StudioShift) => string[];
  formatDateTime: (value: string) => string;
  getShiftWindowLabel: (shift: StudioShift) => string;
  onToggleDutyManager: (shiftId: string, nextDutyManager: boolean) => void;
  onEdit: (shift: StudioShift) => void;
  onDelete: (shiftId: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLimitChange: (limit: number) => void;
};

export function ShiftRosterCard({
  shifts,
  isLoading,
  isFetching,
  page,
  totalPages,
  total,
  limit,
  canManageShifts,
  memberMap,
  deleteConfirmShiftId,
  isMutating,
  getShiftDisplayDate,
  getShiftBlockLabels,
  formatDateTime,
  getShiftWindowLabel,
  onToggleDutyManager,
  onEdit,
  onDelete,
  onPreviousPage,
  onNextPage,
  onLimitChange,
}: ShiftRosterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Records</CardTitle>
        <CardDescription>
          Tabular records for scheduled shifts and duty manager assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(isLoading || isFetching)
          ? (
              <p className="text-sm text-muted-foreground">Loading shifts...</p>
            )
          : shifts.length === 0
            ? (
                <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
              )
            : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="hidden lg:table-cell">Blocks</TableHead>
                        <TableHead className="hidden xl:table-cell">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Updated</TableHead>
                        {canManageShifts && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift) => {
                        const user = memberMap.get(shift.user_id);
                        const blockLabels = getShiftBlockLabels(shift);

                        return (
                          <TableRow key={shift.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium text-sm lg:text-base flex items-center">
                                    {user?.name ?? shift.user_id}
                                    {shift.is_duty_manager && (
                                      <Badge variant="secondary" className="ml-2 scale-90 px-1.5 py-0 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Duty
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground hidden sm:block">
                                    {user?.email ?? 'Member details unavailable'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-medium">{getShiftDisplayDate(shift)}</p>
                                <p className="text-xs text-muted-foreground">{getShiftWindowLabel(shift)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {blockLabels.length <= 1
                                ? (
                                    <span className="text-sm text-muted-foreground">1 block</span>
                                  )
                                : (
                                    <div className="space-y-1">
                                      <Badge variant="secondary">
                                        {blockLabels.length}
                                        {' '}
                                        blocks
                                      </Badge>
                                      <p className="text-xs text-muted-foreground">
                                        {blockLabels.slice(0, 2).join(', ')}
                                        {blockLabels.length > 2 ? ` +${blockLabels.length - 2} more` : ''}
                                      </p>
                                    </div>
                                  )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <Badge variant="outline">{shift.status}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {formatDateTime(shift.updated_at)}
                            </TableCell>
                            {canManageShifts && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isMutating}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(shift)}>
                                      Edit Shift
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onToggleDutyManager(shift.id, !shift.is_duty_manager)}>
                                      {shift.is_duty_manager ? 'Remove Duty Manager' : 'Set as Duty Manager'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onDelete(shift.id)}
                                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    >
                                      {deleteConfirmShiftId === shift.id ? 'Confirm Delete' : 'Delete Shift'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
        {shifts.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Page
              {' '}
              {Math.min(page, totalPages)}
              {' '}
              of
              {' '}
              {totalPages}
              {' '}
              (
              {total}
              {' '}
              records)
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Rows</span>
                <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isFetching}
                onClick={onPreviousPage}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages || isFetching}
                onClick={onNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
