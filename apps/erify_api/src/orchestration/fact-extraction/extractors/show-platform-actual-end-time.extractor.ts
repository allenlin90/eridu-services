import { Injectable, NotFoundException } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import { canResolverOverwrite } from '../source-priority';

import { parseDateTimeValue } from './datetime-value';
import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

type ShowPlatformMetadata = {
  actuals_source?: Partial<Record<string, ActualsSource>>;
  [key: string]: unknown;
};

@Injectable()
export class ShowPlatformActualEndTimeExtractor implements IngestionExtractor {
  readonly factKey = 'show_platform_actual_end_time' as const;

  constructor(private readonly showPlatformService: ShowPlatformService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const incoming = parseDateTimeValue(fact.rawValue);
    if (!incoming) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    // See `show-platform-actual-start-time.extractor.ts` for the rationale:
    // only `NotFoundException` collapses to a stale-target noop; every
    // other error propagates so the outer service catch reports it as
    // `extractor_error` and the failure stays visible.
    let showPlatform: Awaited<ReturnType<ShowPlatformService['getShowPlatformById']>>;
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

    const metadata = (showPlatform.metadata as ShowPlatformMetadata | null) ?? {};
    const recordedSource = metadata.actuals_source?.[fact.factKey] as ActualsSource | undefined;
    const currentValue = showPlatform.actualEndTime;

    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource!,
        attemptedValue: incoming.toISOString(),
      };
    }

    if (currentValue && currentValue.getTime() === incoming.getTime() && recordedSource === ctx.source) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    this.showPlatformService.ensureValidActualTimeRange(
      showPlatform.actualStartTime,
      showPlatform.actualEndTime,
      { actualEndTime: incoming },
    );

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: ShowPlatformMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    await this.showPlatformService.updateActuals(fact.targetUid, {
      actualEndTime: incoming,
      metadata: nextMetadata,
    });

    return {
      kind: 'write',
      action: currentValue ? 'UPDATE' : 'CREATE',
      oldValue: currentValue ? currentValue.toISOString() : null,
      newValue: incoming.toISOString(),
    };
  }
}
