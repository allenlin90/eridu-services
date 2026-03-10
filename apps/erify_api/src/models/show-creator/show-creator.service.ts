import { Injectable } from '@nestjs/common';
import { ShowMC } from '@prisma/client';

import type {
  CreateShowCreatorPayload,
  UpdateShowCreatorPayload,
} from './schemas/show-creator.schema';
import { ShowCreatorRepository } from './show-creator.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { CreatorRepository } from '@/models/creator/creator.repository';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowCreatorService extends BaseModelService {
  static readonly UID_PREFIX = 'show_mc';
  protected readonly uidPrefix = ShowCreatorService.UID_PREFIX;

  constructor(
    private readonly showCreatorRepository: ShowCreatorRepository,
    private readonly creatorRepository: CreatorRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  /**
   * Generates a show creator UID.
   * Public wrapper for generateUid() to allow external services to generate UIDs.
   */
  generateShowCreatorUid(): string {
    return this.generateUid();
  }

  async create(
    payload: CreateShowCreatorPayload,
  ): ReturnType<ShowCreatorRepository['createByUids']> {
    const uid = this.generateUid();
    return this.showCreatorRepository.createByUids(uid, {
      showUid: payload.showId,
      creatorUid: payload.creatorId,
      // Backward-compatible alias expected by existing tests/callers.
      mcUid: payload.creatorId,
      note: payload.note,
      agreedRate: payload.agreedRate,
      compensationType: payload.compensationType,
      commissionRate: payload.commissionRate,
      metadata: payload.metadata,
    });
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
  ): Promise<ShowMC | null> {
    const records = await this.showCreatorRepository.findMany({
      where: { showId, mcId: creatorId, deletedAt: null },
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

    return this.showCreatorRepository.update({ uid }, data);
  }

  async softDelete(uid: string): ReturnType<ShowCreatorRepository['softDelete']> {
    return this.showCreatorRepository.softDelete({ uid });
  }

  /**
   * Adds a creator to a show, restoring a soft-deleted assignment if one exists.
   */
  async addCreatorToShow(
    showId: bigint,
    creatorUid: string,
    params: {
      note?: string;
      agreedRate?: number;
      compensationType?: string;
      commissionRate?: number;
    },
  ): Promise<ShowMC> {
    const creator = await this.creatorRepository.findByUid(creatorUid);
    if (!creator) {
      throw HttpError.notFound('Creator not found');
    }

    const existing = await this.showCreatorRepository.findMany({
      where: { showId, mcId: creator.id },
    });
    const existingRecord = existing[0];

    const rateFields = {
      agreedRate: params.agreedRate !== undefined ? params.agreedRate.toFixed(2) : undefined,
      compensationType: params.compensationType,
      commissionRate: params.commissionRate !== undefined ? params.commissionRate.toFixed(2) : undefined,
    };

    if (existingRecord) {
      if (existingRecord.deletedAt === null) {
        throw HttpError.badRequest('Creator is already assigned to this show');
      }
      const restored = await this.showCreatorRepository.restoreAndUpdateAssignment(existingRecord.id, {
        note: params.note,
        ...rateFields,
      });
      return (await this.showCreatorRepository.findByUid(restored.uid, { show: true, mc: true }))!;
    }

    const uid = this.generateUid();
    const created = await this.showCreatorRepository.createAssignment({
      uid,
      showId,
      mcId: creator.id,
      note: params.note,
      ...rateFields,
    });
    return (await this.showCreatorRepository.findByUid(created.uid, { show: true, mc: true }))!;
  }

  /**
   * Removes a creator from a show by soft-deleting the assignment.
   */
  async removeCreatorFromShow(showId: bigint, creatorUid: string): Promise<ShowMC> {
    const creator = await this.creatorRepository.findByUid(creatorUid);
    if (!creator) {
      throw HttpError.notFound('Creator not found');
    }

    const assignments = await this.showCreatorRepository.findMany({
      where: { showId, mcId: creator.id, deletedAt: null },
      include: { show: true, mc: true },
    });

    const assignment = assignments[0];
    if (!assignment) {
      throw HttpError.notFound('Creator is not assigned to this show');
    }

    await this.showCreatorRepository.softDelete({ id: assignment.id });
    return assignment;
  }
}

// TODO(deprecate): Remove MC alias once all consumers migrate to Creator naming
export { ShowCreatorService as ShowMcService };
