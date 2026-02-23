import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { Prisma, Show } from '@prisma/client';

import { BaseRepository, PrismaModelWrapper } from '@/lib/repositories/base.repository';
import { ListShowsQueryDto } from '@/models/show/schemas/show.schema';
import { PrismaService } from '@/prisma/prisma.service';

// Custom model wrapper that implements IBaseModel with ShowWhereInput

@Injectable()
export class ShowRepository extends BaseRepository<
  Show,
  Prisma.ShowCreateInput,
  Prisma.ShowUpdateInput,
  Prisma.ShowWhereInput
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
  ) {
    super(new PrismaModelWrapper(prisma.show));
  }

  private get delegate() {
    return this.txHost.tx.show;
  }

  async findByUid<T extends Prisma.ShowInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Prisma.ShowGetPayload<{ include: T }> | null> {
    return this.delegate.findFirst({
      where: { uid, deletedAt: null },
      ...(include && { include }),
    }) as Promise<Prisma.ShowGetPayload<{ include: T }> | null>;
  }

  async findByName(name: string): Promise<Show | null> {
    return this.delegate.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findActiveShows(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ShowWhereInput;
    orderBy?: Prisma.ShowOrderByWithRelationInput;
    include?: Prisma.ShowInclude;
  }): Promise<Show[]> {
    const { skip, take, where, orderBy, include } = params;
    return this.delegate.findMany({
      where: { ...where, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByClient(
    clientId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.delegate.findMany({
      where: { clientId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByStudioRoom(
    studioRoomId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.delegate.findMany({
      where: { studioRoomId, deletedAt: null },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findShowsByDateRange(
    startDate: Date,
    endDate: Date,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    const { skip, take, orderBy, include } = params || {};
    return this.delegate.findMany({
      where: {
        deletedAt: null,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      skip,
      take,
      orderBy,
      ...(include && { include }),
    });
  }

  async findPaginated(
    query: ListShowsQueryDto,
    include?: Prisma.ShowInclude,
  ): Promise<{ data: Show[]; total: number }> {
    const where = this.buildWhereClause(query);
    const orderBy = this.buildOrderByClause(query);
    const delegate = this.delegate;

    const [data, total] = await Promise.all([
      delegate.findMany({
        skip: query.skip,
        take: query.take,
        where,
        orderBy,
        include,
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  private buildWhereClause(query: ListShowsQueryDto): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {};

    // Filter out soft deleted records by default
    if (!query.include_deleted) {
      where.deletedAt = null;
    }

    // Name filtering
    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    // UID filtering
    if (query.uid) {
      where.uid = {
        contains: query.uid,
        mode: 'insensitive',
      };
    }

    // Client filtering (ID)
    if (query.client_id) {
      const clientIds = Array.isArray(query.client_id)
        ? query.client_id
        : [query.client_id];
      where.client = {
        uid: { in: clientIds },
        deletedAt: null,
      };
    }

    // Client filtering (Name)
    if (query.client_name) {
      where.client = {
        ...((where.client as Prisma.ClientWhereInput) || {}),
        name: {
          contains: query.client_name,
          mode: 'insensitive',
        },
      };
    }

    // MC filtering (Name)
    if (query.mc_name) {
      where.showMCs = {
        some: {
          mc: {
            name: {
              contains: query.mc_name,
              mode: 'insensitive',
            },
          },
          deletedAt: null,
        },
      };
    }

    // Date range filtering for start time
    if (query.start_date_from || query.start_date_to) {
      where.startTime = {};
      if (query.start_date_from) {
        where.startTime.gte = new Date(query.start_date_from);
      }
      if (query.start_date_to) {
        const endDate = new Date(query.start_date_to);
        endDate.setHours(23, 59, 59, 999);
        where.startTime.lte = endDate;
      }
    }

    // Date range filtering for end time
    if (query.end_date_from || query.end_date_to) {
      where.endTime = {};
      if (query.end_date_from) {
        where.endTime.gte = new Date(query.end_date_from);
      }
      if (query.end_date_to) {
        const endDate = new Date(query.end_date_to);
        endDate.setHours(23, 59, 59, 999);
        where.endTime.lte = endDate;
      }
    }

    if (query.show_standard_name) {
      where.showStandard = {
        name: {
          contains: query.show_standard_name,
          mode: 'insensitive',
        },
      };
    }

    if (query.show_status_name) {
      where.showStatus = {
        name: {
          contains: query.show_status_name,
          mode: 'insensitive',
        },
      };
    }

    if (query.platform_name) {
      where.showPlatforms = {
        some: {
          platform: {
            name: {
              contains: query.platform_name,
              mode: 'insensitive',
            },
          },
        },
      };
    }

    return where;
  }

  async findMany(params: {
    where?: Prisma.ShowWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowOrderByWithRelationInput;
    include?: Prisma.ShowInclude;
  }): Promise<Show[]> {
    return this.delegate.findMany(params);
  }

  private buildOrderByClause(
    query: Pick<ListShowsQueryDto, 'order_by' | 'order_direction'>,
  ): Prisma.ShowOrderByWithRelationInput {
    const fieldMap: Record<string, keyof Prisma.ShowOrderByWithRelationInput>
      = {
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        start_time: 'startTime',
        end_time: 'endTime',
      };
    const field = fieldMap[query.order_by] || 'createdAt';
    return { [field]: query.order_direction };
  }

  async create(data: Prisma.ShowCreateInput, include?: Record<string, any>): Promise<Show> {
    return this.delegate.create({ data, ...(include && { include }) });
  }

  async update(
    where: Prisma.ShowWhereUniqueInput,
    data: Prisma.ShowUpdateInput,
    include?: Prisma.ShowInclude,
  ): Promise<Show> {
    return this.delegate.update({
      where,
      data,
      ...(include && { include }),
    });
  }

  async softDelete(where: Prisma.ShowWhereUniqueInput): Promise<Show> {
    return this.delegate.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findPaginatedWithTaskSummary(
    studioId: bigint,
    query: {
      skip?: number;
      take?: number;
      search?: string;
      date_from?: string;
      date_to?: string;
      has_tasks?: boolean;
      client_name?: string;
      show_type_name?: string;
      show_standard_name?: string;
      show_status_name?: string;
      platform_name?: string;
    },
  ) {
    const where: Prisma.ShowWhereInput = {
      studioId,
      deletedAt: null,
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.date_from || query.date_to) {
      where.startTime = {
        ...(query.date_from && { gte: new Date(query.date_from) }),
        ...(query.date_to && { lte: new Date(query.date_to) }),
      };
    }

    if (query.has_tasks !== undefined) {
      if (query.has_tasks) {
        where.taskTargets = { some: { deletedAt: null } };
      } else {
        where.taskTargets = { none: { deletedAt: null } };
      }
    }

    if (query.client_name) {
      where.client = {
        name: { contains: query.client_name, mode: 'insensitive' },
        deletedAt: null,
      };
    }

    if (query.show_type_name) {
      where.showType = {
        name: { contains: query.show_type_name, mode: 'insensitive' },
      };
    }

    if (query.show_standard_name) {
      where.showStandard = {
        name: { contains: query.show_standard_name, mode: 'insensitive' },
      };
    }

    if (query.show_status_name) {
      where.showStatus = {
        name: { contains: query.show_status_name, mode: 'insensitive' },
      };
    }

    if (query.platform_name) {
      where.showPlatforms = {
        some: {
          platform: {
            name: { contains: query.platform_name, mode: 'insensitive' },
          },
        },
      };
    }

    const [total, data] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { startTime: 'desc' },
        include: {
          client: true,
          studio: true,
          studioRoom: true,
          showType: true,
          showStatus: true,
          showStandard: true,
          taskTargets: {
            where: { deletedAt: null },
            include: {
              task: {
                select: {
                  status: true,
                  assigneeId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return { data, total };
  }
}
