import type { ReactNode } from 'react';

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@eridu/ui';

type ReviewMetric = {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'warning' | 'success';
};

type ReviewStep = {
  title: string;
  description: string;
  icon: ReactNode;
};

type OperationsReviewPreviewProps = {
  title: string;
  description: string;
  metrics: ReviewMetric[];
  steps: ReviewStep[];
};

function getMetricClassName(tone: ReviewMetric['tone'] = 'default'): string {
  if (tone === 'warning')
    return 'border-amber-200 bg-amber-50/60 text-amber-950';

  if (tone === 'success')
    return 'border-emerald-200 bg-emerald-50/60 text-emerald-950';

  return 'border-border bg-muted/30';
}

export function OperationsReviewPreview({
  title,
  description,
  metrics,
  steps,
}: OperationsReviewPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className={getMetricClassName(metric.tone)}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-normal">
                {metric.label}
              </CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {metric.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit font-normal">
              Foundation view
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {steps.map((step) => (
              <div key={step.title} className="flex gap-3 rounded-md border bg-background p-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  {step.icon}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
