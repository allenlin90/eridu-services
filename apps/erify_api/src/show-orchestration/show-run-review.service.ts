import { Injectable } from '@nestjs/common';

import type { ShowRunReviewSummary } from '@eridu/api-types/shows';

import { ShowService } from '@/models/show/show.service';
import { StudioService } from '@/models/studio/studio.service';

type ReviewShow = Awaited<ReturnType<ShowService['getShowsForReview']>>[number];

/**
 * Read-only show-run review analytics (the daily operational-fact summary and
 * its paginated sub-resources). Extracted from `ShowOrchestrationService` per
 * D3: review analytics is not orchestration — it performs no writes and holds
 * no `@Transactional` boundary, so it lives as its own peer service.
 */
@Injectable()
export class ShowRunReviewService {
  constructor(
    private readonly showService: ShowService,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Retrieves compiled daily operational facts and summaries (PR 12.4.4)
   */
  async getShowRunReviewSummary(
    studioUid: string,
    query: { date_from: string; date_to: string },
  ): Promise<ShowRunReviewSummary> {
    const studio = await this.studioService.getStudioById(studioUid);
    const studioId = studio.id;

    const start = new Date(query.date_from);
    const end = new Date(query.date_to);

    const shows = await this.showService.getShowsForReview(studioId, start, end);

    // Counts are derived from the same helpers the paginated sub-resource
    // endpoints use, so the summary totals always match the detail lists.
    const { startedCount, lateStartCount, missingDurationMinutes, endRecordedCount } = this.deriveShowActuals(shows);
    const creatorExceptions = this.deriveCreatorExceptions(shows);
    const activeViolations = this.deriveViolations(shows);
    const incompleteTasksList = this.deriveIncompleteTasks(shows);
    const totalCreatorsCount = shows.reduce((count, show) => count + show.showCreators.length, 0);
    const lateCreatorsCount = creatorExceptions.filter((exception) => exception.status === 'LATE').length;
    const missingCreatorsCount = creatorExceptions.filter((exception) => exception.status === 'MISSING').length;

    return {
      date_from: query.date_from,
      date_to: query.date_to,
      shows: {
        total_count: shows.length,
        started_count: startedCount,
        not_started_count: shows.length - startedCount,
        late_start_count: lateStartCount,
        missing_duration_minutes: missingDurationMinutes,
        end_recorded_count: endRecordedCount,
      },
      creators: {
        total_count: totalCreatorsCount,
        late_count: lateCreatorsCount,
        missing_count: missingCreatorsCount,
        exceptions: [],
      },
      platforms: {
        active_violations_count: activeViolations.length,
        violations: [],
      },
      tasks: {
        incomplete_phase_checks_count: incompleteTasksList.length,
        incomplete_tasks: [],
      },
    };
  }

  async getShowRunReviewCreators(
    studioUid: string,
    query: { date_from: string; date_to: string; page?: number; limit?: number; search?: string; status?: 'LATE' | 'MISSING' },
  ) {
    const shows = await this.loadReviewShows(studioUid, query);

    let filtered = this.deriveCreatorExceptions(shows);
    if (query.status) {
      filtered = filtered.filter((ex) => ex.status === query.status);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.creator_name.toLowerCase().includes(s)
          || ex.show_name.toLowerCase().includes(s)
          || (ex.reason !== null && ex.reason.toLowerCase().includes(s)),
      );
    }

    return this.paginate(filtered, query.page, query.limit);
  }

  async getShowRunReviewViolations(
    studioUid: string,
    query: { date_from: string; date_to: string; page?: number; limit?: number; search?: string; severity?: string },
  ) {
    const shows = await this.loadReviewShows(studioUid, query);

    let filtered = this.deriveViolations(shows);
    if (query.severity) {
      filtered = filtered.filter((v) => v.severity === query.severity);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.platform_name.toLowerCase().includes(s)
          || v.show_name.toLowerCase().includes(s)
          || v.reason.toLowerCase().includes(s)
          || v.violation_type.toLowerCase().includes(s),
      );
    }

    return this.paginate(filtered, query.page, query.limit);
  }

  async getShowRunReviewTasks(
    studioUid: string,
    query: { date_from: string; date_to: string; page?: number; limit?: number; search?: string; status?: string },
  ) {
    const shows = await this.loadReviewShows(studioUid, query);

    let filtered = this.deriveIncompleteTasks(shows);
    if (query.status) {
      filtered = filtered.filter((t) => t.status === query.status);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(s)
          || t.show_name.toLowerCase().includes(s)
          || t.type.toLowerCase().includes(s),
      );
    }

    return this.paginate(filtered, query.page, query.limit);
  }

  async getShowRunReviewShows(
    studioUid: string,
    query: { date_from: string; date_to: string; page?: number; limit?: number; search?: string; completeness?: string },
  ) {
    const shows = await this.loadReviewShows(studioUid, query);

    let filtered = this.buildShowsRangeRows(shows);
    if (query.completeness) {
      filtered = filtered.filter((r) => r.status === query.completeness);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.shows_range.toLowerCase().includes(s)
          || r.actuals_completeness.toLowerCase().includes(s),
      );
    }

    return this.paginate(filtered, query.page, query.limit);
  }

  /**
   * Loads the shows graph for a review range. Shared by the summary and every
   * paginated sub-resource so they derive from the same data set.
   */
  private async loadReviewShows(
    studioUid: string,
    query: { date_from: string; date_to: string },
  ): Promise<ReviewShow[]> {
    const studio = await this.studioService.getStudioById(studioUid);
    return this.showService.getShowsForReview(
      studio.id,
      new Date(query.date_from),
      new Date(query.date_to),
    );
  }

  /**
   * Single source of truth for the derived run-review views. The summary uses
   * these to compute counts; the sub-resource endpoints use them for the list
   * contents — keeping the two from drifting apart.
   */
  private deriveCreatorExceptions(shows: ReviewShow[]): ShowRunReviewSummary['creators']['exceptions'] {
    const exceptions: ShowRunReviewSummary['creators']['exceptions'] = [];
    for (const show of shows) {
      for (const sc of show.showCreators) {
        if (sc.attendanceMissing) {
          exceptions.push({
            show_creator_uid: sc.uid,
            creator_name: sc.creator.aliasName || sc.creator.name,
            show_name: show.name,
            show_start_time: show.startTime.toISOString(),
            status: 'MISSING',
            late_minutes: 0,
            reason: sc.attendanceReason,
          });
        } else if (sc.actualStartTime) {
          const actualStart = new Date(sc.actualStartTime);
          const plannedStart = new Date(show.startTime);
          if (actualStart > plannedStart) {
            const diffMs = actualStart.getTime() - plannedStart.getTime();
            exceptions.push({
              show_creator_uid: sc.uid,
              creator_name: sc.creator.aliasName || sc.creator.name,
              show_name: show.name,
              show_start_time: show.startTime.toISOString(),
              status: 'LATE',
              late_minutes: Math.max(0, Math.floor(diffMs / 60000)),
              reason: sc.attendanceReason,
            });
          }
        }
      }
    }
    return exceptions;
  }

  private deriveViolations(shows: ReviewShow[]): ShowRunReviewSummary['platforms']['violations'] {
    const violations: ShowRunReviewSummary['platforms']['violations'] = [];
    for (const show of shows) {
      for (const sp of show.showPlatforms) {
        for (const v of sp.violations) {
          violations.push({
            violation_uid: v.uid,
            platform_name: sp.platform.name,
            show_name: show.name,
            show_start_time: show.startTime.toISOString(),
            violation_type: v.violationType,
            severity: v.severity,
            reason: v.reason,
            observed_at: v.observedAt.toISOString(),
          });
        }
      }
    }
    return violations;
  }

  private deriveIncompleteTasks(shows: ReviewShow[]): ShowRunReviewSummary['tasks']['incomplete_tasks'] {
    const tasks: ShowRunReviewSummary['tasks']['incomplete_tasks'] = [];
    const seenTaskUids = new Set<string>();
    for (const show of shows) {
      for (const target of show.taskTargets) {
        const task = target.task;
        if (task && task.deletedAt === null && task.status !== 'COMPLETED' && task.status !== 'CLOSED') {
          if (!seenTaskUids.has(task.uid)) {
            seenTaskUids.add(task.uid);
            tasks.push({
              task_uid: task.uid,
              description: task.description,
              status: task.status,
              type: task.type,
              show_name: show.name,
            });
          }
        }
      }
    }
    return tasks;
  }

  private deriveShowActuals(shows: ReviewShow[]): {
    startedCount: number;
    lateStartCount: number;
    missingDurationMinutes: number;
    endRecordedCount: number;
  } {
    let startedCount = 0;
    let lateStartCount = 0;
    let missingDurationMinutes = 0;
    let endRecordedCount = 0;
    for (const show of shows) {
      if (show.actualStartTime !== null) {
        startedCount++;
        const actualStart = new Date(show.actualStartTime);
        const plannedStart = new Date(show.startTime);
        if (actualStart > plannedStart) {
          lateStartCount++;
          const diffMs = actualStart.getTime() - plannedStart.getTime();
          missingDurationMinutes += Math.max(0, Math.floor(diffMs / 60000));
        }
      }
      if (show.actualEndTime !== null) {
        endRecordedCount++;
      }
    }
    return { startedCount, lateStartCount, missingDurationMinutes, endRecordedCount };
  }

  private buildShowsRangeRows(shows: ReviewShow[]): Array<{
    id: string;
    shows_range: string;
    actuals_completeness: string;
    status: string;
  }> {
    if (shows.length === 0) {
      return [];
    }
    const { startedCount, lateStartCount, missingDurationMinutes } = this.deriveShowActuals(shows);
    return [
      {
        id: 'shows-range-summary',
        shows_range: `Shows scheduled within range: ${shows.length} scheduled`,
        actuals_completeness: `${startedCount} started, ${shows.length - startedCount} not started · ${lateStartCount} late (${this.formatDurationMinutes(missingDurationMinutes)} lost)`,
        status: shows.length - startedCount === 0 ? 'ALL STARTED' : 'MISSING STARTS',
      },
    ];
  }

  private paginate<T>(items: T[], page?: number, limit?: number): { items: T[]; total: number } {
    const pageNum = page ?? 1;
    const pageSize = limit ?? 10;
    return {
      items: items.slice((pageNum - 1) * pageSize, pageNum * pageSize),
      total: items.length,
    };
  }

  private formatDurationMinutes(totalMinutes: number): string {
    if (totalMinutes <= 0) {
      return '0m';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
}
