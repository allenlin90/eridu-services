import { Injectable } from '@nestjs/common';
import { Prisma, Studio } from '@prisma/client';

import { StudioRepository } from './studio.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class StudioService extends BaseModelService {
  static readonly UID_PREFIX = 'std';
  protected readonly uidPrefix = StudioService.UID_PREFIX;

  constructor(
    private readonly studioRepository: StudioRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createStudio(
    data: Omit<Prisma.StudioCreateInput, 'uid'>,
  ): Promise<Studio> {
    const uid = this.generateUid();
    return this.studioRepository.create({ ...data, uid });
  }

  getStudioById(uid: string, include?: Prisma.StudioInclude): Promise<Studio> {
    return this.findStudioOrThrow(uid, include);
  }

  async findStudioById(id: bigint): Promise<Studio | null> {
    return this.studioRepository.findOne({ id });
  }

  async getStudios(params: {
    skip?: number;
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Studio[]> {
    return this.studioRepository.findMany(params);
  }

  async countStudios(): Promise<number> {
    return this.studioRepository.count({});
  }

  async listStudios(query: {
    skip?: number;
    take?: number;
    name?: string;
    uid?: string;
    include_deleted?: boolean;
  }): Promise<{ data: Studio[]; total: number }> {
    const where: Prisma.StudioWhereInput = {};

    if (!query.include_deleted) {
      where.deletedAt = null;
    }

    if (query.name) {
      where.name = {
        contains: query.name,
        mode: 'insensitive',
      };
    }

    if (query.uid) {
      where.uid = {
        contains: query.uid,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.studioRepository.findMany({
        skip: query.skip,
        take: query.take,
        where,
      }),
      this.studioRepository.count(where),
    ]);

    return { data, total };
  }

  async updateStudio(
    uid: string,
    data: Prisma.StudioUpdateInput,
  ): Promise<Studio> {
    return this.studioRepository.update({ uid }, data);
  }

  async deleteStudio(uid: string): Promise<Studio> {
    return this.studioRepository.softDelete({ uid });
  }

  private async findStudioOrThrow(
    uid: string,
    include?: Prisma.StudioInclude,
  ): Promise<Studio> {
    const studio = await this.studioRepository.findOne({ uid }, include);
    if (!studio) {
      throw HttpError.notFound('Studio', uid);
    }
    return studio;
  }
}
