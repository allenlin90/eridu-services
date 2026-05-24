import { Injectable } from '@nestjs/common';
import { ShowCreator } from '@prisma/client';

import type {
  CreateShowCreatorPayload,
  UpdateShowCreatorPayload,
} from './schemas/show-creator.schema';
import { ShowCreatorRepository } from './show-creator.repository';

import { HttpError } from '@/lib/errors/http-error.util';
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
      agreedRate: payload.agreedRate ?? null,
      compensationType: payload.compensationType ?? null,
      commissionRate: payload.commissionRate ?? null,
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
    if (payload.agreedRate !== undefined)
      data.agreedRate = payload.agreedRate;
    if (payload.compensationType !== undefined)
      data.compensationType = payload.compensationType;
    if (payload.commissionRate !== undefined)
      data.commissionRate = payload.commissionRate;
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

  async findActiveByUids(
    uids: string[],
    showId: bigint,
  ): Promise<Map<string, { id: bigint; showId: bigint }>> {
    if (uids.length === 0) {
      return new Map();
    }
    const rows = await this.showCreatorRepository.findMany({
      where: { uid: { in: uids }, showId, deletedAt: null },
    });
    return new Map(rows.map((row) => [row.uid, { id: row.id, showId: row.showId }]));
  }

  async getShowCreatorById(uid: string): Promise<
    ShowCreator & { show?: { startTime: Date } }
  > {
    const showCreator = await this.showCreatorRepository.findByUid(uid, {
      show: { select: { startTime: true } },
    });
    if (!showCreator) {
      throw HttpError.notFound('ShowCreator', uid);
    }
    return showCreator as ShowCreator & { show?: { startTime: Date } };
  }

  ensureValidActualTimeRange(
    currentActualStartTime: Date | null | undefined,
    currentActualEndTime: Date | null | undefined,
    dto: { actualStartTime?: Date | null; actualEndTime?: Date | null },
  ): void {
    const nextActualStart = dto.actualStartTime !== undefined
      ? dto.actualStartTime
      : currentActualStartTime ?? null;
    const nextActualEnd = dto.actualEndTime !== undefined
      ? dto.actualEndTime
      : currentActualEndTime ?? null;

    if (nextActualStart && nextActualEnd && nextActualEnd <= nextActualStart) {
      throw HttpError.badRequest('Actual end time must be after actual start time');
    }
  }

  async updateActuals(
    uid: string,
    showId: bigint,
    payload: {
      actualStartTime?: Date;
      actualEndTime?: Date;
      attendanceMissing?: boolean;
      attendanceReason?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const result = await this.showCreatorRepository.updateMany(
      { uid, showId, deletedAt: null },
      {
        ...(payload.actualStartTime !== undefined ? { actualStartTime: payload.actualStartTime } : {}),
        ...(payload.actualEndTime !== undefined ? { actualEndTime: payload.actualEndTime } : {}),
        ...(payload.attendanceMissing !== undefined ? { attendanceMissing: payload.attendanceMissing } : {}),
        ...(payload.attendanceReason !== undefined ? { attendanceReason: payload.attendanceReason } : {}),
        ...(payload.metadata !== undefined ? { metadata: payload.metadata as never } : {}),
      },
    );
    if (result.count === 0) {
      throw HttpError.notFound('ShowCreator', uid);
    }
  }
}
