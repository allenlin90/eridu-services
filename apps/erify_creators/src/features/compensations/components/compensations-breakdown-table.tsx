import { format } from 'date-fns';

import type { StudioCreatorCompensationShow } from '@eridu/api-types/studio-creators';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import {
  compensationTypeBadgeVariant,
  formatAdjustmentTotal,
  formatAgreedRate,
  formatAmount,
  formatCommissionRate,
  formatUnresolvedReason,
  getAdjustmentTone,
} from '@/features/compensations/lib/compensations-display';
import * as m from '@/paraglide/messages.js';

export type CompensationsBreakdownTableProps = {
  shows: StudioCreatorCompensationShow[];
};

const ADJUSTMENT_CELL_CLASS: Record<ReturnType<typeof getAdjustmentTone>, string> = {
  muted: 'text-muted-foreground',
  negative: 'text-destructive',
  positive: 'text-emerald-600 dark:text-emerald-400',
};

export function CompensationsBreakdownTable({ shows }: CompensationsBreakdownTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m['compensations.table.showName']()}</TableHead>
            <TableHead>{m['compensations.table.dateTime']()}</TableHead>
            <TableHead>{m['compensations.table.type']()}</TableHead>
            <TableHead className="text-right">{m['compensations.table.agreedRate']()}</TableHead>
            <TableHead className="text-right">{m['compensations.table.commission']()}</TableHead>
            <TableHead className="text-right">{m['compensations.table.baseAmount']()}</TableHead>
            <TableHead className="text-right">{m['compensations.table.adjustments']()}</TableHead>
            <TableHead className="text-right">{m['compensations.table.totalAmount']()}</TableHead>
            <TableHead>{m['compensations.table.status']()}</TableHead>
            <TableHead>{m['compensations.table.notes']()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shows.map((show) => {
            const unresolvedReason = formatUnresolvedReason(show.unresolved_reason);
            const isUnresolved = show.unresolved_reason !== null;
            const adjustmentTone = getAdjustmentTone(show.adjustment_total);

            return (
              <TableRow key={show.show_creator_id}>
                <TableCell className="max-w-[200px] truncate font-medium">
                  {show.show_name}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {format(new Date(show.show_start_time), 'PPP p')}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {show.compensation_type
                    ? (
                        <Badge variant={compensationTypeBadgeVariant(show.compensation_type)}>
                          {show.compensation_type}
                        </Badge>
                      )
                    : (
                        <span className="text-muted-foreground">—</span>
                      )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                  {formatAgreedRate(show)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                  {formatCommissionRate(show)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                  {formatAmount(show.base_amount)}
                </TableCell>
                <TableCell
                  className={`whitespace-nowrap text-right font-medium ${ADJUSTMENT_CELL_CLASS[adjustmentTone]}`}
                >
                  {formatAdjustmentTotal(show.adjustment_total)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-semibold">
                  {isUnresolved
                    ? <span className="text-muted-foreground">{m['compensations.status.unresolved']()}</span>
                    : formatAmount(show.total_amount)}
                </TableCell>
                <TableCell>
                  {isUnresolved
                    ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className="w-fit">
                            {m['compensations.status.unresolved']()}
                          </Badge>
                          {unresolvedReason
                            ? (
                                <span className="block max-w-[150px] truncate text-xs leading-tight text-muted-foreground">
                                  {unresolvedReason}
                                </span>
                              )
                            : null}
                        </div>
                      )
                    : (
                        <Badge variant="secondary">
                          {m['compensations.status.resolved']()}
                        </Badge>
                      )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-muted-foreground" title={show.note ?? ''}>
                  {show.note ? show.note : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
