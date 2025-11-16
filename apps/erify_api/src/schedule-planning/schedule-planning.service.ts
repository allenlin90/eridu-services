import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { HttpError } from '@/common/errors/http-error.util';
import { ScheduleService } from '@/models/schedule/schedule.service';
import { ScheduleSnapshotService } from '@/models/schedule-snapshot/schedule-snapshot.service';
import { PrismaService } from '@/prisma/prisma.service';

import { PublishingService, ScheduleWithRelations } from './publishing.service';
import {
  PlanDocument,
  ValidationResult,
} from './schemas/schedule-planning.schema';
import { ValidationService } from './validation.service';

@Injectable()
export class SchedulePlanningService {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly scheduleSnapshotService: ScheduleSnapshotService,
    private readonly validationService: ValidationService,
    private readonly publishingService: PublishingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Validates a schedule before publishing.
   *
   * @param scheduleUid - The schedule UID to validate
   * @returns Validation result with errors if any
   */
  async validateSchedule(scheduleUid: string): Promise<ValidationResult> {
    const schedule = await this.scheduleService.getScheduleById(scheduleUid, {
      client: true,
    });

    if (!schedule) {
      throw HttpError.notFound('Schedule', scheduleUid);
    }

    const planDocument = schedule.planDocument as PlanDocument;
    if (!planDocument || !planDocument.shows) {
      throw HttpError.badRequest('Invalid plan document structure');
    }

    return this.validationService.validateSchedule({
      id: schedule.id,
      uid: schedule.uid,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      planDocument,
      clientId: schedule.clientId,
    });
  }

  /**
   * Publishes a schedule by syncing the JSON plan document to normalized Show tables.
   *
   * @param scheduleUid - The schedule UID to publish
   * @param version - The version number for optimistic locking
   * @param userId - The user ID publishing the schedule
   * @returns The published schedule with creation stats
   */
  async publishSchedule(
    scheduleUid: string,
    version: number,
    userId: bigint,
  ): Promise<{
    schedule: ScheduleWithRelations;
    showsCreated: number;
    showsDeleted: number;
  }> {
    return this.publishingService.publish(scheduleUid, version, userId);
  }

  /**
   * Restores a schedule from a snapshot.
   *
   * @param snapshotUid - The snapshot UID to restore from
   * @param userId - The user ID performing the restore
   * @returns The restored schedule
   */
  async restoreFromSnapshot(snapshotUid: string, userId: bigint) {
    // Get snapshot with schedule
    const snapshot = await this.scheduleSnapshotService.getScheduleSnapshotById(
      snapshotUid,
      {
        schedule: {
          include: {
            client: true,
            createdByUser: true,
          },
        },
        user: true,
      },
    );

    if (!snapshot) {
      throw HttpError.notFound('ScheduleSnapshot', snapshotUid);
    }

    // Type assertion for snapshot with schedule relation
    const snapshotWithSchedule = snapshot as typeof snapshot & {
      schedule: {
        id: bigint;
        uid: string;
        status: string;
        planDocument: Prisma.JsonValue;
        version: number;
        clientId: bigint;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        client?: {
          uid: string;
          name: string;
        } | null;
        createdByUser?: {
          uid: string;
          name: string;
        } | null;
      };
    };

    const schedule = snapshotWithSchedule.schedule;

    if (!schedule) {
      throw HttpError.notFound('Schedule', snapshotUid);
    }

    // Cannot restore published schedules directly
    if (schedule.status === 'published') {
      throw HttpError.badRequest(
        'Cannot restore published schedules. Please unpublish first or create a new schedule from the snapshot.',
      );
    }

    // Execute restore in a transaction
    return this.prisma.executeTransaction(async (tx) => {
      // 1. Create a snapshot of current state before restore (for rollback)
      await this.scheduleSnapshotService.createScheduleSnapshot({
        schedule: { connect: { id: schedule.id } },
        planDocument: schedule.planDocument as Prisma.InputJsonValue,
        version: schedule.version,
        status: schedule.status,
        snapshotReason: 'before_restore',
        user: { connect: { id: userId } },
      });

      // 2. Restore plan document from snapshot
      const restoredSchedule = await tx.schedule.update({
        where: { id: schedule.id },
        data: {
          planDocument: snapshot.planDocument as Prisma.InputJsonValue,
          version: schedule.version + 1,
          updatedAt: new Date(),
        },
        include: {
          client: true,
          createdByUser: true,
          publishedByUser: true,
        },
      });

      return restoredSchedule;
    });
  }

  /**
   * Gets all snapshots for a schedule.
   *
   * @param scheduleUid - The schedule UID
   * @param filters - Optional filters
   * @returns List of snapshots
   */
  async getSnapshotsBySchedule(
    scheduleUid: string,
    filters?: {
      limit?: number;
      orderBy?: 'asc' | 'desc';
    },
  ) {
    const schedule = await this.scheduleService.getScheduleById(scheduleUid);

    // Use database-level sorting and limiting for better performance
    return this.scheduleSnapshotService.getScheduleSnapshots({
      where: { scheduleId: schedule.id },
      orderBy: { createdAt: filters?.orderBy || 'desc' },
      take: filters?.limit,
      include: {
        user: {
          select: {
            uid: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Creates a snapshot for a schedule (manual snapshot).
   *
   * @param scheduleUid - The schedule UID
   * @param reason - The reason for the snapshot
   * @param userId - The user ID creating the snapshot
   * @returns The created snapshot
   */
  async createManualSnapshot(
    scheduleUid: string,
    reason: string,
    userId: bigint,
  ) {
    const schedule = await this.scheduleService.getScheduleById(scheduleUid);

    return this.scheduleSnapshotService.createScheduleSnapshot({
      schedule: { connect: { id: schedule.id } },
      planDocument: schedule.planDocument as Prisma.InputJsonValue,
      version: schedule.version,
      status: schedule.status,
      snapshotReason: reason || 'manual',
      user: { connect: { id: userId } },
    });
  }
}
