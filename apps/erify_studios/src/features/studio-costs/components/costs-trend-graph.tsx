import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { CostsSummaryResponse } from '@eridu/api-types/costs';
import { Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { currencySymbol, toCurrencyDisplayString } from '@/lib/decimal-format';

type CostsTrendGraphProps = {
  data?: CostsSummaryResponse;
  isLoading: boolean;
};

type TrendTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    color: string;
    payload: { date: string; show_cost: string; shift_cost: string; total_cost: string };
  }>;
  locale?: string;
  currency?: string;
};

function CustomTooltip({ active, payload, locale, currency }: TrendTooltipProps) {
  if (active && payload && payload.length) {
    const rawPayload = payload[0].payload;
    let dateStr = '';
    try {
      dateStr = format(parseISO(rawPayload.date), 'MMMM d, yyyy');
    } catch {
      dateStr = rawPayload.date;
    }

    const formatVal = (value: string | number) => {
      return toCurrencyDisplayString(String(value), locale ?? 'th-TH', currency ?? 'THB');
    };

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{dateStr}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
              <span className="text-xs text-muted-foreground font-medium">Show Costs</span>
            </div>
            <span className="text-xs font-bold">{formatVal(rawPayload.show_cost)}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span className="text-xs text-muted-foreground font-medium">Shift Costs</span>
            </div>
            <span className="text-xs font-bold">{formatVal(rawPayload.shift_cost)}</span>
          </div>
          <div className="h-px bg-muted my-1" />
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#6366f1]" />
              <span className="text-xs font-bold text-foreground">Total Cost</span>
            </div>
            <span className="text-xs font-bold text-foreground">{formatVal(rawPayload.total_cost)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function CostsTrendGraph({ data, isLoading }: CostsTrendGraphProps) {
  const trendData = (data?.trend ?? []).map((coord) => ({
    ...coord,
    // Convert to number for recharts stacking/drawing
    show_cost_num: Number.parseFloat(coord.show_cost),
    shift_cost_num: Number.parseFloat(coord.shift_cost),
    total_cost_num: Number.parseFloat(coord.total_cost),
  }));

  const hasData = trendData.length > 0;
  const locale = data?.locale ?? 'th-TH';
  const currency = data?.currency ?? 'THB';

  const formatXAxis = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'MMM d');
    } catch {
      return tickItem;
    }
  };

  const formatYAxis = (tickItem: number) => {
    const prefix = currencySymbol(locale, currency);
    if (tickItem >= 1000) {
      return `${prefix}${(tickItem / 1000).toFixed(0)}k`;
    }
    return `${prefix}${tickItem}`;
  };

  if (isLoading) {
    return (
      <Card className="border-muted/40 bg-muted/5 animate-pulse">
        <CardHeader className="pb-4">
          <div className="h-6 w-32 rounded bg-muted/40" />
          <div className="h-3 w-48 mt-1 rounded bg-muted/20" />
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full rounded-lg bg-muted/20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/20 bg-background/50 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-6">
        <div>
          <CardTitle className="text-lg font-bold">Daily Cost Composition</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Stacked daily show and shift costs visual representation
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {hasData
          ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorShow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="colorShift" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatXAxis}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '10px' }}
                      dy={10}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '10px' }}
                      dx={-5}
                    />
                    <Tooltip
                      content={(
                        <CustomTooltip
                          locale={locale}
                          currency={currency}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="show_cost_num"
                      stackId="1"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorShow)"
                    />
                    <Area
                      type="monotone"
                      dataKey="shift_cost_num"
                      stackId="1"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorShift)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-muted/50 bg-muted/5">
                <p className="text-sm text-muted-foreground">No trend data available for the selected range.</p>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
