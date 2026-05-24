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
export class ShowPlatformActualStartTimeExtractor implements IngestionExtractor {
  readonly factKey = 'show_platform_actual_start_time' as const;

  constructor(private readonly showPlatformService: ShowPlatformService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const incoming = parseDateTimeValue(fact.rawValue);
    if (!incoming) {
      // Field-level validation should have caught this at submission time;
      // refusing to write here keeps a malformed value from blanking the column.
      return { kind: 'noop', reason: 'value_absent' };
    }

    // Stale-target guard: hydration ran at submission time, so a target that
    // was un-assigned (soft-deleted) between submit + extract must not be
    // written. Defence-in-depth: the service also pre-filters via
    // `resolveAuditTargetIds`, but extractors stay independently safe in
    // case a future caller invokes them directly.
    //
    // Only `NotFoundException` collapses to a stale-target noop — every
    // other error (Prisma outage, transient connection failure, etc.)
    // propagates so the outer service catch reports it as `extractor_error`
    // and the failure stays visible. Silently swallowing all errors here
    // would misclassify production incidents as routine stale assignments.
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
    const currentValue = showPlatform.actualStartTime;

    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource!,
        attemptedValue: incoming.toISOString(),
      };
    }

    // Idempotency: short-circuit a resubmission of the already-recorded
    // value BEFORE validating the time range. Otherwise a harmless retry
    // against a platform whose stored pair is already inverted surfaces as
    // `extractor_error` even though no column would have moved.
    if (currentValue && currentValue.getTime() === incoming.getTime() && recordedSource === ctx.source) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    // One-sided update path: validates the incoming start against the
    // stored end. Submissions that carry BOTH start + end for the same
    // platform target never reach this extractor — they are routed to
    // `FactExtractionProcessor.applyPairedShowPlatformActuals` so the
    // priority check + merged-pair validation + paired column write all
    // commit (or roll back) inside a single transaction.
    this.showPlatformService.ensureValidActualTimeRange(
      showPlatform.actualStartTime,
      showPlatform.actualEndTime,
      { actualStartTime: incoming },
    );

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: ShowPlatformMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    try {
      await this.showPlatformService.updateActuals(fact.targetUid, ctx.showId, {
        actualStartTime: incoming,
        metadata: nextMetadata,
      });
    } catch (err) {
      // Concurrent soft-delete race: the read above saw an active row but
      // `updateActuals` filters by `deletedAt: null`, so the write
      // throws `NotFoundException` when the platform was deleted between
      // read and write. Collapse to `target_stale` (same as the prefetch
      // race) so no audit / column write claims a soft-deleted target.
      if (err instanceof NotFoundException) {
        return { kind: 'noop', reason: 'target_stale' };
      }
      throw err;
    }

    return {
      kind: 'write',
      action: currentValue ? 'UPDATE' : 'CREATE',
      oldValue: currentValue ? currentValue.toISOString() : null,
      newValue: incoming.toISOString(),
    };
  }
}
