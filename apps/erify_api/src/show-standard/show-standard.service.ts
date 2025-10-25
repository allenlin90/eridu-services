import { Injectable } from '@nestjs/common';
import { Prisma, ShowStandard } from '@prisma/client';

import { BaseModelService } from '../common/services/base-model.service';
import { UtilityService } from '../utility/utility.service';
import { ShowStandardRepository } from './show-standard.repository';

@Injectable()
export class ShowStandardService extends BaseModelService {
  static readonly UID_PREFIX = 'shsd';
  protected readonly uidPrefix = ShowStandardService.UID_PREFIX;

  constructor(
    private readonly showStandardRepository: ShowStandardRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShowStandard(
    data: Omit<Prisma.ShowStandardCreateInput, 'uid'>,
  ): Promise<ShowStandard> {
    const uid = this.generateUid();
    return this.showStandardRepository.create({ ...data, uid });
  }

  async getShowStandardById(uid: string): Promise<ShowStandard | null> {
    return this.showStandardRepository.findOne({ uid });
  }

  async getShowStandards(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowStandard[]> {
    return this.showStandardRepository.findMany(params);
  }

  async countShowStandards(): Promise<number> {
    return this.showStandardRepository.count({});
  }

  async updateShowStandard(
    uid: string,
    data: Prisma.ShowStandardUpdateInput,
  ): Promise<ShowStandard> {
    return this.showStandardRepository.update({ uid }, data);
  }

  async deleteShowStandard(uid: string): Promise<ShowStandard> {
    return this.showStandardRepository.softDelete({ uid });
  }
}
