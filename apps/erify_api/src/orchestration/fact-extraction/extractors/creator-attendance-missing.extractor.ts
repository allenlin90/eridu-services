import { Injectable, NotFoundException } from '@nestjs/common';

import type { ActualsSource } from '@eridu/api-types/audits';

import { canResolverOverwrite } from '../source-priority';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowCreatorService } from '@/models/show-creator/show-creator.service';

const MISSING_REASON_FALLBACK = 'Missing attendance reason was not provided by the task field.';

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

    if (currentValue === incoming && recordedSource === ctx.source) {
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
    const trimmedReason = typeof fact.reason === 'string' ? fact.reason.trim() : '';

    try {
      await this.showCreatorService.updateActuals(fact.targetUid, ctx.showId, {
        attendanceMissing: incoming,
        attendanceReason: incoming ? trimmedReason || MISSING_REASON_FALLBACK : null,
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
