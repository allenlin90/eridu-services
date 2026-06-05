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

    const isDecimal = this.dbField !== 'viewerCount';

    // Parse + validate the incoming value. Decimal-backed metrics (GMV, CTR,
    // CTO) are built straight from the raw value so monetary / percentage
    // precision is never truncated through a JS float; the view count is an
    // integer counter. An unparseable value is treated as "not recorded".
    let incomingDecimal: Prisma.Decimal | null = null;
    let incomingViewCount = 0;
    if (isDecimal) {
      try {
        incomingDecimal = new Prisma.Decimal(fact.rawValue as Prisma.Decimal.Value);
      } catch {
        return { kind: 'noop', reason: 'value_absent' };
      }
      if (!incomingDecimal.isFinite()) {
        return { kind: 'noop', reason: 'value_absent' };
      }
    } else {
      incomingViewCount = Number(fact.rawValue);
      if (!Number.isFinite(incomingViewCount)) {
        return { kind: 'noop', reason: 'value_absent' };
      }
    }

    const attemptedValue = isDecimal ? incomingDecimal!.toString() : incomingViewCount;

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
        skippedBy: ctx.source,
        attemptedValue,
      };
    }

    const currentValue = showPlatform[this.dbField];

    // Resubmission of the same value by the same template is a no-op. Decimal
    // columns compare via `Decimal.equals` so 5.25 and 5.250 are treated as
    // equal without re-introducing float drift.
    const unchanged = isDecimal
      ? currentValue !== null && incomingDecimal!.equals(currentValue as Prisma.Decimal)
      : currentValue === incomingViewCount;
    if (unchanged && recordedTemplate === ctx.templateUid) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    // Prepare metadata
    const nextMetadata = {
      ...metadata,
      performance_templates: {
        ...(metadata.performance_templates ?? {}),
        [this.factKey]: ctx.templateUid ?? '',
      },
    };

    const updateData: Record<string, any> = {
      metadata: nextMetadata,
      [this.dbField]: isDecimal ? incomingDecimal : incomingViewCount,
    };

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
      newValue: isDecimal ? incomingDecimal!.toString() : String(incomingViewCount),
    };
  }
}

@Injectable()
export class PlatformGmvExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_gmv' as const;
  readonly dbField = 'gmv' as const;
}

@Injectable()
export class PlatformViewCountExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_view_count' as const;
  readonly dbField = 'viewerCount' as const;
}

@Injectable()
export class PlatformCtrExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_ctr' as const;
  readonly dbField = 'ctr' as const;
}

@Injectable()
export class PlatformCtoExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_cto' as const;
  readonly dbField = 'cto' as const;
}
