import { Injectable } from '@nestjs/common';
import { Prisma, Studio } from '@prisma/client';

import { BaseModelService } from '../common/services/base-model.service';
import { UtilityService } from '../utility/utility.service';
import { StudioRepository } from './studio.repository';

@Injectable()
export class StudioService extends BaseModelService {
  static readonly UID_PREFIX = 'std';
  protected readonly uidPrefix = StudioService.UID_PREFIX;

  constructor(
    private readonly studioRepository: StudioRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createStudio(
    data: Omit<Prisma.StudioCreateInput, 'uid'>,
  ): Promise<Studio> {
    const uid = this.generateUid();
    return this.studioRepository.create({ ...data, uid });
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
    return this.studioRepository.findMany(params);
  }

  async countStudios(): Promise<number> {
    return this.studioRepository.count({});
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
}
