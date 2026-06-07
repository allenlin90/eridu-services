import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PerformanceSummaryResponse } from '@eridu/api-types/performance';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { toCurrencyDisplayString } from '@/lib/decimal-format';

type PerformanceTrendGraphProps = {
  data?: PerformanceSummaryResponse;
  isLoading: boolean;
};

type MetricKey = 'gmv' | 'views';

const BTN_SKELETONS = ['btn-ske-1', 'btn-ske-2'];

type TrendTooltipProps = {
  // Injected by Recharts when used as a `content` element.
  active?: boolean;
  payload?: Array<{ value: number | string; payload: { date: string } }>;
  // Our own props. Note: do NOT name a prop `label` — Recharts injects its own
  // `label` (the active x-axis value) and would shadow it.
  activeMetric: MetricKey;
  metricLabel: string;
  color: string;
  locale?: string;
  currency?: string;
};

// Custom Tooltip component defined outside of the render function
function CustomTooltip({ active, payload, activeMetric, metricLabel, color, locale, currency }: TrendTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    let dateStr = '';
    try {
      dateStr = format(parseISO(item.payload.date), 'MMMM d, yyyy');
    } catch {
      dateStr = item.payload.date;
    }

    const formatTooltipValue = (value: number | string) => {
      if (activeMetric === 'gmv') {
        return toCurrencyDisplayString(String(value), locale ?? 'th-TH', currency ?? 'THB');
      }
      return new Intl.NumberFormat(locale ?? 'th-TH').format(Number(value));
    };

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{dateStr}</p>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium">
            {metricLabel}
            :
          </span>
          <span className="text-sm font-bold">{formatTooltipValue(item.value)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function PerformanceTrendGraph({ data, isLoading }: PerformanceTrendGraphProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('gmv');

  const trendData = data?.trend ?? [];
  const hasData = trendData.length > 0;

  const metrics = [
    { key: 'gmv' as const, label: 'GMV', color: '#10b981', gradientId: 'colorGmv' },
    { key: 'views' as const, label: 'Views', color: '#3b82f6', gradientId: 'colorViews' },
  ];

  const activeMetricConfig = metrics.find((m) => m.key === activeMetric)!;

  // Format tick labels
  const formatXAxis = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'MMM d');
    } catch {
      return tickItem;
    }
  };

  const formatYAxis = (tickItem: number) => {
    const locale = data?.locale ?? 'th-TH';
    const currency = data?.currency ?? 'THB';
    if (activeMetric === 'gmv') {
      let prefix = '$';
      try {
        const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
        const currencyPart = parts.find((p) => p.type === 'currency');
        if (currencyPart) {
          prefix = currencyPart.value;
        }
      } catch {
        prefix = currency === 'THB' ? '฿' : '$';
      }

      if (tickItem >= 1000)
        return `${prefix}${(tickItem / 1000).toFixed(0)}k`;
      return `${prefix}${tickItem}`;
    }
    if (tickItem >= 1000)
      return `${(tickItem / 1000).toFixed(0)}k`;
    return `${tickItem}`;
  };

  if (isLoading) {
    return (
      <Card className="border-muted/40 bg-muted/5">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="h-6 w-32 rounded bg-muted/40 animate-pulse" />
          <div className="flex gap-2">
            {BTN_SKELETONS.map((id) => (
              <div key={id} className="h-8 w-16 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full rounded-lg bg-muted/20 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted/20 bg-background/50 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
        <div>
          <CardTitle className="text-lg font-bold">Daily Performance Trend</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Visualizing daily metrics for the selected time range
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg self-start sm:self-auto">
          {metrics.map((metric) => (
            <Button
              key={metric.key}
              variant={activeMetric === metric.key ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeMetric === metric.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveMetric(metric.key)}
            >
              {metric.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {hasData
          ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={activeMetricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeMetricConfig.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={activeMetricConfig.color} stopOpacity={0.01} />
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
                          activeMetric={activeMetric}
                          metricLabel={activeMetricConfig.label}
                          color={activeMetricConfig.color}
                          locale={data?.locale}
                          currency={data?.currency}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeMetric}
                      stroke={activeMetricConfig.color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#${activeMetricConfig.gradientId})`}
                      activeDot={{ r: 4, strokeWidth: 0, fill: activeMetricConfig.color }}
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
