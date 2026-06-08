import { Injectable } from '@nestjs/common';
import { ClientMechanic, Prisma } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';
import { VersionConflictError } from '@/lib/errors/version-conflict.error';
import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
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
      where: { uid: params.uid, client: { uid: params.clientUid }, deletedAt: null },
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
        where: { uid, version, client: { uid: clientUid }, deletedAt: null },
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
}
