import { Injectable } from '@nestjs/common';
import type { Platform, Prisma } from '@prisma/client';

import { UtilityService } from '../utility/utility.service';
import { PlatformRepository } from './platform.repository';

@Injectable()
export class PlatformService {
  static readonly UID_PREFIX = 'plt_';

  constructor(
    private readonly platformRepository: PlatformRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createPlatform(
    data: Omit<Prisma.PlatformCreateInput, 'uid'>,
  ): Promise<Platform> {
    const uid = this.utilityService.generateBrandedId(
      PlatformService.UID_PREFIX,
    );
    const platformData = { ...data, uid };

    return this.platformRepository.create(platformData);
  }

  async getPlatformById(uid: string): Promise<Platform | null> {
    return this.platformRepository.findOne({ uid });
  }

  async findPlatformById(id: bigint): Promise<Platform | null> {
    return this.platformRepository.findOne({ id });
  }

  async getPlatforms(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Platform[]> {
    return this.platformRepository.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
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

  async countPlatforms(): Promise<number> {
    return this.platformRepository.count({});
  }
}
