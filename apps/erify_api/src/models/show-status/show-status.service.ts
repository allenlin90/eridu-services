import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

import type {
  CreateShowStatusPayload,
  ListShowStatusesParams,
  ShowStatusFilter,
  ShowStatusRecord,
  UpdateShowStatusPayload,
} from './schemas/show-status.schema';
import { SHOW_STATUS_UID_PREFIX } from './show-status-uid.util';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class ShowStatusService extends BaseModelService {
  static readonly UID_PREFIX = SHOW_STATUS_UID_PREFIX;
  protected readonly uidPrefix = ShowStatusService.UID_PREFIX;

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma>,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createShowStatus(
    payload: CreateShowStatusPayload,
  ): Promise<ShowStatusRecord> {
    const uid = this.generateUid();
    return this.txHost.tx.showStatus.create({
      data: { ...payload, uid },
    });
  }

  async getShowStatusById(uid: string): Promise<ShowStatusRecord | null> {
    return this.txHost.tx.showStatus.findFirst({
      where: { uid, deletedAt: null },
    });
  }

  async getShowStatusBySystemKey(
    systemKey: string,
  ): Promise<ShowStatusRecord | null> {
    return this.txHost.tx.showStatus.findFirst({
      where: { systemKey, deletedAt: null },
    });
  }

  async getShowStatuses(
    params: ListShowStatusesParams,
  ): Promise<{ data: ShowStatusRecord[]; total: number }> {
    const where = { ...params.where, deletedAt: null };
    const [data, total] = await Promise.all([
      this.txHost.tx.showStatus.findMany({
        skip: params.skip,
        take: params.take,
        where,
        orderBy: params.orderBy
          ? { createdAt: params.orderBy }
          : undefined,
      }),
      this.txHost.tx.showStatus.count({ where }),
    ]);

    return { data, total };
  }

  async countShowStatuses(
    where: ShowStatusFilter = {},
  ): Promise<number> {
    return this.txHost.tx.showStatus.count({
      where: { ...where, deletedAt: null },
    });
  }

  async updateShowStatus(
    uid: string,
    payload: UpdateShowStatusPayload,
  ): Promise<ShowStatusRecord> {
    return this.txHost.tx.showStatus.update({
      where: { uid, deletedAt: null },
      data: payload,
    });
  }

  async deleteShowStatus(
    where: { uid: string },
  ): Promise<ShowStatusRecord> {
    return this.txHost.tx.showStatus.update({
      where: { ...where, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
