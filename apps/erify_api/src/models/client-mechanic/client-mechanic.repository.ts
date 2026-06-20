import { Injectable } from '@nestjs/common';
import { ClientMechanic, Prisma } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { FINALIZED_LOOP_TASK_STATUSES } from '@/models/task/task-finalized-loop.constants';
import { PrismaService } from '@/prisma/prisma.service';

type ListClientMechanicsParams = {
  clientUid: string;
  search?: string;
  status?: string;
  includeDeleted?: boolean;
  skip?: number;
  take?: number;
  sort?: 'asc' | 'desc';
};

export const clientMechanicDefaultInclude = {
  client: { select: { uid: true } },
} satisfies Prisma.ClientMechanicInclude;

@Injectable()
export class ClientMechanicRepository extends BaseRepository<
  ClientMechanic,
  Prisma.ClientMechanicCreateInput,
  Prisma.ClientMechanicUpdateInput,
  Prisma.ClientMechanicWhereInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(new PrismaModelWrapper(prisma.clientMechanic));
  }

  /**
   * Finds a mechanic by UID scoped to its owning client. Returns `null` when the
   * mechanic does not exist or belongs to a different client.
   *
   * Engineering decision: not a thin `findMany` wrapper — it is the canonical
   * client-scoped unique lookup reused by `getMechanic` / `updateMechanic` /
   * `retireMechanic` and the version-conflict re-fetch, and it returns the
   * `include`-typed payload (`client.uid`) the response DTO needs. Centralising
   * the scope + include here keeps the three callers from re-deriving it.
   */
  async findByUidForClient(params: {
    uid: string;
    clientUid: string;
  }): Promise<Prisma.ClientMechanicGetPayload<{ include: typeof clientMechanicDefaultInclude }> | null> {
    return this.model.findFirst({
      where: {
        uid: params.uid,
        client: { uid: params.clientUid, deletedAt: null },
        deletedAt: null,
      },
      include: clientMechanicDefaultInclude,
    }) as Promise<Prisma.ClientMechanicGetPayload<{ include: typeof clientMechanicDefaultInclude }> | null>;
  }

  /**
   * Lists a client's mechanics with pagination, status filter, and a free-text
   * search across title / instruction label / UID.
   *
   * Engineering decision: non-trivial where building (multi-field `OR` search +
   * status + client scope) plus the paired data/count `Promise.all` — cannot be
   * a plain `findMany({ where })` call from the service.
   */
  async findPaginated(
    params: ListClientMechanicsParams,
  ): Promise<{ data: ClientMechanic[]; total: number }> {
    const { clientUid, search, status, includeDeleted, skip, take, sort = 'desc' } = params;

    const where: Prisma.ClientMechanicWhereInput = {
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
        { title: { contains: search, mode: 'insensitive' } },
        { instructionLabel: { contains: search, mode: 'insensitive' } },
        { uid: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ClientMechanicOrderByWithRelationInput[] = [
      { createdAt: sort },
      { uid: 'asc' },
    ];

    const [data, total] = await Promise.all([
      this.model.findMany({ where, skip, take, orderBy, include: clientMechanicDefaultInclude }),
      this.model.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Updates a mechanic guarding the optimistic-lock `version`. Throws
   * `VersionConflictError` (domain error) when the row exists but the version is
   * stale; the service maps it to a 409.
   *
   * Engineering decision: multi-step optimistic-lock op — version-guarded update,
   * then on `RecordNotFound` a re-fetch to distinguish "stale version" (409) from
   * "genuinely gone" (404). Mirrors `task-template.repository`; not a `findMany`.
   */
  async updateWithVersionCheck(
    params: { uid: string; clientUid: string; version: number },
    data: Prisma.ClientMechanicUpdateInput,
  ): Promise<ClientMechanic> {
    const { uid, clientUid, version } = params;

    try {
      return await this.prisma.clientMechanic.update({
        where: {
          uid,
          version,
          client: { uid: clientUid, deletedAt: null },
          deletedAt: null,
        },
        data,
        include: clientMechanicDefaultInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === PRISMA_ERROR.RecordNotFound
      ) {
        const existing = await this.findByUidForClient({ uid, clientUid });
        if (existing) {
          throw new VersionConflictError(
            'Client mechanic version is outdated',
            version,
            existing.version,
          );
        }
      }
      throw error;
    }
  }

  async findTemplatesByMechanic(mechanicId: bigint) {
    return this.prisma.taskTemplateMechanicRef.findMany({
      where: { mechanicId },
      select: {
        templateId: true,
        snapshotId: true,
        template: {
          select: {
            uid: true,
            name: true,
          },
        },
      },
    });
  }

  // Coverage answers "is this mechanic reaching MY target shows" (per the
  // design doc) — scoped to the requesting studio's own shows, not every show
  // the client runs across other studios.
  async findShowsForCoverage(studioUid: string, clientUid: string, startDate: Date, endDate: Date) {
    return this.prisma.show.findMany({
      where: {
        studio: { uid: studioUid },
        client: { uid: clientUid },
        startTime: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        name: true,
        startTime: true,
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // Reuses PR 22.1's "latest finalized task with a loop schema wins" selection
  // rule (FINALIZED_LOOP_TASK_STATUSES) — coverage also needs the template
  // relation StudioPerformanceRepository doesn't load, hence a separate query.
  async findFinalizedLoopTasksForShows(showIds: bigint[]) {
    return this.prisma.task.findMany({
      where: {
        targets: { some: { showId: { in: showIds }, deletedAt: null } },
        status: { in: [...FINALIZED_LOOP_TASK_STATUSES] },
        deletedAt: null,
      },
      include: {
        snapshot: true,
        template: {
          select: {
            uid: true,
            name: true,
          },
        },
        targets: { where: { deletedAt: null }, select: { showId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findTemplateRefsForTemplatesAndSnapshots(templateIds: bigint[], snapshotIds: bigint[]) {
    return this.prisma.taskTemplateMechanicRef.findMany({
      where: {
        OR: [
          { templateId: { in: templateIds }, snapshotId: null },
          { snapshotId: { in: snapshotIds } },
        ],
      },
      select: {
        templateId: true,
        snapshotId: true,
        mechanicId: true,
        mechanic: {
          select: {
            uid: true,
            contentRevision: true,
          },
        },
      },
    });
  }

  async findShowForCoverageDetail(studioUid: string, showUid: string) {
    return this.prisma.show.findFirst({
      where: {
        uid: showUid,
        studio: { uid: studioUid },
        deletedAt: null,
      },
      select: {
        id: true,
        uid: true,
        name: true,
        clientId: true,
        client: {
          select: {
            uid: true,
            name: true,
          },
        },
      },
    });
  }

  async findTemplateRefsForShowCoverage(templateId: bigint, snapshotId: bigint) {
    return this.prisma.taskTemplateMechanicRef.findMany({
      where: {
        OR: [
          { templateId, snapshotId: null },
          { snapshotId },
        ],
      },
      include: {
        mechanic: {
          select: {
            id: true,
            uid: true,
            title: true,
            instructionLabel: true,
            instructionBody: true,
            status: true,
            contentRevision: true,
          },
        },
      },
    });
  }
}
