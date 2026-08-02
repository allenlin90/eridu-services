import { ShowRunReviewService } from './show-run-review.service';

import { HttpError } from '@/lib/errors/http-error.util';
import type { ShowService } from '@/models/show/show.service';
import type { ShowIssueService } from '@/models/show-issue/show-issue.service';
import type { StudioService } from '@/models/studio/studio.service';

describe('showRunReviewService', () => {
  let service: ShowRunReviewService;
  let showService: { getShowsForReview: jest.Mock };
  let studioService: { getStudioById: jest.Mock };
  let showIssueService: { getUnresolvedIssueSeverityCounts: jest.Mock; listShowIssues: jest.Mock };

  beforeEach(() => {
    showService = { getShowsForReview: jest.fn() };
    studioService = { getStudioById: jest.fn() };
    showIssueService = {
      getUnresolvedIssueSeverityCounts: jest.fn().mockResolvedValue({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }),
      listShowIssues: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    service = new ShowRunReviewService(
      showService as unknown as ShowService,
      studioService as unknown as StudioService,
      showIssueService as unknown as ShowIssueService,
    );
  });

  describe('getShowRunReviewSummary', () => {
    const studioUid = 'std_test123';
    const mockStudio = { id: BigInt(1), uid: studioUid, deletedAt: null };

    it('should throw NotFoundException if studio does not exist', async () => {
      studioService.getStudioById.mockRejectedValue(HttpError.notFound('Studio', studioUid));

      await expect(
        service.getShowRunReviewSummary(studioUid, {
          date_from: '2026-05-12T06:00:00.000Z',
          date_to: '2026-05-13T05:59:59.999Z',
        }),
      ).rejects.toThrow('Studio not found with id std_test123');
    });

    it('should compile and return correct summary metrics', async () => {
      studioService.getStudioById.mockResolvedValue(mockStudio as any);

      const mockShows = [
        {
          id: BigInt(10),
          uid: 'show_10',
          name: 'Show 1',
          startTime: new Date('2026-05-12T10:00:00.000Z'),
          endTime: new Date('2026-05-12T12:00:00.000Z'),
          actualStartTime: new Date('2026-05-12T10:05:00.000Z'), // Complete
          actualEndTime: new Date('2026-05-12T12:05:00.000Z'),
          showCreators: [
            {
              uid: 'sc_1',
              attendanceMissing: false,
              actualStartTime: new Date('2026-05-12T10:15:00.000Z'), // Late by 15 mins
              attendanceReason: 'Traffic',
              creator: { uid: 'creator_alice', name: 'Alice', aliasName: 'Ali' },
            },
          ],
          showPlatforms: [
            {
              platform: { name: 'YouTube' },
              violations: [
                {
                  uid: 'v_1',
                  violationType: 'AUDIO_LAG',
                  severity: 'HIGH',
                  reason: 'Laggy audio',
                  observedAt: new Date('2026-05-12T10:30:00.000Z'),
                },
              ],
            },
          ],
          taskTargets: [
            {
              task: {
                uid: 'task_1',
                description: 'Pre-production sound check',
                status: 'IN_PROGRESS',
                type: 'PRE_PRODUCTION',
                deletedAt: null,
              },
            },
          ],
        },
        {
          id: BigInt(20),
          uid: 'show_20',
          name: 'Show 2',
          startTime: new Date('2026-05-12T13:00:00.000Z'),
          endTime: new Date('2026-05-12T15:00:00.000Z'),
          actualStartTime: null, // Incomplete
          actualEndTime: null,
          showCreators: [
            {
              uid: 'sc_2',
              attendanceMissing: true, // Missing
              actualStartTime: null,
              attendanceReason: 'SICK',
              creator: { uid: 'creator_bob', name: 'Bob', aliasName: null },
            },
          ],
          showPlatforms: [],
          taskTargets: [],
        },
        {
          id: BigInt(30),
          uid: 'show_30',
          name: 'Late-night Show',
          startTime: new Date('2026-05-13T02:00:00.000Z'), // Operational day May 12!
          endTime: new Date('2026-05-13T04:00:00.000Z'),
          actualStartTime: new Date('2026-05-13T02:00:00.000Z'), // Complete
          actualEndTime: new Date('2026-05-13T04:00:00.000Z'),
          showCreators: [],
          showPlatforms: [],
          taskTargets: [],
        },
      ];

      showService.getShowsForReview.mockResolvedValue(mockShows as any);

      const result = await service.getShowRunReviewSummary(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });

      expect(studioService.getStudioById).toHaveBeenCalledWith(studioUid);
      expect(showService.getShowsForReview).toHaveBeenCalledWith(
        mockStudio.id,
        new Date('2026-05-12T06:00:00.000Z'),
        new Date('2026-05-13T05:59:59.999Z'),
      );

      expect(result.shows).toEqual({
        total_count: 3,
        started_count: 2,
        not_started_count: 1,
        late_start_count: 1,
        missing_duration_minutes: 5,
        end_recorded_count: 2,
      });

      expect(result.creators.total_count).toBe(2);
      expect(result.creators.late_count).toBe(1);
      expect(result.creators.missing_count).toBe(1);
      expect(result.creators.exceptions).toHaveLength(0);

      expect(result.platforms.active_violations_count).toBe(1);
      expect(result.platforms.violations).toHaveLength(0);

      expect(result.tasks.incomplete_phase_checks_count).toBe(1);
      expect(result.tasks.incomplete_tasks).toHaveLength(0);

      expect(result.issues).toEqual({
        unresolved_count: 0,
        unresolved_by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
      });
      expect(showIssueService.getUnresolvedIssueSeverityCounts).toHaveBeenCalledWith({
        studioUid,
        dateFrom: new Date('2026-05-12T06:00:00.000Z'),
        dateTo: new Date('2026-05-13T05:59:59.999Z'),
      });

      // Verify the new paginated sub-resource helper methods
      const creatorsRes = await service.getShowRunReviewCreators(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(creatorsRes.total).toBe(2);
      expect(creatorsRes.items).toHaveLength(2);
      expect(creatorsRes.items).toContainEqual(
        expect.objectContaining({
          show_creator_uid: 'sc_1',
          creator_name: 'Ali',
          status: 'LATE',
          late_minutes: 15,
          reason: 'Traffic',
        }),
      );
      expect(creatorsRes.items).toContainEqual(
        expect.objectContaining({
          show_creator_uid: 'sc_2',
          creator_name: 'Bob',
          status: 'MISSING',
          late_minutes: 0,
          reason: 'SICK',
        }),
      );

      const violationsRes = await service.getShowRunReviewViolations(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(violationsRes.total).toBe(1);
      expect(violationsRes.items).toHaveLength(1);
      expect(violationsRes.items[0]).toEqual(
        expect.objectContaining({
          violation_uid: 'v_1',
          platform_name: 'YouTube',
          violation_type: 'AUDIO_LAG',
          severity: 'HIGH',
          reason: 'Laggy audio',
        }),
      );

      const tasksRes = await service.getShowRunReviewTasks(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(tasksRes.total).toBe(1);
      expect(tasksRes.items).toHaveLength(1);
      expect(tasksRes.items[0]).toEqual(
        expect.objectContaining({
          task_uid: 'task_1',
          description: 'Pre-production sound check',
          status: 'IN_PROGRESS',
          type: 'PRE_PRODUCTION',
          show_name: 'Show 1',
        }),
      );

      const showsRes = await service.getShowRunReviewShows(studioUid, {
        date_from: '2026-05-12T06:00:00.000Z',
        date_to: '2026-05-13T05:59:59.999Z',
      });
      expect(showsRes.total).toBe(1);
      expect(showsRes.items).toHaveLength(1);
      expect(showsRes.items[0]).toEqual(
        expect.objectContaining({
          id: 'shows-range-summary',
          status: 'MISSING STARTS',
        }),
      );
    });
  });

  describe('getShowRunReviewIssues', () => {
    const studioUid = 'std_test123';
    const range = { date_from: '2026-05-12T06:00:00.000Z', date_to: '2026-05-13T05:59:59.999Z' };

    function mockIssueRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 1n,
        uid: 'issue_1',
        category: 'EQUIPMENT',
        origin: 'MANUAL',
        severity: 'HIGH',
        status: 'OPEN',
        title: 'Broken mic',
        evidence: null,
        dueAt: null,
        escalationLevel: 0,
        escalatedAt: null,
        escalationNote: null,
        resolvedAt: null,
        resolutionCode: null,
        resolutionNote: null,
        version: 1,
        createdAt: new Date('2026-05-12T09:00:00.000Z'),
        updatedAt: new Date('2026-05-12T09:00:00.000Z'),
        show: { uid: 'show_1', name: 'Morning Show' },
        owner: null,
        createdBy: null,
        escalatedBy: null,
        resolvedBy: null,
        showCreator: null,
        showPlatformViolation: null,
        ...overrides,
      };
    }

    // The design doc's core contract: the summary's unresolved count and this
    // sub-resource's default-filtered total must match under the same
    // studioUid/date range with no extra filters — otherwise the summary
    // badge and the drill-in tab can silently disagree.
    it('acceptance scenario: summary unresolved_count equals this method\'s total under the same filters', async () => {
      studioService.getStudioById.mockResolvedValue({ id: BigInt(1) } as any);
      showService.getShowsForReview.mockResolvedValue([]);
      showIssueService.getUnresolvedIssueSeverityCounts.mockResolvedValue({
        LOW: 1,
        MEDIUM: 2,
        HIGH: 0,
        CRITICAL: 0,
      });
      showIssueService.listShowIssues.mockResolvedValue({
        data: [mockIssueRow(), mockIssueRow({ id: 2n, uid: 'issue_2' }), mockIssueRow({ id: 3n, uid: 'issue_3' })],
        total: 3,
      });

      const summary = await service.getShowRunReviewSummary(studioUid, range);
      const issuesRes = await service.getShowRunReviewIssues(studioUid, range);

      expect(summary.issues.unresolved_count).toBe(3);
      expect(issuesRes.total).toBe(3);
      expect(summary.issues.unresolved_count).toBe(issuesRes.total);
    });

    it('defaults to unresolved (OPEN + IN_PROGRESS) statusIn when no status query param is given', async () => {
      showIssueService.listShowIssues.mockResolvedValue({ data: [], total: 0 });

      await service.getShowRunReviewIssues(studioUid, range);

      expect(showIssueService.listShowIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          studioUid,
          status: undefined,
          statusIn: ['OPEN', 'IN_PROGRESS'],
        }),
        { skip: 0, take: 10 },
      );
    });

    it('drops the default statusIn when an explicit status filter is provided', async () => {
      showIssueService.listShowIssues.mockResolvedValue({ data: [], total: 0 });

      await service.getShowRunReviewIssues(studioUid, { ...range, status: 'RESOLVED' });

      expect(showIssueService.listShowIssues).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'RESOLVED',
          statusIn: undefined,
        }),
        { skip: 0, take: 10 },
      );
    });

    it('paginates via skip/take and maps rows through the shared API response shape', async () => {
      showIssueService.listShowIssues.mockResolvedValue({
        data: [mockIssueRow()],
        total: 1,
      });

      const result = await service.getShowRunReviewIssues(studioUid, { ...range, page: 2, limit: 5 });

      expect(showIssueService.listShowIssues).toHaveBeenCalledWith(
        expect.anything(),
        { skip: 5, take: 5 },
      );
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual(expect.objectContaining({ id: 'issue_1', title: 'Broken mic' }));
    });

    // The design doc requires issue pagination/filtering/counting to run in
    // PostgreSQL via the canonical repository — not an in-memory slice of the
    // show graph the other four sub-resources load.
    it('does not load the show graph for review (no in-memory slicing)', async () => {
      showIssueService.listShowIssues.mockResolvedValue({ data: [], total: 0 });

      await service.getShowRunReviewIssues(studioUid, range);

      expect(showService.getShowsForReview).not.toHaveBeenCalled();
    });
  });
});
