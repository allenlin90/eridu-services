import { Injectable, NotFoundException } from '@nestjs/common';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';

import { ShowPlatformService } from '@/models/show-platform/show-platform.service';
import { ShowPlatformViolationService } from '@/models/show-platform-violation/show-platform-violation.service';

const DEFAULT_VIOLATION_REASON = 'Operator did not provide a violation reason.';
const DEFAULT_VIOLATION_SEVERITY = 'WARNING';

type ParsedViolation = {
  violationType: string;
  severity: string;
};

@Injectable()
export class ShowPlatformViolationExtractor implements IngestionExtractor {
  readonly factKey = 'show_platform_violation' as const;

  constructor(
    private readonly showPlatformService: ShowPlatformService,
    private readonly showPlatformViolationService: ShowPlatformViolationService,
  ) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const parsedViolations = parseViolationValue(fact.rawValue);
    if (!parsedViolations) {
      return { kind: 'noop', reason: 'value_absent' };
    }

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

    const observedAt = new Date();
    const reason = fact.reason?.trim() || DEFAULT_VIOLATION_REASON;
    const result = await this.showPlatformViolationService.replaceForTaskField({
      showPlatformId: showPlatform.id,
      sourceTaskId: ctx.taskId,
      // Use the hydrated content key, not the template field id, so one
      // platform target cannot supersede another platform's rows when the
      // same template field hydrates across multiple platforms.
      sourceFieldId: fact.contentKey,
      entries: parsedViolations.map((violation) => ({
        violationType: violation.violationType,
        severity: violation.severity,
        reason,
        observedAt,
        metadata: {
          ingestion_source: 'task_submission',
          task_uid: ctx.taskUid,
          task_field_id: fact.sourceFieldId,
        },
      })),
    });

    if (result.created.length === 0 && result.superseded.length === 0) {
      return { kind: 'noop', reason: 'value_unchanged' };
    }

    return {
      kind: 'write',
      action: result.superseded.length > 0 ? 'UPDATE' : 'CREATE',
      oldValue: result.superseded.map(toAuditValue),
      newValue: result.created.map(toAuditValue),
    };
  }
}

function parseViolationValue(rawValue: unknown): ParsedViolation[] | null {
  if (!Array.isArray(rawValue)) {
    return null;
  }

  const violations = rawValue
    .map(parseViolationEntry)
    .filter((entry): entry is ParsedViolation => entry !== null);
  return violations;
}

function parseViolationEntry(entry: unknown): ParsedViolation | null {
  if (typeof entry !== 'string') {
    return null;
  }

  const [rawType, rawSeverity] = entry.split(':', 2);
  const violationType = rawType?.trim().toUpperCase();
  if (!violationType) {
    return null;
  }

  const severity = rawSeverity?.trim().toUpperCase() || DEFAULT_VIOLATION_SEVERITY;
  return { violationType, severity };
}

function toAuditValue(entry: {
  violationType: string;
  severity: string;
}): { violation_type: string; severity: string } {
  return {
    violation_type: entry.violationType,
    severity: entry.severity,
  };
}
