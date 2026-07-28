import type { SceneQcReport } from '@eridu/api-types/scene-qc';
import { Badge, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';

import { resolveSceneQcResultChip } from '../lib/scene-qc-result-chip';

const REPORT_STATUS_CHIP: Record<SceneQcReport['status'], { label: string; className: string }> = {
  CURRENT: { label: 'Current', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  STALE: { label: 'Stale', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  SUPERSEDED: { label: 'Superseded', className: 'bg-muted text-muted-foreground' },
};

type SceneQcReportViewProps = {
  report: SceneQcReport | undefined;
  isLoading: boolean;
  isError: boolean;
};

function ScopeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function ShowRow({ show }: { show: SceneQcReport['shows'][number] }) {
  const chip = resolveSceneQcResultChip(show.result);
  return (
    <TableRow>
      <TableCell>{new Date(show.scheduled_start_time).toLocaleString()}</TableCell>
      <TableCell>{show.show_name}</TableCell>
      <TableCell>{show.client?.name ?? '—'}</TableCell>
      <TableCell>{show.platforms.map((platform) => platform.name).join(', ') || '—'}</TableCell>
      <TableCell><Badge variant="outline" className={chip.className}>{chip.label}</Badge></TableCell>
      <TableCell>{show.reviewed_by.name}</TableCell>
      <TableCell className="max-w-[16rem] truncate">{show.feedback ?? '—'}</TableCell>
    </TableRow>
  );
}

/** §7.6 sections 1-5: identity, scope cards, Client/platform breakdowns, Show detail table, exceptions. Read-only. */
export function SceneQcReportView({ report, isLoading, isError }: SceneQcReportViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError) {
    return <div className="p-6 text-center text-sm text-destructive">Unable to load this report.</div>;
  }
  if (!report) {
    return null;
  }

  const statusChip = REPORT_STATUS_CHIP[report.status];

  return (
    <div className="space-y-6 p-1">
      {/* 1. Identity */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">
            {report.studio.name}
            {' — '}
            {report.operational_date}
          </h3>
          <Badge variant="outline" className={statusChip.className}>{statusChip.label}</Badge>
          <span className="text-xs text-muted-foreground">
            Revision
            {' '}
            {report.confirmation_revision}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Confirmed by
          {' '}
          {report.confirmed_by.name}
          {' '}
          on
          {' '}
          {new Date(report.confirmed_at).toLocaleString()}
        </p>
      </div>

      {/* 2. Scope cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ScopeStat label="Total Shows" value={report.scope.total_shows} />
        <ScopeStat label="Pass" value={`${report.scope.pass_count} (${report.scope.pass_percentage}%)`} />
        <ScopeStat label="Minor" value={`${report.scope.minor_count} (${report.scope.minor_percentage}%)`} />
        <ScopeStat label="Fail" value={`${report.scope.fail_count} (${report.scope.fail_percentage}%)`} />
      </div>

      {/* 3. Client breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Client breakdown</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Pass</TableHead>
              <TableHead>Minor</TableHead>
              <TableHead>Fail</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.client_breakdown.map((row) => (
              <TableRow key={row.client_id}>
                <TableCell>{row.client_name}</TableCell>
                <TableCell>{row.pass_count}</TableCell>
                <TableCell>{row.minor_count}</TableCell>
                <TableCell>{row.fail_count}</TableCell>
                <TableCell>{row.total_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 3. Platform breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Platform breakdown
          <span className="ml-1 font-normal">(totals may exceed total Shows for multi-platform Shows)</span>
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Pass</TableHead>
              <TableHead>Minor</TableHead>
              <TableHead>Fail</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.platform_breakdown.map((row) => (
              <TableRow key={row.platform_id}>
                <TableCell>{row.platform_name}</TableCell>
                <TableCell>{row.pass_count}</TableCell>
                <TableCell>{row.minor_count}</TableCell>
                <TableCell>{row.fail_count}</TableCell>
                <TableCell>{row.total_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. Show detail */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Shows</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Show</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Platforms</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Reviewed By</TableHead>
              <TableHead>Feedback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.shows.map((show) => <ShowRow key={show.show_id} show={show} />)}
          </TableBody>
        </Table>
      </div>

      {/* 5. Exceptions */}
      {report.exceptions.length > 0
        ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Exceptions (
                {report.exceptions.length}
                )
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Show</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.exceptions.map((show) => <ShowRow key={show.show_id} show={show} />)}
                </TableBody>
              </Table>
            </div>
          )
        : null}
    </div>
  );
}
