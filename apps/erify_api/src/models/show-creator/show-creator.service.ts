import { Injectable } from '@nestjs/common';
import { ShowCreator } from '@prisma/client';

import type {
  CreateShowCreatorPayload,
  UpdateShowCreatorPayload,
} from './schemas/show-creator.schema';
import { ShowCreatorRepository } from './show-creator.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowCreatorService extends BaseModelService {
  static readonly UID_PREFIX = 'show_mc';
  protected readonly uidPrefix = ShowCreatorService.UID_PREFIX;

  constructor(
    private readonly showCreatorRepository: ShowCreatorRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Generates a show Creator UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowCreatorUid(): string {
    return this.generateUid();
  }

  async create(
    payload: CreateShowCreatorPayload,
  ): ReturnType<ShowCreatorRepository['create']> {
    const uid = this.generateUid();

    const data = {
      note: payload.note ?? null,
      metadata: payload.metadata ?? {},
      show: { connect: { uid: payload.showId } },
      creator: { connect: { uid: payload.creatorId } },
      uid,
    };

    return this.showCreatorRepository.create(data);
  }

  async findOne(
    ...args: Parameters<ShowCreatorRepository['findByUid']>
  ): ReturnType<ShowCreatorRepository['findByUid']> {
    return this.showCreatorRepository.findByUid(...args);
  }

  async findPaginated(
    ...args: Parameters<ShowCreatorRepository['findPaginated']>
  ): ReturnType<ShowCreatorRepository['findPaginated']> {
    return this.showCreatorRepository.findPaginated(...args);
  }

  async findByShowAndCreator(
    showId: bigint,
    creatorId: bigint,
  ): Promise<ShowCreator | null> {
    const records = await this.showCreatorRepository.findMany({
      where: { showId, creatorId, deletedAt: null },
    });
    return records[0] || null;
  }

  async update(
    uid: string,
    payload: UpdateShowCreatorPayload,
  ): ReturnType<ShowCreatorRepository['update']> {
    const data: Record<string, any> = {};

    if (payload.note !== undefined)
      data.note = payload.note;
    if (payload.metadata !== undefined)
      data.metadata = payload.metadata;

    if (payload.showId !== undefined) {
      data.show = { connect: { uid: payload.showId } };
    }

    if (payload.creatorId !== undefined) {
      data.creator = { connect: { uid: payload.creatorId } };
    }

    return this.showCreatorRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowCreatorRepository['softDelete']> {
    return this.showCreatorRepository.softDelete({ uid });
  }
}
