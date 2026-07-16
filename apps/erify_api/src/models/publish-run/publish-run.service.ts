import { Injectable } from '@nestjs/common';
import type { PublishRun } from '@prisma/client';

import type { CreatePublishRunPayload } from './schemas/publish-run.schema';
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

  async createPublishRun(payload: CreatePublishRunPayload): Promise<PublishRun> {
    return this.publishRunRepository.create({
      ...payload,
      uid: this.generateUid(),
    });
  }

  async updatePublishRunSummary(
    id: bigint,
    summary: Record<string, unknown>,
  ): Promise<PublishRun> {
    return this.publishRunRepository.updateSummary(id, summary);
  }

  async getPublishRunByUid(uid: string): Promise<PublishRun | null> {
    return this.publishRunRepository.findByUid(uid);
  }

  async getPublishRunsForStudio(
    ...params: Parameters<PublishRunRepository['findPaginatedForStudio']>
  ): ReturnType<PublishRunRepository['findPaginatedForStudio']> {
    return this.publishRunRepository.findPaginatedForStudio(...params);
  }
}
