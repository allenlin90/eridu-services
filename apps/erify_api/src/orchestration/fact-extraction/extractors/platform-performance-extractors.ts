import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { ActualsSource } from '@eridu/api-types/audits';
import type { SystemFactKey } from '@eridu/api-types/task-management';

import { canResolverOverwrite } from '../source-priority';

import type {
  ExtractedFact,
  ExtractionContext,
  ExtractionDecision,
  IngestionExtractor,
} from './extractor.types';
import { parseNumberValue } from './number-value';

import { ShowPlatformService } from '@/models/show-platform/show-platform.service';

export const POST_PRODUCTION_TEMPLATE_UID = 'ttpl_n6f7qAZQmPA4He6MOR-y';

/**
 * Postgres column shape for each Decimal-backed metric (see
 * `prisma/schema.prisma`: `gmv Decimal(12,2)`, `ctr`/`cto Decimal(5,2)`).
 *
 * Postgres silently rounds `numeric(p,s)` to `scale` on write, so the
 * extractor must round the incoming value to the SAME scale BEFORE the
 * idempotency comparison, the column write, and the audit `newValue` —
 * otherwise a `1250.125` submission is audited at full precision while the
 * column stores `1250.12`, and every resubmission re-reads the rounded value,
 * fails the `Decimal.equals` check, and re-writes forever (`value_unchanged`
 * can never fire). A value whose integer part exceeds `precision - scale`
 * digits would raise `numeric field overflow` on the write, so it is rejected
 * up front as `value_out_of_range` rather than thrown as an unhandled error.
 */
const DECIMAL_COLUMN_SPECS = {
  gmv: { precision: 12, scale: 2 },
  ctr: { precision: 5, scale: 2 },
  cto: { precision: 5, scale: 2 },
} as const satisfies Record<string, { precision: number; scale: number }>;

/**
 * `viewer_count` is a Postgres `Int` (Int4) column. `parseNumberValue` only
 * guarantees finiteness, so a non-integer (`12.5`) or out-of-range (`3e9`)
 * value would reach the raw UPDATE and fail as an unhandled `extractor_error`
 * instead of a controlled noop — the integer analogue of the Decimal precision
 * guard. (Codex P2 on PR #132.)
 */
const INT4_MIN = -2_147_483_648;
const INT4_MAX = 2_147_483_647;

export abstract class BasePlatformPerformanceExtractor implements IngestionExtractor {
  abstract readonly factKey: SystemFactKey;
  abstract readonly dbField: 'gmv' | 'viewerCount' | 'ctr' | 'cto';

  constructor(protected readonly showPlatformService: ShowPlatformService) {}

  async apply(fact: ExtractedFact, ctx: ExtractionContext): Promise<ExtractionDecision> {
    if (fact.rawValue === null || fact.rawValue === undefined || fact.rawValue === '') {
      return { kind: 'noop', reason: 'value_absent' };
    }

    const isDecimal = this.dbField !== 'viewerCount';

    // Parse + validate the incoming value. `parseNumberValue` is the SAME gate
    // the orchestrator's `isFactValueParseable` prefilter uses, so an
    // unparseable value noops here AND is never advertised as a colliding
    // write. Decimal-backed metrics (GMV, CTR, CTO) are then built straight
    // from the raw value so monetary / percentage precision is never truncated
    // through a JS float; the view count is an integer counter.
    if (parseNumberValue(fact.rawValue) === null) {
      return { kind: 'noop', reason: 'value_absent' };
    }

    let incomingDecimal: Prisma.Decimal | null = null;
    let incomingViewCount = 0;
    if (isDecimal) {
      const spec = DECIMAL_COLUMN_SPECS[this.dbField];
      // Trim string input before constructing the Decimal. `parseNumberValue`
      // (and the orchestrator's matching prefilter) accept a whitespace-padded
      // numeric string like `' 1250.5 '`, but `Prisma.Decimal` rejects
      // surrounding whitespace — without this trim the gate and the extractor
      // disagree, so a valid value would be advertised as a writing fact yet
      // silently noop here. Trimming preserves every significant digit.
      const normalized = typeof fact.rawValue === 'string' ? fact.rawValue.trim() : fact.rawValue;
      try {
        incomingDecimal = new Prisma.Decimal(normalized as Prisma.Decimal.Value);
      } catch {
        return { kind: 'noop', reason: 'value_absent' };
      }
      if (!incomingDecimal.isFinite()) {
        return { kind: 'noop', reason: 'value_absent' };
      }
      // Round to the column scale so the idempotency check and the audit value
      // match what Postgres actually persists (it rounds `numeric(p,s)` on
      // write). ROUND_HALF_UP mirrors Postgres' round-half-away-from-zero.
      incomingDecimal = incomingDecimal.toDecimalPlaces(spec.scale, Prisma.Decimal.ROUND_HALF_UP);
      // Reject values that exceed the column precision before they reach the
      // write — otherwise Postgres raises `numeric field overflow`, which would
      // surface as an unhandled `extractor_error` and silently drop the value.
      const maxMagnitude = new Prisma.Decimal(10).pow(spec.precision - spec.scale);
      if (incomingDecimal.abs().gte(maxMagnitude)) {
        return { kind: 'noop', reason: 'value_out_of_range' };
      }
    } else {
      incomingViewCount = Number(fact.rawValue);
      // Reject a non-integer or out-of-Int4-range view count before it reaches
      // the write — Postgres would otherwise raise an integer / out-of-range
      // error that surfaces as a silent `extractor_error` drop.
      if (
        !Number.isInteger(incomingViewCount)
        || incomingViewCount < INT4_MIN
        || incomingViewCount > INT4_MAX
      ) {
        return { kind: 'noop', reason: 'value_out_of_range' };
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
    // If a manager corrected this metric, it has MANAGER priority which blocks lower priority templates.
    const metadata = (showPlatform.metadata as Record<string, any> | null) ?? {};
    const recordedSource = metadata.actuals_source?.[this.factKey] as ActualsSource | undefined;
    if (!canResolverOverwrite(ctx.source, recordedSource)) {
      if (!recordedSource) {
        throw new Error(`Missing recorded source for blocked ${this.factKey} write`);
      }
      return {
        kind: 'skip',
        action: 'SKIPPED_LOWER_PRIORITY',
        skippedBy: recordedSource,
        attemptedValue,
      };
    }

    // If the currently recorded template for this metric was the post-production check,
    // we only allow overrides from the post-production check itself.
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

    // Write the column and merge ONLY this metric's provenance entry into
    // `metadata.performance_templates` atomically (single statement). A whole
    // -blob replacement here would let a concurrent write to a sibling metric
    // drop this entry — see ShowPlatformService.updatePerformanceMetric.
    try {
      const updateResult = await this.showPlatformService.updatePerformanceMetric({
        uid: fact.targetUid,
        showId: ctx.showId,
        dbField: this.dbField,
        value: isDecimal ? incomingDecimal! : incomingViewCount,
        factKey: this.factKey,
        source: ctx.source,
        templateUid: ctx.templateUid ?? '',
        protectedTemplateUid: POST_PRODUCTION_TEMPLATE_UID,
      });
      if (updateResult === 'blocked_by_higher_priority') {
        return {
          kind: 'skip',
          action: 'SKIPPED_LOWER_PRIORITY',
          skippedBy: ctx.source,
          attemptedValue,
        };
      }
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

// Each concrete extractor MUST declare its own constructor that forwards to
// `super(showPlatformService)`. TypeScript only emits `design:paramtypes`
// (the metadata Nest reads to inject constructor deps) for a class that has
// its OWN constructor — a decorated subclass that inherits the base
// constructor gets `design:paramtypes === undefined`, so Nest injects nothing
// and `this.showPlatformService` is `undefined` at runtime. That made every
// platform-performance write throw `extractor_error` and silently noop (no
// column write, no audit), which is why these metrics only ever populated via
// the backfill. Do NOT remove these constructors as "redundant".
@Injectable()
export class PlatformGmvExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_gmv' as const;
  readonly dbField = 'gmv' as const;

  constructor(showPlatformService: ShowPlatformService) {
    super(showPlatformService);
  }
}

@Injectable()
export class PlatformViewCountExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_view_count' as const;
  readonly dbField = 'viewerCount' as const;

  constructor(showPlatformService: ShowPlatformService) {
    super(showPlatformService);
  }
}

@Injectable()
export class PlatformCtrExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_ctr' as const;
  readonly dbField = 'ctr' as const;

  constructor(showPlatformService: ShowPlatformService) {
    super(showPlatformService);
  }
}

@Injectable()
export class PlatformCtoExtractor extends BasePlatformPerformanceExtractor {
  readonly factKey = 'show_platform_cto' as const;
  readonly dbField = 'cto' as const;

  constructor(showPlatformService: ShowPlatformService) {
    super(showPlatformService);
  }
}
