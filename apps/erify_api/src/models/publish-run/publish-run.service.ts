import { Injectable } from '@nestjs/common';

import type {
  CreatePublishRunPayload,
  PublishRunListItem,
  PublishRunRecord,
} from './schemas/publish-run.schema';
import { PublishRunRepository } from './publish-run.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

@Injectable()
export class PublishRunService extends BaseModelService {
  static readonly UID_PREFIX = 'prun';
  protected readonly uidPrefix = PublishRunService.UID_PREFIX;

  constructor(
    private readonly publishRunRepository: PublishRunRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async createPublishRun(payload: CreatePublishRunPayload): Promise<PublishRunRecord> {
    const run = await this.publishRunRepository.create({
      ...payload,
      uid: this.generateUid(),
    });

    return this.toPublishRunRecord(run);
  }

  async updatePublishRunSummary(
    id: bigint,
    summary: Record<string, unknown>,
  ): Promise<PublishRunRecord> {
    return this.toPublishRunRecord(
      await this.publishRunRepository.updateSummary(id, summary),
    );
  }

  async getPublishRunByUid(uid: string): Promise<PublishRunRecord | null> {
    const run = await this.publishRunRepository.findByUid(uid);
    return run ? this.toPublishRunRecord(run) : null;
  }

  async getPublishRunsForStudio(
    studioUid: string,
    opts: { skip: number; take: number },
  ): Promise<{ items: PublishRunListItem[]; total: number }> {
    const { items, total } = await this.publishRunRepository.findPaginatedForStudio(studioUid, opts);

    return {
      items: items.map((run) => ({
        ...this.toPublishRunRecord(run),
        schedule: run.schedule,
        triggeredBy: run.triggeredBy,
      })),
      total,
    };
  }

  private toPublishRunRecord(run: {
    id: bigint;
    uid: string;
    source: string;
    summary: unknown;
    createdAt: Date;
  }): PublishRunRecord {
    return {
      id: run.id,
      uid: run.uid,
      source: run.source,
      summary: run.summary,
      createdAt: run.createdAt,
    };
  }
}
