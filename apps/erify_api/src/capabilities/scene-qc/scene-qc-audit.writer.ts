import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma } from '@prisma/client';

import type { AuditAction, AuditMetadata } from '@eridu/api-types/audits';
import { UID_PREFIXES } from '@eridu/api-types/constants';

import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

/**
 * Capability-owned audit writer. Writes the STANDARD shared `Audit` envelope
 * plus a capability-owned `SceneQcAuditTarget` junction row in ONE nested
 * statement through the ambient CLS transaction.
 *
 * Why not AuditService.create: AuditRepository.toTargetCreateInput is an
 * exhaustive switch over AuditTargetType routing exclusively into the shared
 * `audit_targets` table. Reaching Scene QC through it would require widening
 * that shared enum AND adding a scene_profile_id FK to `audit_targets` --
 * explicitly rejected by SCENE_QC_IMPLEMENTATION_PLAN.md section 5.5
 * ("widening audit_targets is not the fallback").
 *
 * This writer never calls AuditService, so the shared "Audit requires at least
 * one target" guard is untouched for every other capability. Its own no-orphan
 * guarantee is structural: the target id is a REQUIRED parameter, the junction
 * is nested in the same statement, and the
 * scene_qc_audit_targets_single_target_check CHECK rejects a null target.
 *
 * PRIVATE to SceneQcModule -- never added to `exports`. Child PR 3 added
 * recordSceneQcReviewChange, Child PR 4 adds recordDailyConfirmation, each
 * with its own required typed target id.
 */
@Injectable()
export class SceneQcAuditWriter {
  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    private readonly uidGenerator: UidGeneratorService,
  ) {}

  async recordSceneProfileChange(input: {
    action: Extract<AuditAction, 'CREATE' | 'UPDATE' | 'DELETE'>;
    actorId: bigint;
    sceneProfileId: bigint;
    metadata: AuditMetadata;
  }): Promise<{ uid: string }> {
    return this.txHost.tx.audit.create({
      data: {
        uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.AUDIT),
        action: input.action,
        actor: { connect: { id: input.actorId } },
        metadata: input.metadata as Prisma.InputJsonValue,
        // `reason` intentionally omitted: reserved for Stage 2 reasoned amendments.
        sceneQcTargets: {
          create: [{ sceneProfile: { connect: { id: input.sceneProfileId } } }],
        },
      },
      select: { uid: true },
    });
  }

  /**
   * Same identical nested-create shape as `recordSceneProfileChange` so the
   * widened `scene_qc_audit_targets_single_target_check` CHECK is
   * structurally satisfied (exactly one typed target FK set). Metadata stays
   * thin -- business fields (result, feedback) live in the normalized
   * `SceneQcReview` row, never duplicated into audit metadata (plan section 5.5).
   */
  async recordSceneQcReviewChange(input: {
    action: Extract<AuditAction, 'CREATE' | 'UPDATE'>;
    actorId: bigint;
    sceneQcReviewId: bigint;
    metadata: AuditMetadata;
  }): Promise<{ uid: string }> {
    return this.txHost.tx.audit.create({
      data: {
        uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.AUDIT),
        action: input.action,
        actor: { connect: { id: input.actorId } },
        metadata: input.metadata as Prisma.InputJsonValue,
        sceneQcTargets: {
          create: [{ sceneQcReview: { connect: { id: input.sceneQcReviewId } } }],
        },
      },
      select: { uid: true },
    });
  }

  /**
   * Third method, structurally identical to the two above so the widened
   * `scene_qc_audit_targets_single_target_check` CHECK is satisfied by
   * construction. `action` is always `'CREATE'` -- a confirmation is never
   * updated. Metadata stays thin: business facts (show/pass/minor/fail
   * counts) live in the normalized confirmation/item tables, never
   * duplicated into audit metadata (plan section 5.5).
   */
  async recordDailyConfirmation(input: {
    action: Extract<AuditAction, 'CREATE'>;
    actorId: bigint;
    sceneQcDailyConfirmationId: bigint;
    metadata: AuditMetadata;
  }): Promise<{ uid: string }> {
    return this.txHost.tx.audit.create({
      data: {
        uid: this.uidGenerator.generateBrandedId(UID_PREFIXES.AUDIT),
        action: input.action,
        actor: { connect: { id: input.actorId } },
        metadata: input.metadata as Prisma.InputJsonValue,
        sceneQcTargets: {
          create: [{ sceneQcDailyConfirmation: { connect: { id: input.sceneQcDailyConfirmationId } } }],
        },
      },
      select: { uid: true },
    });
  }
}
