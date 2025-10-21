import { Injectable } from '@nestjs/common';
import type { Prisma, Studio } from '@prisma/client';

import { UtilityService } from '../utility/utility.service';
import { StudioRepository } from './studio.repository';

@Injectable()
export class StudioService {
  static readonly UID_PREFIX = 'std_';

  constructor(
    private readonly studioRepository: StudioRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createStudio(
    data: Omit<Prisma.StudioCreateInput, 'uid'>,
  ): Promise<Studio> {
    const uid = this.utilityService.generateBrandedId(StudioService.UID_PREFIX);
    const studioData = { ...data, uid };

    return this.studioRepository.create(studioData);
  }

  async getStudioById(uid: string): Promise<Studio | null> {
    return this.studioRepository.findOne({ uid });
  }

  async findStudioById(id: bigint): Promise<Studio | null> {
    return this.studioRepository.findOne({ id });
  }

  async getStudios(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Studio[]> {
    return this.studioRepository.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  }

  async updateStudio(
    uid: string,
    data: Prisma.StudioUpdateInput,
  ): Promise<Studio> {
    return this.studioRepository.update({ uid }, data);
  }

  async deleteStudio(uid: string): Promise<Studio> {
    return this.studioRepository.softDelete({ uid });
  }

  async countStudios(): Promise<number> {
    return this.studioRepository.count({});
  }
}
