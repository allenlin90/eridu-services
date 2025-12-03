import { Injectable } from '@nestjs/common';
import { Prisma, ShowStatus } from '@prisma/client';

import { ShowStatusRepository } from './show-status.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowStatusService extends BaseModelService {
  static readonly UID_PREFIX = 'shst';
  protected readonly uidPrefix = ShowStatusService.UID_PREFIX;

  constructor(
    private readonly showStatusRepository: ShowStatusRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShowStatus(
    data: Omit<Prisma.ShowStatusCreateInput, 'uid'>,
  ): Promise<ShowStatus> {
    const uid = this.generateUid();
    return this.showStatusRepository.create({ ...data, uid });
  }

  async getShowStatusById(uid: string): Promise<ShowStatus | null> {
    return this.showStatusRepository.findOne({ uid });
  }

  async getShowStatuses(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowStatus[]> {
    return this.showStatusRepository.findMany(params);
  }

  async countShowStatuses(): Promise<number> {
    return this.showStatusRepository.count({});
  }

  async updateShowStatus(
    uid: string,
    data: Prisma.ShowStatusUpdateInput,
  ): Promise<ShowStatus> {
    return this.showStatusRepository.update({ uid }, data);
  }

  async deleteShowStatus(uid: string): Promise<ShowStatus> {
    return this.showStatusRepository.softDelete({ uid });
  }

  private async findShowStatusOrThrow(uid: string): Promise<ShowStatus> {
    const showStatus = await this.showStatusRepository.findByUid(uid);
    if (!showStatus) {
      throw HttpError.notFound('Show Status', uid);
    }
    return showStatus;
  }
}
