import { createFileRoute } from '@tanstack/react-router';
import Big from 'big.js';
import { BarChart3, ExternalLink, Eye, Globe, Percent, TrendingUp } from 'lucide-react';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@eridu/ui';

import { StudioRouteGuard } from '@/components/guards/studio-route-guard';
import { usePerformanceLoopsQuery } from '@/features/studio-performance/api/get-performance-loops';
import { ShowPerformanceLoopsGraph } from '@/features/studio-performance/components/show-performance-loops-graph';
import { useStudioShow } from '@/features/studio-shows/hooks/use-studio-show';
import { toCurrencyDisplayString, toDecimalDisplayString } from '@/lib/decimal-format';

export const Route = createFileRoute('/studios/$studioId/shows/$showId/performance')({
  component: ShowPerformanceRouteComponent,
});

function ShowPerformanceRouteComponent() {
  const { studioId } = Route.useParams();
  return (
    <StudioRouteGuard studioId={studioId} routeKey="performance">
      <StudioShowPerformanceTab />
    </StudioRouteGuard>
  );
}

function StudioShowPerformanceTab() {
  const { studioId, showId } = Route.useParams();
  const { data: show } = useStudioShow({ studioId, showId });
  const { data: loopData, isLoading: isLoadingLoops } = usePerformanceLoopsQuery(studioId, showId);

  if (!show) {
    return null;
  }

  const platforms = show.platforms ?? [];

  // Compute aggregates
  let totalGmv: Big | null = null;
  let totalViews = 0;
  let sumCtr: Big | null = null;
  let sumCto: Big | null = null;
  let platformsWithGmvCount = 0;
  let platformsWithViewsCount = 0;
  let platformsWithCtrCount = 0;
  let platformsWithCtoCount = 0;

  platforms.forEach((p) => {
    if (p.gmv) {
      totalGmv = (totalGmv ?? new Big(0)).add(new Big(p.gmv));
      platformsWithGmvCount++;
    }
    if (p.viewer_count > 0) {
      totalViews += p.viewer_count;
      platformsWithViewsCount++;
    }
    if (p.ctr) {
      sumCtr = (sumCtr ?? new Big(0)).add(new Big(p.ctr));
      platformsWithCtrCount++;
    }
    if (p.cto) {
      sumCto = (sumCto ?? new Big(0)).add(new Big(p.cto));
      platformsWithCtoCount++;
    }
  });

  const hasMetrics
    = platformsWithGmvCount > 0
    || platformsWithViewsCount > 0
    || platformsWithCtrCount > 0
    || platformsWithCtoCount > 0;

  if (platforms.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-3">
          <Globe className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">No Platforms Assigned</CardTitle>
            <CardDescription className="max-w-md text-sm">
              This show does not have any platforms assigned yet. Go to the Details tab to configure platforms.
            </CardDescription>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasMetrics) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground/60" />
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">No Performance Data</CardTitle>
            <CardDescription className="max-w-md text-sm">
              Performance metrics have not been recorded for this show. Complete the post-production wrap-up or moderation check tasks to populate metrics.
            </CardDescription>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {platforms.map((p) => (
              <Badge key={p.show_platform_uid} variant="outline">
                {p.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgCtr = sumCtr && platformsWithCtrCount > 0 ? sumCtr.div(platformsWithCtrCount) : null;
  const avgCto = sumCto && platformsWithCtoCount > 0 ? sumCto.div(platformsWithCtoCount) : null;

  return (
    <div className="space-y-6">
      {/* Aggregate Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GMV</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalGmv ? toCurrencyDisplayString(totalGmv.toString()) : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across
              {' '}
              {platformsWithGmvCount}
              {' '}
              platform
              {platformsWithGmvCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {totalViews > 0 ? totalViews.toLocaleString() : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across
              {' '}
              {platformsWithViewsCount}
              {' '}
              platform
              {platformsWithViewsCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Percent className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {avgCtr ? `${toDecimalDisplayString(avgCtr.toString())}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unweighted avg across
              {' '}
              {platformsWithCtrCount}
              {' '}
              platform
              {platformsWithCtrCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTO</CardTitle>
            <Percent className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
              {avgCto ? `${toDecimalDisplayString(avgCto.toString())}%` : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unweighted avg across
              {' '}
              {platformsWithCtoCount}
              {' '}
              platform
              {platformsWithCtoCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Loop Trend */}
      <ShowPerformanceLoopsGraph data={loopData} isLoading={isLoadingLoops} />

      {/* Platform Breakdown */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Platform Breakdown</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {platforms.map((p) => {
            const hasPlatMetrics = p.gmv || p.viewer_count || p.ctr || p.cto;
            return (
              <Card key={p.show_platform_uid} className="flex flex-col">
                <CardHeader className="border-b pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{p.name}</CardTitle>
                      {p.platform_show_id && (
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          ID:
                          {' '}
                          {p.platform_show_id}
                        </span>
                      )}
                    </div>
                    {p.live_stream_link && (
                      <a
                        href={p.live_stream_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent focus:outline-none"
                      >
                        Stream Link
                        {' '}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  {!hasPlatMetrics
                    ? (
                        <p className="text-sm text-muted-foreground italic text-center py-6">
                          No metrics recorded for this platform.
                        </p>
                      )
                    : (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <span className="text-xs text-muted-foreground block">GMV</span>
                            <span className="text-lg font-semibold block mt-0.5">
                              {p.gmv ? toCurrencyDisplayString(p.gmv) : '—'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <span className="text-xs text-muted-foreground block">Views</span>
                            <span className="text-lg font-semibold block mt-0.5">
                              {p.viewer_count > 0 ? p.viewer_count.toLocaleString() : '—'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <span className="text-xs text-muted-foreground block">CTR</span>
                            <span className="text-lg font-semibold block mt-0.5">
                              {p.ctr ? `${toDecimalDisplayString(p.ctr)}%` : '—'}
                            </span>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <span className="text-xs text-muted-foreground block">CTO</span>
                            <span className="text-lg font-semibold block mt-0.5">
                              {p.cto ? `${toDecimalDisplayString(p.cto)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
