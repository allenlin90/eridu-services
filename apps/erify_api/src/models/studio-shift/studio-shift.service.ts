import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type {
  BlocksReplacePayload,
  CreateStudioShiftInput,
  ListMyStudioShiftsQuery,
  ListStudioShiftsQuery,
  UpdateStudioShiftBlockInput,
  UpdateStudioShiftInput,
} from './schemas/studio-shift.schema';
import { StudioShiftRepository } from './studio-shift.repository';

import { appendSnapshotAudit, isSnapshotValueEqual } from '@/lib/audit/snapshot-audit.helper';
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
  actualStartTime?: Date | null;
  actualEndTime?: Date | null;
  metadata: Record<string, any>;
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
    this.assertPositiveHourlyRate(hourlyRate);

    return this.studioShiftRepository.createShift({
      uid: this.generateUid(),
      date: payload.date,
      hourlyRate,
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
          actualStartTime: block.actualStartTime,
          actualEndTime: block.actualEndTime,
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
    actorExtId = 'system',
  ) {
    const existing = await this.studioShiftRepository.findByUidInStudio(studioId, uid);
    if (!existing) {
      return null;
    }

    const targetUserId = payload.userId ?? existing.user.uid;

    let hourlyRate = payload.hourlyRate ?? existing.hourlyRate.toString();

    // Re-derive hourly rate from membership only on an actual reassignment (different user).
    // Sending the same user_id in a PATCH payload (e.g. alongside is_duty_manager) must not
    // trigger membership lookup or throw "Hourly rate is required" for members without a
    // baseHourlyRate — the shift already has a valid stored rate in that case.
    const isReassignment = payload.userId && payload.userId !== existing.user.uid;
    if (isReassignment) {
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
          actualStartTime: block.actualStartTime,
          actualEndTime: block.actualEndTime,
          metadata: (block.metadata ?? {}) as JsonObject,
        }));

    const nextStatus = payload.status ?? existing.status;
    if (nextStatus !== 'CANCELLED') {
      await this.ensureNoOverlapInStudio(studioId, targetUserId, normalizedBlocks, uid);
    }
    this.assertPositiveHourlyRate(hourlyRate);

    const blocksPayload = payload.blocks
      ? this.buildBlocksReplacePayload(normalizedBlocks, existing.blocks)
      : undefined;
    const snapshotChanges = isSnapshotValueEqual(existing.hourlyRate, hourlyRate)
      ? []
      : [{ field: 'hourly_rate', old_value: existing.hourlyRate, new_value: hourlyRate }];
    const metadata = appendSnapshotAudit(
      this.mergeMetadata(existing.metadata, payload.metadata),
      snapshotChanges,
      actorExtId,
      payload.overrideReason,
    ) as JsonObject;

    return this.studioShiftRepository.updateShift(studioId, uid, {
      ...(payload.userId && { user: { connect: { uid: targetUserId } } }),
      ...(payload.date && { date: payload.date }),
      ...(payload.status && { status: payload.status }),
      ...(payload.isDutyManager !== undefined && {
        isDutyManager: payload.isDutyManager,
      }),
      ...(payload.isApproved !== undefined && { isApproved: payload.isApproved }),
      ...(payload.metadata !== undefined && { metadata: payload.metadata }),
      ...((payload.metadata !== undefined || snapshotChanges.length > 0) && { metadata }),
      hourlyRate,
    }, existing.id, blocksPayload);
  }

  async updateShiftBlock(
    studioId: string,
    shiftUid: string,
    blockUid: string,
    payload: UpdateStudioShiftBlockInput,
    actorExtId = 'system',
  ) {
    const existing = await this.studioShiftRepository.findByUidInStudio(studioId, shiftUid);
    if (!existing) {
      return null;
    }

    const targetBlock = existing.blocks.find((block) => block.uid === blockUid);
    if (!targetBlock) {
      return null;
    }

    const blocks = existing.blocks.map((block) => ({
      uid: block.uid,
      startTime: block.uid === blockUid
        ? payload.startTime ?? block.startTime
        : block.startTime,
      endTime: block.uid === blockUid
        ? payload.endTime ?? block.endTime
        : block.endTime,
      actualStartTime: block.uid === blockUid
        ? payload.actualStartTime !== undefined
          ? payload.actualStartTime
          : block.actualStartTime
        : block.actualStartTime,
      actualEndTime: block.uid === blockUid
        ? payload.actualEndTime !== undefined
          ? payload.actualEndTime
          : block.actualEndTime
        : block.actualEndTime,
      metadata: block.uid === blockUid
        ? payload.metadata ?? ((block.metadata ?? {}) as JsonObject)
        : (block.metadata ?? {}) as JsonObject,
    }));

    return this.updateShift(studioId, shiftUid, { blocks }, actorExtId);
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

      if (block.actualStartTime && block.actualEndTime && block.actualEndTime <= block.actualStartTime) {
        throw HttpError.badRequest('Shift block actual_end_time must be after actual_start_time');
      }
    }

    return normalizedBlocks;
  }

  private assertPositiveHourlyRate(hourlyRate: string): void {
    let rate: Prisma.Decimal;
    try {
      rate = new Prisma.Decimal(hourlyRate);
    } catch {
      throw HttpError.badRequest('Hourly rate must be a positive number');
    }
    if (!rate.isFinite() || rate.lte(0)) {
      throw HttpError.badRequest('Hourly rate must be a positive number');
    }
  }

  private generateBlockUid(): string {
    return this.utilityService.generateBrandedId(StudioShiftService.BLOCK_UID_PREFIX);
  }

  private buildBlocksReplacePayload(
    blocks: ShiftBlockInput[],
    existingBlocks: Array<{
      uid: string;
      startTime: Date;
      endTime: Date;
      actualStartTime: Date | null;
      actualEndTime: Date | null;
      metadata: unknown;
    }>,
  ): BlocksReplacePayload {
    const sortedExistingBlocks = this.normalizeAndValidateBlocks(
      existingBlocks.map((block) => ({
        uid: block.uid,
        startTime: block.startTime,
        endTime: block.endTime,
        actualStartTime: block.actualStartTime,
        actualEndTime: block.actualEndTime,
        // metadata always defaults to {} in schema — narrowing cast is safe here
        metadata: (block.metadata ?? {}) as JsonObject,
      })),
    );

    const existingBlockUids = new Set(sortedExistingBlocks.map((block) => block.uid));
    const blocksToUpsert = blocks.map((block, index) => ({
      uid: block.uid && existingBlockUids.has(block.uid)
        ? block.uid
        : sortedExistingBlocks[index]?.uid ?? this.generateBlockUid(),
      startTime: block.startTime,
      endTime: block.endTime,
      actualStartTime: block.actualStartTime,
      actualEndTime: block.actualEndTime,
      metadata: block.metadata,
    }));

    return {
      blocksToUpsert,
      retainedUids: blocksToUpsert.map((block) => block.uid),
    };
  }

  private mergeMetadata(existing: unknown, incoming: unknown): Record<string, unknown> {
    return {
      ...this.toMetadataObject(existing),
      ...this.toMetadataObject(incoming),
    };
  }

  private toMetadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
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
