import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, SceneProfileAssignment } from '@prisma/client';

import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';

export const sceneProfileAssignmentDefaultInclude = {
  show: { select: { uid: true } },
  profile: { select: { uid: true } },
} satisfies Prisma.SceneProfileAssignmentInclude;

type SceneProfileAssignmentWithDefaultInclude = Prisma.SceneProfileAssignmentGetPayload<{
  include: typeof sceneProfileAssignmentDefaultInclude;
}>;

@Injectable()
export class SceneProfileAssignmentRepository extends BaseRepository<
  SceneProfileAssignment,
  Prisma.SceneProfileAssignmentCreateInput,
  Prisma.SceneProfileAssignmentUpdateInput,
  Prisma.SceneProfileAssignmentWhereInput
> {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {
    super(new PrismaModelWrapper(() => txHost.tx.sceneProfileAssignment));
  }

  /** The Show's active, non-deleted assignment, if any (by internal id). */
  async findActiveByShowId(showId: bigint): Promise<SceneProfileAssignmentWithDefaultInclude | null> {
    return this.txHost.tx.sceneProfileAssignment.findFirst({
      where: { showId, deletedAt: null },
      include: sceneProfileAssignmentDefaultInclude,
    });
  }

  /** The Show's active, non-deleted assignment, if any (by UID). */
  async findActiveByShowUid(showUid: string): Promise<SceneProfileAssignmentWithDefaultInclude | null> {
    return this.txHost.tx.sceneProfileAssignment.findFirst({
      where: { show: { uid: showUid }, deletedAt: null },
      include: sceneProfileAssignmentDefaultInclude,
    });
  }

  /**
   * Creates or revives the Show's single active assignment. The partial
   * unique index `scene_profile_assignments_show_id_active_key`
   * (`WHERE deleted_at IS NULL`) means a previously-unassigned Show already
   * has a soft-deleted row for the same `show_id`; this revives it
   * (`deletedAt = null`, `version + 1`) instead of inserting a duplicate row
   * and orphaning history.
   *
   * `expectedVersion` guards a re-assignment of an already-active assignment
   * against a concurrent edit; omit it when there is no active row to
   * conflict with (fresh assignment or reviving a soft-deleted one).
   */
  async upsertActiveAssignment(params: {
    uid: string;
    showId: bigint;
    profileId: bigint;
    expectedVersion?: number;
  }): Promise<SceneProfileAssignmentWithDefaultInclude> {
    const { uid, showId, profileId, expectedVersion } = params;

    const existing = await this.txHost.tx.sceneProfileAssignment.findFirst({
      where: { showId },
      orderBy: { id: 'desc' },
    });

    if (!existing) {
      return this.txHost.tx.sceneProfileAssignment.create({
        data: { uid, showId, profileId },
        include: sceneProfileAssignmentDefaultInclude,
      });
    }

    if (
      existing.deletedAt === null
      && expectedVersion !== undefined
      && existing.version !== expectedVersion
    ) {
      throw new VersionConflictError(
        'Scene profile assignment version is outdated',
        expectedVersion,
        existing.version,
      );
    }

    return this.txHost.tx.sceneProfileAssignment.update({
      where: { id: existing.id },
      data: { profileId, deletedAt: null, version: existing.version + 1 },
      include: sceneProfileAssignmentDefaultInclude,
    });
  }

  /**
   * Soft-deletes the Show's active assignment, guarding the optimistic-lock
   * `version`. Returns `null` when no active assignment exists (404) and
   * throws `VersionConflictError` when one exists but the version is stale
   * (409).
   *
   * Engineering decision: `showId` is not itself a Prisma-unique field (the
   * one-active-row rule is a partial unique index Prisma cannot express), so
   * this uses `updateMany` + a count check rather than a unique-keyed
   * `update`, matching the documented conflict-probe requirement that the
   * check understand every supported `where` shape.
   */
  async softDeleteWithVersionCheck(params: {
    showId: bigint;
    version: number;
  }): Promise<SceneProfileAssignmentWithDefaultInclude | null> {
    const { showId, version } = params;

    const result = await this.txHost.tx.sceneProfileAssignment.updateMany({
      where: { showId, version, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });

    if (result.count === 1) {
      return this.txHost.tx.sceneProfileAssignment.findFirst({
        where: { showId, deletedAt: { not: null } },
        orderBy: { id: 'desc' },
        include: sceneProfileAssignmentDefaultInclude,
      });
    }

    const existing = await this.txHost.tx.sceneProfileAssignment.findFirst({
      where: { showId, deletedAt: null },
    });

    if (existing) {
      throw new VersionConflictError('Scene profile assignment version is outdated', version, existing.version);
    }

    return null;
  }

  /**
   * Resolves a Show UID to the minimal identity `assignProfileToShow` needs
   * (internal id plus its owning Client's uid, to scope the profile lookup
   * to the same Client). A simple bounded cross-table lookup, mirroring
   * `SceneProfileRepository.resolveStudioIds` — not a Show capability
   * concern.
   */
  async findShowForAssignment(
    showUid: string,
  ): Promise<{ id: bigint; uid: string; clientId: bigint; clientUid: string } | null> {
    const show = await this.txHost.tx.show.findFirst({
      where: { uid: showUid, deletedAt: null },
      select: { id: true, uid: true, clientId: true, client: { select: { uid: true } } },
    });

    if (!show) {
      return null;
    }

    return { id: show.id, uid: show.uid, clientId: show.clientId, clientUid: show.client.uid };
  }
}
