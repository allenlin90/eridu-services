import { createFileRoute } from '@tanstack/react-router';
import { ClipboardCheck, Clock3, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  Label,
} from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { PageLayout } from '@/components/layouts/page-layout';
import {
  buildOperationsReviewRange,
  getOperationsReviewRefetchInterval,
  type OperationsReviewRangeKey,
} from '@/features/operations-review/lib/operations-review-range';

const operationsReviewSearchSchema = z.object({
  range: z.enum(['today', 'yesterday', 'last_7_days', 'custom']).catch('today'),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

type OperationsReviewSearch = z.infer<typeof operationsReviewSearchSchema>;

type RangeOption = {
  value: OperationsReviewRangeKey;
  label: string;
};

const RANGE_OPTIONS: RangeOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'custom', label: 'Custom' },
];

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const Route = createFileRoute('/studios/$studioId/operations-review')({
  component: StudioOperationsReviewRoute,
  validateSearch: (search) => operationsReviewSearchSchema.parse(search),
});

function formatWindowLabel(start: Date, end: Date): string {
  return `${DATETIME_FORMATTER.format(start)} - ${DATETIME_FORMATTER.format(end)}`;
}

function formatRefreshLabel(value: Date): string {
  return DATETIME_FORMATTER.format(value);
}

function getItemIcon(item: string) {
  if (item.includes('Needs') || item.includes('violations'))
    return <TriangleAlert className="h-4 w-4 text-amber-600" />;

  return <Clock3 className="h-4 w-4 text-muted-foreground" />;
}

function StudioOperationsReviewRoute() {
  const { studioId } = Route.useParams();

  return (
    <StudioRouteGuard
      studioId={studioId}
      routeKey="operationsReview"
      deniedTitle="Operations Review Access Required"
      deniedDescription="Only studio managers and admins can access operations review."
    >
      <StudioOperationsReviewPage />
    </StudioRouteGuard>
  );
}

function StudioOperationsReviewPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());

  const range = useMemo(
    () => buildOperationsReviewRange({
      range: search.range,
      dateFrom: search.date_from,
      dateTo: search.date_to,
    }),
    [search.date_from, search.date_to, search.range],
  );
  const refetchInterval = getOperationsReviewRefetchInterval(search.range);

  const navigateRange = useCallback((nextRange: OperationsReviewRangeKey) => {
    void navigate({
      search: (previous) => ({
        ...(previous as OperationsReviewSearch),
        range: nextRange,
        date_from: nextRange === 'custom' ? range.dateFrom : undefined,
        date_to: nextRange === 'custom' ? range.dateTo : undefined,
      }),
      replace: true,
    });
  }, [navigate, range.dateFrom, range.dateTo]);

  const navigateDateFrom = useCallback((dateFrom: string) => {
    void navigate({
      search: (previous) => ({
        ...(previous as OperationsReviewSearch),
        range: 'custom',
        date_from: dateFrom || undefined,
      }),
      replace: true,
    });
  }, [navigate]);

  const navigateDateTo = useCallback((dateTo: string) => {
    void navigate({
      search: (previous) => ({
        ...(previous as OperationsReviewSearch),
        range: 'custom',
        date_to: dateTo || undefined,
      }),
      replace: true,
    });
  }, [navigate]);

  return (
    <PageLayout
      title="Operations Review"
      description="Confirm submitted tasks and review confirmed operational facts for the selected operational day."
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Operational Day Scope</CardTitle>
                <CardDescription>
                  {formatWindowLabel(range.windowStart, range.windowEnd)}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-2">
                  {RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={search.range === option.value ? 'default' : 'outline'}
                      onClick={() => navigateRange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {search.range === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 sm:w-72">
                    <div className="grid gap-1">
                      <Label htmlFor="operations-review-date-from" className="text-xs">
                        From
                      </Label>
                      <DatePicker
                        value={range.dateFrom}
                        onChange={navigateDateFrom}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="operations-review-date-to" className="text-xs">
                        To
                      </Label>
                      <DatePicker
                        value={range.dateTo}
                        onChange={navigateDateTo}
                      />
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Refresh operations review"
                  onClick={() => setLastRefreshedAt(new Date())}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Last refreshed at
              {' '}
              {formatRefreshLabel(lastRefreshedAt)}
            </span>
            <Badge variant="outline" className="w-fit font-normal">
              {refetchInterval ? 'Today cadence: 5 min' : 'Manual refresh'}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <OperationsReviewSection
            icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />}
            title="Submission Review"
            description="Submitted tasks are confirmed before their bound facts populate operational records."
            items={[
              'Awaiting manager confirmation',
              'Ready for bulk approval',
              'Needs attention before approval',
              'Extraction outcome after approval',
            ]}
          />
          <OperationsReviewSection
            icon={<ShieldCheck className="h-4 w-4 text-green-600" />}
            title="Operational Facts Review"
            description="Confirmed tasks populate show, creator, platform, and violation records for review."
            items={[
              'Show actuals completeness',
              'Late or missing creator reasons',
              'Active platform violations',
              'Range sign-off readiness',
            ]}
          />
        </div>
      </div>
    </PageLayout>
  );
}

function OperationsReviewSection({
  icon,
  title,
  description,
  items,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              {getItemIcon(item)}
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
