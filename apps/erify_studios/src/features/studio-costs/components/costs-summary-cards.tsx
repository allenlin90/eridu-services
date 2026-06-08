import { AlertTriangle, BarChart2, Receipt, Users } from 'lucide-react';

import type { CostsSummaryResponse } from '@eridu/api-types/costs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@eridu/ui';

import { toCurrencyDisplayString } from '@/lib/decimal-format';

type CostsSummaryCardsProps = {
  data?: CostsSummaryResponse;
  isLoading: boolean;
};

const SKELETON_IDS = ['ske-total', 'ske-shows', 'ske-shifts'];

export function CostsSummaryCards({ data, isLoading }: CostsSummaryCardsProps) {
  const formatCurrency = (val?: string) => {
    const locale = data?.locale ?? 'th-TH';
    const currency = data?.currency ?? 'THB';
    if (!val) {
      try {
        return toCurrencyDisplayString('0', locale, currency);
      } catch {
        return currency === 'THB' ? '฿0.00' : '$0.00';
      }
    }
    try {
      return toCurrencyDisplayString(val, locale, currency);
    } catch {
      const fallbackSymbol = currency === 'THB' ? '฿' : '$';
      return `${fallbackSymbol}${val}`;
    }
  };

  const formatNumber = (val?: number) => {
    if (val === undefined)
      return '0';
    return new Intl.NumberFormat().format(val);
  };

  const hasUnresolved = (data?.unresolved_shows_count ?? 0) > 0 || (data?.unresolved_shifts_count ?? 0) > 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SKELETON_IDS.map((id) => (
          <Card key={id} className="animate-pulse border-muted/40 bg-muted/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 rounded bg-muted/40" />
              <div className="h-4 w-4 rounded-full bg-muted/40" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 rounded bg-muted/40" />
              <div className="mt-2 h-3 w-32 rounded bg-muted/20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Cost Card */}
        <Card className="overflow-hidden border bg-gradient-to-br from-indigo-500/10 to-purple-500/5 dark:from-indigo-500/20 dark:to-purple-500/10 border-indigo-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Total Cost
              {hasUnresolved && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-amber-500 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Total costs are currently incomplete because some shows or shifts contain unresolved billing.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <Receipt className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(data?.total_cost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {hasUnresolved ? 'Incomplete total cost (unresolved items present)' : 'Total cost for the selected range'}
            </p>
          </CardContent>
        </Card>

        {/* Show Costs Card */}
        <Card className="overflow-hidden border bg-gradient-to-br from-blue-500/10 to-cyan-500/5 dark:from-blue-500/20 dark:to-cyan-500/10 border-blue-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Show Costs
              {(data?.unresolved_shows_count ?? 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-amber-500 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {formatNumber(data?.unresolved_shows_count)}
                    {' '}
                    show(s) have unresolved billing setup (e.g. missing creator rates) and are excluded from this subtotal.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(data?.show_cost_subtotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(data?.unresolved_shows_count ?? 0) > 0
                ? `${formatNumber(data?.unresolved_shows_count)} of ${formatNumber(data?.total_shows_count)} shows unresolved`
                : `For all ${formatNumber(data?.total_shows_count)} shows in range`}
            </p>
          </CardContent>
        </Card>

        {/* Shift Costs Card */}
        <Card className="overflow-hidden border bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border-emerald-500/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Shift Costs
              {(data?.unresolved_shifts_count ?? 0) > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-4 w-4 text-amber-500 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {formatNumber(data?.unresolved_shifts_count)}
                    {' '}
                    operator shift(s) have unresolved billing (e.g. missing membership hourly rates) and are excluded from this subtotal.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{formatCurrency(data?.shift_cost_subtotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(data?.unresolved_shifts_count ?? 0) > 0
                ? `${formatNumber(data?.unresolved_shifts_count)} of ${formatNumber(data?.total_shifts_count)} shifts unresolved`
                : `For all ${formatNumber(data?.total_shifts_count)} shifts in range`}
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
