import type { SceneQcReport } from '@eridu/api-types/scene-qc';
import { SCENE_QC_REPORT_CSV_COLUMNS } from '@eridu/api-types/scene-qc';

import { serializeSceneQcReportToCsv } from './scene-qc-report-csv';

function buildReport(overrides: Partial<SceneQcReport> = {}): SceneQcReport {
  return {
    confirmation_id: 'scqcc_a',
    confirmation_revision: 2,
    status: 'CURRENT',
    studio: { id: 'std_1', name: 'Main Studio' },
    operational_date: '2026-08-01',
    window_start: '2026-08-01T06:00:00.000Z',
    window_end: '2026-08-02T06:00:00.000Z',
    timezone: 'Asia/Bangkok',
    confirmed_by: { id: 'user_1', name: 'Manager One' },
    confirmed_at: '2026-08-01T08:00:00.000Z',
    generated_at: '2026-08-01T09:00:00.000Z',
    scope: { total_shows: 1, pass_count: 1, minor_count: 0, fail_count: 0, pass_percentage: 100, minor_percentage: 0, fail_percentage: 0 },
    client_breakdown: [],
    platform_breakdown: [],
    shows: [
      {
        scheduled_start_time: '2026-08-01T07:00:00.000Z',
        show_id: 'show_1',
        show_name: 'Show One',
        client: { id: 'client_1', name: 'Client One' },
        platforms: [{ id: 'plt_1', name: 'TikTok' }, { id: 'plt_2', name: 'YouTube' }],
        result: 'PASS',
        reviewed_by: { id: 'user_reviewer', name: 'Reviewer' },
        reviewed_at: '2026-08-01T07:30:00.000Z',
        feedback: null,
        evidence_count: 2,
        scene_type: 'GRAPHIC_BG',
        amended: false,
      },
    ],
    exceptions: [],
    ...overrides,
  };
}

describe('serializeSceneQcReportToCsv', () => {
  it('starts with the UTF-8 BOM', () => {
    const csv = serializeSceneQcReportToCsv(buildReport());
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('header matches SCENE_QC_REPORT_CSV_COLUMNS in exact order', () => {
    const csv = serializeSceneQcReportToCsv(buildReport());
    const headerLine = csv.slice(1).split('\r\n')[0];
    const headerCells = headerLine.split(',').map((cell) => cell.replace(/^"|"$/g, ''));
    expect(headerCells).toEqual([...SCENE_QC_REPORT_CSV_COLUMNS]);
  });

  it('emits one row per Show, joining multi-platform names with "; "', () => {
    const csv = serializeSceneQcReportToCsv(buildReport());
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"TikTok; YouTube"');
  });

  it('doubles embedded quotes and preserves commas/newlines inside a quoted feedback cell', () => {
    const report = buildReport({
      shows: [
        {
          ...buildReport().shows[0],
          feedback: 'Needs "urgent" fix,\nplease review',
        },
      ],
    });

    const csv = serializeSceneQcReportToCsv(report);
    expect(csv).toContain('"Needs ""urgent"" fix,\nplease review"');
  });

  it('prefixes a feedback value starting with = with a single quote (CSV injection guard)', () => {
    const report = buildReport({
      shows: [{ ...buildReport().shows[0], feedback: '=SUM(A1:A9)' }],
    });

    const csv = serializeSceneQcReportToCsv(report);
    expect(csv).toContain(`"'=SUM(A1:A9)"`);
  });

  it.each(['=', '+', '-', '@', '\t', '\r'])('injection-guards a feedback value starting with %s', (prefix) => {
    const report = buildReport({
      shows: [{ ...buildReport().shows[0], feedback: `${prefix}payload` }],
    });

    const csv = serializeSceneQcReportToCsv(report);
    expect(csv).toContain(`"'${prefix}payload"`);
  });

  it('does not injection-guard a normal feedback value', () => {
    const report = buildReport({
      shows: [{ ...buildReport().shows[0], feedback: 'Looks good' }],
    });

    const csv = serializeSceneQcReportToCsv(report);
    expect(csv).toContain('"Looks good"');
    expect(csv).not.toContain(`"'Looks good"`);
  });

  it('renders a null client as an empty client_id/client_name cell', () => {
    const report = buildReport({
      shows: [{ ...buildReport().shows[0], client: null }],
    });

    const csv = serializeSceneQcReportToCsv(report);
    const dataLine = csv.slice(1).split('\r\n')[1];
    expect(dataLine).toContain('"",""');
  });
});
