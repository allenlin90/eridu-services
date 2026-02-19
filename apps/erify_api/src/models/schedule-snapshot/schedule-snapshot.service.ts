import { Injectable } from '@nestjs/common';
import { ScheduleSnapshot } from '@prisma/client';

import {
  ScheduleSnapshotCreatePayload,
  ScheduleSnapshotInclude,
  ScheduleSnapshotWhereInput,
  ScheduleSnapshotWithRelations,
} from './schemas/schedule-snapshot.schema';
import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ScheduleSnapshotService extends BaseModelService {
  static readonly UID_PREFIX = 'snapshot';
  protected readonly uidPrefix = ScheduleSnapshotService.UID_PREFIX;

  constructor(
    private readonly scheduleSnapshotRepository: ScheduleSnapshotRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createScheduleSnapshot(
    data: ScheduleSnapshotCreatePayload,
  ): Promise<ScheduleSnapshot> {
    const uid = this.generateUid();
    return this.scheduleSnapshotRepository.create({ ...data, uid });
  }

  getScheduleSnapshotById<T extends ScheduleSnapshotInclude = Record<string, never>>(
    uid: string,
    include?: T,
  ): Promise<ScheduleSnapshot | ScheduleSnapshotWithRelations<T>> {
    return this.findScheduleSnapshotOrThrow(uid, include);
  }

  async findScheduleSnapshotById(id: bigint): Promise<ScheduleSnapshot | null> {
    return this.scheduleSnapshotRepository.findOne({ id });
  }

  async getScheduleSnapshots(params: {
    skip?: number;
    take?: number;
    where?: ScheduleSnapshotWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: ScheduleSnapshotInclude;
  }): Promise<ScheduleSnapshot[]> {
    return this.scheduleSnapshotRepository.findMany(params);
  }

  async getSnapshotsByScheduleId(
    scheduleId: bigint,
    include?: ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot[]> {
    return this.scheduleSnapshotRepository.findByScheduleId(scheduleId, include);
  }

  async getSnapshotByScheduleIdAndVersion(
    scheduleId: bigint,
    version: number,
    include?: ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.scheduleSnapshotRepository.findByScheduleIdAndVersion(
      scheduleId,
      version,
      include,
    );
  }

  async countScheduleSnapshots(where?: ScheduleSnapshotWhereInput): Promise<number> {
    return this.scheduleSnapshotRepository.count(where ?? {});
  }

  async listScheduleSnapshots(params: {
    skip?: number;
    take?: number;
    where?: ScheduleSnapshotWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: ScheduleSnapshotInclude;
  }): Promise<{ data: ScheduleSnapshot[]; total: number }> {
    const [data, total] = await Promise.all([
      this.scheduleSnapshotRepository.findMany(params),
      this.scheduleSnapshotRepository.count(params.where ?? {}),
    ]);

    return { data, total };
  }

  /**
   * Update is not supported for snapshots - they are immutable.
   * @throws HttpError.badRequest if called
   */
  updateScheduleSnapshot(): never {
    throw HttpError.badRequest(
      'ScheduleSnapshot does not support update - snapshots are immutable',
    );
  }

  async deleteScheduleSnapshot(uid: string): Promise<ScheduleSnapshot> {
    await this.findScheduleSnapshotOrThrow(uid);
    // Use hard delete since snapshots don't support soft delete
    return this.scheduleSnapshotRepository.delete({ uid });
  }

  private async findScheduleSnapshotOrThrow<
    T extends ScheduleSnapshotInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<ScheduleSnapshot | ScheduleSnapshotWithRelations<T>> {
    const snapshot = await this.scheduleSnapshotRepository.findByUid(uid, include);
    if (!snapshot) {
      throw HttpError.notFound('ScheduleSnapshot', uid);
    }
    return snapshot as ScheduleSnapshot | ScheduleSnapshotWithRelations<T>;
  }
}
