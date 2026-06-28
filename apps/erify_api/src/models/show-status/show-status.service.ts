import { Injectable } from '@nestjs/common';
import type { ShowStatus } from '@prisma/client';

import type {
  CreateShowStatusPayload,
  UpdateShowStatusPayload,
} from './schemas/show-status.schema';
import { ShowStatusRepository } from './show-status.repository';
import { SHOW_STATUS_UID_PREFIX } from './show-status-uid.util';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowStatusService extends BaseModelService {
  static readonly UID_PREFIX = SHOW_STATUS_UID_PREFIX;
  protected readonly uidPrefix = ShowStatusService.UID_PREFIX;

  constructor(
    private readonly showStatusRepository: ShowStatusRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShowStatus(
    payload: CreateShowStatusPayload,
  ): ReturnType<ShowStatusRepository['create']> {
    const uid = this.generateUid();
    return this.showStatusRepository.create({ ...payload, uid });
  }

  async getShowStatusById(
    ...params: Parameters<ShowStatusRepository['findByUid']>
  ): ReturnType<ShowStatusRepository['findByUid']> {
    return this.showStatusRepository.findByUid(...params);
  }

  async getShowStatusBySystemKey(systemKey: string): Promise<ShowStatus | null> {
    return this.showStatusRepository.findOne({ systemKey });
  }

  async getShowStatuses(
    ...params: Parameters<ShowStatusRepository['findPaginated']>
  ): ReturnType<ShowStatusRepository['findPaginated']> {
    return this.showStatusRepository.findPaginated(...params);
  }

  async countShowStatuses(
    ...params: Parameters<ShowStatusRepository['count']>
  ): ReturnType<ShowStatusRepository['count']> {
    return this.showStatusRepository.count(...params);
  }

  async updateShowStatus(
    uid: string,
    payload: UpdateShowStatusPayload,
  ): ReturnType<ShowStatusRepository['update']> {
    return this.showStatusRepository.update({ uid }, payload);
  }

  async deleteShowStatus(
    ...params: Parameters<ShowStatusRepository['softDelete']>
  ): ReturnType<ShowStatusRepository['softDelete']> {
    return this.showStatusRepository.softDelete(...params);
  }
}
