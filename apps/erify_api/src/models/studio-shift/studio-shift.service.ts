import { Injectable } from '@nestjs/common';

import type {
  CreateStudioShiftInput,
  ListMyStudioShiftsQuery,
  ListStudioShiftsQuery,
  UpdateStudioShiftInput,
} from './schemas/studio-shift.schema';
import { StudioShiftRepository } from './studio-shift.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { StudioMembershipService } from '@/models/membership/studio-membership.service';
import { UtilityService } from '@/utility/utility.service';

// Local JSON types — structurally compatible with Prisma's InputJsonValue so that
// metadata objects can be passed to the repository without importing Prisma types here.
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ShiftBlockInput = {
  uid?: string;
  startTime: Date;
  endTime: Date;
  metadata: JsonObject;
};

@Injectable()
export class StudioShiftService extends BaseModelService {
  static readonly UID_PREFIX = 'ssh';
  static readonly BLOCK_UID_PREFIX = 'ssb';
  protected readonly uidPrefix = StudioShiftService.UID_PREFIX;

  constructor(
    private readonly studioShiftRepository: StudioShiftRepository,
    private readonly studioMembershipService: StudioMembershipService,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShift(studioId: string, payload: CreateStudioShiftInput) {
    const normalizedBlocks = this.normalizeAndValidateBlocks(payload.blocks);
    if (payload.status !== 'CANCELLED') {
      await this.ensureNoOverlapInStudio(studioId, payload.userId, normalizedBlocks);
    }
    const membership = await this.findStudioMembershipOrThrow(studioId, payload.userId);

    const hourlyRate = payload.hourlyRate
      ?? this.resolveMembershipHourlyRateOrThrow(membership.baseHourlyRate);

    const projectedCost = this.calculateProjectedCost(hourlyRate, normalizedBlocks);

    return this.studioShiftRepository.createShift({
      uid: this.generateUid(),
      date: payload.date,
      hourlyRate,
      projectedCost,
      ...(payload.calculatedCost !== undefined && {
        calculatedCost: payload.calculatedCost,
      }),
      ...(payload.isApproved !== undefined && { isApproved: payload.isApproved }),
      ...(payload.isDutyManager !== undefined && { isDutyManager: payload.isDutyManager }),
      ...(payload.status && { status: payload.status }),
      metadata: payload.metadata ?? {},
      studio: { connect: { uid: studioId } },
      user: { connect: { uid: payload.userId } },
      blocks: {
        create: normalizedBlocks.map((block) => ({
          uid: this.generateBlockUid(),
          startTime: block.startTime,
          endTime: block.endTime,
          metadata: block.metadata,
        })),
      },
    });
  }

  async findByUidInStudio(studioId: string, uid: string) {
    return this.studioShiftRepository.findByUidInStudio(studioId, uid);
  }

  async listStudioShifts(studioId: string, query: ListStudioShiftsQuery) {
    return this.studioShiftRepository.findPaginated({
      studioId,
      skip: query.skip,
      take: query.take,
      uid: query.uid,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      isDutyManager: query.isDutyManager,
      includeDeleted: query.includeDeleted,
    });
  }

  async listUserShifts(userUid: string, query: ListMyStudioShiftsQuery) {
    return this.studioShiftRepository.findPaginatedForUser({
      userUid,
      studioUid: query.studioId,
      skip: query.skip,
      take: query.take,
      uid: query.uid,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      status: query.status,
      isDutyManager: query.isDutyManager,
      includeDeleted: query.includeDeleted,
    });
  }

  /**
   * @internal
   */
  async findShiftsInWindow(params: Parameters<StudioShiftRepository['findByStudioAndBlockWindow']>[0]) {
    return this.studioShiftRepository.findByStudioAndBlockWindow(params);
  }

  async updateShift(
    studioId: string,
    uid: string,
    payload: Partial<UpdateStudioShiftInput>,
  ) {
    const existing = await this.studioShiftRepository.findByUidInStudio(studioId, uid);
    if (!existing) {
      return null;
    }

    const targetUserId = payload.userId ?? existing.user.uid;

    let hourlyRate = payload.hourlyRate ?? existing.hourlyRate.toString();

    if (payload.userId) {
      const membership = await this.findStudioMembershipOrThrow(studioId, targetUserId);
      if (!payload.hourlyRate) {
        hourlyRate = this.resolveMembershipHourlyRateOrThrow(membership.baseHourlyRate);
      }
    }

    const normalizedBlocks = payload.blocks
      ? this.normalizeAndValidateBlocks(payload.blocks)
      : existing.blocks.map((block) => ({
          startTime: block.startTime,
          endTime: block.endTime,
          metadata: (block.metadata ?? {}) as JsonObject,
        }));

    const nextStatus = payload.status ?? existing.status;
    if (nextStatus !== 'CANCELLED') {
      await this.ensureNoOverlapInStudio(studioId, targetUserId, normalizedBlocks, uid);
    }

    const projectedCost = this.calculateProjectedCost(hourlyRate, normalizedBlocks);

    return this.studioShiftRepository.updateShift(studioId, uid, {
      ...(payload.userId && { user: { connect: { uid: targetUserId } } }),
      ...(payload.date && { date: payload.date }),
      ...(payload.status && { status: payload.status }),
      ...(payload.isDutyManager !== undefined && {
        isDutyManager: payload.isDutyManager,
      }),
      ...(payload.isApproved !== undefined && { isApproved: payload.isApproved }),
      ...(payload.metadata !== undefined && { metadata: payload.metadata }),
      ...(payload.calculatedCost !== undefined && {
        calculatedCost: payload.calculatedCost,
      }),
      hourlyRate,
      projectedCost,
      ...(payload.blocks && {
        blocks: this.buildBlocksUpdateData(normalizedBlocks, existing.blocks),
      }),
    }, existing.id);
  }

  async deleteShift(studioId: string, uid: string) {
    const existing = await this.studioShiftRepository.findByUidInStudio(studioId, uid);
    if (!existing) {
      return null;
    }

    return this.studioShiftRepository.softDeleteInStudio(studioId, uid, existing.id);
  }

  async findActiveDutyManager(studioId: string, timestamp: Date) {
    return this.studioShiftRepository.findActiveDutyManager(studioId, timestamp);
  }

  private async findStudioMembershipOrThrow(
    studioId: string,
    userId: string,
  ) {
    const membership = await this.studioMembershipService.findOne({
      user: { uid: userId },
      studio: { uid: studioId },
      deletedAt: null,
    });

    if (!membership) {
      throw HttpError.badRequest(
        'User must be a member of the studio to create or update a shift.',
      );
    }

    return membership;
  }

  private resolveMembershipHourlyRateOrThrow(baseHourlyRate: { toString: () => string } | null): string {
    if (baseHourlyRate === null) {
      throw HttpError.badRequest(
        'Hourly rate is required. Provide hourly_rate or set base hourly rate in studio membership.',
      );
    }
    return baseHourlyRate.toString();
  }

  private normalizeAndValidateBlocks(blocks: ShiftBlockInput[]): ShiftBlockInput[] {
    if (blocks.length === 0) {
      throw HttpError.badRequest('Shift must contain at least one block');
    }

    const normalizedBlocks = blocks
      .map((block) => ({
        ...block,
        metadata: block.metadata ?? {},
      }))
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    for (let i = 0; i < normalizedBlocks.length; i += 1) {
      const block = normalizedBlocks[i];
      if (block.endTime <= block.startTime) {
        throw HttpError.badRequest('Shift block end_time must be after start_time');
      }

      if (i > 0) {
        const previousBlock = normalizedBlocks[i - 1];
        if (block.startTime < previousBlock.endTime) {
          throw HttpError.badRequest('Shift blocks cannot overlap');
        }
      }
    }

    return normalizedBlocks;
  }

  private calculateProjectedCost(
    hourlyRate: string,
    blocks: ShiftBlockInput[],
  ): string {
    const totalMilliseconds = blocks.reduce(
      (sum, block) => sum + (block.endTime.getTime() - block.startTime.getTime()),
      0,
    );

    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    const rate = Number(hourlyRate);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw HttpError.badRequest('Hourly rate must be a positive number');
    }

    return (totalHours * rate).toFixed(2);
  }

  private generateBlockUid(): string {
    return this.utilityService.generateBrandedId(StudioShiftService.BLOCK_UID_PREFIX);
  }

  private buildBlocksUpdateData(
    blocks: ShiftBlockInput[],
    existingBlocks: Array<{
      uid: string;
      startTime: Date;
      endTime: Date;
      metadata: unknown;
    }>,
  ) {
    const sortedExistingBlocks = this.normalizeAndValidateBlocks(
      existingBlocks.map((block) => ({
        uid: block.uid,
        startTime: block.startTime,
        endTime: block.endTime,
        // metadata always defaults to {} in schema — narrowing cast is safe here
        metadata: (block.metadata ?? {}) as JsonObject,
      })),
    );

    const blocksWithUid = blocks.map((block, index) => ({
      uid: sortedExistingBlocks[index]?.uid ?? this.generateBlockUid(),
      startTime: block.startTime,
      endTime: block.endTime,
      metadata: block.metadata,
    }));

    const retainedUids = blocksWithUid.map((block) => block.uid);
    const deletedAt = new Date();

    return {
      updateMany: {
        where: {
          deletedAt: null,
          uid: {
            notIn: retainedUids,
          },
        },
        data: {
          deletedAt,
        },
      },
      upsert: blocksWithUid.map((block) => ({
        where: { uid: block.uid },
        update: {
          startTime: block.startTime,
          endTime: block.endTime,
          metadata: block.metadata,
          deletedAt: null,
        },
        create: {
          uid: block.uid,
          startTime: block.startTime,
          endTime: block.endTime,
          metadata: block.metadata,
        },
      })),
    };
  }

  private async ensureNoOverlapInStudio(
    studioId: string,
    userUid: string,
    blocks: ShiftBlockInput[],
    excludeShiftUid?: string,
  ) {
    const overlapping = await this.studioShiftRepository.findOverlappingShift({
      studioUid: studioId,
      userUid,
      blocks,
      excludeShiftUid,
    });

    if (overlapping) {
      throw HttpError.badRequest(
        'Shift blocks overlap with an existing non-cancelled shift for this user.',
      );
    }
  }
}
