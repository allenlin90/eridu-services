import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SystemFactKey } from '@eridu/api-types/task-management';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

export const POST_PRODUCTION_TEMPLATE_UID = 'ttpl_n6f7qAZQmPA4He6MOR-y';

export abstract class BasePlatformPerformanceExtractor implements IngestionExtractor {
  abstract readonly factKey: SystemFactKey;
  abstract readonly dbField: 'gmv' | 'viewerCount' | 'ctr' | 'cto';

  constructor(protected readonly showPlatformService: ShowPlatformService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const incomingValue = Number(fact.rawValue);
    if (Number.isNaN(incomingValue)) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    let showPlatform;
    try {
      showPlatform = await this.showPlatformService.getShowPlatformById(fact.targetUid);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { kind: 'noop', reason: 'target_stale' };
      }
      throw err;
    }

    if (!showPlatform || showPlatform.showId !== ctx.showId) {
      return { kind: 'noop', reason: 'target_stale' };
    }

    // Precedence rule check:
    // If the currently recorded template for this metric was the post-production check,
    // we only allow overrides from the post-production check itself.
    const metadata = (showPlatform.metadata as Record<string, any> | null) ?? {};
    const recordedTemplate = metadata.performance_templates?.[this.factKey];
    if (
      recordedTemplate === POST_PRODUCTION_TEMPLATE_UID
      && ctx.templateUid !== POST_PRODUCTION_TEMPLATE_UID
    ) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: 'OPERATOR',
        attemptedValue: incomingValue,
      };
    }

    const currentValue = showPlatform[this.dbField];
    const isDecimal = this.dbField !== 'viewerCount';

    // Check if the value has changed
    const currentNum = currentValue !== null ? Number(currentValue) : null;
    if (currentNum === incomingValue && recordedTemplate === ctx.templateUid) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    // Prepare metadata
    const nextPerformanceTemplates = {
      ...(metadata.performance_templates ?? {}),
      [this.factKey]: ctx.templateUid ?? '',
    };
    const nextMetadata = {
      ...metadata,
      performance_templates: nextPerformanceTemplates,
    };

    // Prepare update data
    const updateData: Record<string, any> = {
      metadata: nextMetadata,
    };
    if (isDecimal) {
      updateData[this.dbField] = new Prisma.Decimal(incomingValue);
    } else {
      updateData[this.dbField] = incomingValue;
    }

    try {
      await this.showPlatformService.updatePerformanceMetrics(
        fact.targetUid,
        ctx.showId,
        updateData,
      );
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { kind: 'noop', reason: 'target_stale' };
      }
      throw err;
    }

    return {
      kind: 'write',
      action: currentValue !== null ? 'UPDATE' : 'CREATE',
      oldValue: currentValue !== null ? currentValue.toString() : null,
      newValue: incomingValue.toString(),
    };
  }
}

@Injectable()
export class PlatformGmvExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'platform_gmv' as const;
  readonly dbField = 'gmv' as const;
}

@Injectable()
export class PlatformViewCountExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'platform_view_count' as const;
  readonly dbField = 'viewerCount' as const;
}

@Injectable()
export class PlatformCtrExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'platform_ctr' as const;
  readonly dbField = 'ctr' as const;
}

@Injectable()
export class PlatformCtoExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'platform_cto' as const;
  readonly dbField = 'cto' as const;
}
