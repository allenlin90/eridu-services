import { ShowRunReviewService } from './show-run-review.service';

import { HttpError } from '@/lib/errors/http-error.util';
import type { ShowService } from '@/models/show/show.service';
import type { StudioService } from '@/models/studio/studio.service';

describe('showRunReviewService', () => {
  let service: ShowRunReviewService;
  let showService: { getShowsForReview: jest.Mock };
  let studioService: { getStudioById: jest.Mock };

  beforeEach(() => {
    showService = { getShowsForReview: jest.fn() };
    studioService = { getStudioById: jest.fn() };
    service = new ShowRunReviewService(
      showService as unknown as ShowService,
      studioService as unknown as StudioService,
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
});
