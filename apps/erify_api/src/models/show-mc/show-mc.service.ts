import { Injectable } from '@nestjs/common';
import { Prisma, ShowMC } from '@prisma/client';

import { CreateShowMcDto, UpdateShowMcDto } from './schemas/show-mc.schema';
import { ShowMcRepository } from './show-mc.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

type ShowMCWithIncludes<T extends Prisma.ShowMCInclude> =
  Prisma.ShowMCGetPayload<{
    include: T;
  }>;

@Injectable()
export class ShowMcService extends BaseModelService {
  static readonly UID_PREFIX = 'show_mc';
  protected readonly uidPrefix = ShowMcService.UID_PREFIX;

  constructor(
    private readonly showMcRepository: ShowMcRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Generates a show MC UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowMcUid(): string {
    return this.generateUid();
  }

  async createShowMcFromDto<
    T extends Prisma.ShowMCInclude = Record<string, never>,
  >(
    dto: CreateShowMcDto,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    const data = this.buildCreatePayload(dto);
    return this.createShowMc(data, include);
  }

  async createShowMc<T extends Prisma.ShowMCInclude = Record<string, never>>(
    data: Omit<Prisma.ShowMCCreateInput, 'uid'>,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    const uid = this.generateUid();
    return this.showMcRepository.create({ ...data, uid }, include);
  }

  async getShowMcById<T extends Prisma.ShowMCInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    return this.findShowMcOrThrow(uid, include);
  }

  async getShowMcs<T extends Prisma.ShowMCInclude = Record<string, never>>(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ShowMCWhereInput;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
    },
    include?: T,
  ): Promise<ShowMC[] | ShowMCWithIncludes<T>[]> {
    return this.showMcRepository.findMany({ ...params, include });
  }

  async getActiveShowMcs(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.ShowMCOrderByWithRelationInput;
    include?: Prisma.ShowMCInclude;
  }): Promise<ShowMC[]> {
    return this.showMcRepository.findActiveShowMcs(params);
  }

  async getShowMcsByShow(
    showId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
      include?: Prisma.ShowMCInclude;
    },
  ): Promise<ShowMC[]> {
    return this.showMcRepository.findByShow(showId, params);
  }

  async getShowMcsByMc(
    mcId: bigint,
    params?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
      include?: Prisma.ShowMCInclude;
    },
  ): Promise<ShowMC[]> {
    return this.showMcRepository.findByMc(mcId, params);
  }

  async findShowMcByShowAndMc(
    showId: bigint,
    mcId: bigint,
  ): Promise<ShowMC | null> {
    return this.showMcRepository.findByShowAndMc(showId, mcId);
  }

  async countShowMcs(where?: Prisma.ShowMCWhereInput): Promise<number> {
    return this.showMcRepository.count(where ?? {});
  }

  async listShowMcs<T extends Prisma.ShowMCInclude = Record<string, never>>(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ShowMCWhereInput;
      orderBy?: Prisma.ShowMCOrderByWithRelationInput;
    },
    include?: T,
  ): Promise<{ data: ShowMC[] | ShowMCWithIncludes<T>[]; total: number }> {
    const [data, total] = await Promise.all([
      this.showMcRepository.findMany({ ...params, include }),
      this.showMcRepository.count(params.where ?? {}),
    ]);

    return { data, total };
  }

  async updateShowMcFromDto<
    T extends Prisma.ShowMCInclude = Record<string, never>,
  >(
    uid: string,
    dto: UpdateShowMcDto,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    const data = this.buildUpdatePayload(dto);
    return this.updateShowMc(uid, data, include);
  }

  async updateShowMc<T extends Prisma.ShowMCInclude = Record<string, never>>(
    uid: string,
    data: Prisma.ShowMCUpdateInput,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    await this.findShowMcOrThrow(uid);
    return this.showMcRepository.update({ uid }, data, include);
  }

  async deleteShowMc(uid: string): Promise<ShowMC> {
    await this.findShowMcOrThrow(uid);
    return this.showMcRepository.softDelete({ uid });
  }

  private async findShowMcOrThrow<
    T extends Prisma.ShowMCInclude = Record<string, never>,
  >(uid: string,
    include?: T,
  ): Promise<ShowMC | ShowMCWithIncludes<T>> {
    const showMc = await this.showMcRepository.findByUid(uid, include);
    if (!showMc) {
      throw HttpError.notFound('ShowMC', uid);
    }
    return showMc;
  }

  private buildCreatePayload(
    dto: CreateShowMcDto,
  ): Omit<Prisma.ShowMCCreateInput, 'uid'> {
    return {
      note: dto.note ?? null,
      metadata: dto.metadata ?? {},
      show: { connect: { uid: dto.showId } },
      mc: { connect: { uid: dto.mcId } },
    };
  }

  private buildUpdatePayload(dto: UpdateShowMcDto): Prisma.ShowMCUpdateInput {
    const payload: Prisma.ShowMCUpdateInput = {};

    if (dto.note !== undefined)
      payload.note = dto.note;
    if (dto.metadata !== undefined)
      payload.metadata = dto.metadata;

    if (dto.showId !== undefined) {
      payload.show = { connect: { uid: dto.showId } };
    }

    if (dto.mcId !== undefined) {
      payload.mc = { connect: { uid: dto.mcId } };
    }

    return payload;
  }
}
