import { Injectable } from '@nestjs/common';

import type { SceneQcRecord, SceneQcRecordDetail, SceneQcReportStatus } from '@eridu/api-types/scene-qc';
import { SCENE_QC_REPORT_STATUS } from '@eridu/api-types/scene-qc';

import type { ConfirmationRef } from './schemas/scene-qc-confirmation.schema';
import type { SceneQcRecordsQueryDto } from './schemas/scene-qc-records.schema';
import { toSceneQcRecordDetailDto, toSceneQcRecordDto } from './schemas/scene-qc-records.schema';
import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';
import { resolveSceneQcRevisionStatus } from './scene-qc-confirmation-state.policy';
import { SceneQcRecordsQuery } from './scene-qc-records.query';
import { SceneQcRepository } from './scene-qc-review.repository';

import { HttpError } from '@/lib/errors/http-error.util';

/**
 * Records list + detail read models. EXPORTED (capability API). See
 * "Routes" in apps/erify_api/docs/SCENE_QC.md.
 */
@Injectable()
export class SceneQcRecordsQueryService {
  constructor(
    private readonly sceneQcRepository: SceneQcRepository,
    private readonly recordsQuery: SceneQcRecordsQuery,
    private readonly confirmationRepository: SceneQcConfirmationRepository,
  ) {}

  async listRecords(
    studioUid: string,
    query: SceneQcRecordsQueryDto,
  ): Promise<{ items: SceneQcRecord[]; total: number }> {
    const operationalDateFrom = this.operationalDateToUtcMidnight(query.dateFrom);
    const operationalDateTo = this.operationalDateToUtcMidnight(query.dateTo);
    const skip = (query.page - 1) * query.limit;

    const filters = {
      studioUid,
      operationalDateFrom,
      operationalDateTo,
      clientUid: query.clientId,
      platformUid: query.platformId,
      result: query.result,
    };

    const [rows, total] = await Promise.all([
      this.recordsQuery.findReviewRecords({ ...filters, skip, take: query.limit }),
      this.recordsQuery.countReviewRecords(filters),
    ]);

    const refs = await this.confirmationRepository.findConfirmationRefsForReviews(rows.map((row) => row.id));
    return { items: rows.map((row) => toSceneQcRecordDto(row, refs.get(row.id))), total };
  }

  async getRecordDetail(studioUid: string, reviewUid: string): Promise<SceneQcRecordDetail> {
    const record = await this.sceneQcRepository.findReviewRecordDetail({ studioUid, reviewUid });
    if (!record) {
      throw HttpError.notFound('Scene QC review');
    }

    const [auditHistory, amendments, refs] = await Promise.all([
      this.sceneQcRepository.findReviewAuditHistory(record.id),
      this.sceneQcRepository.findReviewAmendments(record.id),
      this.confirmationRepository.findConfirmationRefsForReviews([record.id]),
    ]);
    const ref = refs.get(record.id);
    const confirmation = ref
      ? { ref, status: await this.resolveRevisionStatus(studioUid, ref), confirmedBy: ref.confirmedBy, confirmedAt: ref.confirmedAt }
      : null;

    return toSceneQcRecordDetailDto({
      show: {
        uid: record.show.uid,
        name: record.show.name,
        scheduledStartTime: record.show.startTime,
        client: record.show.client,
        platforms: record.show.platforms,
      },
      review: record,
      confirmation,
      auditHistory,
      amendments,
    });
  }

  /**
   * OQ-42: `hasLaterRevision` (via `isLatestRevisionForDay`) cheaply yields
   * SUPERSEDED; otherwise the revision's own pinned scope is diffed against
   * the day's current eligible scope, exactly like the daily summary and the
   * report do.
   */
  private async resolveRevisionStatus(studioUid: string, ref: ConfirmationRef): Promise<SceneQcReportStatus> {
    if (!ref.isLatestRevisionForDay) {
      return SCENE_QC_REPORT_STATUS.SUPERSEDED;
    }
    const scope = await this.confirmationRepository.findConfirmationScopeById(ref.confirmationId);
    if (!scope) {
      return SCENE_QC_REPORT_STATUS.SUPERSEDED;
    }

    const shows = await this.sceneQcRepository.findEligibleShowsInWindow({
      studioUid,
      windowStart: scope.windowStart,
      windowEnd: scope.windowEnd,
    });
    const reviewHeads = await this.sceneQcRepository.findReviewHeadsForShows({
      showIds: shows.map((show) => show.id),
      operationalDate: scope.operationalDate,
    });
    const reviewHeadByShow = new Map(reviewHeads.map((review) => [review.showId, review]));
    const current = shows.map((show) => {
      const head = reviewHeadByShow.get(show.id);
      return { showId: show.id, reviewId: head?.id ?? null, reviewVersion: head?.version ?? null };
    });

    return resolveSceneQcRevisionStatus({ hasLaterRevision: false, pinned: scope.items, current });
  }

  private operationalDateToUtcMidnight(operationalDate: string): Date {
    return new Date(`${operationalDate}T00:00:00.000Z`);
  }
}
