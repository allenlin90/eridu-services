import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { ArrowLeft, Flag } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { z } from 'zod';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  DatePickerWithRange,
} from '@eridu/ui';
import { toast } from 'sonner';

import { PageLayout } from '@/components/layouts/page-layout';
import { useClientMechanicQuery } from '@/features/client-mechanics/api/get-client-mechanic';
import { useMechanicCoverageQuery } from '@/features/client-mechanics/api/get-mechanic-coverage';
import { useActiveStudio } from '@/lib/hooks/use-active-studio';
import {
  buildOperationalDayRange,
  getCurrentOperationalDate,
  toOperationalDateInputValue,
} from '@/lib/operational-day-range';
import { fromLocalDateInput } from '@/features/studio-shifts/utils/shift-date.utils';

const routeApi = getRouteApi('/studios/$studioId/client-mechanics/$mechanicId/coverage');

const mechanicCoverageSearchSchema = z.object({
  client_id: z.string().optional().catch(undefined),
  date_from: z.string().optional().catch(undefined),
  date_to: z.string().optional().catch(undefined),
});

type MechanicCoverageSearch = z.infer<typeof mechanicCoverageSearchSchema>;

export function MechanicCoveragePage() {
  const { studioId, mechanicId } = routeApi.useParams();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { activeStudio } = useActiveStudio();

  const updateSearch = useCallback(
    (nextSearch: Partial<MechanicCoverageSearch>) => {
      void navigate({
        search: (previous) => {
          const next = { ...previous, ...nextSearch };
          Object.keys(next).forEach((key) => {
            if (next[key as keyof MechanicCoverageSearch] === undefined) {
              delete next[key as keyof MechanicCoverageSearch];
            }
          });
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  const dateRange = useMemo(() => {
    if (!search.date_from && !search.date_to) {
      const defaultDays = (activeStudio?.studio as any)?.metadata?.planning?.defaultDashboardRangeDays ?? 7;
      const todayStr = getCurrentOperationalDate();
      const today = fromLocalDateInput(todayStr);
      const startRange = new Date(today);
      startRange.setDate(today.getDate() - (defaultDays - 1));
      return buildOperationalDayRange({
        date_from: toOperationalDateInputValue(startRange),
        date_to: todayStr,
      });
    }
    return buildOperationalDayRange({
      date_from: search.date_from,
      date_to: search.date_to,
    });
  }, [search.date_from, search.date_to, activeStudio]);

  const selectedPickerRange = useMemo<DateRange>(() => {
    return {
      from: fromLocalDateInput(dateRange.dateFrom),
      to: fromLocalDateInput(dateRange.dateTo),
    };
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const handleDateRangeChange = useCallback(
    (nextRange: DateRange | undefined) => {
      updateSearch({
        date_from: nextRange?.from ? toOperationalDateInputValue(nextRange.from) : undefined,
        date_to: nextRange?.to ? toOperationalDateInputValue(nextRange.to) : undefined,
      });
    },
    [updateSearch],
  );

  const sharedApiParams = useMemo(() => {
    return {
      start_date: dateRange.windowStart.toISOString(),
      end_date: dateRange.windowEnd.toISOString(),
    };
  }, [dateRange]);

  const mechanicQuery = useClientMechanicQuery(studioId, search.client_id, mechanicId);
  const coverageQuery = useMechanicCoverageQuery(studioId, search.client_id, mechanicId, sharedApiParams);

  const mechanic = mechanicQuery.data;
  const coverageData = coverageQuery.data;

  const handleFlagToManager = useCallback((showName: string) => {
    toast.success(`Flagged ${showName} coverage discrepancy to manager.`, {
      description: 'An operational alert has been raised.',
    });
  }, []);

  const columns = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: 'Show Name',
        cell: ({ row }: any) => (
          <div className="font-semibold">{row.original.name}</div>
        ),
      },
      {
        accessorKey: 'start_time',
        header: 'Show Time',
        cell: ({ row }: any) => new Date(row.original.start_time).toLocaleString(),
      },
      {
        accessorKey: 'template_name',
        header: 'Expected Template',
        cell: ({ row }: any) => {
          const { template_name, template_uid } = row.original;
          if (!template_name) return <span className="text-muted-foreground">—</span>;
          return (
            <Link
              to="/studios/$studioId/task-templates/$templateId"
              params={{ studioId, templateId: template_uid || '' }}
              search={{ page: 1, limit: 10 }}
              className="text-primary hover:underline"
            >
              {template_name}
            </Link>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: any) => {
          const { status, frozen_revision, catalog_revision } = row.original;

          switch (status) {
            case 'current':
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Current</Badge>
                  <span className="text-xs text-muted-foreground">v{frozen_revision}</span>
                </div>
              );
            case 'stale':
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Stale</Badge>
                  <span className="text-xs text-muted-foreground">
                    v{frozen_revision} vs latest v{catalog_revision}
                  </span>
                </div>
              );
            case 'dropped':
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Dropped</Badge>
                  <span className="text-xs text-muted-foreground">Removed from template</span>
                </div>
              );
            case 'unassigned':
            default:
              return (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Unassigned</Badge>
                </div>
              );
          }
        },
      },
      {
        id: 'flag',
        header: 'Actions',
        cell: ({ row }: any) => {
          const { status, name } = row.original;
          if (status === 'current') return null;

          return (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleFlagToManager(name)}
            >
              <Flag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              Flag to Manager
            </Button>
          );
        },
      },
    ];
  }, [studioId, handleFlagToManager]);

  const isLoading = mechanicQuery.isLoading || coverageQuery.isLoading;

  return (
    <PageLayout
      title="Mechanic Coverage"
      description="Track task-template and show assignment alignment for reusable moderation cues."
    >
      <div className="space-y-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link
              to="/studios/$studioId/client-mechanics"
              params={{ studioId }}
              search={{ page: 1, limit: 10, client_id: search.client_id }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Catalog
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading coverage statistics...</span>
          </div>
        ) : !mechanic ? (
          <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
            <span className="text-sm text-muted-foreground">Client mechanic not found.</span>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{mechanic.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Label: <span className="font-semibold text-foreground">{mechanic.instruction_label}</span> · Revision v{mechanic.content_revision}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={mechanic.status === 'active' ? 'outline' : 'secondary'}
                    className={mechanic.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : undefined}
                  >
                    {mechanic.status}
                  </Badge>
                </div>
              </CardHeader>
              <hr className="border-t" />
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Instruction Details
                  </span>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md border">
                    {mechanic.instruction_body}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Linked Templates</CardTitle>
                  <CardDescription>
                    Templates containing reference bindings to this mechanic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coverageData?.templates && coverageData.templates.length > 0 ? (
                    coverageData.templates.map((tpl) => (
                      <div
                        key={tpl.uid}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/10 text-sm"
                      >
                        <Link
                          to="/studios/$studioId/task-templates/$templateId"
                          params={{ studioId, templateId: tpl.uid }}
                          search={{ page: 1, limit: 10 }}
                          className="font-medium text-primary hover:underline truncate max-w-[180px]"
                        >
                          {tpl.name}
                        </Link>
                        {tpl.is_latest_carrying ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] py-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] py-0">
                            Dropped
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-6">
                      No task templates reference this mechanic.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-base">Shows Target Coverage</CardTitle>
                    <CardDescription>
                      Alignment status across shows of the client.
                    </CardDescription>
                  </div>
                  <DatePickerWithRange
                    date={selectedPickerRange}
                    setDate={handleDateRangeChange}
                  />
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={columns as any}
                    data={coverageData?.shows ?? []}
                    isLoading={coverageQuery.isLoading}
                    emptyMessage="No shows found in the chosen date range."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export const Route = createFileRoute(
  '/studios/$studioId/client-mechanics/$mechanicId/coverage',
)({
  validateSearch: (search) => mechanicCoverageSearchSchema.parse(search),
  component: MechanicCoveragePage,
});
