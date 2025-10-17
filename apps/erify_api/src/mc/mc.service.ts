import { Injectable } from '@nestjs/common';
import { MC, Prisma } from '@prisma/client';

import { HttpError } from '../common/errors/http-error.util';
import { PRISMA_ERROR } from '../common/errors/prisma-error-codes';
import { UtilityService } from '../utility/utility.service';
import { McRepository } from './mc.repository';
import { CreateMcDto, UpdateMcDto } from './schemas/mc.schema';

@Injectable()
export class McService {
  static readonly UID_PREFIX = 'mc';

  constructor(
    private readonly mcRepository: McRepository,
    private readonly utilityService: UtilityService,
  ) {}

  async createMc(data: CreateMcDto): Promise<MC> {
    const uid = this.utilityService.generateBrandedId(McService.UID_PREFIX);
    const payload = { ...data, uid };

    try {
      return await this.mcRepository.create(payload);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('MC already exists');
      }
      throw error;
    }
  }

  async getMcById(uid: string): Promise<MC> {
    const mc = await this.mcRepository.findByUid(uid);
    if (!mc) {
      throw HttpError.notFound('MC', uid);
    }
    return mc;
  }

  async updateMc(uid: string, data: UpdateMcDto): Promise<MC> {
    const mc = await this.mcRepository.findByUid(uid);
    if (!mc) {
      throw HttpError.notFound('MC', uid);
    }
    try {
      return await this.mcRepository.update({ uid }, data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR.UniqueConstraint
      ) {
        throw HttpError.conflict('MC already exists');
      }
      throw error;
    }
  }

  async getMcs(params: {
    skip?: number;
    take?: number;
    where?: Prisma.MCWhereInput;
  }): Promise<MC[]> {
    const { skip, take, where } = params;
    return this.mcRepository.findMany({ skip, take, where });
  }

  async countMcs(where?: Prisma.MCWhereInput): Promise<number> {
    return this.mcRepository.count(where ?? ({} as Prisma.MCWhereInput));
  }

  async deleteMc(uid: string): Promise<MC> {
    const mc = await this.mcRepository.findByUid(uid);
    if (!mc) {
      throw HttpError.notFound('MC', uid);
    }
    return this.mcRepository.softDelete({ uid });
  }

  async getActiveMcs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.MCOrderByWithRelationInput;
  }): Promise<MC[]> {
    return this.mcRepository.findActiveMCs(params);
  }
}
