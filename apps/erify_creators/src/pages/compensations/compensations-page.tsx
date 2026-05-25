import { useNavigate, useSearch } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  Info,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePickerWithRange,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@eridu/ui';

import { PageContainer } from '@/components/layouts/page-container';
import { PageLayout } from '@/components/layouts/page-layout';
import { useMyShowCompensations } from '@/features/compensations/api/compensations.api';
import { getInitialDateRange } from '@/features/compensations/config/compensations-search-schema';
import { useActiveStudio } from '@/lib/hooks';
const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  AGREEMENT_SNAPSHOT_MISSING: 'Agreement pending',
  COMMISSION_REVENUE_NOT_AVAILABLE: 'Revenue pending verification',
};

function formatAmount(value: string | null) {
  return value ? `$${value}` : '—';
}

function formatUnresolvedReason(value: string | null) {
  if (!value)
    return null;
  return UNRESOLVED_REASON_LABELS[value] ?? value;
}

export function CompensationsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/compensations/' });
  const { activeStudioId, activeStudio } = useActiveStudio();

  // Initialize and fallback date params
  const { dateFrom: defaultFrom, dateTo: defaultTo } = getInitialDateRange();
  const hasNoDateParams = !search.dateFrom && !search.dateTo;
  const dateFrom = hasNoDateParams ? defaultFrom : search.dateFrom;
  const dateTo = hasNoDateParams ? defaultTo : search.dateTo;

  // Active query parameters for react-query
  const queryParams = {
    studio_id: activeStudioId ?? '',
    date_from: dateFrom ?? '',
    date_to: dateTo ?? '',
  };

  const isQueryEnabled = !!queryParams.studio_id && !!queryParams.date_from && !!queryParams.date_to;

  const { data, isLoading, isFetching, isError, refetch } = useMyShowCompensations(queryParams);

  const dateRange: DateRange = {
    from: dateFrom ? new Date(dateFrom) : undefined,
    to: dateTo ? new Date(dateTo) : undefined,
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const toDate = range?.to ? new Date(range.to) : undefined;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    navigate({
      search: (prev) => ({
        ...prev,
        dateFrom: range?.from?.toISOString(),
        dateTo: toDate?.toISOString(),
      }),
    });
  };

  const shows = data?.shows ?? [];

  return (
    <PageContainer>
      <PageLayout
        title="My Compensations"
        description={
          activeStudio
             ? `Viewing show earnings with ${activeStudio.studio.name}`
             : 'Review your agreed rates and earnings across assigned shows'
        }
      >
        <div className="space-y-6">
          {/* Filters Area */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-900/40 p-4 border border-slate-800/80 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-slate-800 bg-slate-900/60 hover:bg-slate-800"
              onClick={() => isQueryEnabled && refetch()}
              disabled={isFetching || !isQueryEnabled}
              aria-label="Refresh compensations"
            >
              <RefreshCw className={`h-4 w-4 text-slate-300 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Earnings */}
            <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors duration-300 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Total Earnings
                </CardTitle>
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-slate-100">
                  {isLoading ? '...' : `$${data?.total_amount ?? '0.00'}`}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  Cumulative show payments
                </p>
              </CardContent>
            </Card>

            {/* Shows Completed */}
            <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-300 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Shows Completed
                </CardTitle>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Award className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-slate-100">
                  {isLoading ? '...' : shows.length}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  Assigned shows in range
                </p>
              </CardContent>
            </Card>

            {/* Pending Items */}
            <Card className="relative overflow-hidden bg-slate-900/30 border-slate-800 hover:border-slate-700/60 transition-all duration-300 shadow-xl group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors duration-300 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Pending Items
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-slate-100">
                  {isLoading ? '...' : data?.unresolved_count ?? 0}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3 text-amber-400" />
                  Awaiting verification
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Payments Grid Table */}
          <Card className="bg-slate-900/20 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-800/80 bg-slate-900/35">
              <CardTitle className="text-base text-slate-200">Show Compensation Breakdown</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Detailed listing of agreed contract rates, commissions, adjustments, and final payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && isQueryEnabled && (
                <div className="flex flex-col items-center justify-center p-12 text-sm text-slate-400 gap-3">
                  <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
                  <span>Loading compensations data...</span>
                </div>
              )}

              {!isLoading && isError && isQueryEnabled && (
                <div className="flex flex-col items-center justify-center p-12 text-sm text-red-400 gap-4">
                  <AlertTriangle className="h-8 w-8" />
                  <p>Failed to load compensations data. Please try again.</p>
                  <Button variant="outline" size="sm" onClick={() => isQueryEnabled && refetch()}>
                    Try Again
                  </Button>
                </div>
              )}

              {!isQueryEnabled && (
                <div className="flex flex-col items-center justify-center p-16 text-sm text-slate-400 gap-2">
                  {dateFrom && !dateTo
                    ? (
                        <>
                          <Calendar className="h-8 w-8 text-indigo-400/80 animate-pulse" />
                          <p>Please select an end date to view compensations.</p>
                        </>
                      )
                    : (
                        <>
                          <Info className="h-8 w-8 text-slate-500" />
                          <p>No compensations found for the selected period.</p>
                        </>
                      )}
                </div>
              )}

              {isQueryEnabled && !isLoading && !isError && shows.length === 0 && (
                <div className="flex flex-col items-center justify-center p-16 text-sm text-slate-400 gap-2">
                  <Info className="h-8 w-8 text-slate-500" />
                  <p>No compensations found for the selected period.</p>
                </div>
              )}

              {isQueryEnabled && !isLoading && !isError && shows.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-900/50 hover:bg-slate-900/50 border-b border-slate-800">
                      <TableRow className="border-b border-slate-800">
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs">
                          Show Name
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs">
                          Date &amp; Time
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs">
                          Type
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">
                          Agreed Rate
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">
                          Commission
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">
                          Base Amount
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">
                          Adjustments
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs text-right">
                          Total Amount
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs">
                          Status
                        </TableHead>
                        <TableHead className="text-slate-300 font-semibold h-11 text-xs">
                          Notes
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shows.map((show) => {
                        const unresolvedReason = formatUnresolvedReason(show.unresolved_reason);
                        const isUnresolved = show.unresolved_reason !== null;

                        // agreed rate style
                        let rateLabel = formatAmount(show.agreed_rate);
                        if (show.compensation_type === 'COMMISSION' && !show.agreed_rate) {
                          rateLabel = '—';
                        }

                        // commission percentage style
                        const commissionLabel = show.commission_rate
                          ? `${show.commission_rate}%`
                          : '—';

                        // adjustments coloring
                        const isAdjNegative = Number.parseFloat(show.adjustment_total) < 0;
                        const isAdjZero = Number.parseFloat(show.adjustment_total) === 0;

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
                                    <Badge
                                      className={
                                        show.compensation_type === 'FIXED'
                                          ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/10 border-indigo-500/20 text-[10px]'
                                          : show.compensation_type === 'COMMISSION'
                                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20 text-[10px]'
                                            : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/20 text-[10px]'
                                      }
                                    >
                                      {show.compensation_type}
                                    </Badge>
                                  )
                                : (
                                    <span className="text-slate-500">—</span>
                                  )}
                            </TableCell>
                            <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                              {rateLabel}
                            </TableCell>
                            <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                              {commissionLabel}
                            </TableCell>
                            <TableCell className="text-right text-slate-300 text-xs py-3.5 whitespace-nowrap">
                              {formatAmount(show.base_amount)}
                            </TableCell>
                            <TableCell
                              className={`text-right text-xs py-3.5 whitespace-nowrap font-medium ${
                                isAdjZero
                                  ? 'text-slate-400'
                                  : isAdjNegative
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                              }`}
                            >
                              {isAdjZero
                                ? '$0.00'
                                : isAdjNegative
                                  ? `-$${Math.abs(Number.parseFloat(show.adjustment_total)).toFixed(2)}`
                                  : `+$${show.adjustment_total}`}
                            </TableCell>
                            <TableCell className="text-right text-slate-100 font-semibold text-xs py-3.5 whitespace-nowrap">
                              {isUnresolved
                                ? (
                                    <span className="text-slate-400">Unresolved</span>
                                  )
                                : (
                                    formatAmount(show.total_amount)
                                  )}
                            </TableCell>
                            <TableCell className="text-xs py-3.5">
                              {isUnresolved
                                ? (
                                    <div className="flex flex-col gap-0.5">
                                      <Badge className="w-fit bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10 text-[9px] font-medium">
                                        Unresolved
                                      </Badge>
                                      {unresolvedReason && (
                                        <span className="text-[10px] text-amber-500/90 leading-tight block max-w-[150px] truncate">
                                          {unresolvedReason}
                                        </span>
                                      )}
                                    </div>
                                  )
                                : (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-[9px] font-medium">
                                      Resolved
                                    </Badge>
                                  )}
                            </TableCell>
                            <TableCell className="text-xs py-3.5 max-w-[150px] truncate text-slate-300" title={show.note ?? ''}>
                              {show.note || <span className="text-slate-500">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </PageContainer>
  );
}
