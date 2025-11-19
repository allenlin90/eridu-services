import { Injectable } from '@nestjs/common';
import { Prisma, ShowType } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

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

  async getShowTypeById(uid: string): Promise<ShowType> {
    return this.findShowTypeOrThrow(uid);
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
    await this.findShowTypeOrThrow(uid);
    return this.showTypeRepository.update({ uid }, data);
  }

  async deleteShowType(uid: string): Promise<ShowType> {
    await this.findShowTypeOrThrow(uid);
    return this.showTypeRepository.softDelete({ uid });
  }

  private async findShowTypeOrThrow(uid: string): Promise<ShowType> {
    const showType = await this.showTypeRepository.findByUid(uid);
    if (!showType) {
      throw HttpError.notFound('Show Type', uid);
    }
    return showType;
  }
}
