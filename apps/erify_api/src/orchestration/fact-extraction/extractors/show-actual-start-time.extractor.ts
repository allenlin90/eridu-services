import { Injectable } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowService } from '@/models/show/show.service';

import { canResolverOverwrite } from '../source-priority';

type ShowMetadata = {
  actuals_source?: Partial<Record<string, ActualsSource>>;
  [key: string]: unknown;
};

@Injectable()
export class ShowActualStartTimeExtractor implements IngestionExtractor {
  readonly factKey = 'show_actual_start_time' as const;

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

    // Re-validate the target at extraction time — the show could have been
    // soft-deleted between submission and processing. The fact's targetUid
    // for show-scoped facts matches the task's bound show.
    if (fact.targetUid !== ctx.showUid) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const show = await this.showService.getShowById(ctx.showUid);
    const metadata = (show.metadata as ShowMetadata | null) ?? {};
    const recordedSource = metadata.actuals_source?.[fact.factKey] as ActualsSource | undefined;
    const currentValue = show.actualStartTime;

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

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: ShowMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    await this.showService.updateShow(ctx.showUid, {
      actualStartTime: incoming,
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

function parseDateTimeValue(raw: unknown): Date | null {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
