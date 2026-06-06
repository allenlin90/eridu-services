import { BarChart2, DollarSign, Eye } from 'lucide-react';

import type { PerformanceSummaryResponse } from '@eridu/api-types/performance';
import { Card, CardContent, CardHeader, CardTitle } from '@eridu/ui';

import { toCurrencyDisplayString } from '@/lib/decimal-format';

type PerformanceSummaryCardsProps = {
  data?: PerformanceSummaryResponse;
  isLoading: boolean;
};

const SKELETON_IDS = ['ske-gmv', 'ske-views', 'ske-recorded'];

export function PerformanceSummaryCards({ data, isLoading }: PerformanceSummaryCardsProps) {
  const formatCurrency = (val?: string) => {
    if (!val)
      return '$0.00';
    try {
      return toCurrencyDisplayString(val);
    } catch {
      return `$${val}`;
    }
  };

  const formatNumber = (val?: number) => {
    if (val === undefined)
      return '0';
    return new Intl.NumberFormat().format(val);
  };

  const cards = [
    {
      title: 'Total GMV',
      value: formatCurrency(data?.total_gmv),
      description: 'Gross Merchandise Value',
      icon: DollarSign,
      gradient: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10',
      border: 'border-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Total Views',
      value: formatNumber(data?.total_views),
      description: 'Accumulated view count',
      icon: Eye,
      gradient: 'from-blue-500/10 to-indigo-500/5 dark:from-blue-500/20 dark:to-indigo-500/10',
      border: 'border-blue-500/20',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Recorded Shows',
      value: data ? `${data.recorded_shows_count} / ${data.total_shows_count}` : '0 / 0',
      description: 'Shows with performance data',
      icon: BarChart2,
      gradient: 'from-rose-500/10 to-pink-500/5 dark:from-rose-500/20 dark:to-pink-500/10',
      border: 'border-rose-500/20',
      iconColor: 'text-rose-500',
    },
  ];

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`overflow-hidden border bg-gradient-to-br ${card.gradient} ${card.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
