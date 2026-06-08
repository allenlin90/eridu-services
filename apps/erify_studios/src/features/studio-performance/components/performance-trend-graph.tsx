import { format, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PerformanceSummaryResponse, ShowPerformanceSeriesResponse } from '@eridu/api-types/performance';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { currencySymbol, toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

export type PerformanceChartMode = 'daily' | 'by_show';

type PerformanceTrendGraphProps = {
  /** Daily-trend source (operational-day buckets). */
  data?: PerformanceSummaryResponse;
  isLoading: boolean;
  mode: PerformanceChartMode;
  onModeChange: (mode: PerformanceChartMode) => void;
  /** Per-show series source for By-Show mode. */
  seriesData?: ShowPerformanceSeriesResponse;
  seriesLoading: boolean;
  /** Client selector rendered above the chart in By-Show mode. */
  clientSelector: ReactNode;
};

type DailyMetric = 'gmv' | 'views';
type SeriesMetric = 'gmv' | 'views' | 'peak_ctr' | 'peak_cto';

const BTN_SKELETONS = ['btn-ske-1', 'btn-ske-2'];
const SERIES_COLOR = '#6366f1'; // indigo

const DAILY_METRICS = [
  { key: 'gmv' as const, label: 'GMV', color: '#10b981', gradientId: 'colorGmv' },
  { key: 'views' as const, label: 'Views', color: '#3b82f6', gradientId: 'colorViews' },
];

const SERIES_METRICS = [
  { key: 'gmv' as const, label: 'GMV' },
  { key: 'views' as const, label: 'Views' },
  { key: 'peak_ctr' as const, label: 'Peak CTR' },
  { key: 'peak_cto' as const, label: 'Peak CTO' },
];

const MODES: Array<{ key: PerformanceChartMode; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'by_show', label: 'By Show' },
];

function isRateMetric(metric: SeriesMetric): boolean {
  return metric === 'peak_ctr' || metric === 'peak_cto';
}

// --- Daily (operational-day) tooltip -----------------------------------------

type DailyTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number | string; payload: { date: string } }>;
  activeMetric: DailyMetric;
  metricLabel: string;
  color: string;
  locale?: string;
  currency?: string;
};

function DailyTooltip({ active, payload, activeMetric, metricLabel, color, locale, currency }: DailyTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    let dateStr = '';
    try {
      dateStr = format(parseISO(item.payload.date), 'MMMM d, yyyy');
    } catch {
      dateStr = item.payload.date;
    }

    const formatted = activeMetric === 'gmv'
      ? toCurrencyDisplayString(String(item.value), locale ?? 'th-TH', currency ?? 'THB')
      : new Intl.NumberFormat(locale ?? 'th-TH').format(Number(item.value));

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{dateStr}</p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium">
            {metricLabel}
            :
          </span>
          <span className="text-sm font-bold">{formatted}</span>
        </div>
      </div>
    );
  }
  return null;
}

// --- By-Show tooltip ----------------------------------------------------------

type SeriesTooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number | string; payload: { name: string } }>;
  activeMetric: SeriesMetric;
  metricLabel: string;
  locale?: string;
  currency?: string;
};

function SeriesTooltip({ active, payload, activeMetric, metricLabel, locale, currency }: SeriesTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0];
    const value = item.value;

    let formatted: string;
    if (value === null || value === undefined) {
      formatted = '—';
    } else if (isRateMetric(activeMetric)) {
      formatted = `${toDecimalDisplayString(String(value))}%`;
    } else if (activeMetric === 'gmv') {
      formatted = toCurrencyDisplayString(String(value), locale ?? 'th-TH', currency ?? 'THB');
    } else {
      formatted = new Intl.NumberFormat(locale ?? 'th-TH').format(Number(value));
    }

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{item.payload.name}</p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES_COLOR }} />
          <span className="text-sm font-medium">
            {metricLabel}
            :
          </span>
          <span className="text-sm font-bold">{formatted}</span>
        </div>
      </div>
    );
  }
  return null;
}

// --- Card ---------------------------------------------------------------------

export function PerformanceTrendGraph({
  data,
  isLoading,
  mode,
  onModeChange,
  seriesData,
  seriesLoading,
  clientSelector,
}: PerformanceTrendGraphProps) {
  const [dailyMetric, setDailyMetric] = useState<DailyMetric>('gmv');
  const [seriesMetric, setSeriesMetric] = useState<SeriesMetric>('gmv');

  const trendData = data?.trend ?? [];
  const activeDaily = DAILY_METRICS.find((m) => m.key === dailyMetric)!;
  const activeSeries = SERIES_METRICS.find((m) => m.key === seriesMetric)!;

  const locale = (mode === 'daily' ? data?.locale : seriesData?.locale) ?? 'th-TH';
  const currency = (mode === 'daily' ? data?.currency : seriesData?.currency) ?? 'THB';

  // Per-show chart points: one x per show, y = the active metric (null-safe).
  const seriesChartData = useMemo(() => {
    return (seriesData?.shows ?? []).map((show) => {
      const raw = show[seriesMetric];
      const value = raw === null || raw === undefined ? null : Number(raw);
      return { name: show.name, value: Number.isFinite(value as number) ? value : null };
    });
  }, [seriesData?.shows, seriesMetric]);

  const isCurrentLoading = mode === 'daily' ? isLoading : seriesLoading;
  const hasDailyData = trendData.length > 0;
  const hasSeriesData = seriesChartData.length > 0;

  const formatDailyXAxis = (tick: string) => {
    try {
      return format(parseISO(tick), 'MMM d');
    } catch {
      return tick;
    }
  };

  const truncateName = (tick: string) => (tick.length > 12 ? `${tick.slice(0, 11)}…` : tick);

  const formatYAxis = (tick: number, metricKey: DailyMetric | SeriesMetric) => {
    if (isRateMetric(metricKey as SeriesMetric)) {
      return `${tick}%`;
    }
    if (metricKey === 'gmv') {
      const prefix = currencySymbol(locale, currency);
      if (tick >= 1000)
        return `${prefix}${(tick / 1000).toFixed(0)}k`;
      return `${prefix}${tick}`;
    }
    if (tick >= 1000)
      return `${(tick / 1000).toFixed(0)}k`;
    return `${tick}`;
  };

  if (isCurrentLoading) {
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
      <CardHeader className="flex flex-col gap-4 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold">
              {mode === 'daily' ? 'Daily Performance Trend' : 'Performance by Show'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'daily'
                ? 'Visualizing daily metrics for the selected time range'
                : 'Per-show metrics across the selected range, ordered by start time'}
            </p>
          </div>
          {/* X-axis mode toggle */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg self-start sm:self-auto">
            {MODES.map((m) => (
              <Button
                key={m.key}
                variant={mode === m.key ? 'secondary' : 'ghost'}
                size="sm"
                className={`h-7 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${
                  mode === m.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => onModeChange(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Metric toggle (set depends on mode) + client selector for By-Show */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {mode === 'by_show'
            ? <div className="w-full sm:max-w-xs">{clientSelector}</div>
            : <div />}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/40 rounded-lg self-start sm:self-auto">
            {(mode === 'daily' ? DAILY_METRICS : SERIES_METRICS).map((metric) => {
              const active = mode === 'daily' ? dailyMetric === metric.key : seriesMetric === metric.key;
              return (
                <Button
                  key={metric.key}
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`h-7 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${
                    active
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => (mode === 'daily'
                    ? setDailyMetric(metric.key as DailyMetric)
                    : setSeriesMetric(metric.key as SeriesMetric))}
                >
                  {metric.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {mode === 'daily'
          ? (
              hasDailyData
                ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={activeDaily.gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeDaily.color} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={activeDaily.color} stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDailyXAxis}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '10px' }}
                            dy={10}
                          />
                          <YAxis
                            tickFormatter={(tick: number) => formatYAxis(tick, dailyMetric)}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '10px' }}
                            dx={-5}
                          />
                          <Tooltip
                            content={(
                              <DailyTooltip
                                activeMetric={dailyMetric}
                                metricLabel={activeDaily.label}
                                color={activeDaily.color}
                                locale={data?.locale}
                                currency={data?.currency}
                              />
                            )}
                          />
                          <Area
                            type="monotone"
                            dataKey={dailyMetric}
                            stroke={activeDaily.color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#${activeDaily.gradientId})`}
                            activeDot={{ r: 4, strokeWidth: 0, fill: activeDaily.color }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )
                : (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-muted/50 bg-muted/5">
                      <p className="text-sm text-muted-foreground">No trend data available for the selected range.</p>
                    </div>
                  )
            )
          : (
              hasSeriesData
                ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seriesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
                          <XAxis
                            dataKey="name"
                            tickFormatter={truncateName}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '10px' }}
                            dy={10}
                          />
                          <YAxis
                            tickFormatter={(tick: number) => formatYAxis(tick, seriesMetric)}
                            tickLine={false}
                            axisLine={false}
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '10px' }}
                            dx={-5}
                          />
                          <Tooltip
                            content={(
                              <SeriesTooltip
                                activeMetric={seriesMetric}
                                metricLabel={activeSeries.label}
                                locale={seriesData?.locale}
                                currency={seriesData?.currency}
                              />
                            )}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={SERIES_COLOR}
                            strokeWidth={2}
                            dot={{ r: 3, strokeWidth: 0, fill: SERIES_COLOR }}
                            activeDot={{ r: 4, strokeWidth: 0, fill: SERIES_COLOR }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                : (
                    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-muted/50 bg-muted/5">
                      <p className="text-sm text-muted-foreground">No shows in the selected range.</p>
                    </div>
                  )
            )}
      </CardContent>
    </Card>
  );
}
