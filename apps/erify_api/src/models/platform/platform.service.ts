import { Injectable } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';

import { HttpError } from '@/common/errors/http-error.util';
import { BaseModelService } from '@/common/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

import { PlatformRepository } from './platform.repository';

@Injectable()
export class PlatformService extends BaseModelService {
  static readonly UID_PREFIX = 'plt';
  protected readonly uidPrefix = PlatformService.UID_PREFIX;

  constructor(
    private readonly platformRepository: PlatformRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createPlatform(
    data: Omit<Prisma.PlatformCreateInput, 'uid'>,
  ): Promise<Platform> {
    const uid = this.generateUid();
    return this.platformRepository.create({ ...data, uid });
  }

  getPlatformById(
    uid: string,
    include?: Prisma.PlatformInclude,
  ): Promise<Platform> {
    return this.findPlatformOrThrow(uid, include);
  }

  async findPlatformById(id: bigint): Promise<Platform | null> {
    return this.platformRepository.findOne({ id });
  }

  async getPlatforms(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Platform[]> {
    return this.platformRepository.findMany(params);
  }

  async countPlatforms(): Promise<number> {
    return this.platformRepository.count({});
  }

  async updatePlatform(
    uid: string,
    data: Prisma.PlatformUpdateInput,
  ): Promise<Platform> {
    return this.platformRepository.update({ uid }, data);
  }

  async deletePlatform(uid: string): Promise<Platform> {
    return this.platformRepository.softDelete({ uid });
  }

  private async findPlatformOrThrow(
    uid: string,
    include?: Prisma.PlatformInclude,
  ): Promise<Platform> {
    const platform = await this.platformRepository.findOne({ uid }, include);
    if (!platform) {
      throw HttpError.notFound('Platform', uid);
    }
    return platform;
  }
}
