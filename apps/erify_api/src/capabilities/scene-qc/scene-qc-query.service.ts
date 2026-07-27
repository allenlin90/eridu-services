import { Injectable } from '@nestjs/common';

import type { SceneQcDailyItemDetail, SceneQcDailySummary } from '@eridu/api-types/scene-qc';
import { SCENE_QC_REVIEW_STATE } from '@eridu/api-types/scene-qc';

import type { SceneQcDailyItemInput, SceneQcItemsQueryDto } from './schemas/scene-qc-daily.schema';
import {
  classifySceneQcReviewState,
  resolveSceneQcBlockedReason,
  toSceneQcDailyItemDto,
  toSceneQcDailySummaryDto,
  toSceneQcExpectedReferenceDto,
} from './schemas/scene-qc-daily.schema';
import type { EligibleShowRow, ReviewHeadRow } from './schemas/scene-qc-review.schema';
import { SceneProfileService } from './scene-profile.service';
import { isShowEligibleForSceneQc } from './scene-qc-eligibility-policy';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from './scene-qc-operational-window.util';
import { SceneQcRepository } from './scene-qc-review.repository';

import { HttpError } from '@/lib/errors/http-error.util';

/**
 * The three GET read models (§8.1 → code). Enforces studio scope, bounded
 * pagination, lean projections. EXPORTED (capability API). See
 * SCENE_QC_CHILD_PR_3_BREAKDOWN.md section 1.5/1.8.
 */
@Injectable()
export class SceneQcQueryService {
  constructor(
    private readonly sceneQcRepository: SceneQcRepository,
    private readonly evidenceResolver: SceneQcEvidenceResolver,
    private readonly sceneProfileService: SceneProfileService,
  ) {}

  /** Always the UNFILTERED eligible set -- never receives filter params. */
  async getDailySummary(studioUid: string, operationalDate: string): Promise<SceneQcDailySummary> {
    const window = resolveOperationalWindow(operationalDate, OPERATIONAL_TIMEZONE);
    const shows = await this.sceneQcRepository.findEligibleShowsInWindow({
      studioUid,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
    });
    const showIds = shows.map((show) => show.id);
    const [reviewHeads, evidenceByShow] = await Promise.all([
      this.sceneQcRepository.findReviewHeadsForShows({
        showIds,
        operationalDate: this.operationalDateToUtcMidnight(window.operationalDate),
      }),
      this.evidenceResolver.resolveForShows(showIds),
    ]);

    let passCount = 0;
    let minorCount = 0;
    let failCount = 0;
    for (const review of reviewHeads) {
      if (review.result === 'PASS')
        passCount += 1;
      else if (review.result === 'MINOR')
        minorCount += 1;
      else if (review.result === 'FAIL')
        failCount += 1;
    }
    const blockedNoEvidenceCount = shows.filter(
      (show) => (evidenceByShow.get(show.id)?.length ?? 0) === 0,
    ).length;

    return toSceneQcDailySummaryDto({
      operationalDate: window.operationalDate,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      timezone: window.timezone,
      eligibleCount: shows.length,
      reviewedCount: reviewHeads.length,
      passCount,
      minorCount,
      failCount,
      blockedNoEvidenceCount,
    });
  }

  /** Filters narrow visible rows only; the unfiltered summary/eligible scope is untouched. */
  async listDailyItems(
    studioUid: string,
    query: SceneQcItemsQueryDto,
  ): Promise<{ items: ReturnType<typeof toSceneQcDailyItemDto>[]; total: number }> {
    const window = resolveOperationalWindow(query.operationalDate, OPERATIONAL_TIMEZONE);
    const shows = await this.sceneQcRepository.findEligibleShowsInWindow({
      studioUid,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      clientUid: query.clientId,
      platformUid: query.platformId,
      search: query.search,
    });
    const showIds = shows.map((show) => show.id);
    const clientIds = [...new Set(shows.map((show) => show.client?.id).filter((id): id is bigint => id !== undefined))];

    const [reviewHeads, evidenceByShow, clientIdsWithProfile] = await Promise.all([
      this.sceneQcRepository.findReviewHeadsForShows({
        showIds,
        operationalDate: this.operationalDateToUtcMidnight(window.operationalDate),
      }),
      this.evidenceResolver.resolveForShows(showIds),
      this.sceneQcRepository.findClientIdsWithActiveProfile(clientIds),
    ]);
    const reviewHeadByShow = new Map<bigint, ReviewHeadRow>(reviewHeads.map((review) => [review.showId, review]));

    const items: SceneQcDailyItemInput[] = shows.map((show) => ({
      show,
      evidenceCount: evidenceByShow.get(show.id)?.length ?? 0,
      hasSceneProfile: show.client ? clientIdsWithProfile.has(show.client.id) : false,
      reviewHead: reviewHeadByShow.get(show.id) ?? null,
    }));

    const filtered = query.reviewState === SCENE_QC_REVIEW_STATE.ALL
      ? items
      : items.filter((item) => classifySceneQcReviewState(item) === query.reviewState);

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    const page = filtered.slice(start, start + query.limit);

    return { items: page.map(toSceneQcDailyItemDto), total };
  }

  async getDailyItemDetail(
    studioUid: string,
    showUid: string,
    operationalDate: string,
  ): Promise<SceneQcDailyItemDetail> {
    const show = await this.sceneQcRepository.findEligibleShowForReview({ studioUid, showUid });
    if (!show) {
      throw HttpError.notFound('Show');
    }

    const window = resolveOperationalWindow(operationalDate, OPERATIONAL_TIMEZONE);
    const [evidenceByShow, profile, review] = await Promise.all([
      this.evidenceResolver.resolveForShows([show.id]),
      show.client ? this.sceneProfileService.getActiveProfileForClient(show.client.uid) : Promise.resolve(null),
      this.sceneQcRepository.findReviewByShowAndDate({
        showId: show.id,
        operationalDate: this.operationalDateToUtcMidnight(window.operationalDate),
        includeEvidence: true,
      }),
    ]);
    const evidence = evidenceByShow.get(show.id) ?? [];

    return {
      show: {
        id: show.uid,
        name: show.name,
        scheduled_start_time: show.startTime.toISOString(),
        client: show.client ? { id: show.client.uid, name: show.client.name } : null,
        platforms: show.platforms.map((platform) => ({ id: platform.uid, name: platform.name })),
      },
      operational_window: {
        operational_date: window.operationalDate,
        window_start: window.windowStart.toISOString(),
        window_end: window.windowEnd.toISOString(),
        timezone: window.timezone,
      },
      evidence: evidence.map((item, index) => ({
        sort_order: index,
        source_task_id: item.sourceTaskUid,
        source_task_version: item.sourceTaskVersion,
        source_field_key: item.sourceFieldKey,
        label: item.sourceLabel,
        object_key: item.objectKey,
        file_url: item.fileUrl,
      })),
      scene_profile: toSceneQcExpectedReferenceDto(profile),
      review: review
        ? {
            id: review.uid,
            show_id: review.show.uid,
            operational_date: review.operationalDate.toISOString().slice(0, 10),
            window_start: review.windowStart.toISOString(),
            window_end: review.windowEnd.toISOString(),
            timezone: review.timezone,
            result: review.result,
            feedback: review.feedback,
            reviewed_by: { id: review.reviewedBy.uid, name: review.reviewedBy.name },
            reviewed_at: review.reviewedAt.toISOString(),
            expected_reference: review.expectedFileUrl
              ? {
                  object_key: review.expectedObjectKey,
                  file_url: review.expectedFileUrl,
                  scene_type: review.expectedSceneType!,
                }
              : null,
            version: review.version,
            confirmed_at: review.confirmedAt ? review.confirmedAt.toISOString() : null,
            created_at: review.createdAt.toISOString(),
            updated_at: review.updatedAt.toISOString(),
            evidence: review.evidence.map((item) => ({
              sort_order: item.sortOrder,
              source_task_id: item.sourceTaskUid,
              source_task_version: item.sourceTaskVersion,
              source_field_key: item.sourceFieldKey,
              label: item.sourceLabel,
              object_key: item.objectKey,
              file_url: item.fileUrl,
            })),
          }
        : null,
      allowed_actions: this.resolveAllowedActions({ show, window, evidenceCount: evidence.length, review }),
    };
  }

  private resolveAllowedActions(input: {
    show: EligibleShowRow;
    window: { windowStart: Date; windowEnd: Date };
    evidenceCount: number;
    review: { confirmedAt: Date | null } | null;
  }) {
    if (!isShowEligibleForSceneQc(input.show, input.window)) {
      return { can_review: false, blocked_reason: 'NOT_ELIGIBLE' as const };
    }
    const blockedReason = resolveSceneQcBlockedReason({
      evidenceCount: input.evidenceCount,
      reviewConfirmed: Boolean(input.review?.confirmedAt),
    });
    return { can_review: blockedReason === null, blocked_reason: blockedReason };
  }

  private operationalDateToUtcMidnight(operationalDate: string): Date {
    return new Date(`${operationalDate}T00:00:00.000Z`);
  }
}
