import { format, parseISO } from 'date-fns';
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';

import type { SceneQcPeriodReport } from '@eridu/api-types/scene-qc';
import { Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@eridu/ui';

function passRate(row: { total_count: number; pass_count: number }): number {
  return row.total_count === 0 ? 0 : (row.pass_count / row.total_count) * 100;
}

export function SceneQcPeriodInsights({ report }: { report: SceneQcPeriodReport }) {
  const weekday = new Map<string, { total: number; pass: number }>();
  for (const day of report.trend) {
    const key = format(parseISO(day.operational_date), 'EEE');
    const current = weekday.get(key) ?? { total: 0, pass: 0 };
    current.total += day.total_count;
    current.pass += day.pass_count;
    weekday.set(key, current);
  }

  const clientHistory = new Map<string, typeof report.client_trend>();
  for (const row of report.client_trend) {
    clientHistory.set(row.client_id, [...(clientHistory.get(row.client_id) ?? []), row]);
  }
  const clientTrends = [...clientHistory.values()].map((rows) => {
    const first = rows[0];
    const latest = rows[rows.length - 1];
    return {
      id: first.client_id,
      name: first.client_name,
      first: passRate(first),
      latest: passRate(latest),
      delta: passRate(latest) - passRate(first),
    };
  });
  const scatter = report.client_breakdown.map((client) => ({
    name: client.client_name,
    volume: client.total_count,
    pass_rate: Number(passRate(client).toFixed(1)),
    exceptions: client.minor_count + client.fail_count,
  }));
  const lowestClient = [...report.client_breakdown].sort((a, b) => passRate(a) - passRate(b))[0];
  const topIssue = report.issue_breakdown[0];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Weekday pattern</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
              const value = weekday.get(day);
              const rate = value && value.total > 0 ? (value.pass / value.total) * 100 : null;
              return (
                <div key={day} className="rounded-md border p-2 text-center">
                  <p className="text-xs text-muted-foreground">{day}</p>
                  <p className="font-semibold">{rate === null ? '—' : `${rate.toFixed(0)}%`}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Volume vs. quality by client</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 256 }}>
              <ScatterChart>
                <XAxis type="number" dataKey="volume" name="Reviewed" allowDecimals={false} />
                <YAxis type="number" dataKey="pass_rate" name="Pass rate" unit="%" domain={[0, 100]} />
                <ZAxis type="number" dataKey="exceptions" range={[80, 360]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatter} fill="#0f766e" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Client trend: first day vs latest day</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>First</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientTrends.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>
                    {client.first.toFixed(1)}
                    %
                  </TableCell>
                  <TableCell>
                    {client.latest.toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className={client.delta < 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {client.delta >= 0 ? '+' : ''}
                    {client.delta.toFixed(1)}
                    {' '}
                    pp
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily pass rate by client</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {report.client_breakdown.map((client) => <TableHead key={client.client_id}>{client.client_name}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.trend.map((day) => (
                <TableRow key={day.operational_date}>
                  <TableCell>{day.operational_date}</TableCell>
                  {report.client_breakdown.map((client) => {
                    const cell = report.client_trend.find((row) => row.operational_date === day.operational_date && row.client_id === client.client_id);
                    return <TableCell key={client.client_id}>{cell ? `${passRate(cell).toFixed(0)}%` : '—'}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="text-sm">
          Across
          {' '}
          {report.confirmed_day_count}
          {' '}
          confirmed days,
          {' '}
          {report.summary.total_count}
          {' '}
          Shows achieved a
          {' '}
          {report.summary.pass_percentage}
          % pass rate.
          {lowestClient ? ` ${lowestClient.client_name} had the lowest Client pass rate at ${passRate(lowestClient).toFixed(1)}%.` : ''}
          {topIssue ? ` The most frequent issue was ${topIssue.element_label} · ${topIssue.defect_label} (${topIssue.count}).` : ' No structured issues were recorded.'}
        </CardContent>
      </Card>
    </>
  );
}
