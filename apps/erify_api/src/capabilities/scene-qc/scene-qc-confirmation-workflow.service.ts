import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { UID_PREFIXES } from '@eridu/api-types/constants';
import type { SceneQcConfirmation } from '@eridu/api-types/scene-qc';
import { SCENE_QC_CONFIRMATION_STATE } from '@eridu/api-types/scene-qc';

import type { SceneQcConfirmationMutationContext } from './schemas/scene-qc-confirmation.schema';
import { toSceneQcConfirmationDto } from './schemas/scene-qc-confirmation.schema';
import type { EligibleShowRow, ReviewHeadRow } from './schemas/scene-qc-review.schema';
import { SceneQcAuditWriter } from './scene-qc-audit.writer';
import { SceneQcConfirmationRepository } from './scene-qc-confirmation.repository';
import { resolveSceneQcConfirmationState } from './scene-qc-confirmation-state.policy';
import { SceneQcEvidenceResolver } from './scene-qc-evidence.resolver';
import { OPERATIONAL_TIMEZONE, resolveOperationalWindow } from './scene-qc-operational-window.util';
import { SceneQcRepository } from './scene-qc-review.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';
import { UserService } from '@/models/user/user.service';

type ResultCounts = { pass: number; minor: number; fail: number };

/**
 * `confirmDay` -- the §8.3 confirmation transaction owning the advisory-locked,
 * cross-row, append-only revision append end to end. The transaction boundary
 * is this workflow method (capability skill section 3). See
 * SCENE_QC_CHILD_PR_4_BREAKDOWN.md section 1.6.
 *
 * EXPORTED (capability API).
 */
@Injectable()
export class SceneQcConfirmationWorkflowService {
  constructor(
    private readonly confirmationRepository: SceneQcConfirmationRepository,
    private readonly sceneQcRepository: SceneQcRepository,
    private readonly evidenceResolver: SceneQcEvidenceResolver,
    private readonly auditWriter: SceneQcAuditWriter,
    private readonly uidGenerator: UidGeneratorService,
    private readonly userService: UserService,
  ) {}

  @Transactional()
  async confirmDay(
    studioUid: string,
    operationalDate: string,
    context: SceneQcConfirmationMutationContext,
  ): Promise<SceneQcConfirmation> {
    // Step 1: the lock is the FIRST statement, before any read (breakdown
    // section 1.6.1). Acquiring it after reading eligible Shows reintroduces
    // the check-then-insert race the lock exists to close.
    await this.confirmationRepository.acquireDayLock({ studioUid, operationalDate });

    const actor = await this.resolveActor(context.actorExtId);

    // Step 2: recompute eligible Shows without UI filters -- the same
    // unfiltered path getDailySummary uses.
    const window = resolveOperationalWindow(operationalDate, OPERATIONAL_TIMEZONE);
    const operationalDateUtcMidnight = this.operationalDateToUtcMidnight(window.operationalDate);
    const shows = await this.sceneQcRepository.findEligibleShowsInWindow({
      studioUid,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
    });
    if (shows.length === 0) {
      throw HttpError.unprocessableEntity('There are no eligible Shows to confirm for this operational day.');
    }
    const showIds = shows.map((show) => show.id);

    // Step 3: resolve one effective review per Show, and recheck evidence
    // completeness inside the lock -- deliberately not trusted from the
    // summary response (plan section 12.2).
    const [reviewHeads, evidenceByShow] = await Promise.all([
      this.sceneQcRepository.findReviewHeadsForShows({ showIds, operationalDate: operationalDateUtcMidnight }),
      this.evidenceResolver.resolveForShows(showIds),
    ]);
    const reviewHeadByShow = new Map<bigint, ReviewHeadRow>(reviewHeads.map((review) => [review.showId, review]));

    // Step 4: reject blockers. No separate "optimistic conflict" branch --
    // this command carries no version token and the confirmation table has
    // no `version` column; the only genuine conflict is a concurrent
    // confirmation, resolved by the lock plus the replay guard below (OQ-39).
    this.assertNoBlockedShows(shows, evidenceByShow);
    this.assertNoMissingReviews(shows, reviewHeadByShow);

    const current = shows.map((show) => {
      const head = reviewHeadByShow.get(show.id);
      return { showId: show.id, reviewId: head?.id ?? null, reviewVersion: head?.version ?? null };
    });
    const counts = this.tallyResults(shows, reviewHeadByShow);

    const latest = await this.confirmationRepository.findLatestConfirmationWithScope({
      studioUid,
      operationalDate: operationalDateUtcMidnight,
    });
    const { state } = resolveSceneQcConfirmationState({ pinned: latest?.items ?? null, current });

    // Step 4b: replay guard -- already CURRENT, return it without appending
    // a revision (OQ-19). This is what makes "replayed concurrent
    // confirmation creates one next revision" true.
    if (state === SCENE_QC_CONFIRMATION_STATE.CURRENT && latest) {
      return toSceneQcConfirmationDto({
        uid: latest.uid,
        operationalDate: operationalDateUtcMidnight,
        windowStart: window.windowStart,
        windowEnd: window.windowEnd,
        timezone: window.timezone,
        revision: latest.revision,
        confirmedBy: latest.confirmedBy,
        confirmedAt: latest.confirmedAt,
        showCount: shows.length,
        passCount: counts.pass,
        minorCount: counts.minor,
        failCount: counts.fail,
      });
    }

    // Steps 5-6: append confirmation + item + platform rows. `revision` is
    // read inside the lock, so a concurrent caller either blocks on the lock
    // (serialized) or, on replay, is handled by the guard above.
    const platformUids = [...new Set(shows.flatMap((show) => show.platforms.map((platform) => platform.uid)))];
    const platformIdByUid = await this.confirmationRepository.findPlatformIdsByUid(platformUids);
    const maxRevision = await this.confirmationRepository.findMaxRevision({
      studioUid,
      operationalDate: operationalDateUtcMidnight,
    });
    const revision = maxRevision + 1;
    const confirmedAt = new Date();

    const created = await this.confirmationRepository.appendConfirmation({
      uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.SCENE_QC_CONFIRMATION),
      studioUid,
      operationalDate: operationalDateUtcMidnight,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      timezone: window.timezone,
      revision,
      confirmedById: actor.id,
      confirmedAt,
      items: shows.map((show) => {
        const head = reviewHeadByShow.get(show.id)!;
        const client = this.requireClient(show);
        return {
          showId: show.id,
          reviewId: head.id,
          reviewVersion: head.version,
          showUid: show.uid,
          showName: show.name,
          scheduledStartTime: show.startTime,
          clientId: client.id,
          clientUid: client.uid,
          clientName: client.name,
          platforms: show.platforms.map((platform) => ({
            platformId: platformIdByUid.get(platform.uid) ?? null,
            platformUid: platform.uid,
            platformName: platform.name,
          })),
        };
      }),
    });

    // Step 7: mark newly included draft reviews confirmed. `confirmedAt:
    // null` in the predicate (inside the repository) means a review already
    // stamped by an earlier revision keeps its original stamp.
    const newlyConfirmedCount = await this.confirmationRepository.markReviewsConfirmed({
      reviewIds: reviewHeads.map((review) => review.id),
      confirmedAt,
    });

    // Step 8: write Audit.
    await this.auditWriter.recordDailyConfirmation({
      action: 'CREATE',
      actorId: actor.id,
      sceneQcDailyConfirmationId: created.id,
      metadata: {
        event: 'scene_qc_day_confirmed',
        scene_qc_confirmation_uid: created.uid,
        studio_uid: studioUid,
        actor_uid: actor.uid,
        operational_date: window.operationalDate,
        old_value: latest ? { revision: latest.revision, show_count: latest.items.length } : null,
        new_value: {
          revision,
          show_count: shows.length,
          pass_count: counts.pass,
          minor_count: counts.minor,
          fail_count: counts.fail,
          newly_confirmed_review_count: newlyConfirmedCount,
        },
      },
    });

    return toSceneQcConfirmationDto({
      uid: created.uid,
      operationalDate: operationalDateUtcMidnight,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      timezone: window.timezone,
      revision: created.revision,
      confirmedBy: created.confirmedBy,
      confirmedAt: created.confirmedAt,
      showCount: shows.length,
      passCount: counts.pass,
      minorCount: counts.minor,
      failCount: counts.fail,
    });
  }

  private assertNoBlockedShows(shows: EligibleShowRow[], evidenceByShow: Map<bigint, unknown[]>): void {
    const blockedCount = shows.filter((show) => (evidenceByShow.get(show.id)?.length ?? 0) === 0).length;
    if (blockedCount > 0) {
      throw HttpError.unprocessableEntity(
        `${blockedCount} Show(s) are blocked with no Scene QC evidence and cannot be confirmed.`,
      );
    }
  }

  private assertNoMissingReviews(shows: EligibleShowRow[], reviewHeadByShow: Map<bigint, ReviewHeadRow>): void {
    const missingCount = shows.filter((show) => !reviewHeadByShow.has(show.id)).length;
    if (missingCount > 0) {
      throw HttpError.unprocessableEntity(
        `${missingCount} Show(s) still need a Scene QC review before this day can be confirmed.`,
      );
    }
  }

  private tallyResults(shows: EligibleShowRow[], reviewHeadByShow: Map<bigint, ReviewHeadRow>): ResultCounts {
    const counts: ResultCounts = { pass: 0, minor: 0, fail: 0 };
    for (const show of shows) {
      const result = reviewHeadByShow.get(show.id)?.result;
      if (result === 'PASS')
        counts.pass += 1;
      else if (result === 'MINOR')
        counts.minor += 1;
      else if (result === 'FAIL')
        counts.fail += 1;
    }
    return counts;
  }

  private requireClient(show: EligibleShowRow): { id: bigint; uid: string; name: string } {
    // Show.clientId is a required (non-nullable) FK -- a Show eligible for
    // Scene QC always has a Client. Defense-in-depth only.
    if (!show.client) {
      throw HttpError.internalServerError(`Show ${show.uid} is missing its required Client relation`);
    }
    return show.client;
  }

  private async resolveActor(actorExtId: string): Promise<{ id: bigint; uid: string }> {
    const actor = await this.userService.getUserByExtId(actorExtId);
    if (!actor) {
      throw HttpError.unauthorized('ACTOR_NOT_FOUND');
    }
    return { id: actor.id, uid: actor.uid };
  }

  private operationalDateToUtcMidnight(operationalDate: string): Date {
    return new Date(`${operationalDate}T00:00:00.000Z`);
  }
}
