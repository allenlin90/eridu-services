import { Injectable } from '@nestjs/common';
import { Prisma, ShowStandard } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { ShowStandardRepository } from './show-standard.repository';

@Injectable()
export class ShowStandardService {
  static readonly UID_PREFIX = 'shs_';

  constructor(
    private readonly showStandardRepository: ShowStandardRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createShowStandard(
    data: Omit<Prisma.ShowStandardCreateInput, 'uid'>,
  ): Promise<ShowStandard> {
    const uid = this.utilityService.generateBrandedId(
      ShowStandardService.UID_PREFIX,
    );
    const showStandardData = { ...data, uid };

    try {
      return await this.showStandardRepository.create(showStandardData);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Show standard already exists');
      }
      throw error;
    }
  }

  async getShowStandardById(uid: string): Promise<ShowStandard | null> {
    return this.showStandardRepository.findOne({ uid });
  }

  async getShowStandards(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<ShowStandard[]> {
    return this.showStandardRepository.findMany({
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    });
  }

  async updateShowStandard(
    uid: string,
    data: Prisma.ShowStandardUpdateInput,
  ): Promise<ShowStandard> {
    try {
      return await this.showStandardRepository.update({ uid }, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('Show standard already exists');
      }
      throw error;
    }
  }

  async deleteShowStandard(uid: string): Promise<ShowStandard> {
    return this.showStandardRepository.softDelete({ uid });
  }

  async countShowStandards(): Promise<number> {
    return this.showStandardRepository.count({});
  }
}
