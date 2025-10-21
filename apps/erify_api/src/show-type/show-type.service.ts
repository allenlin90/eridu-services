import { Injectable } from '@nestjs/common';
import type { Prisma, ShowType } from '@prisma/client';

import { UtilityService } from '../utility/utility.service';
import { ShowTypeRepository } from './show-type.repository';

@Injectable()
export class ShowTypeService {
  static readonly UID_PREFIX = 'sht_';

  constructor(
    private readonly showTypeRepository: ShowTypeRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createShowType(
    data: Omit<Prisma.ShowTypeCreateInput, 'uid'>,
  ): Promise<ShowType> {
    const uid = this.utilityService.generateBrandedId(
      ShowTypeService.UID_PREFIX,
    );
    const showTypeData = { ...data, uid };

    return this.showTypeRepository.create(showTypeData);
  }

  async getShowTypeById(uid: string): Promise<ShowType | null> {
    return this.showTypeRepository.findOne({ uid });
  }

  async getShowTypes(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowType[]> {
    return this.showTypeRepository.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
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

  async countShowTypes(): Promise<number> {
    return this.showTypeRepository.count({});
  }
}
