import { Injectable } from '@nestjs/common';
import { Prisma, ShowPlatform } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

import {
  CreateShowPlatformDto,
  UpdateShowPlatformDto,
} from './schemas/show-platform.schema';
import { ShowPlatformRepository } from './show-platform.repository';

type ShowPlatformWithIncludes<T extends Prisma.ShowPlatformInclude> =
  Prisma.ShowPlatformGetPayload<{
    include: T;
  }>;

@Injectable()
export class ShowPlatformService extends BaseModelService {
  static readonly UID_PREFIX = 'show_plt';
  protected readonly uidPrefix = ShowPlatformService.UID_PREFIX;

  constructor(
    private readonly showPlatformRepository: ShowPlatformRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Generates a show platform UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowPlatformUid(): string {
    return this.generateUid();
  }

  async createShowPlatformFromDto<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    dto: CreateShowPlatformDto,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createShowPlatform(data, include);
  }

  async createShowPlatform<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    data: Omit<Prisma.ShowPlatformCreateInput, 'uid'>,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    const uid = this.generateUid();
    return this.showPlatformRepository.create({ ...data, uid }, include);
  }

  async getShowPlatformById<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    return this.findShowPlatformOrThrow(uid, include);
  }

  async getShowPlatforms<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ShowPlatformWhereInput;
    },
    include?: T,
  ): Promise<ShowPlatform[] | ShowPlatformWithIncludes<T>[]> {
    return this.showPlatformRepository.findMany({ ...params, include });
  }

  async getActiveShowPlatforms(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
    include?: Prisma.ShowPlatformInclude;
  }): Promise<ShowPlatform[]> {
    return this.showPlatformRepository.findActiveShowPlatforms(params);
  }

  async getShowPlatformsByShow(
    showId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
      include?: Prisma.ShowPlatformInclude;
    },
  ): Promise<ShowPlatform[]> {
    return this.showPlatformRepository.findByShow(showId, params);
  }

  async getShowPlatformsByPlatform(
    platformId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowPlatformOrderByWithRelationInput;
      include?: Prisma.ShowPlatformInclude;
    },
  ): Promise<ShowPlatform[]> {
    return this.showPlatformRepository.findByPlatform(platformId, params);
  }

  async findShowPlatformByShowAndPlatform(
    showId: bigint,
    platformId: bigint,
  ): Promise<ShowPlatform | null> {
    return this.showPlatformRepository.findByShowAndPlatform(
      showId,
      platformId,
    );
  }

  async countShowPlatforms(
    where?: Prisma.ShowPlatformWhereInput,
  ): Promise<number> {
    return this.showPlatformRepository.count(where ?? {});
  }

  async updateShowPlatformFromDto<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    uid: string,
    dto: UpdateShowPlatformDto,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateShowPlatform(uid, data, include);
  }

  async updateShowPlatform<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    uid: string,
    data: Prisma.ShowPlatformUpdateInput,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    await this.findShowPlatformOrThrow(uid);
    return this.showPlatformRepository.update({ uid }, data, include);
  }

  async deleteShowPlatform(uid: string): Promise<ShowPlatform> {
    await this.findShowPlatformOrThrow(uid);
    return this.showPlatformRepository.softDelete({ uid });
  }

  private async findShowPlatformOrThrow<
    T extends Prisma.ShowPlatformInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<ShowPlatform | ShowPlatformWithIncludes<T>> {
    const showPlatform = await this.showPlatformRepository.findByUid(
      uid,
      include,
    );
    if (!showPlatform) {
      throw HttpError.notFound('ShowPlatform', uid);
    }
    return showPlatform;
  }

  private buildCreatePayload(
    dto: CreateShowPlatformDto,
  ): Omit<Prisma.ShowPlatformCreateInput, 'uid'> {
    return {
      liveStreamLink: dto.liveStreamLink,
      platformShowId: dto.platformShowId,
      viewerCount: dto.viewerCount ?? 0,
      metadata: dto.metadata ?? {},
      show: { connect: { uid: dto.showId } },
      platform: { connect: { uid: dto.platformId } },
    };
  }

  private buildUpdatePayload(
    dto: UpdateShowPlatformDto,
  ): Prisma.ShowPlatformUpdateInput {
    const payload: Prisma.ShowPlatformUpdateInput = {};

    if (dto.liveStreamLink !== undefined)
      payload.liveStreamLink = dto.liveStreamLink;
    if (dto.platformShowId !== undefined)
      payload.platformShowId = dto.platformShowId;
    if (dto.viewerCount !== undefined) payload.viewerCount = dto.viewerCount;
    if (dto.metadata !== undefined) payload.metadata = dto.metadata;

    if (dto.showId !== undefined) {
      payload.show = { connect: { uid: dto.showId } };
    }

    if (dto.platformId !== undefined) {
      payload.platform = { connect: { uid: dto.platformId } };
    }

    return payload;
  }
}
