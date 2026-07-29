import { SceneQcReportService } from './scene-qc-report.service';

type ReportItemFixture = {
  showId: bigint;
  reviewId: bigint;
  reviewVersion: number;
  showUid: string;
  showName: string;
  scheduledStartTime: Date;
  clientUid: string;
  clientName: string;
  platforms: Array<{ platformUid: string; platformName: string }>;
  review: {
    result: string;
    feedback: string | null;
    reviewedBy: { uid: string; name: string };
    reviewedAt: Date;
    evidenceCount: number;
    expectedSceneType: string;
  };
};

function buildReportRow(overrides: Partial<{ revision: number; items: ReportItemFixture[] }> = {}) {
  return {
    id: 1n,
    uid: 'scqcc_a',
    studioId: 5n,
    studio: { uid: 'std_1', name: 'Main Studio' },
    revision: overrides.revision ?? 1,
    operationalDate: new Date('2026-08-01T00:00:00.000Z'),
    windowStart: new Date('2026-08-01T06:00:00.000Z'),
    windowEnd: new Date('2026-08-02T06:00:00.000Z'),
    timezone: 'Asia/Bangkok',
    confirmedBy: { uid: 'user_1', name: 'Manager One' },
    confirmedAt: new Date('2026-08-01T08:00:00.000Z'),
    items: overrides.items ?? [
      {
        showId: 1n,
        reviewId: 10n,
        reviewVersion: 1,
        showUid: 'show_1',
        showName: 'Show One',
        scheduledStartTime: new Date('2026-08-01T07:00:00.000Z'),
        clientUid: 'client_1',
        clientName: 'Client One',
        platforms: [{ platformUid: 'plt_1', platformName: 'TikTok' }, { platformUid: 'plt_2', platformName: 'YouTube' }],
        review: {
          result: 'PASS',
          feedback: null,
          reviewedBy: { uid: 'user_reviewer', name: 'Reviewer' },
          reviewedAt: new Date('2026-08-01T07:30:00.000Z'),
          evidenceCount: 2,
          expectedSceneType: 'GRAPHIC_BG',
        },
      },
      {
        showId: 2n,
        reviewId: 11n,
        reviewVersion: 1,
        showUid: 'show_2',
        showName: 'Show Two',
        scheduledStartTime: new Date('2026-08-01T08:00:00.000Z'),
        clientUid: 'client_1',
        clientName: 'Client One',
        platforms: [{ platformUid: 'plt_1', platformName: 'TikTok' }],
        review: {
          result: 'FAIL',
          feedback: 'Watermark missing',
          reviewedBy: { uid: 'user_reviewer', name: 'Reviewer' },
          reviewedAt: new Date('2026-08-01T08:30:00.000Z'),
          evidenceCount: 1,
          expectedSceneType: 'GRAPHIC_BG',
        },
      },
    ],
  };
}

describe('sceneQcReportService.getReport', () => {
  function buildHarness() {
    const findConfirmationForReport = jest.fn().mockResolvedValue(buildReportRow());
    const hasLaterRevision = jest.fn().mockResolvedValue(false);
    const confirmationRepository = { findConfirmationForReport, hasLaterRevision };

    const findEligibleShowsInWindow = jest.fn().mockResolvedValue([{ id: 1n }, { id: 2n }]);
    const findReviewHeadsForShows = jest.fn().mockResolvedValue([
      { showId: 1n, id: 10n, version: 1 },
      { showId: 2n, id: 11n, version: 1 },
    ]);
    const sceneQcRepository = { findEligibleShowsInWindow, findReviewHeadsForShows };

    const service = new SceneQcReportService(confirmationRepository as never, sceneQcRepository as never);
    return { service, confirmationRepository, sceneQcRepository };
  }

  it('throws 404 when the confirmation does not exist for the studio', async () => {
    const { service, confirmationRepository } = buildHarness();
    confirmationRepository.findConfirmationForReport.mockResolvedValue(null);

    await expect(service.getReport('std_1', 'scqcc_missing')).rejects.toMatchObject({ status: 404 });
  });

  it('returns SUPERSEDED without recomputing eligibility when a later revision exists', async () => {
    const { service, confirmationRepository, sceneQcRepository } = buildHarness();
    confirmationRepository.hasLaterRevision.mockResolvedValue(true);

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.status).toBe('SUPERSEDED');
    expect(sceneQcRepository.findEligibleShowsInWindow).not.toHaveBeenCalled();
  });

  it('returns CURRENT when it is the latest revision and the scope is unchanged', async () => {
    const { service } = buildHarness();

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.status).toBe('CURRENT');
  });

  it('returns STALE when it is the latest revision but the scope has drifted', async () => {
    const { service, sceneQcRepository } = buildHarness();
    sceneQcRepository.findEligibleShowsInWindow.mockResolvedValue([{ id: 1n }, { id: 2n }, { id: 3n }]);
    sceneQcRepository.findReviewHeadsForShows.mockResolvedValue([
      { showId: 1n, id: 10n, version: 1 },
      { showId: 2n, id: 11n, version: 1 },
      { showId: 3n, id: 12n, version: 1 },
    ]);

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.status).toBe('STALE');
  });

  it('reconciles scope totals to the confirmation items and reads only the pinned item snapshot, never a live relation', async () => {
    const { service } = buildHarness();

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.scope.total_shows).toBe(2);
    expect(report.scope.pass_count).toBe(1);
    expect(report.scope.fail_count).toBe(1);
    expect(report.scope.minor_count).toBe(0);
    expect(report.scope.pass_count + report.scope.minor_count + report.scope.fail_count).toBe(report.scope.total_shows);
    expect(report.shows).toHaveLength(2);
    expect(report.shows[0].show_name).toBe('Show One');
  });

  it('each Show contributes once to its Client breakdown even though it has multiple platforms', async () => {
    const { service } = buildHarness();

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.client_breakdown).toEqual([
      { client_id: 'client_1', client_name: 'Client One', pass_count: 1, minor_count: 0, fail_count: 1, total_count: 2 },
    ]);
  });

  it('platform breakdown totals can exceed the confirmed-Show total for a multi-platform Show', async () => {
    const { service } = buildHarness();

    const report = await service.getReport('std_1', 'scqcc_a');

    const platformTotal = report.platform_breakdown.reduce((sum, row) => sum + row.total_count, 0);
    expect(platformTotal).toBeGreaterThan(report.scope.total_shows);
    expect(report.platform_breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ platform_id: 'plt_1', total_count: 2 }),
        expect.objectContaining({ platform_id: 'plt_2', total_count: 1 }),
      ]),
    );
  });

  it('exceptions is the MINOR/FAIL subset of shows', async () => {
    const { service } = buildHarness();

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.exceptions).toHaveLength(1);
    expect(report.exceptions[0].show_name).toBe('Show Two');
  });

  it('breaks same-scheduled-time ties by Show UID for deterministic ordering', async () => {
    const { service, confirmationRepository } = buildHarness();
    const sameTime = new Date('2026-08-01T07:00:00.000Z');
    const base = buildReportRow();
    confirmationRepository.findConfirmationForReport.mockResolvedValue(
      buildReportRow({
        items: [
          { ...base.items[1], showUid: 'show_z', showName: 'Later UID', scheduledStartTime: sameTime },
          { ...base.items[0], showUid: 'show_a', showName: 'Earlier UID', scheduledStartTime: sameTime },
        ],
      }),
    );

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.shows.map((show) => show.show_id)).toEqual(['show_a', 'show_z']);
  });

  it('sorts Client and platform breakdowns by name regardless of item insertion order', async () => {
    const { service, confirmationRepository } = buildHarness();
    const base = buildReportRow();
    confirmationRepository.findConfirmationForReport.mockResolvedValue(
      buildReportRow({
        items: [
          { ...base.items[0], showUid: 'show_z', clientUid: 'client_z', clientName: 'Zeta Client', platforms: [{ platformUid: 'plt_z', platformName: 'Zeta Platform' }] },
          { ...base.items[1], showUid: 'show_a', clientUid: 'client_a', clientName: 'Alpha Client', platforms: [{ platformUid: 'plt_a', platformName: 'Alpha Platform' }] },
        ],
      }),
    );

    const report = await service.getReport('std_1', 'scqcc_a');

    expect(report.client_breakdown.map((row) => row.client_name)).toEqual(['Alpha Client', 'Zeta Client']);
    expect(report.platform_breakdown.map((row) => row.platform_name)).toEqual(['Alpha Platform', 'Zeta Platform']);
  });
});
