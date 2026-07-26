import { Injectable } from '@nestjs/common';

import type {
  CreateShowTypePayload,
  UpdateShowTypePayload,
} from './schemas/show-type.schema';
import { ShowTypeRepository } from './show-type.repository';
import { SHOW_TYPE_UID_PREFIX } from './show-type-uid.util';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UidGeneratorService } from '@/lib/uid/uid-generator.service';

@Injectable()
export class ShowTypeService extends BaseModelService {
  static readonly UID_PREFIX = SHOW_TYPE_UID_PREFIX;
  protected readonly uidPrefix = ShowTypeService.UID_PREFIX;

  constructor(
    private readonly showTypeRepository: ShowTypeRepository,
    protected readonly uidGenerator: UidGeneratorService,
  ) {
    super(uidGenerator);
  }

  async createShowType(
    payload: CreateShowTypePayload,
  ): ReturnType<ShowTypeRepository['create']> {
    const uid = this.generateUid();
    return this.showTypeRepository.create({ ...payload, uid });
  }

  async getShowTypeById(
    ...params: Parameters<ShowTypeRepository['findByUid']>
  ): ReturnType<ShowTypeRepository['findByUid']> {
    return this.showTypeRepository.findByUid(...params);
  }

  async getShowTypes(
    ...params: Parameters<ShowTypeRepository['findPaginated']>
  ): ReturnType<ShowTypeRepository['findPaginated']> {
    return this.showTypeRepository.findPaginated(...params);
  }

  async countShowTypes(
    ...params: Parameters<ShowTypeRepository['count']>
  ): ReturnType<ShowTypeRepository['count']> {
    return this.showTypeRepository.count(...params);
  }

  async listShowTypes(params: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    include_deleted?: boolean;
  }): ReturnType<ShowTypeRepository['findPaginated']> {
    const { skip, take, name, uid, include_deleted } = params;

    return this.showTypeRepository.findPaginated({
      skip,
      take,
      name,
      uid,
      includeDeleted: include_deleted,
    });
  }

  async updateShowType(
    uid: string,
    payload: UpdateShowTypePayload,
  ): ReturnType<ShowTypeRepository['update']> {
    return this.showTypeRepository.update({ uid }, payload);
  }

  async deleteShowType(
    params: Parameters<ShowTypeRepository['softDelete']>[0],
  ): ReturnType<ShowTypeRepository['softDelete']> {
    const { uid } = params;
    if (typeof uid !== 'string') {
      throw new TypeError('UID must be a string for deletion');
    }
    return this.showTypeRepository.softDelete({ uid });
  }
}
