import { Injectable } from '@nestjs/common';
import { ShowMC } from '@prisma/client';

import type {
  CreateShowCreatorPayload,
  UpdateShowCreatorPayload,
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
    payload: CreateShowCreatorPayload,
  ): ReturnType<ShowMcRepository['createByUids']> {
    const uid = this.generateUid();
    return this.showMcRepository.createByUids(uid, {
      showUid: payload.showId,
      mcUid: payload.creatorId,
      note: payload.note,
      agreedRate: payload.agreedRate,
      compensationType: payload.compensationType,
      commissionRate: payload.commissionRate,
      metadata: payload.metadata,
    });
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
    payload: UpdateShowCreatorPayload,
  ): ReturnType<ShowMcRepository['update']> {
    const data: Record<string, any> = {};

    if (payload.note !== undefined)
      data.note = payload.note;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;
    if (payload.agreedRate !== undefined)
      data.agreedRate = payload.agreedRate;
    if (payload.compensationType !== undefined)
      data.compensationType = payload.compensationType;
    if (payload.commissionRate !== undefined)
      data.commissionRate = payload.commissionRate;

    if (payload.showId !== undefined) {
      data.show = { connect: { uid: payload.showId } };
    }

    if (payload.creatorId !== undefined) {
      data.mc = { connect: { uid: payload.creatorId } };
    }

    return this.showMcRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowMcRepository['softDelete']> {
    return this.showMcRepository.softDelete({ uid });
  }
}
