import { Injectable } from '@nestjs/common';
import { ShowMC } from '@prisma/client';

import type {
  CreateShowMcPayload,
  UpdateShowMcPayload,
} from './schemas/show-mc.schema';
import { ShowMcRepository } from './show-mc.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

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

  async create(
    payload: CreateShowMcPayload,
  ): ReturnType<ShowMcRepository['create']> {
    const uid = this.generateUid();

    const data = {
      note: payload.note ?? null,
      metadata: payload.metadata ?? {},
      show: { connect: { uid: payload.showId } },
      mc: { connect: { uid: payload.mcId } },
      uid,
    };

    return this.showMcRepository.create(data);
  }

  async findOne(
    ...args: Parameters<ShowMcRepository['findByUid']>
  ): ReturnType<ShowMcRepository['findByUid']> {
    return this.showMcRepository.findByUid(...args);
  }

  async findPaginated(
    ...args: Parameters<ShowMcRepository['findPaginated']>
  ): ReturnType<ShowMcRepository['findPaginated']> {
    return this.showMcRepository.findPaginated(...args);
  }

  async findByShowAndMc(
    showId: bigint,
    mcId: bigint,
  ): Promise<ShowMC | null> {
    const records = await this.showMcRepository.findMany({
      where: { showId, mcId, deletedAt: null },
    });
    return records[0] || null;
  }

  async update(
    uid: string,
    payload: UpdateShowMcPayload,
  ): ReturnType<ShowMcRepository['update']> {
    const data: Record<string, any> = {};

    if (payload.note !== undefined)
      data.note = payload.note;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.showId !== undefined) {
      data.show = { connect: { uid: payload.showId } };
    }

    if (payload.mcId !== undefined) {
      data.mc = { connect: { uid: payload.mcId } };
    }

    return this.showMcRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowMcRepository['softDelete']> {
    return this.showMcRepository.softDelete({ uid });
  }
}
