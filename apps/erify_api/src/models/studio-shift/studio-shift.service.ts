import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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

type ShiftBlockInput = {
  startTime: Date;
  endTime: Date;
  metadata: Record<string, Prisma.JsonValue>;
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
          metadata: block.metadata as Record<string, Prisma.JsonValue>,
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
        blocks: {
          deleteMany: {},
          create: normalizedBlocks.map((block) => ({
            uid: this.generateBlockUid(),
            startTime: block.startTime,
            endTime: block.endTime,
            metadata: block.metadata,
          })),
        },
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
