import { Injectable } from '@nestjs/common';
import { Prisma, ShowStandard } from '@prisma/client';

import { ShowStandardRepository } from './show-standard.repository';

import { HttpError } from '@/lib/errors/http-error.util';
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
    data: Omit<Prisma.ShowStandardCreateInput, 'uid'>,
  ): Promise<ShowStandard> {
    const uid = this.generateUid();
    return this.showStandardRepository.create({ ...data, uid });
  }

  getShowStandardById(
    uid: string,
    include?: Prisma.ShowStandardInclude,
  ): Promise<ShowStandard> {
    return this.findShowStandardOrThrow(uid, include);
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

  async listShowStandards(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ShowStandardWhereInput;
  }): Promise<{ data: ShowStandard[]; total: number }> {
    const [data, total] = await Promise.all([
      this.showStandardRepository.findMany(params),
      this.showStandardRepository.count(params.where ?? {}),
    ]);

    return { data, total };
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

  private async findShowStandardOrThrow(
    uid: string,
    include?: Prisma.ShowStandardInclude,
  ): Promise<ShowStandard> {
    const showStandard = await this.showStandardRepository.findOne(
      { uid },
      include,
    );
    if (!showStandard) {
      throw HttpError.notFound('Show Standard', uid);
    }
    return showStandard;
  }
}
