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
  formatAdjustmentTotal,
  formatAgreedRate,
  formatAmount,
  formatCommissionRate,
  formatUnresolvedReason,
  getAdjustmentTone,
  getCompensationTypeBadgeClass,
} from '@/features/compensations/lib/compensations-display';

export type CompensationsBreakdownTableProps = {
  shows: StudioCreatorCompensationShow[];
};

const ADJUSTMENT_CELL_CLASS: Record<ReturnType<typeof getAdjustmentTone>, string> = {
  muted: 'text-slate-400',
  negative: 'text-rose-400',
  positive: 'text-emerald-400',
};

export function CompensationsBreakdownTable({ shows }: CompensationsBreakdownTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-900/50 hover:bg-slate-900/50 border-b border-slate-800">
          <TableRow className="border-b border-slate-800">
            <TableHead className="text-slate-300 font-semibold h-11 text-xs">Show Name</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs">Date &amp; Time</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs">Type</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">Agreed Rate</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">Commission</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">Base Amount</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">Adjustments</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">Total Amount</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs">Status</TableHead>
            <TableHead className="text-slate-300 font-semibold h-11 text-xs">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shows.map((show) => {
            const unresolvedReason = formatUnresolvedReason(show.unresolved_reason);
            const isUnresolved = show.unresolved_reason !== null;
            const adjustmentTone = getAdjustmentTone(show.adjustment_total);

            return (
              <TableRow
                key={show.show_creator_id}
                className="border-b border-slate-800/60 hover:bg-slate-900/20 transition-colors"
              >
                <TableCell className="font-medium text-slate-100 max-w-[200px] truncate text-xs py-3.5">
                  {show.show_name}
                </TableCell>
                <TableCell className="text-slate-300 text-xs py-3.5 whitespace-nowrap">
                  {format(new Date(show.show_start_time), 'PPP p')}
                </TableCell>
                <TableCell className="text-xs py-3.5 whitespace-nowrap">
                  {show.compensation_type
                    ? (
                        <Badge className={getCompensationTypeBadgeClass(show.compensation_type)}>
                          {show.compensation_type}
                        </Badge>
                      )
                    : (
                        <span className="text-slate-500">—</span>
                      )}
                </TableCell>
                <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                  {formatAgreedRate(show)}
                </TableCell>
                <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                  {formatCommissionRate(show)}
                </TableCell>
                <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                  {formatAmount(show.base_amount)}
                </TableCell>
                <TableCell
                  className={`text-right text-xs py-3.5 whitespace-nowrap font-medium ${ADJUSTMENT_CELL_CLASS[adjustmentTone]}`}
                >
                  {formatAdjustmentTotal(show.adjustment_total)}
                </TableCell>
                <TableCell className="text-right text-slate-100 font-semibold text-xs py-3.5 whitespace-nowrap">
                  {isUnresolved
                    ? <span className="text-slate-400">Unresolved</span>
                    : formatAmount(show.total_amount)}
                </TableCell>
                <TableCell className="text-xs py-3.5">
                  {isUnresolved
                    ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className="w-fit bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10 text-[9px] font-medium">
                            Unresolved
                          </Badge>
                          {unresolvedReason
                            ? (
                                <span className="text-[10px] text-amber-500/90 leading-tight block max-w-[150px] truncate">
                                  {unresolvedReason}
                                </span>
                              )
                            : null}
                        </div>
                      )
                    : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-[9px] font-medium">
                          Resolved
                        </Badge>
                      )}
                </TableCell>
                <TableCell className="text-xs py-3.5 max-w-[150px] truncate text-slate-300" title={show.note ?? ''}>
                  {show.note ? show.note : <span className="text-slate-500">—</span>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
