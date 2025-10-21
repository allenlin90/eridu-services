import { Injectable } from '@nestjs/common';
import { Prisma, ShowStatus } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { ShowStatusRepository } from './show-status.repository';

@Injectable()
export class ShowStatusService {
  static readonly UID_PREFIX = 'shs_';

  constructor(
    private readonly showStatusRepository: ShowStatusRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createShowStatus(
    data: Omit<Prisma.ShowStatusCreateInput, 'uid'>,
  ): Promise<ShowStatus> {
    const uid = this.utilityService.generateBrandedId(
      ShowStatusService.UID_PREFIX,
    );
    const showStatusData = { ...data, uid };

    try {
      return await this.showStatusRepository.create(showStatusData);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Show status already exists');
      }
      throw error;
    }
  }

  async getShowStatusById(uid: string): Promise<ShowStatus | null> {
    return this.showStatusRepository.findOne({ uid });
  }

  async getShowStatuses(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowStatus[]> {
    return this.showStatusRepository.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  }

  async updateShowStatus(
    uid: string,
    data: Prisma.ShowStatusUpdateInput,
  ): Promise<ShowStatus> {
    try {
      return await this.showStatusRepository.update({ uid }, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Show status already exists');
      }
      throw error;
    }
  }

  async deleteShowStatus(uid: string): Promise<ShowStatus> {
    return this.showStatusRepository.softDelete({ uid });
  }

  async countShowStatuses(): Promise<number> {
    return this.showStatusRepository.count({});
  }
}
