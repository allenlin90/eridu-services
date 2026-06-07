import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ShowPerformanceLoopsResponse } from '@eridu/api-types/performance';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { currencySymbol, toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

type ShowPerformanceLoopsGraphProps = {
  data?: ShowPerformanceLoopsResponse;
  isLoading: boolean;
};

type MetricKey = 'viewer_count' | 'gmv' | 'ctr' | 'cto';

const PALETTE = [
  '#ea580c', // Shopee orange
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
];

type LoopTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
  activeMetric: MetricKey;
  locale?: string;
  currency?: string;
};

function CustomTooltip({ active, payload, label, activeMetric, locale, currency }: LoopTooltipProps) {
  if (active && payload && payload.length) {
    const formatValue = (value: any) => {
      if (activeMetric === 'viewer_count') {
        return new Intl.NumberFormat(locale ?? 'th-TH').format(Number(value));
      }
      if (activeMetric === 'gmv') {
        return toCurrencyDisplayString(String(value), locale ?? 'th-TH', currency ?? 'THB');
      }
      return `${toDecimalDisplayString(String(value))}%`;
    };

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, index: number) => (
            <div key={item.name || index} className="flex items-center gap-2 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {item.name}
                :
              </span>
              <span className="font-bold text-foreground">
                {formatValue(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function ShowPerformanceLoopsGraph({ data, isLoading }: ShowPerformanceLoopsGraphProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('viewer_count');

  const loops = useMemo(() => data?.loops ?? [], [data?.loops]);
  const hasData = loops.length > 0;

  // Extract all unique platform names across all loops to plot lines for them
  const platformNames = useMemo(() => {
    const names = new Set<string>();
    loops.forEach((loop) => {
      loop.metrics.forEach((m) => {
        if (m.platform_name) {
          names.add(m.platform_name);
        }
      });
    });
    return Array.from(names);
  }, [loops]);

  // Transform loop metrics into Recharts-friendly structure
  const chartData = useMemo(() => {
    return loops.map((loop) => {
      const dataPoint: Record<string, any> = {
        name: loop.name,
      };

      loop.metrics.forEach((m) => {
        let val: number | null = null;
        if (activeMetric === 'viewer_count') {
          val = m.viewer_count;
        } else if (activeMetric === 'ctr') {
          val = m.ctr !== null ? Number(m.ctr) : null;
        } else if (activeMetric === 'cto') {
          val = m.cto !== null ? Number(m.cto) : null;
        } else if (activeMetric === 'gmv') {
          val = m.gmv !== null ? Number(m.gmv) : null;
        }
        dataPoint[m.platform_name] = val;
      });

      return dataPoint;
    });
  }, [loops, activeMetric]);

  const metrics = [
    { key: 'viewer_count' as const, label: 'Views' },
    { key: 'gmv' as const, label: 'GMV' },
    { key: 'ctr' as const, label: 'CTR (%)' },
    { key: 'cto' as const, label: 'CTO (%)' },
  ];

  const formatYAxis = (tickItem: number) => {
    const locale = data?.locale ?? 'th-TH';
    const currency = data?.currency ?? 'THB';
    if (activeMetric === 'viewer_count') {
      if (tickItem >= 1000)
        return `${(tickItem / 1000).toFixed(0)}k`;
      return String(tickItem);
    }
    if (activeMetric === 'gmv') {
      const prefix = currencySymbol(locale, currency);
      if (tickItem >= 1000)
        return `${prefix}${(tickItem / 1000).toFixed(0)}k`;
      return `${prefix}${tickItem}`;
    }
    return `${tickItem}%`;
  };

  if (isLoading) {
    return (
      <Card className="border-muted/40 bg-muted/5">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded bg-muted/40 animate-pulse" />
            <div className="h-8 w-16 rounded bg-muted/40 animate-pulse" />
            <div className="h-8 w-16 rounded bg-muted/40 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full rounded-lg bg-muted/20 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <Card className="border-muted/20 bg-background/50 hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
        <div>
          <CardTitle className="text-lg font-bold">Moderation Loop Trend</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Visualizing loop-by-loop metric progression during the broadcast
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
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.3)" />
              <XAxis
                dataKey="name"
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
                  />
                )}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
              />
              {platformNames.map((name, index) => {
                const color = PALETTE[index % PALETTE.length];
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={color}
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                    dot={{ r: 3, strokeWidth: 0, fill: color }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
