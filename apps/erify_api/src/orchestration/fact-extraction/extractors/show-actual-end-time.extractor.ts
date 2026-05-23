import { Injectable } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import { canResolverOverwrite } from '../source-priority';

import { parseDateTimeValue } from './datetime-value';
import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowService } from '@/models/show/show.service';

type ShowMetadata = {
  actuals_source?: Partial<Record<string, ActualsSource>>;
  [key: string]: unknown;
};

@Injectable()
export class ShowActualEndTimeExtractor implements IngestionExtractor {
  readonly factKey = 'show_actual_end_time' as const;

  constructor(private readonly showService: ShowService) {}

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

    // No explicit stale-target check for show scope: `fact.targetUid` is set
    // to `ctx.showUid` by construction in `collectBoundFacts`, so they cannot
    // disagree here. The 12.1.x / 12.2 creator + platform extractors will
    // need a real assignment lookup (the target uid points at a ShowCreator
    // / ShowPlatform that may have been unassigned between submission and
    // extraction). `getShowById` below also throws if the show has been
    // soft-deleted, which gives us the practical target-still-exists guard
    // for this scope.
    const show = await this.showService.getShowById(ctx.showUid);
    const metadata = (show.metadata as ShowMetadata | null) ?? {};
    const recordedSource = metadata.actuals_source?.[fact.factKey] as ActualsSource | undefined;
    const currentValue = show.actualEndTime;

    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource!,
        attemptedValue: incoming.toISOString(),
      };
    }

    // Validate time range against the merged same-submission pair, not just
    // the stored start. If this submission also carries an `actualStartTime`
    // fact, both halves are evaluated together so a valid paired edit
    // (e.g., 10:00–11:00 → 12:00–13:00) is not rejected based on the order
    // in which the orchestrator happens to process the two facts. With no
    // paired start on the submission, `ensureValidActualTimeRange` falls
    // back to the stored start via its `undefined` semantics.
    this.showService.ensureValidActualTimeRange(
      show.actualStartTime,
      show.actualEndTime,
      {
        actualEndTime: incoming,
        ...(ctx.incomingShowActuals?.actualStartTime !== undefined
          ? { actualStartTime: ctx.incomingShowActuals.actualStartTime }
          : {}),
      },
    );

    if (currentValue && currentValue.getTime() === incoming.getTime() && recordedSource === ctx.source) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: ShowMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    await this.showService.updateShow(ctx.showUid, {
      actualEndTime: incoming,
      metadata: nextMetadata as unknown as Parameters<ShowService['updateShow']>[1]['metadata'],
    });

    return {
      kind: 'write',
      action: currentValue ? 'UPDATE' : 'CREATE',
      oldValue: currentValue ? currentValue.toISOString() : null,
      newValue: incoming.toISOString(),
    };
  }
}
