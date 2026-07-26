import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, SceneProfile, SceneProfileRevision, SceneQcStatus, SceneType } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';

type ListSceneProfilesParams = {
  clientUid: string;
  search?: string;
  status?: SceneQcStatus;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  sort?: 'asc' | 'desc';
};

export const sceneProfileDefaultInclude = {
  client: { select: { uid: true } },
  // The service/DTO layer only ever needs the current (latest) revision (see
  // `sceneProfileSchema` in `schemas/scene-profile.schema.ts`).
  revisions: {
    orderBy: { revision: 'desc' },
    take: 1,
    include: {
      createdBy: { select: { uid: true } },
      materials: {
        orderBy: { sortOrder: 'asc' },
        include: {
          materialRevision: { include: { material: { select: { uid: true } } } },
          // `id` is needed (alongside `uid`) so `resolveProfileForShow` can run
          // `selectApplicableMaterials` against the Show's internal bigint ids
          // without a second round-trip.
          studio: { select: { id: true, uid: true } },
          platform: { select: { id: true, uid: true } },
        },
      },
    },
  },
} satisfies Prisma.SceneProfileInclude;

type SceneProfileWithDefaultInclude = Prisma.SceneProfileGetPayload<{
  include: typeof sceneProfileDefaultInclude;
}>;

@Injectable()
export class SceneProfileRepository extends BaseRepository<
  SceneProfile,
  Prisma.SceneProfileCreateInput,
  Prisma.SceneProfileUpdateInput,
  Prisma.SceneProfileWhereInput
> {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {
    super(new PrismaModelWrapper(() => txHost.tx.sceneProfile));
  }

  /**
   * Finds a profile by UID scoped to its owning Client. Returns `null` when
   * the profile does not exist or belongs to a different Client. Mirrors
   * `SceneMaterialRepository.findByUidForClient`.
   */
  async findByUidForClient(params: {
    uid: string;
    clientUid: string;
  }): Promise<SceneProfileWithDefaultInclude | null> {
    return this.model.findFirst({
      where: {
        uid: params.uid,
        client: { uid: params.clientUid, deletedAt: null },
        deletedAt: null,
      },
      include: sceneProfileDefaultInclude,
    }) as Promise<SceneProfileWithDefaultInclude | null>;
  }

  /**
   * Lists a Client's profiles with pagination, status filter, and a
   * free-text search across name / UID.
   */
  async findPaginated(
    params: ListSceneProfilesParams,
  ): Promise<{ data: SceneProfileWithDefaultInclude[]; total: number }> {
    const { clientUid, search, status, includeDeleted, skip, take, sort = 'desc' } = params;

    const where: Prisma.SceneProfileWhereInput = {
      client: { uid: clientUid },
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { uid: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.SceneProfileOrderByWithRelationInput[] = [
      { createdAt: sort },
      { id: sort },
    ];

    const [data, total] = await Promise.all([
      this.model.findMany({ where, skip, take, orderBy, include: sceneProfileDefaultInclude }),
      this.model.count({ where }),
    ]);

    return { data: data as SceneProfileWithDefaultInclude[], total };
  }

  /**
   * Updates a profile guarding the optimistic-lock `version`. Throws
   * `VersionConflictError` when the row exists but the version is stale.
   */
  async updateWithVersionCheck(
    params: { uid: string; clientUid: string; version: number },
    data: Prisma.SceneProfileUpdateInput,
  ): Promise<SceneProfileWithDefaultInclude> {
    const { uid, clientUid, version } = params;

    try {
      return await this.txHost.tx.sceneProfile.update({
        where: {
          uid,
          version,
          client: { uid: clientUid, deletedAt: null },
          deletedAt: null,
        },
        data,
        include: sceneProfileDefaultInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === PRISMA_ERROR.RecordNotFound
      ) {
        const existing = await this.findByUidForClient({ uid, clientUid });
        if (existing) {
          throw new VersionConflictError('Scene profile version is outdated', version, existing.version);
        }
      }
      throw error;
    }
  }

  /**
   * The Client's single active, non-deleted default profile, if any. The
   * partial unique index `scene_profiles_client_id_default_active_key`
   * (migration custom SQL) guarantees at most one row matches.
   */
  async findActiveDefaultForClient(clientId: bigint): Promise<SceneProfileWithDefaultInclude | null> {
    return this.txHost.tx.sceneProfile.findFirst({
      where: { clientId, status: 'ACTIVE', isDefault: true, deletedAt: null },
      include: sceneProfileDefaultInclude,
    });
  }

  /**
   * The Show's active, non-deleted explicit profile assignment target, only
   * when the assigned profile is itself active and non-deleted (a retired or
   * deleted profile does not silently keep winning resolution — see
   * `repository-pattern-nestjs` "Relation Filters Must Respect Soft-Deleted
   * Join Rows").
   */
  async findActiveAssignedProfileForShow(showId: bigint): Promise<SceneProfileWithDefaultInclude | null> {
    const assignment = await this.txHost.tx.sceneProfileAssignment.findFirst({
      where: {
        showId,
        deletedAt: null,
        profile: { status: 'ACTIVE', deletedAt: null },
      },
      include: { profile: { include: sceneProfileDefaultInclude } },
    });

    return assignment?.profile ?? null;
  }

  /**
   * Appends an immutable composition revision plus its ordered material
   * links, reading `MAX(revision)` inside the ambient transaction.
   *
   * Engineering decision: multi-row append (revision insert + bulk link
   * `createMany`) that must observe uncommitted writes from the same
   * transaction — cannot be a plain `create`.
   */
  async appendRevision(params: {
    uid: string;
    profileId: bigint;
    profileName: string;
    profileDescription: string | null;
    sceneType: SceneType;
    createdById?: bigint;
    materials: {
      materialRevisionId: bigint;
      sortOrder: number;
      studioId?: bigint;
      platformId?: bigint;
      label: string;
    }[];
  }): Promise<SceneProfileRevision> {
    const { uid, profileId, profileName, profileDescription, sceneType, createdById, materials } = params;

    const latest = await this.txHost.tx.sceneProfileRevision.aggregate({
      where: { profileId },
      _max: { revision: true },
    });
    const nextRevision = (latest._max.revision ?? 0) + 1;

    const revision = await this.txHost.tx.sceneProfileRevision.create({
      data: {
        uid,
        profileId,
        revision: nextRevision,
        profileName,
        profileDescription,
        sceneType,
        ...(createdById !== undefined && { createdById }),
      },
    });

    if (materials.length > 0) {
      await this.txHost.tx.sceneProfileRevisionMaterial.createMany({
        data: materials.map((material) => ({
          profileRevisionId: revision.id,
          materialRevisionId: material.materialRevisionId,
          sortOrder: material.sortOrder,
          studioId: material.studioId ?? null,
          platformId: material.platformId ?? null,
          label: material.label,
        })),
      });
    }

    return revision;
  }

  /**
   * Serializes concurrent default-profile writes for one Client behind a
   * transaction-scoped advisory lock (auto-releases on commit/rollback), so
   * two concurrent "set as default" calls cannot both observe "no current
   * default" and leave two active defaults (SCENE_QC_IMPLEMENTATION_PLAN §5.2).
   * `hashtextextended` avoids reserving a numeric lock-key range for an
   * identity that has no single-row PK to lock directly.
   */
  async acquireClientDefaultLock(clientId: bigint): Promise<void> {
    const key = `scene-qc-client-default:${clientId}`;
    await this.txHost.tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
  }

  /**
   * Clears `isDefault` on every other active, non-deleted default for the
   * Client. Call only while holding `acquireClientDefaultLock`.
   */
  async clearActiveDefaultForClient(clientId: bigint, exceptProfileId?: bigint): Promise<void> {
    await this.txHost.tx.sceneProfile.updateMany({
      where: {
        clientId,
        status: 'ACTIVE',
        isDefault: true,
        deletedAt: null,
        ...(exceptProfileId !== undefined && { id: { not: exceptProfileId } }),
      },
      data: { isDefault: false },
    });
  }

  /**
   * Resolves Studio UIDs to internal ids for composition-save applicability
   * scoping. A simple bounded cross-table lookup (not a Studio capability
   * concern) — mirrors `ClientMechanicRepository`'s direct `Show` reads.
   */
  async resolveStudioIds(studioUids: string[]): Promise<Map<string, bigint>> {
    if (studioUids.length === 0) {
      return new Map();
    }
    const rows = await this.txHost.tx.studio.findMany({
      where: { uid: { in: studioUids }, deletedAt: null },
      select: { id: true, uid: true },
    });
    return new Map(rows.map((row) => [row.uid, row.id]));
  }

  /**
   * Resolves Platform UIDs to internal ids for composition-save applicability
   * scoping. See `resolveStudioIds`.
   */
  async resolvePlatformIds(platformUids: string[]): Promise<Map<string, bigint>> {
    if (platformUids.length === 0) {
      return new Map();
    }
    const rows = await this.txHost.tx.platform.findMany({
      where: { uid: { in: platformUids }, deletedAt: null },
      select: { id: true, uid: true },
    });
    return new Map(rows.map((row) => [row.uid, row.id]));
  }

  /**
   * Resolves a User UID to its internal id for a revision's optional
   * `created_by_id` provenance. See `SceneMaterialRepository.resolveUserId`.
   */
  async resolveUserId(userUid: string): Promise<bigint | undefined> {
    const user = await this.txHost.tx.user.findFirst({
      where: { uid: userUid, deletedAt: null },
      select: { id: true },
    });
    return user?.id;
  }
}
