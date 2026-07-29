import type { SceneQcReport } from '@eridu/api-types/scene-qc';
import { SCENE_QC_REPORT_CSV_COLUMNS } from '@eridu/api-types/scene-qc';

/**
 * Mirrors `apps/erify_studios/src/lib/csv.ts` exactly: UTF-8 BOM, every cell
 * double-quoted with `"` doubled, and the CSV-injection prefix guard. This is
 * `erify_api`'s first non-JSON response -- see
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.8. Columns are the exact
 * ordered §6.3 list from the single shared `SCENE_QC_REPORT_CSV_COLUMNS`
 * constant.
 */

const UTF8_BOM = '﻿';
const CSV_INJECTION_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvCell(value: string): string {
  const safe = CSV_INJECTION_PREFIX.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toRow(report: SceneQcReport, show: SceneQcReport['shows'][number]): Record<(typeof SCENE_QC_REPORT_CSV_COLUMNS)[number], string> {
  return {
    studio: report.studio.name,
    operational_date: report.operational_date,
    timezone: report.timezone,
    confirmation_revision: String(report.confirmation_revision),
    confirmed_by: report.confirmed_by.name,
    confirmed_at: report.confirmed_at,
    show_start_time: show.scheduled_start_time,
    show_id: show.show_id,
    show_name: show.show_name,
    client_id: show.client?.id ?? '',
    client_name: show.client?.name ?? '',
    platforms: show.platforms.map((platform) => platform.name).join('; '),
    result: show.result,
    feedback: show.feedback ?? '',
    reviewed_by: show.reviewed_by.name,
    reviewed_at: show.reviewed_at,
    evidence_count: String(show.evidence_count),
    scene_type: show.scene_type ?? '',
    amended: String(show.amended),
  };
}

/** One row per confirmed Show -- the complete confirmation item set, never a paginated UI table page. */
export function serializeSceneQcReportToCsv(report: SceneQcReport): string {
  const header = SCENE_QC_REPORT_CSV_COLUMNS.map((column) => escapeCsvCell(column)).join(',');
  const body = report.shows.map((show) => {
    const row = toRow(report, show);
    return SCENE_QC_REPORT_CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(',');
  });

  return `${UTF8_BOM}${[header, ...body].join('\r\n')}`;
}
