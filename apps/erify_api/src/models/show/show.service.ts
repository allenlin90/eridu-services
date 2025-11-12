import { Injectable } from '@nestjs/common';
import { Prisma, Show } from '@prisma/client';

import { HttpError } from '@/common/errors/http-error.util';
import { BaseModelService } from '@/common/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

import { CreateShowDto, UpdateShowDto } from './schemas/show.schema';
import { ShowRepository } from './show.repository';

type ListShowsQuery = {
  page: number;
  limit: number;
  take: number;
  skip: number;
  client_id?: string | string[];
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  order_by: 'created_at' | 'updated_at' | 'start_time' | 'end_time';
  order_direction: 'asc' | 'desc';
  include_deleted: boolean;
};

type ShowWithIncludes<T extends Prisma.ShowInclude> = Prisma.ShowGetPayload<{
  include: T;
}>;

@Injectable()
export class ShowService extends BaseModelService {
  static readonly UID_PREFIX = 'show';
  protected readonly uidPrefix = ShowService.UID_PREFIX;

  constructor(
    private readonly showRepository: ShowRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  generateShowUid(size?: number) {
    return this.generateUid(size);
  }

  async createShowFromDto<T extends Prisma.ShowInclude = Record<string, never>>(
    dto: CreateShowDto,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createShow(data, include);
  }

  async createShow<T extends Prisma.ShowInclude = Record<string, never>>(
    data: Omit<Prisma.ShowCreateInput, 'uid'>,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const uid = this.generateShowUid();
    return this.showRepository.create({ ...data, uid }, include);
  }

  async getShowById<T extends Prisma.ShowInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    return this.findShowOrThrow(uid, include);
  }

  async findShowById(id: bigint): Promise<Show | null> {
    return this.showRepository.findOne({ id });
  }

  async getShows<T extends Prisma.ShowInclude = Record<string, never>>(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ShowWhereInput;
      orderBy?: Record<string, 'asc' | 'desc'>;
    },
    include?: T,
  ): Promise<Show[] | ShowWithIncludes<T>[]> {
    return this.showRepository.findMany({ ...params, include });
  }

  async getActiveShows(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowOrderByWithRelationInput;
    include?: Prisma.ShowInclude;
  }): Promise<Show[]> {
    return this.showRepository.findActiveShows(params);
  }

  async getShowsByClient(
    clientId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    return this.showRepository.findShowsByClient(clientId, params);
  }

  async getShowsByStudioRoom(
    studioRoomId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    return this.showRepository.findShowsByStudioRoom(studioRoomId, params);
  }

  async getShowsByDateRange(
    startDate: Date,
    endDate: Date,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowOrderByWithRelationInput;
      include?: Prisma.ShowInclude;
    },
  ): Promise<Show[]> {
    return this.showRepository.findShowsByDateRange(startDate, endDate, params);
  }

  async countShows(where?: Prisma.ShowWhereInput): Promise<number> {
    return this.showRepository.count(where ?? {});
  }

  async getPaginatedShows(query: ListShowsQuery): Promise<{
    shows: Show[];
    total: number;
  }> {
    const where = this.buildShowWhereClause(query);
    const orderBy = this.buildOrderByClause(query);

    const include: Prisma.ShowInclude = {
      client: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    };

    const [shows, total] = await Promise.all([
      this.getShows(
        {
          skip: query.skip,
          take: query.take,
          where,
          orderBy,
        },
        include,
      ),
      this.countShows(where),
    ]);

    return { shows, total };
  }

  private buildShowWhereClause(filters: {
    client_id?: string | string[];
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
    include_deleted: boolean;
  }): Prisma.ShowWhereInput {
    const where: Prisma.ShowWhereInput = {};

    // Filter out soft deleted records by default
    if (!filters.include_deleted) {
      where.deletedAt = null;
    }

    // Client filtering
    if (filters.client_id) {
      const clientIds = Array.isArray(filters.client_id)
        ? filters.client_id
        : [filters.client_id];
      where.client = {
        uid: { in: clientIds },
        deletedAt: null,
      };
    }

    // Date range filtering for start time
    if (filters.start_date_from || filters.start_date_to) {
      where.startTime = {};
      if (filters.start_date_from) {
        where.startTime.gte = new Date(filters.start_date_from);
      }
      if (filters.start_date_to) {
        where.startTime.lte = new Date(filters.start_date_to);
      }
    }

    // Date range filtering for end time
    if (filters.end_date_from || filters.end_date_to) {
      where.endTime = {};
      if (filters.end_date_from) {
        where.endTime.gte = new Date(filters.end_date_from);
      }
      if (filters.end_date_to) {
        where.endTime.lte = new Date(filters.end_date_to);
      }
    }

    return where;
  }

  private buildOrderByClause(
    query: Pick<ListShowsQuery, 'order_by' | 'order_direction'>,
  ): Record<string, 'asc' | 'desc'> {
    const fieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      start_time: 'startTime',
      end_time: 'endTime',
    };
    const field = fieldMap[query.order_by] || 'createdAt';
    return { [field]: query.order_direction };
  }

  async updateShowFromDto<T extends Prisma.ShowInclude = Record<string, never>>(
    uid: string,
    dto: UpdateShowDto,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateShow(uid, data, include);
  }

  async updateShow<T extends Prisma.ShowInclude = Record<string, never>>(
    uid: string,
    data: Prisma.ShowUpdateInput,
    include?: T,
  ): Promise<Show | ShowWithIncludes<T>> {
    await this.findShowOrThrow(uid);
    return this.showRepository.update({ uid }, data, include);
  }

  async deleteShow(uid: string): Promise<Show> {
    await this.findShowOrThrow(uid);
    return this.showRepository.softDelete({ uid });
  }

  private async findShowOrThrow<
    T extends Prisma.ShowInclude = Record<string, never>,
  >(uid: string, include?: T): Promise<Show | ShowWithIncludes<T>> {
    const show = await this.showRepository.findByUid(uid, include);
    if (!show) {
      throw HttpError.notFound('Show', uid);
    }
    return show;
  }

  private buildCreatePayload(
    dto: CreateShowDto,
  ): Omit<Prisma.ShowCreateInput, 'uid'> {
    // Validate time range
    if (dto.endTime <= dto.startTime) {
      throw HttpError.badRequest('End time must be after start time');
    }

    return {
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      metadata: dto.metadata ?? {},
      client: { connect: { uid: dto.clientId } },
      studioRoom: { connect: { uid: dto.studioRoomId } },
      showType: { connect: { uid: dto.showTypeId } },
      showStatus: { connect: { uid: dto.showStatusId } },
      showStandard: { connect: { uid: dto.showStandardId } },
    };
  }

  private buildUpdatePayload(dto: UpdateShowDto): Prisma.ShowUpdateInput {
    const payload: Prisma.ShowUpdateInput = {};

    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.startTime !== undefined) payload.startTime = dto.startTime;
    if (dto.endTime !== undefined) payload.endTime = dto.endTime;
    if (dto.metadata !== undefined) payload.metadata = dto.metadata;

    if (dto.clientId !== undefined) {
      payload.client = { connect: { uid: dto.clientId } };
    }

    if (dto.studioRoomId !== undefined) {
      payload.studioRoom = { connect: { uid: dto.studioRoomId } };
    }

    if (dto.showTypeId !== undefined) {
      payload.showType = { connect: { uid: dto.showTypeId } };
    }

    if (dto.showStatusId !== undefined) {
      payload.showStatus = { connect: { uid: dto.showStatusId } };
    }

    if (dto.showStandardId !== undefined) {
      payload.showStandard = { connect: { uid: dto.showStandardId } };
    }

    // Validate time range if both times are present
    if (dto.startTime !== undefined && dto.endTime !== undefined) {
      if (dto.endTime <= dto.startTime) {
        throw HttpError.badRequest('End time must be after start time');
      }
    }

    return payload;
  }
}
