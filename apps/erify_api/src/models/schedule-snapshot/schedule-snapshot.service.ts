import { Injectable } from '@nestjs/common';
import { Prisma, ScheduleSnapshot } from '@prisma/client';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';

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
    data: Omit<Prisma.ScheduleSnapshotCreateInput, 'uid'>,
  ): Promise<ScheduleSnapshot> {
    const uid = this.generateUid();
    return this.scheduleSnapshotRepository.create({ ...data, uid });
  }

  getScheduleSnapshotById(
    uid: string,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot> {
    return this.findScheduleSnapshotOrThrow(uid, include);
  }

  async findScheduleSnapshotById(id: bigint): Promise<ScheduleSnapshot | null> {
    return this.scheduleSnapshotRepository.findOne({ id });
  }

  async getScheduleSnapshots(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ScheduleSnapshotWhereInput;
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: Prisma.ScheduleSnapshotInclude;
  }): Promise<ScheduleSnapshot[]> {
    return this.scheduleSnapshotRepository.findMany(params);
  }

  async getSnapshotsByScheduleId(
    scheduleId: bigint,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot[]> {
    return this.scheduleSnapshotRepository.findByScheduleId(
      scheduleId,
      include,
    );
  }

  async getSnapshotByScheduleIdAndVersion(
    scheduleId: bigint,
    version: number,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot | null> {
    return this.scheduleSnapshotRepository.findByScheduleIdAndVersion(
      scheduleId,
      version,
      include,
    );
  }

  async countScheduleSnapshots(
    where?: Prisma.ScheduleSnapshotWhereInput,
  ): Promise<number> {
    return this.scheduleSnapshotRepository.count(where ?? {});
  }

  async updateScheduleSnapshot(
    uid: string,
    data: Prisma.ScheduleSnapshotUpdateInput,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot> {
    await this.findScheduleSnapshotOrThrow(uid);
    return this.scheduleSnapshotRepository.update({ uid }, data, include);
  }

  async deleteScheduleSnapshot(uid: string): Promise<ScheduleSnapshot> {
    await this.findScheduleSnapshotOrThrow(uid);
    // Use hard delete since snapshots don't support soft delete
    return this.scheduleSnapshotRepository.delete({ uid });
  }

  private async findScheduleSnapshotOrThrow(
    uid: string,
    include?: Prisma.ScheduleSnapshotInclude,
  ): Promise<ScheduleSnapshot> {
    const snapshot = await this.scheduleSnapshotRepository.findByUid(
      uid,
      include,
    );
    if (!snapshot) {
      throw HttpError.notFound('ScheduleSnapshot', uid);
    }
    return snapshot;
  }
}
