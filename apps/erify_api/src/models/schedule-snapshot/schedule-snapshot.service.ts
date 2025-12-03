import { Injectable } from '@nestjs/common';
import { Prisma, ScheduleSnapshot } from '@prisma/client';

import { ScheduleSnapshotRepository } from './schedule-snapshot.repository';

import { HttpError } from '@/lib/errors/http-error.util';
import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

type ScheduleSnapshotWithIncludes<T extends Prisma.ScheduleSnapshotInclude> =
  Prisma.ScheduleSnapshotGetPayload<{
    include: T;
  }>;

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

  getScheduleSnapshotById<
    T extends Prisma.ScheduleSnapshotInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<ScheduleSnapshot | ScheduleSnapshotWithIncludes<T>> {
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
    T extends Prisma.ScheduleSnapshotInclude = Record<string, never>,
  >(
    uid: string,
    include?: T,
  ): Promise<ScheduleSnapshot | ScheduleSnapshotWithIncludes<T>> {
    const snapshot = await this.scheduleSnapshotRepository.findByUid(
      uid,
      include,
    );
    if (!snapshot) {
      throw HttpError.notFound('ScheduleSnapshot', uid);
    }
    return snapshot as ScheduleSnapshot | ScheduleSnapshotWithIncludes<T>;
  }
}
