import type { EligibleShowRow, ReviewHeadRow } from './schemas/scene-qc-review.schema';
import type { SceneProfileService } from './scene-profile.service';
import type { ResolvedSceneQcEvidence, SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from './scene-qc-operational-window.util';
import { SceneQcQueryService } from './scene-qc-query.service';
import type { SceneQcRepository } from './scene-qc-review.repository';

const STUDIO_UID = 'std_abc';
const OPERATIONAL_DATE = '2026-06-01';
const WINDOW = resolveOperationalWindow(OPERATIONAL_DATE, OPERATIONAL_TIMEZONE);

function buildShow(overrides: Partial<EligibleShowRow> = {}): EligibleShowRow {
  return {
    id: 100n,
    uid: 'show_abc',
    name: 'Show ABC',
    startTime: new Date(WINDOW.windowStart.getTime() + 60 * 60 * 1000),
    deletedAt: null,
    statusSystemKey: null,
    client: { id: 5n, uid: 'client_x', name: 'Client X' },
    platforms: [{ uid: 'plt_1', name: 'TikTok' }],
    ...overrides,
  };
}

function buildEvidence(overrides: Partial<ResolvedSceneQcEvidence> = {}): ResolvedSceneQcEvidence {
  return {
    sourceTaskId: 1n,
    sourceTaskUid: 'task_a',
    sourceTaskVersion: 1,
    sourceFieldKey: 'field_a',
    sourceLabel: 'Screenshot',
    objectKey: 'key.png',
    fileUrl: 'https://cdn.example.com/key.png',
    ...overrides,
  };
}

function buildReviewHead(overrides: Partial<ReviewHeadRow> = {}): ReviewHeadRow {
  return {
    id: 500n,
    uid: 'scqcr_test1',
    showId: 100n,
    result: 'PASS',
    feedback: null,
    version: 1,
    confirmedAt: null,
    reviewedBy: { uid: 'user_actor1', name: 'Actor' },
    reviewedAt: new Date('2026-06-01T10:00:00.000Z'),
    evidenceCount: 1,
    ...overrides,
  };
}

describe('sceneQcQueryService', () => {
  let repository: jest.Mocked<Pick<SceneQcRepository, 'findEligibleShowsInWindow' | 'findEligibleShowForReview' | 'findReviewHeadsForShows' | 'findReviewByShowAndDate' | 'findClientIdsWithActiveProfile'>>;
  let evidenceResolver: jest.Mocked<Pick<SceneQcEvidenceResolver, 'resolveForShows'>>;
  let sceneProfileService: jest.Mocked<Pick<SceneProfileService, 'getActiveProfileForClient'>>;
  let service: SceneQcQueryService;

  beforeEach(() => {
    repository = {
      findEligibleShowsInWindow: jest.fn().mockResolvedValue([buildShow()]),
      findEligibleShowForReview: jest.fn().mockResolvedValue(buildShow()),
      findReviewHeadsForShows: jest.fn().mockResolvedValue([]),
      findReviewByShowAndDate: jest.fn().mockResolvedValue(null),
      findClientIdsWithActiveProfile: jest.fn().mockResolvedValue(new Set()),
    };
    evidenceResolver = {
      resolveForShows: jest.fn().mockResolvedValue(new Map([[100n, [buildEvidence()]]])),
    };
    sceneProfileService = {
      getActiveProfileForClient: jest.fn().mockResolvedValue(null),
    };
    service = new SceneQcQueryService(
      repository as unknown as SceneQcRepository,
      evidenceResolver as unknown as SceneQcEvidenceResolver,
      sceneProfileService as unknown as SceneProfileService,
    );
  });

  describe('getDailySummary', () => {
    it('uses the UNFILTERED eligible set -- calls findEligibleShowsInWindow with no client/platform/search predicates', async () => {
      await service.getDailySummary(STUDIO_UID, OPERATIONAL_DATE);

      const call = repository.findEligibleShowsInWindow.mock.calls[0][0];
      expect(call.clientUid).toBeUndefined();
      expect(call.platformUid).toBeUndefined();
      expect(call.search).toBeUndefined();
    });

    it('tallies pass/minor/fail from review heads and blocked from zero-evidence Shows', async () => {
      repository.findEligibleShowsInWindow.mockResolvedValue([
        buildShow({ id: 100n, uid: 'show_a' }),
        buildShow({ id: 101n, uid: 'show_b', client: { id: 6n, uid: 'client_y', name: 'Client Y' } }),
      ]);
      repository.findReviewHeadsForShows.mockResolvedValue([
        buildReviewHead({ showId: 100n, result: 'PASS' }),
      ]);
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([
        [100n, [buildEvidence()]],
        [101n, []],
      ]));

      const summary = await service.getDailySummary(STUDIO_UID, OPERATIONAL_DATE);

      expect(summary.eligible_count).toBe(2);
      expect(summary.reviewed_count).toBe(1);
      expect(summary.pass_count).toBe(1);
      expect(summary.minor_count).toBe(0);
      expect(summary.fail_count).toBe(0);
      expect(summary.blocked_no_evidence_count).toBe(1);
      expect(summary.remaining_count).toBe(1);
    });

    it('always returns UNCONFIRMED / null confirmation fields (TODO(scene-qc-confirmation))', async () => {
      const summary = await service.getDailySummary(STUDIO_UID, OPERATIONAL_DATE);

      expect(summary.confirmation).toBe('UNCONFIRMED');
      expect(summary.confirmation_id).toBeNull();
      expect(summary.confirmation_revision).toBeNull();
      expect(summary.confirmed_by).toBeNull();
      expect(summary.confirmed_at).toBeNull();
    });
  });

  describe('listDailyItems', () => {
    const baseQuery = {
      operationalDate: OPERATIONAL_DATE,
      clientId: undefined,
      platformId: undefined,
      reviewState: 'all' as const,
      search: undefined,
      page: 1,
      limit: 20,
    };

    it('passes client_id/platform_id/search filters through to the eligible-Show projection', async () => {
      await service.listDailyItems(STUDIO_UID, { ...baseQuery, clientId: 'client_x', platformId: 'plt_1', search: 'foo' });

      const call = repository.findEligibleShowsInWindow.mock.calls[0][0];
      expect(call.clientUid).toBe('client_x');
      expect(call.platformUid).toBe('plt_1');
      expect(call.search).toBe('foo');
    });

    it('marks a zero-evidence Show as blocked regardless of review_state=all', async () => {
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([[100n, []]]));

      const { items } = await service.listDailyItems(STUDIO_UID, baseQuery);

      expect(items[0].is_blocked).toBe(true);
      expect(items[0].evidence_count).toBe(0);
    });

    it('filters to blocked-only when review_state=blocked', async () => {
      repository.findEligibleShowsInWindow.mockResolvedValue([
        buildShow({ id: 100n, uid: 'show_a' }),
        buildShow({ id: 101n, uid: 'show_b' }),
      ]);
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([
        [100n, [buildEvidence()]],
        [101n, []],
      ]));

      const { items, total } = await service.listDailyItems(STUDIO_UID, { ...baseQuery, reviewState: 'blocked' });

      expect(total).toBe(1);
      expect(items).toHaveLength(1);
      expect(items[0].show_id).toBe('show_b');
    });

    it('filters to unreviewed-only, excluding a Show with an existing review head', async () => {
      repository.findEligibleShowsInWindow.mockResolvedValue([
        buildShow({ id: 100n, uid: 'show_a' }),
        buildShow({ id: 101n, uid: 'show_b' }),
      ]);
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([
        [100n, [buildEvidence()]],
        [101n, [buildEvidence()]],
      ]));
      repository.findReviewHeadsForShows.mockResolvedValue([buildReviewHead({ showId: 100n })]);

      const { items } = await service.listDailyItems(STUDIO_UID, { ...baseQuery, reviewState: 'unreviewed' });

      expect(items).toHaveLength(1);
      expect(items[0].show_id).toBe('show_b');
    });

    it('paginates the in-memory filtered set', async () => {
      const shows = Array.from({ length: 5 }, (_, i) => buildShow({ id: BigInt(100 + i), uid: `show_${i}` }));
      repository.findEligibleShowsInWindow.mockResolvedValue(shows);
      evidenceResolver.resolveForShows.mockResolvedValue(
        new Map(shows.map((show) => [show.id, [buildEvidence()]])),
      );

      const page1 = await service.listDailyItems(STUDIO_UID, { ...baseQuery, page: 1, limit: 2 });
      const page2 = await service.listDailyItems(STUDIO_UID, { ...baseQuery, page: 2, limit: 2 });

      expect(page1.total).toBe(5);
      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(2);
      expect(page1.items[0].show_id).not.toBe(page2.items[0].show_id);
    });

    it('populates has_scene_profile from the bulk client-profile existence check, not a per-row call', async () => {
      repository.findClientIdsWithActiveProfile.mockResolvedValue(new Set([5n]));

      const { items } = await service.listDailyItems(STUDIO_UID, baseQuery);

      expect(items[0].has_scene_profile).toBe(true);
      expect(sceneProfileService.getActiveProfileForClient).not.toHaveBeenCalled();
    });

    it('excludes a Show with studioId: null via the eligible-Show projection (no special-case code needed here)', async () => {
      // The repository's studio: { uid: studioUid } predicate structurally
      // excludes a null-studio Show -- this test documents that the query
      // service adds no additional filtering to achieve it (OQ-13).
      repository.findEligibleShowsInWindow.mockResolvedValue([]);

      const { items, total } = await service.listDailyItems(STUDIO_UID, baseQuery);
      expect(items).toHaveLength(0);
      expect(total).toBe(0);
    });
  });

  describe('getDailyItemDetail', () => {
    it('throws 404 when the Show is not found/eligible for the studio', async () => {
      repository.findEligibleShowForReview.mockResolvedValue(null);

      await expect(
        service.getDailyItemDetail(STUDIO_UID, 'show_missing', OPERATIONAL_DATE),
      ).rejects.toThrow();
    });

    it('resolves LIVE evidence, the current Scene Profile, and the current review together', async () => {
      sceneProfileService.getActiveProfileForClient.mockResolvedValue({
        objectKey: 'k.png',
        fileUrl: 'https://cdn.example.com/k.png',
        sceneType: 'GRAPHIC_BG',
      } as never);

      const detail = await service.getDailyItemDetail(STUDIO_UID, 'show_abc', OPERATIONAL_DATE);

      expect(detail.evidence).toHaveLength(1);
      expect(detail.scene_profile).toEqual({ object_key: 'k.png', file_url: 'https://cdn.example.com/k.png', scene_type: 'GRAPHIC_BG' });
      expect(detail.review).toBeNull();
    });

    it('sets allowed_actions.blocked_reason=NO_EVIDENCE and can_review=false when there is no evidence', async () => {
      evidenceResolver.resolveForShows.mockResolvedValue(new Map([[100n, []]]));

      const detail = await service.getDailyItemDetail(STUDIO_UID, 'show_abc', OPERATIONAL_DATE);

      expect(detail.allowed_actions).toEqual({ can_review: false, blocked_reason: 'NO_EVIDENCE' });
    });

    it('sets allowed_actions.blocked_reason=CONFIRMED and can_review=false when the current review is confirmed', async () => {
      repository.findReviewByShowAndDate.mockResolvedValue({
        id: 500n,
        uid: 'scqcr_test1',
        show: { uid: 'show_abc' },
        operationalDate: new Date(`${OPERATIONAL_DATE}T00:00:00.000Z`),
        windowStart: WINDOW.windowStart,
        windowEnd: WINDOW.windowEnd,
        timezone: WINDOW.timezone,
        result: 'PASS',
        feedback: null,
        reviewedBy: { uid: 'user_actor1', name: 'Actor' },
        reviewedAt: new Date('2026-06-01T10:00:00.000Z'),
        expectedObjectKey: null,
        expectedFileUrl: null,
        expectedSceneType: null,
        version: 1,
        confirmedAt: new Date('2026-06-02T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
        evidence: [],
      });

      const detail = await service.getDailyItemDetail(STUDIO_UID, 'show_abc', OPERATIONAL_DATE);

      expect(detail.allowed_actions).toEqual({ can_review: false, blocked_reason: 'CONFIRMED' });
    });

    it('allows review when evidence exists and no confirmed review is present', async () => {
      const detail = await service.getDailyItemDetail(STUDIO_UID, 'show_abc', OPERATIONAL_DATE);

      expect(detail.allowed_actions).toEqual({ can_review: true, blocked_reason: null });
    });
  });
});
