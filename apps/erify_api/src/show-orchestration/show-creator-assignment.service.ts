import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { Show } from '@prisma/client';

import { CREATOR_COMPENSATION_TYPE } from '@eridu/api-types/creators';
import { STUDIO_CREATOR_ROSTER_ERROR } from '@eridu/api-types/studio-creators';

import { showWithAssignmentsInclude } from './schemas/show-orchestration.schema';
import { decimalLikeToString, isCreatorSnapshotMissing } from './creator-compensation.util';

import { appendSnapshotAudit, isSnapshotValueEqual, SnapshotChange } from '@/lib/audit/snapshot-audit.helper';
import { HttpError } from '@/lib/errors/http-error.util';
import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { CreatorRepository } from '@/models/creator/creator.repository';
import type { ShowInclude, ShowWithPayload } from '@/models/show/schemas/show.schema';
import { ShowRepository } from '@/models/show/show.repository';
import { ShowService } from '@/models/show/show.service';
import { ShowCreatorRepository } from '@/models/show-creator/show-creator.repository';
import { ShowCreatorService } from '@/models/show-creator/show-creator.service';
import { StudioCreatorRepository } from '@/models/studio-creator/studio-creator.repository';

export type CreatorAssignmentPayload = {
  creatorId: string;
  note?: string | null;
  agreedRate?: string | null;
  compensationType?: string | null;
  commissionRate?: string | null;
  overrideReason?: string;
  metadata?: object;
};

export type BulkAssignCreatorsResult = {
  assigned: number;
  skipped: number;
  failed: Array<{
    creatorId: string;
    reason: string;
  }>;
};

export type ShowCreatorListItem = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAliasName: string;
  note: string | null;
  agreedRate: unknown | null;
  compensationType: string | null;
  commissionRate: unknown | null;
  metadata: Record<string, unknown>;
};

type StudioCreatorSnapshotDefaults = {
  defaultRate: { toString: () => string } | string | number | null;
  defaultRateType: string | null;
  defaultCommissionRate: { toString: () => string } | string | number | null;
};

type ResolvedCreatorSnapshot = {
  agreedRate: string | null;
  compensationType: string | null;
  commissionRate: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Owns a show's creator-assignment lifecycle: bulk assign, list, update, remove,
 * replace, plus the agreement-snapshot resolution/audit logic. Extracted from
 * `ShowOrchestrationService`, which delegates its creator methods here and calls
 * `syncShowCreators` from within its `@Transactional` update (CLS propagates the
 * transaction across the service boundary).
 */
@Injectable()
export class ShowCreatorAssignmentService {
  constructor(
    private readonly showService: ShowService,
    private readonly showCreatorService: ShowCreatorService,
    private readonly showRepository: ShowRepository,
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    private readonly studioCreatorRepository: StudioCreatorRepository,
  ) {}

  @Transactional()
  async removeCreatorsFromShow(
    uid: string,
    creatorIds: string[],
  ): Promise<void> {
    const show = await this.showService.getShowById(uid);
    await this.removeShowCreatorAssignmentsByUids(show.id, creatorIds);
  }

  async bulkAssignCreatorsToShow(
    studioUid: string,
    uid: string,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
  ): Promise<BulkAssignCreatorsResult> {
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    if (creators.length === 0) {
      return { assigned: 0, skipped: 0, failed: [] };
    }

    const uniqueCreatorUids = [...new Set(creators.map((creator) => creator.creatorId))];
    const foundCreators = await this.creatorRepository.findByUids(uniqueCreatorUids);
    const creatorUidToIdMap = new Map(foundCreators.map((creator) => [creator.uid, creator.id]));
    const studioCreatorRosterEntries = await this.studioCreatorRepository.findByStudioUidAndCreatorUids(
      studioUid,
      uniqueCreatorUids,
    );
    const rosteredCreatorIds = new Set(
      studioCreatorRosterEntries.map((entry) => entry.creator.uid),
    );
    const inactiveRosterCreatorIds = new Set(
      studioCreatorRosterEntries
        .filter((entry) => !entry.isActive)
        .map((entry) => entry.creator.uid),
    );

    const existingAssignments = await this.showCreatorRepository.findMany({
      where: {
        showId,
        creatorId: {
          in: foundCreators.map((creator) => creator.id),
        },
      },
    });
    const existingByCreatorId = new Map(existingAssignments.map((assignment) => [assignment.creatorId, assignment]));
    const rosterEntryByCreatorUid = new Map(
      studioCreatorRosterEntries.map((entry) => [entry.creator.uid, entry]),
    );
    const processedCreatorUids = new Set<string>();
    const result: BulkAssignCreatorsResult = { assigned: 0, skipped: 0, failed: [] };

    for (const creator of creators) {
      if (processedCreatorUids.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: 'Duplicate creator_id in request',
        });
        continue;
      }
      processedCreatorUids.add(creator.creatorId);

      const internalCreatorId = creatorUidToIdMap.get(creator.creatorId);
      if (!internalCreatorId) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: 'Creator not found',
        });
        continue;
      }

      const existingAssignment = existingByCreatorId.get(internalCreatorId);
      if (existingAssignment?.deletedAt === null) {
        result.skipped += 1;
        continue;
      }

      if (!rosteredCreatorIds.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_NOT_IN_ROSTER,
        });
        continue;
      }

      if (inactiveRosterCreatorIds.has(creator.creatorId)) {
        result.failed.push({
          creatorId: creator.creatorId,
          reason: STUDIO_CREATOR_ROSTER_ERROR.CREATOR_INACTIVE_IN_ROSTER,
        });
        continue;
      }

      try {
        if (existingAssignment) {
          const snapshot = this.resolveCreatorSnapshot(
            creator,
            rosterEntryByCreatorUid.get(creator.creatorId),
            this.mergeMetadata(existingAssignment.metadata, creator.metadata),
            existingAssignment.deletedAt === null ? existingAssignment : undefined,
          );
          const changes = this.buildCreatorSnapshotChanges(existingAssignment, snapshot);

          const newMetadata = appendSnapshotAudit(
            snapshot.metadata,
            changes,
            actorExtId,
            creator.overrideReason,
          );

          await this.showCreatorRepository.restoreAndUpdateAssignment(existingAssignment.id, {
            note: creator.note ?? null,
            agreedRate: snapshot.agreedRate,
            compensationType: snapshot.compensationType,
            commissionRate: snapshot.commissionRate,
            metadata: newMetadata,
          });
        } else {
          const snapshot = this.resolveCreatorSnapshot(
            creator,
            rosterEntryByCreatorUid.get(creator.creatorId),
            creator.metadata,
          );

          await this.showCreatorRepository.createAssignment({
            uid: this.showCreatorService.generateShowCreatorUid(),
            showId,
            creatorId: internalCreatorId,
            note: creator.note ?? null,
            agreedRate: snapshot.agreedRate,
            compensationType: snapshot.compensationType,
            commissionRate: snapshot.commissionRate,
            metadata: snapshot.metadata,
          });
        }
      } catch (error) {
        if (this.isPrismaUniqueConstraintError(error)) {
          // Duplicate assignment race: treat as skipped/idempotent-safe.
          result.skipped += 1;
          continue;
        }

        result.failed.push({
          creatorId: creator.creatorId,
          reason: this.resolveCreatorAssignmentErrorReason(error),
        });
        continue;
      }

      result.assigned += 1;
    }

    return result;
  }

  async listCreatorsForShow(uid: string): Promise<ShowCreatorListItem[]> {
    const show = await this.showService.getShowById(uid, {
      showCreators: {
        where: {
          deletedAt: null,
          creator: { deletedAt: null },
        },
        include: {
          creator: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
      },
    });

    return (show.showCreators ?? []).map((showCreator) => ({
      id: showCreator.uid,
      creatorId: showCreator.creator.uid,
      creatorName: showCreator.creator.name,
      creatorAliasName: showCreator.creator.aliasName,
      note: showCreator.note,
      agreedRate: showCreator.agreedRate ?? null,
      compensationType: showCreator.compensationType ?? null,
      commissionRate: showCreator.commissionRate ?? null,
      metadata: (showCreator.metadata as Record<string, unknown>) ?? {},
    }));
  }

  @Transactional()
  async updateCreatorForShow(
    uid: string,
    showCreatorUid: string,
    payload: Omit<CreatorAssignmentPayload, 'creatorId'>,
    actorExtId: string,
  ): Promise<ShowCreatorListItem> {
    const show = await this.showService.getShowById(uid, {
      showCreators: {
        where: {
          uid: showCreatorUid,
          deletedAt: null,
          creator: { deletedAt: null },
        },
        include: {
          creator: {
            select: {
              uid: true,
              name: true,
              aliasName: true,
            },
          },
        },
      },
    });
    const existing = show.showCreators?.[0];

    if (!existing) {
      throw HttpError.notFound('Show creator', showCreatorUid);
    }

    const snapshot = this.resolveCreatorSnapshot(
      {
        creatorId: existing.creator.uid,
        ...payload,
      },
      undefined,
      this.mergeMetadata(existing.metadata, payload.metadata),
      existing,
    );
    this.assertCreatorSnapshotInvariants(snapshot);
    const changes = this.buildCreatorSnapshotChanges(existing, snapshot);
    const metadata = appendSnapshotAudit(
      snapshot.metadata,
      changes,
      actorExtId,
      payload.overrideReason,
    );

    const updated = await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {
      note: payload.note !== undefined ? payload.note : existing.note,
      agreedRate: snapshot.agreedRate,
      compensationType: snapshot.compensationType,
      commissionRate: snapshot.commissionRate,
      metadata,
    });

    return {
      id: updated.uid,
      creatorId: existing.creator.uid,
      creatorName: existing.creator.name,
      creatorAliasName: existing.creator.aliasName,
      note: updated.note,
      agreedRate: updated.agreedRate ?? null,
      compensationType: updated.compensationType ?? null,
      commissionRate: updated.commissionRate ?? null,
      metadata: (updated.metadata as Record<string, unknown>) ?? {},
    };
  }

  @Transactional()
  async replaceCreatorsForShow<T extends ShowInclude = Record<string, never>>(
    uid: string,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
    include?: T,
  ): Promise<Show | ShowWithPayload<T>> {
    const defaultInclude = include || showWithAssignmentsInclude;
    const show = await this.showService.getShowById(uid);
    const showId = show.id;
    await this.syncShowCreators(showId, creators, actorExtId);
    return this.showRepository.findByUid(uid, defaultInclude) as Promise<Show | ShowWithPayload<T>>;
  }

  /**
   * Syncs creator assignments for a show within the active transaction (via CLS).
   * Validates creators exist, upserts active assignments, soft-deletes removed ones.
   */
  async syncShowCreators(
    showId: bigint,
    creators: CreatorAssignmentPayload[],
    actorExtId: string,
    missingEntityLabel = 'Creators',
  ): Promise<void> {
    const creatorUids = creators.map((c) => c.creatorId);

    const foundCreators = await this.creatorRepository.findByUids(creatorUids);
    if (foundCreators.length !== creatorUids.length) {
      const foundUids = foundCreators.map((creator) => creator.uid);
      const missingUids = creatorUids.filter((uid) => !foundUids.includes(uid));
      throw HttpError.badRequest(`${missingEntityLabel} not found: ${missingUids.join(', ')}`);
    }

    const creatorMap = new Map(foundCreators.map((creator) => [creator.uid, creator.id]));
    const existingAssignments = await this.showCreatorRepository.findMany({ where: { showId } });
    const processedCreatorIds = new Set<bigint>();

    for (const assignment of creators) {
      const internalCreatorId = creatorMap.get(assignment.creatorId);
      if (!internalCreatorId)
        continue;

      processedCreatorIds.add(internalCreatorId);
      const existing = existingAssignments.find((a) => a.creatorId === internalCreatorId);

      if (existing) {
        const snapshot = this.resolveCreatorSnapshot(
          assignment,
          undefined,
          this.mergeMetadata(existing.metadata, assignment.metadata),
          existing,
        );
        const changes = this.buildCreatorSnapshotChanges(existing, snapshot);

        const newMetadata = appendSnapshotAudit(
          snapshot.metadata,
          changes,
          actorExtId,
          assignment.overrideReason,
        );

        await this.showCreatorRepository.restoreAndUpdateAssignment(existing.id, {
          note: assignment.note ?? null,
          agreedRate: snapshot.agreedRate,
          compensationType: snapshot.compensationType,
          commissionRate: snapshot.commissionRate,
          metadata: newMetadata,
        });
      } else {
        const snapshot = this.resolveCreatorSnapshot(assignment, undefined, assignment.metadata);

        await this.showCreatorRepository.createAssignment({
          uid: this.showCreatorService.generateShowCreatorUid(),
          showId,
          creatorId: internalCreatorId,
          note: assignment.note ?? null,
          agreedRate: snapshot.agreedRate,
          compensationType: snapshot.compensationType,
          commissionRate: snapshot.commissionRate,
          metadata: snapshot.metadata,
        });
      }
    }

    const toDelete = existingAssignments.filter(
      (a) => !processedCreatorIds.has(a.creatorId) && a.deletedAt === null,
    );
    for (const assignment of toDelete) {
      await this.showCreatorRepository.softDelete({ id: assignment.id });
    }
  }

  private async removeShowCreatorAssignmentsByUids(
    showId: bigint,
    creatorUids: string[],
  ): Promise<void> {
    const creators = await this.creatorRepository.findByUids(creatorUids);
    const internalCreatorIds = creators.map((creator) => creator.id);
    await this.showCreatorRepository.softDeleteByCreatorIds(showId, internalCreatorIds);
  }

  private resolveCreatorSnapshot(
    assignment: CreatorAssignmentPayload,
    defaults: StudioCreatorSnapshotDefaults | undefined,
    metadata: unknown,
    current?: {
      agreedRate: unknown | null;
      compensationType: string | null;
      commissionRate: unknown | null;
    },
  ): ResolvedCreatorSnapshot {
    const compensationType = assignment.compensationType !== undefined
      ? assignment.compensationType
      : current?.compensationType ?? defaults?.defaultRateType ?? null;
    const agreedRate = assignment.agreedRate !== undefined
      ? assignment.agreedRate
      : decimalLikeToString(current?.agreedRate ?? defaults?.defaultRate ?? null);
    const commissionRate = assignment.commissionRate !== undefined
      ? assignment.commissionRate
      : decimalLikeToString(current?.commissionRate ?? defaults?.defaultCommissionRate ?? null);
    const resolvedMetadata = this.withAgreementSnapshotFlag(
      this.toMetadataObject(metadata),
      isCreatorSnapshotMissing(compensationType, agreedRate, commissionRate),
    );

    return {
      agreedRate,
      compensationType,
      commissionRate,
      metadata: resolvedMetadata,
    };
  }

  private buildCreatorSnapshotChanges(
    current: {
      agreedRate: unknown | null;
      compensationType: string | null;
      commissionRate: unknown | null;
    },
    next: ResolvedCreatorSnapshot,
  ): SnapshotChange[] {
    const changes: SnapshotChange[] = [];
    if (!isSnapshotValueEqual(current.agreedRate, next.agreedRate)) {
      changes.push({ field: 'agreed_rate', old_value: current.agreedRate, new_value: next.agreedRate });
    }
    if (!isSnapshotValueEqual(current.compensationType, next.compensationType)) {
      changes.push({ field: 'compensation_type', old_value: current.compensationType, new_value: next.compensationType });
    }
    if (!isSnapshotValueEqual(current.commissionRate, next.commissionRate)) {
      changes.push({ field: 'commission_rate', old_value: current.commissionRate, new_value: next.commissionRate });
    }
    return changes;
  }

  private assertCreatorSnapshotInvariants(snapshot: ResolvedCreatorSnapshot): void {
    if (
      (snapshot.compensationType === CREATOR_COMPENSATION_TYPE.FIXED || snapshot.compensationType === null)
      && snapshot.commissionRate !== null
    ) {
      throw HttpError.badRequest(
        snapshot.compensationType === null
          ? 'commission_rate must be null when compensation_type is null'
          : 'commission_rate must be null when compensation_type is FIXED',
      );
    }
  }

  private withAgreementSnapshotFlag(
    metadata: Record<string, unknown>,
    isMissing: boolean,
  ): Record<string, unknown> {
    const flags = this.toMetadataObject(metadata.flags);
    return {
      ...metadata,
      flags: {
        ...flags,
        agreement_snapshot_missing: isMissing,
      },
    };
  }

  private mergeMetadata(
    existing: unknown,
    incoming: unknown,
  ): Record<string, unknown> {
    return {
      ...this.toMetadataObject(existing),
      ...this.toMetadataObject(incoming),
    };
  }

  private toMetadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private resolveCreatorAssignmentErrorReason(error: unknown): string {
    if (this.isPrismaKnownRequestError(error)) {
      return 'Database error while assigning creator';
    }
    return 'Failed to assign creator';
  }

  private isPrismaKnownRequestError(error: unknown): error is { code: string } {
    return (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && typeof (error as { code?: unknown }).code === 'string'
    );
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return this.isPrismaKnownRequestError(error) && error.code === PRISMA_ERROR.UniqueConstraint;
  }
}
