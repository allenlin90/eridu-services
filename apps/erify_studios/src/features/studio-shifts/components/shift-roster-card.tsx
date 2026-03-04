import { ShieldCheck, Trash2, UserCheck } from 'lucide-react';

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
  formatDate: (value: string) => string;
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
  formatDate,
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
                        <TableHead>Date</TableHead>
                        <TableHead>Shift Window</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duty Manager</TableHead>
                        <TableHead>Updated</TableHead>
                        {canManageShifts && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift) => {
                        const user = memberMap.get(shift.user_id);

                        return (
                          <TableRow key={shift.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user?.name ?? shift.user_id}</p>
                                <p className="text-xs text-muted-foreground">
                                  {user?.email ?? 'Member details unavailable'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(shift.date)}</TableCell>
                            <TableCell>{getShiftWindowLabel(shift)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{shift.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {shift.is_duty_manager
                                ? (
                                    <Badge>
                                      <ShieldCheck className="mr-1 h-3 w-3" />
                                      Assigned
                                    </Badge>
                                  )
                                : (
                                    <span className="text-sm text-muted-foreground">No</span>
                                  )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(shift.updated_at)}
                            </TableCell>
                            {canManageShifts && (
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant={shift.is_duty_manager ? 'outline' : 'default'}
                                    onClick={() => onToggleDutyManager(shift.id, !shift.is_duty_manager)}
                                    disabled={isMutating}
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    {shift.is_duty_manager ? 'Unset' : 'Set'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onEdit(shift)}
                                    disabled={isMutating}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => onDelete(shift.id)}
                                    disabled={isMutating}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {deleteConfirmShiftId === shift.id ? 'Confirm' : 'Delete'}
                                  </Button>
                                </div>
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
