import { Injectable } from '@nestjs/common';

import type { SceneQcPeriodReport } from '@eridu/api-types/scene-qc';

import { SceneQcPeriodReportQuery } from './scene-qc-period-report.query';

@Injectable()
export class SceneQcPeriodReportService {
  constructor(private readonly query: SceneQcPeriodReportQuery) {}

  async getReport(
    studioUid: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<SceneQcPeriodReport> {
    const rows = await this.query.load({
      studioUid,
      dateFrom: new Date(`${dateFrom}T00:00:00.000Z`),
      dateTo: new Date(`${dateTo}T00:00:00.000Z`),
    });
    const trend = rows.trend.map((row) => ({
      operational_date: row.operational_date.toISOString().slice(0, 10),
      total_count: Number(row.total_count),
      pass_count: Number(row.pass_count),
      minor_count: Number(row.minor_count),
      fail_count: Number(row.fail_count),
    }));
    const totals = trend.reduce(
      (sum, row) => ({
        total_count: sum.total_count + row.total_count,
        pass_count: sum.pass_count + row.pass_count,
        minor_count: sum.minor_count + row.minor_count,
        fail_count: sum.fail_count + row.fail_count,
      }),
      { total_count: 0, pass_count: 0, minor_count: 0, fail_count: 0 },
    );
    return {
      date_from: dateFrom,
      date_to: dateTo,
      generated_at: new Date().toISOString(),
      confirmed_day_count: trend.length,
      summary: {
        ...totals,
        pass_percentage: totals.total_count === 0
          ? 0
          : Number(((totals.pass_count / totals.total_count) * 100).toFixed(1)),
      },
      trend,
      client_breakdown: rows.clients.map((row) => ({
        client_id: row.client_id,
        client_name: row.client_name,
        total_count: Number(row.total_count),
        pass_count: Number(row.pass_count),
        minor_count: Number(row.minor_count),
        fail_count: Number(row.fail_count),
      })),
      client_trend: rows.clientTrend.map((row) => ({
        operational_date: row.operational_date.toISOString().slice(0, 10),
        client_id: row.client_id,
        client_name: row.client_name,
        total_count: Number(row.total_count),
        pass_count: Number(row.pass_count),
        minor_count: Number(row.minor_count),
        fail_count: Number(row.fail_count),
      })),
      issue_breakdown: rows.issues.map((row) => ({
        element_key: row.element_key,
        element_label: row.element_label,
        defect_key: row.defect_key,
        defect_label: row.defect_label,
        count: Number(row.count),
      })),
    };
  }
}
