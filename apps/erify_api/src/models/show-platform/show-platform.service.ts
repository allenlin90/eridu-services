import { Injectable } from '@nestjs/common';

import type {
  CreateShowPlatformPayload,
  UpdateShowPlatformPayload,
} from './schemas/show-platform.schema';
import { ShowPlatformRepository } from './show-platform.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

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

  async create(
    payload: CreateShowPlatformPayload,
  ): ReturnType<ShowPlatformRepository['create']> {
    const uid = this.generateUid();

    return this.showPlatformRepository.create({
      liveStreamLink: payload.liveStreamLink ?? null,
      platformShowId: payload.platformShowId ?? null,
      viewerCount: payload.viewerCount ?? 0,
      ...(payload.gmv !== undefined && { gmv: payload.gmv }),
      ...(payload.sales !== undefined && { sales: payload.sales }),
      ...(payload.orders !== undefined && { orders: payload.orders }),
      metadata: payload.metadata ?? {},
      show: { connect: { uid: payload.showId } },
      platform: { connect: { uid: payload.platformId } },
      uid,
    });
  }

  async findOne(
    ...args: Parameters<ShowPlatformRepository['findByUid']>
  ): ReturnType<ShowPlatformRepository['findByUid']> {
    return this.showPlatformRepository.findByUid(...args);
  }

  async getShowPlatforms(
    ...args: Parameters<ShowPlatformRepository['findPaginated']>
  ): ReturnType<ShowPlatformRepository['findPaginated']> {
    return this.showPlatformRepository.findPaginated(...args);
  }

  async getShowPlatformsByShow(
    ...args: Parameters<ShowPlatformRepository['findByShow']>
  ): ReturnType<ShowPlatformRepository['findByShow']> {
    return this.showPlatformRepository.findByShow(...args);
  }

  async getShowPlatformsByPlatform(
    ...args: Parameters<ShowPlatformRepository['findByPlatform']>
  ): ReturnType<ShowPlatformRepository['findByPlatform']> {
    return this.showPlatformRepository.findByPlatform(...args);
  }

  async findShowPlatformByShowAndPlatform(
    showId: bigint,
    platformId: bigint,
  ): ReturnType<ShowPlatformRepository['findByShowAndPlatform']> {
    return this.showPlatformRepository.findByShowAndPlatform(showId, platformId);
  }

  async update(
    uid: string,
    payload: UpdateShowPlatformPayload,
  ): ReturnType<ShowPlatformRepository['update']> {
    const data: Parameters<ShowPlatformRepository['update']>[1] = {};

    if (payload.liveStreamLink !== undefined)
      data.liveStreamLink = payload.liveStreamLink;
    if (payload.platformShowId !== undefined)
      data.platformShowId = payload.platformShowId;
    if (payload.viewerCount !== undefined)
      data.viewerCount = payload.viewerCount;
    if (payload.gmv !== undefined)
      data.gmv = payload.gmv;
    if (payload.sales !== undefined)
      data.sales = payload.sales;
    if (payload.orders !== undefined)
      data.orders = payload.orders;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.showId !== undefined) {
      data.show = { connect: { uid: payload.showId } };
    }

    if (payload.platformId !== undefined) {
      data.platform = { connect: { uid: payload.platformId } };
    }

    return this.showPlatformRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowPlatformRepository['softDelete']> {
    return this.showPlatformRepository.softDelete({ uid });
  }
}
