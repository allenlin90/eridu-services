import { Injectable, NotFoundException } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import { canResolverOverwrite } from '../source-priority';

import { LATE_REASON_FALLBACK } from './creator-attendance-reasons';
import { parseDateTimeValue } from './datetime-value';
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
export class CreatorActualStartTimeExtractor implements IngestionExtractor {
  readonly factKey = 'creator_actual_start_time' as const;

  constructor(private readonly showCreatorService: ShowCreatorService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const incoming = parseDateTimeValue(fact.rawValue);
    if (!incoming) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    let showCreator: Awaited<ReturnType<ShowCreatorService['getShowCreatorById']>>;
    try {
      showCreator = await this.showCreatorService.getShowCreatorById(
        fact.targetUid,
        { includeShow: true },
      );
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
    const currentValue = showCreator.actualStartTime;

    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource!,
        attemptedValue: incoming.toISOString(),
      };
    }

    const trimmedReason = typeof fact.reason === 'string' ? fact.reason.trim() : '';
    const isLate = showCreator.show?.startTime ? incoming > showCreator.show.startTime : false;
    // Resolve what the late reason should be after this write:
    //   - operator-supplied sidecar wins (real text)
    //   - else preserve whatever is already in the column (real operator
    //     text from a prior submission OR our own fallback) — this avoids
    //     downgrading a real reason back to the fallback when a retry /
    //     edit omits the sidecar
    //   - else seed the system fallback (first write, no sidecar)
    const resolvedLateReason: string | null = isLate
      ? trimmedReason || showCreator.attendanceReason || LATE_REASON_FALLBACK
      : null;
    // Drift detection: a write is only necessary when the resolved value
    // actually differs from what's stored. A first write with no sidecar
    // followed by a resubmission carrying a real reason must still flush
    // the column, while a same-time retry without a sidecar must NOT
    // rewrite the existing reason.
    const lateReasonDrifted = resolvedLateReason !== null
      && resolvedLateReason !== showCreator.attendanceReason;
    const timeUnchanged = currentValue !== null
      && currentValue.getTime() === incoming.getTime()
      && recordedSource === ctx.source;

    if (timeUnchanged && !lateReasonDrifted) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    this.showCreatorService.ensureValidActualTimeRange(
      showCreator.actualStartTime,
      showCreator.actualEndTime,
      { actualStartTime: incoming },
    );

    const nextActualsSource = {
      ...(metadata.actuals_source ?? {}),
      [fact.factKey]: ctx.source,
    };
    const nextMetadata: CreatorMetadata = {
      ...metadata,
      actuals_source: nextActualsSource,
    };

    // `attendanceReason` is a single column shared with the
    // `creator_attendance_missing` extractor. On a corrected on-time start
    // we deliberately do NOT clear it — the stored reason may belong to a
    // prior `attendance_missing = true` write and clearing it here would
    // erase context owned by a different fact. PR 12.2 keeps the two
    // channels write-only; a future PR may split the column.
    try {
      await this.showCreatorService.updateActuals(fact.targetUid, ctx.showId, {
        actualStartTime: incoming,
        ...(lateReasonDrifted ? { attendanceReason: resolvedLateReason } : {}),
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
      action: currentValue ? 'UPDATE' : 'CREATE',
      oldValue: currentValue ? currentValue.toISOString() : null,
      newValue: incoming.toISOString(),
    };
  }
}
