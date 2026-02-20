import { Injectable } from '@nestjs/common';

import type { ShowInclude, ShowWithPayload } from './schemas/show.schema';
import {
  CreateShowDto,
  ListShowsQueryDto,
  UpdateShowDto,
} from './schemas/show.schema';
import { ShowRepository } from './show.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

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

  /**
   * Generates a show UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowUid(): string {
    return this.generateUid();
  }

  async createShowFromDto<T extends Parameters<ShowRepository['create']>[1]>(
    dto: CreateShowDto,
    include?: T,
  ): ReturnType<ShowRepository['create']> {
    const data = this.buildCreatePayload(dto);
    return this.createShow(data, include);
  }

  async createShow<T extends Parameters<ShowRepository['create']>[1]>(
    data: Omit<Parameters<ShowRepository['create']>[0], 'uid'>,
    include?: T,
  ): ReturnType<ShowRepository['create']> {
    const uid = this.generateUid();
    return this.showRepository.create({ ...data, uid }, include);
  }

  async getShowById<T extends ShowInclude>(
    uid: string,
    include?: T,
  ): Promise<ShowWithPayload<T>> {
    return this.findShowOrThrow(uid, include);
  }

  /**
   * @internal
   */
  async getShows<T extends Parameters<ShowRepository['findMany']>[0]['include']>(
    params: Parameters<ShowRepository['findMany']>[0],
    include?: T,
  ): ReturnType<ShowRepository['findMany']> {
    return this.showRepository.findMany({ ...params, include });
  }

  /**
   * @internal
   */
  async findMany(...args: Parameters<ShowRepository['findMany']>): ReturnType<ShowRepository['findMany']> {
    return this.showRepository.findMany(...args);
  }

  /**
   * @internal
   */
  async findPaginatedWithTaskSummary(...args: Parameters<ShowRepository['findPaginatedWithTaskSummary']>): ReturnType<ShowRepository['findPaginatedWithTaskSummary']> {
    return this.showRepository.findPaginatedWithTaskSummary(...args);
  }

  /**
   * @internal
   */
  async getActiveShows(
    params: Parameters<ShowRepository['findActiveShows']>[0],
  ): ReturnType<ShowRepository['findActiveShows']> {
    return this.showRepository.findActiveShows(params);
  }

  /**
   * @internal
   */
  async getShowsByClient(
    clientId: bigint,
    params?: Parameters<ShowRepository['findShowsByClient']>[1],
  ): ReturnType<ShowRepository['findShowsByClient']> {
    return this.showRepository.findShowsByClient(clientId, params);
  }

  /**
   * @internal
   */
  async getShowsByStudioRoom(
    studioRoomId: bigint,
    params?: Parameters<ShowRepository['findShowsByStudioRoom']>[1],
  ): ReturnType<ShowRepository['findShowsByStudioRoom']> {
    return this.showRepository.findShowsByStudioRoom(studioRoomId, params);
  }

  /**
   * @internal
   */
  async getShowsByDateRange(
    startDate: Date,
    endDate: Date,
    params?: Parameters<ShowRepository['findShowsByDateRange']>[2],
  ): ReturnType<ShowRepository['findShowsByDateRange']> {
    return this.showRepository.findShowsByDateRange(startDate, endDate, params);
  }

  /**
   * @internal
   */
  async countShows(where?: Parameters<ShowRepository['count']>[0]): Promise<number> {
    return this.showRepository.count(where ?? {});
  }

  async getPaginatedShows(
    query: ListShowsQueryDto,
    include?: Parameters<ShowRepository['findPaginated']>[1],
  ): ReturnType<ShowRepository['findPaginated']> {
    const defaultInclude = {
      client: true,
      studio: true,
      studioRoom: true,
      showType: true,
      showStatus: true,
      showStandard: true,
    };

    return this.showRepository.findPaginated(query, include ?? defaultInclude);
  }

  async updateShowFromDto<T extends Parameters<ShowRepository['update']>[2]>(
    uid: string,
    dto: UpdateShowDto,
    include?: T,
  ): ReturnType<ShowRepository['update']> {
    const data = this.buildUpdatePayload(dto);
    return this.updateShow(uid, data, include);
  }

  async updateShow<T extends ShowInclude>(
    uid: string,
    data: Parameters<ShowRepository['update']>[1],
    include?: T,
  ): ReturnType<ShowRepository['update']> {
    await this.findShowOrThrow(uid);
    return this.showRepository.update({ uid }, data, include);
  }

  async deleteShow(uid: string): ReturnType<ShowRepository['softDelete']> {
    await this.findShowOrThrow(uid);
    return this.showRepository.softDelete({ uid });
  }

  private async findShowOrThrow<T extends ShowInclude>(
    uid: string,
    include?: T,
  ): Promise<ShowWithPayload<T>> {
    const show = await this.showRepository.findByUid(uid, include);
    if (!show) {
      throw HttpError.notFound('Show', uid);
    }
    return show as ShowWithPayload<T>;
  }

  private buildCreatePayload(
    dto: CreateShowDto,
  ): Omit<Parameters<ShowRepository['create']>[0], 'uid'> {
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
      studioRoom: dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : undefined,
      studio: dto.studioId
        ? { connect: { uid: dto.studioId } }
        : undefined,
      showType: { connect: { uid: dto.showTypeId } },
      showStatus: { connect: { uid: dto.showStatusId } },
      showStandard: { connect: { uid: dto.showStandardId } },
    };
  }

  buildUpdatePayload(dto: UpdateShowDto): Parameters<ShowRepository['update']>[1] {
    const payload: Parameters<ShowRepository['update']>[1] = {};

    if (dto.name !== undefined)
      payload.name = dto.name;
    if (dto.startTime !== undefined)
      payload.startTime = dto.startTime;
    if (dto.endTime !== undefined)
      payload.endTime = dto.endTime;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;

    if (dto.clientId !== undefined) {
      payload.client = { connect: { uid: dto.clientId } };
    }

    if (dto.studioRoomId !== undefined) {
      payload.studioRoom = dto.studioRoomId
        ? { connect: { uid: dto.studioRoomId } }
        : { disconnect: true };
    }

    if (dto.studioId !== undefined) {
      payload.studio = dto.studioId
        ? { connect: { uid: dto.studioId } }
        : { disconnect: true };
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
