import { Injectable } from '@nestjs/common';
import { Prisma, ShowType } from '@prisma/client';

import { BaseModelService } from '../common/services/base-model.service';
import { UtilityService } from '../utility/utility.service';
import { ShowTypeRepository } from './show-type.repository';

@Injectable()
export class ShowTypeService extends BaseModelService {
  static readonly UID_PREFIX = 'sht';
  protected readonly uidPrefix = ShowTypeService.UID_PREFIX;

  constructor(
    private readonly showTypeRepository: ShowTypeRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShowType(
    data: Omit<Prisma.ShowTypeCreateInput, 'uid'>,
  ): Promise<ShowType> {
    const uid = this.generateUid();
    return this.showTypeRepository.create({ ...data, uid });
  }

  async getShowTypeById(uid: string): Promise<ShowType | null> {
    return this.showTypeRepository.findOne({ uid });
  }

  async getShowTypes(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowType[]> {
    return this.showTypeRepository.findMany(params);
  }

  async countShowTypes(): Promise<number> {
    return this.showTypeRepository.count({});
  }

  async updateShowType(
    uid: string,
    data: Prisma.ShowTypeUpdateInput,
  ): Promise<ShowType> {
    return this.showTypeRepository.update({ uid }, data);
  }

  async deleteShowType(uid: string): Promise<ShowType> {
    return this.showTypeRepository.softDelete({ uid });
  }
}
