import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SceneQcReport } from '@eridu/api-types/scene-qc';

import { SceneQcReportView } from '../scene-qc-report-view';

function buildReport(overrides: Partial<SceneQcReport> = {}): SceneQcReport {
  return {
    confirmation_id: 'scqcc_1',
    confirmation_revision: 2,
    status: 'CURRENT',
    studio: { id: 'std_1', name: 'Main Studio' },
    operational_date: '2026-06-01',
    window_start: '2026-05-31T23:00:00.000Z',
    window_end: '2026-06-01T23:00:00.000Z',
    timezone: 'Asia/Bangkok',
    confirmed_by: { id: 'user_1', name: 'Manager One' },
    confirmed_at: '2026-06-01T10:00:00.000Z',
    generated_at: '2026-06-01T11:00:00.000Z',
    scope: { total_shows: 2, pass_count: 1, minor_count: 1, fail_count: 0, pass_percentage: 50, minor_percentage: 50, fail_percentage: 0 },
    client_breakdown: [
      { client_id: 'client_1', client_name: 'Client One', pass_count: 1, minor_count: 1, fail_count: 0, total_count: 2 },
    ],
    platform_breakdown: [
      { platform_id: 'plt_1', platform_name: 'TikTok', pass_count: 1, minor_count: 1, fail_count: 0, total_count: 2 },
    ],
    shows: [
      {
        scheduled_start_time: '2026-06-01T07:00:00.000Z',
        show_id: 'show_1',
        show_name: 'Show One',
        client: { id: 'client_1', name: 'Client One' },
        platforms: [{ id: 'plt_1', name: 'TikTok' }],
        result: 'PASS',
        reviewed_by: { id: 'user_r', name: 'Reviewer' },
        reviewed_at: '2026-06-01T07:30:00.000Z',
        feedback: null,
        evidence_count: 1,
        scene_type: 'GRAPHIC_BG',
        amended: false,
      },
      {
        scheduled_start_time: '2026-06-01T08:00:00.000Z',
        show_id: 'show_2',
        show_name: 'Show Two',
        client: { id: 'client_1', name: 'Client One' },
        platforms: [{ id: 'plt_1', name: 'TikTok' }],
        result: 'MINOR',
        reviewed_by: { id: 'user_r', name: 'Reviewer' },
        reviewed_at: '2026-06-01T08:30:00.000Z',
        feedback: 'Watermark cropped',
        evidence_count: 1,
        scene_type: 'GRAPHIC_BG',
        amended: false,
      },
    ],
    exceptions: [],
    ...overrides,
  };
}

describe('sceneQcReportView', () => {
  it('renders loading and error states', () => {
    const { rerender } = render(<SceneQcReportView report={undefined} isLoading isError={false} />);
    expect(document.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();

    rerender(<SceneQcReportView report={undefined} isLoading={false} isError />);
    expect(screen.getByText(/Unable to load this report/i)).toBeInTheDocument();
  });

  it('renders identity, scope, client/platform breakdown, and Show detail sections read-only', () => {
    render(<SceneQcReportView report={buildReport()} isLoading={false} isError={false} />);

    expect(screen.getByText(/Main Studio/)).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Show One')).toBeInTheDocument();
    expect(screen.getByText('Show Two')).toBeInTheDocument();
    expect(screen.getAllByText('Client One').length).toBeGreaterThan(0);
    expect(screen.getByText('Watermark cropped')).toBeInTheDocument();
    // Read-only: no button that would mutate anything (download lives in the sheet wrapper, not here).
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a prominent STALE badge when the report is stale', () => {
    render(<SceneQcReportView report={buildReport({ status: 'STALE' })} isLoading={false} isError={false} />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('shows a prominent SUPERSEDED badge for a historical report opened from Records', () => {
    render(<SceneQcReportView report={buildReport({ status: 'SUPERSEDED' })} isLoading={false} isError={false} />);
    expect(screen.getByText('Superseded')).toBeInTheDocument();
  });

  it('renders the exceptions section only when there are MINOR/FAIL rows', () => {
    const { rerender } = render(<SceneQcReportView report={buildReport({ exceptions: [] })} isLoading={false} isError={false} />);
    expect(screen.queryByText(/Exceptions/)).not.toBeInTheDocument();

    rerender(<SceneQcReportView report={buildReport({ exceptions: [buildReport().shows[1]] })} isLoading={false} isError={false} />);
    expect(screen.getByText(/Exceptions/)).toBeInTheDocument();
  });
});
