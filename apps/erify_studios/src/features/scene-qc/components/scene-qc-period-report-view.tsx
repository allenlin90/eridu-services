import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { SceneQcPeriodReport } from '@eridu/api-types/scene-qc';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@eridu/ui';

import { SceneQcPeriodInsights } from './scene-qc-period-insights';

type Props = {
  report: SceneQcPeriodReport | undefined;
  isLoading: boolean;
  isError: boolean;
};

export function SceneQcPeriodReportView({ report, isLoading, isError }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (isError) {
    return <div className="rounded-md border p-8 text-center text-sm text-destructive">Unable to load Scene QC analytics.</div>;
  }
  if (!report || report.summary.total_count === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No confirmed Scene QC days in this range.</div>;
  }

  const trend = report.trend.map((row) => ({
    ...row,
    pass_rate: row.total_count === 0 ? 0 : Number(((row.pass_count / row.total_count) * 100).toFixed(1)),
  }));

  return (
    <div className="scene-qc-print-report space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Pass rate', `${report.summary.pass_percentage}%`],
          ['Reviewed', report.summary.total_count],
          ['Pass', report.summary.pass_count],
          ['Minor', report.summary.minor_count],
          ['Fail', report.summary.fail_count],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Overall pass rate trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 288 }}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="operational_date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Line type="monotone" dataKey="pass_rate" name="Pass rate" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pass / Minor / Fail over time</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 288 }}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="operational_date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="pass_count" name="Pass" stackId="result" fill="#10b981" />
                <Bar dataKey="minor_count" name="Minor" stackId="result" fill="#f59e0b" />
                <Bar dataKey="fail_count" name="Fail" stackId="result" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Pass rate by client</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.client_breakdown.map((client) => {
              const rate = client.total_count === 0 ? 0 : (client.pass_count / client.total_count) * 100;
              return (
                <div key={client.client_id}>
                  <div className="flex justify-between text-sm">
                    <span>{client.client_name}</span>
                    <span>
                      {rate.toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-emerald-500" style={{ width: `${rate}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Most frequent issues</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {report.issue_breakdown.slice(0, 12).map((issue) => (
                <li key={`${issue.element_key}:${issue.defect_key}`} className="flex justify-between gap-3 border-b pb-2 text-sm last:border-0">
                  <span>
                    {issue.element_label}
                    {' '}
                    ·
                    {' '}
                    {issue.defect_label}
                  </span>
                  <strong>{issue.count}</strong>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <SceneQcPeriodInsights report={report} />

      <p className="text-xs text-muted-foreground">
        Based on
        {' '}
        {report.confirmed_day_count}
        {' '}
        confirmed operational day
        {report.confirmed_day_count === 1 ? '' : 's'}
        .
        Corrections use the latest append-only amendment; original records remain unchanged.
      </p>
    </div>
  );
}
