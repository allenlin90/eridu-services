import { MoreVertical, ShieldCheck } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTablePagination,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@eridu/ui';

import type { StudioShift } from '@/features/studio-shifts/api/studio-shifts.types';

type MemberInfo = { name: string; email: string };

type ShiftRosterCardProps = {
  shifts: StudioShift[];
  isLoading: boolean;
  isFetching: boolean;
  pagination: {
    pageIndex: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  canManageShifts: boolean;
  memberMap: Map<string, MemberInfo>;
  isMutating: boolean;
  getShiftDisplayDate: (shift: StudioShift) => string;
  getShiftBlockLabels: (shift: StudioShift) => string[];
  formatDateTime: (value: string) => string;
  getShiftWindowLabel: (shift: StudioShift) => string;
  onToggleDutyManager: (shiftId: string, nextDutyManager: boolean) => void;
  onEdit: (shift: StudioShift) => void;
  onDelete: (shiftId: string) => void;
};

export function ShiftRosterCard({
  shifts,
  isLoading,
  isFetching,
  pagination,
  onPaginationChange,
  canManageShifts,
  memberMap,
  isMutating,
  getShiftDisplayDate,
  getShiftBlockLabels,
  formatDateTime,
  getShiftWindowLabel,
  onToggleDutyManager,
  onEdit,
  onDelete,
}: ShiftRosterCardProps) {
  const formatShiftDurationHours = (shift: StudioShift): string => {
    const totalMs = shift.blocks.reduce((acc, block) => {
      return acc + (new Date(block.end_time).getTime() - new Date(block.start_time).getTime());
    }, 0);
    return `${(totalMs / (1000 * 60 * 60)).toFixed(2)}h`;
  };

  const formatProjectedCost = (shift: StudioShift): string => {
    const numeric = Number(shift.projected_cost);
    if (Number.isNaN(numeric)) {
      return shift.projected_cost;
    }

    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numeric);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Records</CardTitle>
        <CardDescription>
          Tabular records for scheduled shifts and duty manager assignment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading
          ? (
              <div className="overflow-x-auto rounded-md border">
                <TableSkeleton
                  columnCount={7}
                  rowCount={Math.max(1, pagination.pageSize)}
                  showButton={canManageShifts}
                />
              </div>
            )
          : shifts.length === 0
            ? (
                <div className="space-y-2">
                  {isFetching && (
                    <p className="text-xs text-muted-foreground">Refreshing shifts...</p>
                  )}
                  <p className="text-sm text-muted-foreground">No shifts scheduled yet.</p>
                </div>
              )
            : (
                <div className="space-y-2">
                  {isFetching && (
                    <p className="text-xs text-muted-foreground">Refreshing shifts...</p>
                  )}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Date / Window</TableHead>
                          <TableHead className="hidden lg:table-cell">Blocks</TableHead>
                          <TableHead className="hidden md:table-cell">Total Hours</TableHead>
                          <TableHead className="hidden lg:table-cell">Projected Cost</TableHead>
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
                                      {shift.user_name}
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
                                      <span className="text-xs text-muted-foreground">
                                        {blockLabels[0] ?? '1 block'}
                                      </span>
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
                              <TableCell className="hidden md:table-cell">
                                {formatShiftDurationHours(shift)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {formatProjectedCost(shift)}
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
                                        className="text-destructive focus:text-destructive"
                                      >
                                        Delete Shift
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
                </div>
              )}
        {shifts.length > 0 && (
          <div className="mt-4">
            <DataTablePagination
              pagination={pagination}
              onPaginationChange={onPaginationChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
