import { Injectable } from '@nestjs/common';

import type { SceneQcReport, SceneQcReportStatus } from '@eridu/api-types/scene-qc';
import { SCENE_QC_REPORT_STATUS } from '@eridu/api-types/scene-qc';

import type { ConfirmationReportRow } from './schemas/scene-qc-confirmation.schema';
import { toSceneQcReportDto } from './schemas/scene-qc-report.schema';
import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';
import { resolveSceneQcRevisionStatus } from './scene-qc-confirmation-state.policy';
import { SceneQcRepository } from './scene-qc-review.repository';

import { HttpError } from '@/lib/errors/http-error.util';

/**
 * The §6.3 report read model + status resolution. Hosts the
 * `TODO(scene-qc-reporting)` marker for the report-status-recomputes-
 * eligible-set tech debt (OQ-42). EXPORTED (capability API). See
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.3/1.9.
 */
@Injectable()
export class SceneQcReportService {
  constructor(
    private readonly confirmationRepository: SceneQcConfirmationRepository,
    private readonly sceneQcRepository: SceneQcRepository,
  ) {}

  async getReport(studioUid: string, confirmationUid: string): Promise<SceneQcReport> {
    const row = await this.confirmationRepository.findConfirmationForReport({ studioUid, confirmationUid });
    if (!row) {
      throw HttpError.notFound('Scene QC confirmation');
    }

    const status = await this.resolveStatus(studioUid, row);
    return toSceneQcReportDto(row, status, new Date());
  }

  /**
   * TODO(scene-qc-reporting): every report request re-derives the day's
   * current eligible set to distinguish CURRENT from STALE when the
   * confirmation is still the day's latest revision. Acceptable for Stage 1
   * (reports are not a polled surface); tracked as
   * docs/tech-debt/scene-qc-report-status-recomputes-eligible-set.md.
   */
  private async resolveStatus(studioUid: string, row: ConfirmationReportRow): Promise<SceneQcReportStatus> {
    const hasLaterRevision = await this.confirmationRepository.hasLaterRevision({
      studioId: row.studioId,
      operationalDate: row.operationalDate,
      revision: row.revision,
    });
    if (hasLaterRevision) {
      return SCENE_QC_REPORT_STATUS.SUPERSEDED;
    }

    const shows = await this.sceneQcRepository.findEligibleShowsInWindow({
      studioUid,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
    });
    const reviewHeads = await this.sceneQcRepository.findReviewHeadsForShows({
      showIds: shows.map((show) => show.id),
      operationalDate: row.operationalDate,
    });
    const reviewHeadByShow = new Map(reviewHeads.map((review) => [review.showId, review]));
    const current = shows.map((show) => {
      const head = reviewHeadByShow.get(show.id);
      return { showId: show.id, reviewId: head?.id ?? null, reviewVersion: head?.version ?? null };
    });
    const pinned = row.items.map((item) => ({ showId: item.showId, reviewId: item.reviewId, reviewVersion: item.reviewVersion }));

    return resolveSceneQcRevisionStatus({ hasLaterRevision: false, pinned, current });
  }
}
