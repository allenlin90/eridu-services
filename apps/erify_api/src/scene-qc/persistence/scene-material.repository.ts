import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, SceneMaterial, SceneMaterialRevision, SceneQcStatus } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';

type ListSceneMaterialsParams = {
  clientUid: string;
  search?: string;
  status?: SceneQcStatus;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  sort?: 'asc' | 'desc';
};

export const sceneMaterialDefaultInclude = {
  client: { select: { uid: true } },
  // The service/DTO layer only ever needs the latest revision (see
  // `sceneMaterialSchema` in `schemas/scene-material.schema.ts`); scoping the
  // include to `take: 1` avoids hydrating full revision history on every read.
  revisions: {
    orderBy: { revision: 'desc' },
    take: 1,
    include: { createdBy: { select: { uid: true } } },
  },
} satisfies Prisma.SceneMaterialInclude;

type SceneMaterialWithDefaultInclude = Prisma.SceneMaterialGetPayload<{
  include: typeof sceneMaterialDefaultInclude;
}>;

@Injectable()
export class SceneMaterialRepository extends BaseRepository<
  SceneMaterial,
  Prisma.SceneMaterialCreateInput,
  Prisma.SceneMaterialUpdateInput,
  Prisma.SceneMaterialWhereInput
> {
  constructor(private readonly txHost: TransactionHost<TransactionalAdapterPrisma>) {
    super(new PrismaModelWrapper(() => txHost.tx.sceneMaterial));
  }

  /**
   * Finds a material by UID scoped to its owning Client. Returns `null` when
   * the material does not exist or belongs to a different Client.
   *
   * Engineering decision: canonical Client-scoped unique lookup reused by
   * `getMaterial` / `updateMaterial` / the version-conflict re-fetch, and it
   * returns the `include`-typed payload the response DTO needs (mirrors
   * `ClientMechanicRepository.findByUidForClient`).
   */
  async findByUidForClient(params: {
    uid: string;
    clientUid: string;
  }): Promise<SceneMaterialWithDefaultInclude | null> {
    return this.model.findFirst({
      where: {
        uid: params.uid,
        client: { uid: params.clientUid, deletedAt: null },
        deletedAt: null,
      },
      include: sceneMaterialDefaultInclude,
    }) as Promise<SceneMaterialWithDefaultInclude | null>;
  }

  /**
   * Lists a Client's materials with pagination, status filter, and a
   * free-text search across name / UID.
   *
   * Engineering decision: non-trivial where building (multi-field `OR`
   * search + status + Client scope) plus the paired data/count `Promise.all`.
   */
  async findPaginated(
    params: ListSceneMaterialsParams,
  ): Promise<{ data: SceneMaterialWithDefaultInclude[]; total: number }> {
    const { clientUid, search, status, includeDeleted, skip, take, sort = 'desc' } = params;

    const where: Prisma.SceneMaterialWhereInput = {
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

    const orderBy: Prisma.SceneMaterialOrderByWithRelationInput[] = [
      { createdAt: sort },
      { id: sort },
    ];

    const [data, total] = await Promise.all([
      this.model.findMany({ where, skip, take, orderBy, include: sceneMaterialDefaultInclude }),
      this.model.count({ where }),
    ]);

    return { data: data as SceneMaterialWithDefaultInclude[], total };
  }

  /**
   * Updates a material guarding the optimistic-lock `version`. Throws
   * `VersionConflictError` when the row exists but the version is stale.
   *
   * Engineering decision: multi-step optimistic-lock op — version-guarded
   * update, then on `RecordNotFound` a re-fetch to distinguish "stale
   * version" (409) from "genuinely gone" (404). Mirrors
   * `ClientMechanicRepository.updateWithVersionCheck`.
   */
  async updateWithVersionCheck(
    params: { uid: string; clientUid: string; version: number },
    data: Prisma.SceneMaterialUpdateInput,
  ): Promise<SceneMaterialWithDefaultInclude> {
    const { uid, clientUid, version } = params;

    try {
      return await this.txHost.tx.sceneMaterial.update({
        where: {
          uid,
          version,
          client: { uid: clientUid, deletedAt: null },
          deletedAt: null,
        },
        data,
        include: sceneMaterialDefaultInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === PRISMA_ERROR.RecordNotFound
      ) {
        const existing = await this.findByUidForClient({ uid, clientUid });
        if (existing) {
          throw new VersionConflictError('Scene material version is outdated', version, existing.version);
        }
      }
      throw error;
    }
  }

  /**
   * Appends an immutable revision, reading `MAX(revision)` for the material
   * inside the ambient transaction and inserting `revision + 1`. Never
   * overwrites an earlier object reference (SCENE_QC_IMPLEMENTATION_PLAN §5.1).
   *
   * Engineering decision: multi-step append (aggregate + create) that must
   * observe uncommitted writes from the same transaction — cannot be a plain
   * `create`.
   */
  async appendRevision(params: {
    uid: string;
    materialId: bigint;
    objectKey: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    createdById?: bigint;
  }): Promise<SceneMaterialRevision> {
    const { uid, materialId, objectKey, fileUrl, mimeType, fileSize, createdById } = params;

    const latest = await this.txHost.tx.sceneMaterialRevision.aggregate({
      where: { materialId },
      _max: { revision: true },
    });
    const nextRevision = (latest._max.revision ?? 0) + 1;

    return this.txHost.tx.sceneMaterialRevision.create({
      data: {
        uid,
        materialId,
        revision: nextRevision,
        objectKey,
        fileUrl,
        mimeType,
        fileSize,
        ...(createdById !== undefined && { createdById }),
      },
    });
  }

  /**
   * Resolves material-revision UIDs to their `(id, materialId, revision)`,
   * scoped to `clientId`. A caller compares the returned row count to the
   * requested UID count to detect a cross-Client composition attempt
   * (SCENE_QC_IMPLEMENTATION_PLAN §5.2) — enforced in the service, not a DB
   * CHECK.
   *
   * Engineering decision: the cross-Client guard requires joining through
   * `material.clientId`, which a plain `findMany` cannot express as a
   * reusable named lookup.
   */
  async findRevisionsForClient(params: {
    clientId: bigint;
    revisionUids: string[];
  }): Promise<{ id: bigint; uid: string; materialId: bigint; materialName: string; revision: number }[]> {
    const rows = await this.txHost.tx.sceneMaterialRevision.findMany({
      where: {
        uid: { in: params.revisionUids },
        material: { clientId: params.clientId, deletedAt: null },
      },
      select: {
        id: true,
        uid: true,
        materialId: true,
        revision: true,
        // Backs the composition-save default label ("copy the material name
        // at composition time" — SCENE_QC_IMPLEMENTATION_PLAN.md §5.2).
        material: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      uid: row.uid,
      materialId: row.materialId,
      revision: row.revision,
      materialName: row.material.name,
    }));
  }

  /**
   * Resolves a User UID to its internal id for the revision's optional
   * `created_by_id` provenance. A simple bounded cross-table lookup (not a
   * User capability concern) — mirrors `SceneProfileRepository.resolveStudioIds`.
   */
  async resolveUserId(userUid: string): Promise<bigint | undefined> {
    const user = await this.txHost.tx.user.findFirst({
      where: { uid: userUid, deletedAt: null },
      select: { id: true },
    });
    return user?.id;
  }
}
