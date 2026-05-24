import { Injectable, NotFoundException } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import { canResolverOverwrite } from '../source-priority';

import { MISSING_REASON_FALLBACK } from './creator-attendance-reasons';
import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowCreatorService } from '@/models/show-creator/show-creator.service';

type CreatorMetadata = {
  actuals_source?: Partial<Record<string, ActualsSource>>;
  [key: string]: unknown;
};

@Injectable()
export class CreatorAttendanceMissingExtractor implements IngestionExtractor {
  readonly factKey = 'creator_attendance_missing' as const;

  constructor(private readonly showCreatorService: ShowCreatorService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const incoming = parseBooleanValue(fact.rawValue);
    if (incoming === null) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    let showCreator: Awaited<ReturnType<ShowCreatorService['getShowCreatorById']>>;
    try {
      showCreator = await this.showCreatorService.getShowCreatorById(fact.targetUid);
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { kind: 'noop', reason: 'target_stale' };
      }
      throw err;
    }
    if (!showCreator || showCreator.showId !== ctx.showId) {
      return { kind: 'noop', reason: 'target_stale' };
    }

    const metadata = (showCreator.metadata as CreatorMetadata | null) ?? {};
    const recordedSource = metadata.actuals_source?.[fact.factKey] as ActualsSource | undefined;
    const currentValue = showCreator.attendanceMissing;

    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource!,
        attemptedValue: incoming,
      };
    }

    const trimmedReason = typeof fact.reason === 'string' ? fact.reason.trim() : '';
    const startCoSubmitted = fact.coSubmittedFactKeysForTarget?.has('creator_actual_start_time') ?? false;
    // `attendanceReason` is shared with `creator_actual_start_time`. The
    // start extractor may run earlier in this same submission and write a
    // late-arrival reason; we must not erase it. We deliberately read
    // co-submission from the current run rather than persisted
    // `metadata.actuals_source` — historical writes from a long-past
    // task shouldn't trap a stale absence reason on a creator who is no
    // longer marked missing.
    //   - flag=true:                                  write real / fallback missing reason.
    //   - flag=true→false AND start NOT co-submitted: clear (our prior no-show note).
    //   - flag=true→false AND start IS  co-submitted: leave alone (late-start owns it).
    //   - flag=false→false:                           never touch the column.
    let desiredReason: string | null | undefined;
    if (incoming) {
      desiredReason = trimmedReason || MISSING_REASON_FALLBACK;
    } else if (currentValue === true && !startCoSubmitted) {
      desiredReason = null;
    } else {
      desiredReason = undefined;
    }
    // Reason drift: a first write with no sidecar stores the system
    // fallback; a later resubmission with the same flag value but a
    // real reason must still flush the column, otherwise the operator's
    // actual reason stays masked. Symmetric with the start-time
    // extractor's late-reason drift check.
    const reasonDrifted = desiredReason !== undefined
      && desiredReason !== showCreator.attendanceReason;

    if (currentValue === incoming && recordedSource === ctx.source && !reasonDrifted) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: CreatorMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    try {
      await this.showCreatorService.updateActuals(fact.targetUid, ctx.showId, {
        attendanceMissing: incoming,
        ...(desiredReason !== undefined ? { attendanceReason: desiredReason } : {}),
        metadata: nextMetadata,
      });
    } catch (err) {
      if (err instanceof NotFoundException) {
        return { kind: 'noop', reason: 'target_stale' };
      }
      throw err;
    }

    return {
      kind: 'write',
      action: 'UPDATE',
      oldValue: currentValue,
      newValue: incoming,
    };
  }
}

function parseBooleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
}
