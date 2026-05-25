import { Injectable } from '@nestjs/common';

import {
  CreateShowPlatformViolationRecord,
  ShowPlatformViolationRepository,
  ShowPlatformViolationTaskFieldScope,
} from './show-platform-violation.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

export type ShowPlatformViolationEntry = Omit<
  CreateShowPlatformViolationRecord,
  'uid' | 'showPlatformId' | 'sourceTaskId' | 'sourceFieldId'
>;

export type ShowPlatformViolationSummary = {
  uid: string;
  violationType: string;
  severity: string;
};

@Injectable()
export class ShowPlatformViolationService extends BaseModelService {
  static readonly UID_PREFIX = 'spv';
  protected readonly uidPrefix = ShowPlatformViolationService.UID_PREFIX;

  constructor(
    private readonly showPlatformViolationRepository: ShowPlatformViolationRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async replaceForTaskField(
    input: ShowPlatformViolationTaskFieldScope & { entries: ShowPlatformViolationEntry[] },
  ): Promise<{
      created: ShowPlatformViolationSummary[];
      superseded: ShowPlatformViolationSummary[];
    }> {
    const scope = {
      showPlatformId: input.showPlatformId,
      sourceTaskId: input.sourceTaskId,
      sourceFieldId: input.sourceFieldId,
    };
    const superseded = await this.showPlatformViolationRepository.findActiveByTaskField(scope);
    if (superseded.length > 0) {
      await this.showPlatformViolationRepository.supersedeActiveByTaskField(scope, new Date());
    }

    const records: CreateShowPlatformViolationRecord[] = input.entries.map((entry) => ({
      uid: this.generateUid(),
      showPlatformId: input.showPlatformId,
      sourceTaskId: input.sourceTaskId,
      sourceFieldId: input.sourceFieldId,
      violationType: entry.violationType,
      severity: entry.severity,
      reason: entry.reason,
      observedAt: entry.observedAt,
      metadata: entry.metadata,
    }));

    if (records.length > 0) {
      await this.showPlatformViolationRepository.createMany(records);
    }

    return {
      created: records.map((record) => ({
        uid: record.uid,
        violationType: record.violationType,
        severity: record.severity,
      })),
      superseded,
    };
  }
}
