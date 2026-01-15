import { Injectable } from '@nestjs/common';
import { MC, Prisma } from '@prisma/client';

import { CreateMcDto, UpdateMcDto } from './schemas/mc.schema';
import { McRepository } from './mc.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

type MCWithIncludes<T extends Prisma.MCInclude> = Prisma.MCGetPayload<{
  include: T;
}>;

@Injectable()
export class McService extends BaseModelService {
  static readonly UID_PREFIX = 'mc';
  protected readonly uidPrefix = McService.UID_PREFIX;

  constructor(
    private readonly mcRepository: McRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createMcFromDto<T extends Prisma.MCInclude = Record<string, never>>(
    dto: CreateMcDto,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createMc(data, include);
  }

  async createMc<T extends Prisma.MCInclude = Record<string, never>>(
    data: Omit<Prisma.MCCreateInput, 'uid'>,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    if (data.user?.connect?.uid) {
      const [mc] = await this.mcRepository.findMany({
        where: { user: { uid: data.user.connect.uid } },
        take: 1,
      });

      if (mc) {
        throw HttpError.badRequest('user is already a mc');
      }
    }

    const uid = this.generateUid();
    return this.mcRepository.create({ ...data, uid }, include);
  }

  async getMcById<T extends Prisma.MCInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    return this.findMcOrThrow(uid, include);
  }

  async getMcs<T extends Prisma.MCInclude = Record<string, never>>(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.MCWhereInput;
    },
    include?: T,
  ): Promise<MC[] | MCWithIncludes<T>[]> {
    return this.mcRepository.findMany({ ...params, include });
  }

  async getActiveMcs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.MCOrderByWithRelationInput;
  }): Promise<MC[]> {
    return this.mcRepository.findActiveMCs(params);
  }

  async countMcs(where?: Prisma.MCWhereInput): Promise<number> {
    return this.mcRepository.count(where ?? {});
  }

  async listMcs<T extends Prisma.MCInclude = Record<string, never>>(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.MCWhereInput;
    },
    include?: T,
  ): Promise<{ data: MC[] | MCWithIncludes<T>[]; total: number }> {
    const [data, total] = await Promise.all([
      this.mcRepository.findMany({ ...params, include }),
      this.mcRepository.count(params.where ?? {}),
    ]);

    return { data, total };
  }

  async updateMcFromDto<T extends Prisma.MCInclude = Record<string, never>>(
    uid: string,
    dto: UpdateMcDto,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateMc(uid, data, include);
  }

  async updateMc<T extends Prisma.MCInclude = Record<string, never>>(
    uid: string,
    data: Prisma.MCUpdateInput,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    if (data.user?.connect?.uid) {
      const [mc] = await this.mcRepository.findMany({
        where: { user: { uid: data.user.connect.uid } },
        take: 1,
      });

      if (mc && mc.uid !== uid) {
        throw HttpError.badRequest('user is already a mc');
      }
    }

    return this.mcRepository.update({ uid }, data, include);
  }

  async deleteMc(uid: string): Promise<MC> {
    await this.findMcOrThrow(uid);
    return this.mcRepository.softDelete({ uid });
  }

  private async findMcOrThrow<
    T extends Prisma.MCInclude = Record<string, never>,
  >(uid: string,
    include?: T,
  ): Promise<MC | MCWithIncludes<T>> {
    const mc = await this.mcRepository.findByUid(uid, include);
    if (!mc) {
      throw HttpError.notFound('MC', uid);
    }
    return mc;
  }

  private buildCreatePayload(
    dto: CreateMcDto,
  ): Omit<Prisma.MCCreateInput, 'uid'> {
    return {
      name: dto.name,
      aliasName: dto.aliasName,
      metadata: dto.metadata ?? {},
      ...(dto.userId && { user: { connect: { uid: dto.userId } } }),
    };
  }

  private buildUpdatePayload(dto: UpdateMcDto): Prisma.MCUpdateInput {
    const payload: Prisma.MCUpdateInput = {};

    if (dto.name !== undefined)
      payload.name = dto.name;
    if (dto.aliasName !== undefined)
      payload.aliasName = dto.aliasName;
    if (dto.isBanned !== undefined)
      payload.isBanned = dto.isBanned;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;

    if (dto.userId !== undefined) {
      payload.user = dto.userId
        ? { connect: { uid: dto.userId } }
        : { disconnect: true };
    }

    return payload;
  }
}
