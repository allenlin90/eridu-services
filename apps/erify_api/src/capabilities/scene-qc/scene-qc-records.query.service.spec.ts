import { SceneQcRecordsQueryService } from './scene-qc-records.query.service';

function buildRow(overrides: Partial<{ id: bigint; uid: string; operationalDate: Date }> = {}) {
  return {
    id: overrides.id ?? 1n,
    uid: overrides.uid ?? 'scqcr_a',
    operationalDate: overrides.operationalDate ?? new Date('2026-08-01T00:00:00.000Z'),
    showUid: 'show_a',
    showName: 'Show A',
    scheduledStartTime: new Date('2026-08-01T07:00:00.000Z'),
    client: { uid: 'client_a', name: 'Client A' },
    platforms: [{ uid: 'plt_1', name: 'TikTok' }],
    result: 'PASS' as const,
    effectiveResult: 'PASS' as const,
    amendmentCount: 0,
    feedback: null,
    reviewedBy: { uid: 'user_a', name: 'Reviewer' },
    reviewedAt: new Date('2026-08-01T07:30:00.000Z'),
    version: 1,
    evidenceCount: 1,
  };
}

describe('sceneQcRecordsQueryService.listRecords', () => {
  function buildHarness() {
    const findReviewRecords = jest.fn().mockResolvedValue([buildRow()]);
    const countReviewRecords = jest.fn().mockResolvedValue(1);
    const findReviewRecordDetail = jest.fn();
    const findReviewAuditHistory = jest.fn().mockResolvedValue([]);
    const sceneQcRepository = { findReviewRecordDetail, findReviewAuditHistory };
    const recordsQuery = { findReviewRecords, countReviewRecords };

    const findConfirmationRefsForReviews = jest.fn().mockResolvedValue(new Map());
    const findConfirmationScopeById = jest.fn();
    const findEligibleShowsInWindow = jest.fn();
    const findReviewHeadsForShows = jest.fn();
    const confirmationRepository = {
      findConfirmationRefsForReviews,
      findConfirmationScopeById,
      findEligibleShowsInWindow,
      findReviewHeadsForShows,
    };

    const service = new SceneQcRecordsQueryService(
      sceneQcRepository as never,
      recordsQuery as never,
      confirmationRepository as never,
    );
    return { service, sceneQcRepository, confirmationRepository, findReviewRecords, countReviewRecords };
  }

  it('paginates via SQL skip/take derived from page/limit, not in-memory slicing', async () => {
    const { service, findReviewRecords } = buildHarness();

    await service.listRecords('std_1', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      clientId: undefined,
      platformId: undefined,
      result: undefined,
      page: 3,
      limit: 20,
    });

    const call = findReviewRecords.mock.calls[0][0];
    expect(call.skip).toBe(40);
    expect(call.take).toBe(20);
  });

  it('targets the review pinned operationalDate range, not show.startTime', async () => {
    const { service, findReviewRecords, countReviewRecords } = buildHarness();

    await service.listRecords('std_1', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      clientId: 'client_a',
      platformId: 'plt_1',
      result: 'PASS',
      page: 1,
      limit: 20,
    });

    const call = findReviewRecords.mock.calls[0][0];
    expect(call.operationalDateFrom).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(call.operationalDateTo).toEqual(new Date('2026-08-07T00:00:00.000Z'));
    expect(call.clientUid).toBe('client_a');
    expect(call.platformUid).toBe('plt_1');
    expect(call.result).toBe('PASS');
    expect(countReviewRecords.mock.calls[0][0].clientUid).toBe('client_a');
  });

  it('scopes to the studio via the repository predicate, passed through as-is', async () => {
    const { service, findReviewRecords } = buildHarness();

    await service.listRecords('std_studio_x', {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-01',
      clientId: undefined,
      platformId: undefined,
      result: undefined,
      page: 1,
      limit: 20,
    });

    expect(findReviewRecords.mock.calls[0][0].studioUid).toBe('std_studio_x');
  });
});

describe('sceneQcRecordsQueryService.getRecordDetail', () => {
  function buildDetailHarness() {
    const showRow = {
      id: 1n,
      uid: 'show_a',
      name: 'Show A',
      startTime: new Date('2026-08-01T07:00:00.000Z'),
      deletedAt: null,
      statusSystemKey: null,
      client: { id: 5n, uid: 'client_a', name: 'Client A' },
      platforms: [],
    };
    const reviewRecord = {
      id: 1n,
      uid: 'scqcr_a',
      show: showRow,
      operationalDate: new Date('2026-08-01T00:00:00.000Z'),
      windowStart: new Date('2026-08-01T06:00:00.000Z'),
      windowEnd: new Date('2026-08-02T06:00:00.000Z'),
      timezone: 'Asia/Bangkok',
      result: 'PASS',
      feedback: null,
      reviewedBy: { uid: 'user_a', name: 'Reviewer' },
      reviewedAt: new Date('2026-08-01T07:30:00.000Z'),
      expectedObjectKey: null,
      expectedFileUrl: null,
      expectedSceneType: null,
      version: 1,
      confirmedAt: null,
      createdAt: new Date('2026-08-01T07:30:00.000Z'),
      updatedAt: new Date('2026-08-01T07:30:00.000Z'),
      evidence: [],
      findings: [],
    };

    const findReviewRecordDetail = jest.fn().mockResolvedValue(reviewRecord);
    const findReviewAuditHistory = jest.fn().mockResolvedValue([
      {
        uid: 'aud_1',
        action: 'CREATE',
        actor: { uid: 'user_a', name: 'Reviewer' },
        createdAt: new Date('2026-08-01T07:30:00.000Z'),
        oldResult: null,
        newResult: 'PASS',
        feedbackChanged: false,
      },
    ]);
    const sceneQcRepository = {
      findReviewRecordDetail,
      findReviewAuditHistory,
      findReviewAmendments: jest.fn().mockResolvedValue([]),
      findEligibleShowsInWindow: jest.fn().mockResolvedValue([]),
      findReviewHeadsForShows: jest.fn().mockResolvedValue([]),
    };

    const findConfirmationRefsForReviews = jest.fn().mockResolvedValue(new Map());
    const confirmationRepository = {
      findConfirmationRefsForReviews,
      findConfirmationScopeById: jest.fn(),
    };

    const service = new SceneQcRecordsQueryService(
      sceneQcRepository as never,
      {} as never,
      confirmationRepository as never,
    );
    return { service, sceneQcRepository, confirmationRepository, findReviewAuditHistory };
  }

  it('throws 404 when the review does not exist for the studio', async () => {
    const { service, sceneQcRepository } = buildDetailHarness();
    sceneQcRepository.findReviewRecordDetail.mockResolvedValue(null);

    await expect(service.getRecordDetail('std_1', 'scqcr_missing')).rejects.toMatchObject({ status: 404 });
  });

  it('returns null confirmation when the review has never been part of a confirmation', async () => {
    const { service } = buildDetailHarness();

    const detail = await service.getRecordDetail('std_1', 'scqcr_a');

    expect(detail.confirmation).toBeNull();
  });

  it('exposes only the curated audit fields -- never ip_address, user_agent, or a raw metadata blob', async () => {
    const { service } = buildDetailHarness();

    const detail = await service.getRecordDetail('std_1', 'scqcr_a');

    expect(detail.audit_history).toHaveLength(1);
    const entry = detail.audit_history[0] as Record<string, unknown>;
    expect(entry).not.toHaveProperty('ip_address');
    expect(entry).not.toHaveProperty('user_agent');
    expect(entry).not.toHaveProperty('metadata');
    expect(Object.keys(entry).sort()).toEqual(['action', 'actor', 'at', 'feedback_changed', 'id', 'new_result', 'old_result'].sort());
  });

  it('marks confirmation SUPERSEDED without recomputing eligibility when a later revision exists', async () => {
    const { service, confirmationRepository } = buildDetailHarness();
    confirmationRepository.findConfirmationRefsForReviews.mockResolvedValue(
      new Map([[1n, {
        confirmationId: 5n,
        confirmationUid: 'scqcc_a',
        revision: 1,
        confirmedBy: { uid: 'user_confirmer', name: 'Confirmer' },
        confirmedAt: new Date('2026-08-01T08:00:00.000Z'),
        isLatestRevisionForDay: false,
      }]]),
    );

    const detail = await service.getRecordDetail('std_1', 'scqcr_a');

    expect(detail.confirmation).toEqual({
      id: 'scqcc_a',
      revision: 1,
      status: 'SUPERSEDED',
      confirmed_by: { id: 'user_confirmer', name: 'Confirmer' },
      confirmed_at: '2026-08-01T08:00:00.000Z',
    });
    expect(confirmationRepository.findConfirmationScopeById).not.toHaveBeenCalled();
  });
});
