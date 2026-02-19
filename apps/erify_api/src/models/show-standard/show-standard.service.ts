import { Injectable } from '@nestjs/common';

import type {
  CreateShowStandardPayload,
  UpdateShowStandardPayload,
} from './schemas/show-standard.schema';
import { ShowStandardRepository } from './show-standard.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

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
    payload: CreateShowStandardPayload,
  ): ReturnType<ShowStandardRepository['create']> {
    const uid = this.generateUid();
    return this.showStandardRepository.create({ ...payload, uid });
  }

  async getShowStandardById(
    ...params: Parameters<ShowStandardRepository['findByUid']>
  ): ReturnType<ShowStandardRepository['findByUid']> {
    return this.showStandardRepository.findByUid(...params);
  }

  async getShowStandards(
    ...params: Parameters<ShowStandardRepository['findPaginated']>
  ): ReturnType<ShowStandardRepository['findPaginated']> {
    return this.showStandardRepository.findPaginated(...params);
  }

  async countShowStandards(
    ...params: Parameters<ShowStandardRepository['count']>
  ): ReturnType<ShowStandardRepository['count']> {
    return this.showStandardRepository.count(...params);
  }

  async listShowStandards(params: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    include_deleted?: boolean;
  }): ReturnType<ShowStandardRepository['findPaginated']> {
    const { skip, take, name, uid, include_deleted } = params;

    return this.showStandardRepository.findPaginated({
      skip,
      take,
      name,
      uid,
      includeDeleted: include_deleted,
    });
  }

  async updateShowStandard(
    uid: string,
    payload: UpdateShowStandardPayload,
  ): ReturnType<ShowStandardRepository['update']> {
    return this.showStandardRepository.update({ uid }, payload);
  }

  async deleteShowStandard(
    params: Parameters<ShowStandardRepository['softDelete']>[0],
  ): ReturnType<ShowStandardRepository['softDelete']> {
    const { uid } = params;
    if (typeof uid !== 'string') {
      throw new TypeError('UID must be a string for deletion');
    }
    return this.showStandardRepository.softDelete({ uid });
  }
}
