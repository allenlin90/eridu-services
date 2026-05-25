import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CreateShowPlatformViolationRecord,
  ShowPlatformViolationRepository,
  ShowPlatformViolationTaskFieldScope,
} from './show-platform-violation.repository';

import { BaseModelService } from '@/lib/services/base-model.service';
import { UtilityService } from '@/utility/utility.service';

export type ShowPlatformViolationEntry = Omit<
  CreateShowPlatformViolationRecord,
  'uid' | 'showPlatformId' | 'sourceTaskId' | 'sourceFieldId'
>;

export type ShowPlatformViolationSummary = {
  uid: string;
  violationType: string;
  severity: string;
  reason: string;
};

@Injectable()
export class ShowPlatformViolationService extends BaseModelService {
  static readonly UID_PREFIX = 'spv';
  protected readonly uidPrefix = ShowPlatformViolationService.UID_PREFIX;

  constructor(
    private readonly showPlatformViolationRepository: ShowPlatformViolationRepository,
    protected readonly utilityService: UtilityService,
  ) {
    super(utilityService);
  }

  async replaceForTaskField(
    input: ShowPlatformViolationTaskFieldScope & {
      showId: bigint;
      entries: ShowPlatformViolationEntry[];
    },
  ): Promise<{
      created: ShowPlatformViolationSummary[];
      superseded: ShowPlatformViolationSummary[];
    }> {
    const scope = {
      showPlatformId: input.showPlatformId,
      sourceTaskId: input.sourceTaskId,
      sourceFieldId: input.sourceFieldId,
    };

    // Close the read-then-write race: the extractor's prefetch saw an active
    // platform under `showId`, but a concurrent soft-delete or reassignment
    // could move it before this transaction. A plain `SELECT` would not
    // prevent the race under `READ COMMITTED`, so the repository issues
    // `SELECT ... FOR UPDATE` to lock the row until commit. If the row is
    // already gone, surface NotFoundException so the extractor collapses
    // to `target_stale`.
    const platformActive = await this.showPlatformViolationRepository.lockActiveInShow(
      input.showPlatformId,
      input.showId,
    );
    if (!platformActive) {
      throw new NotFoundException(
        `ShowPlatform ${input.showPlatformId} is not active under show ${input.showId}`,
      );
    }

    // Deduplicate incoming entries by (violationType, severity). The
    // multiselect field type does not enforce uniqueness on raw payloads,
    // so `['COPYRIGHT', 'COPYRIGHT']` would otherwise create duplicate
    // active rows for the same violation. Reason / metadata / observedAt
    // for collisions are kept from the FIRST occurrence so the audit
    // matches the operator's listed-first entry.
    const dedupedEntries = dedupeEntries(input.entries);

    const existing = await this.showPlatformViolationRepository.findActiveByTaskField(scope);

    // Idempotency: a same-content resubmission would otherwise supersede
    // and recreate identical rows, emitting a spurious UPDATE audit on
    // every retry. Short-circuit when the stored set matches the incoming
    // (deduped) set on (violationType, severity, reason).
    if (isViolationSetUnchanged(existing, dedupedEntries)) {
      return { created: [], superseded: [] };
    }

    if (existing.length > 0) {
      await this.showPlatformViolationRepository.supersedeActiveByTaskField(scope, new Date());
    }

    const records: CreateShowPlatformViolationRecord[] = dedupedEntries.map((entry) => ({
      uid: this.generateUid(),
      showPlatformId: input.showPlatformId,
      sourceTaskId: input.sourceTaskId,
      sourceFieldId: input.sourceFieldId,
      violationType: entry.violationType,
      severity: entry.severity,
      reason: entry.reason,
      observedAt: entry.observedAt,
      metadata: entry.metadata,
    }));

    if (records.length > 0) {
      await this.showPlatformViolationRepository.createMany(records);
    }

    return {
      created: records.map((record) => ({
        uid: record.uid,
        violationType: record.violationType,
        severity: record.severity,
        reason: record.reason,
      })),
      superseded: existing.map((row) => ({
        uid: row.uid,
        violationType: row.violationType,
        severity: row.severity,
        reason: row.reason,
      })),
    };
  }
}

function dedupeEntries(
  entries: ReadonlyArray<ShowPlatformViolationEntry>,
): ShowPlatformViolationEntry[] {
  const seen = new Map<string, ShowPlatformViolationEntry>();
  for (const entry of entries) {
    const key = pairKey(entry);
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }
  return [...seen.values()];
}

function pairKey(entry: { violationType: string; severity: string }): string {
  // JSON.stringify on a tuple escapes embedded quotes / control chars,
  // so two distinct (violationType, severity) pairs never collide.
  return JSON.stringify([entry.violationType, entry.severity]);
}

function tripleKey(entry: { violationType: string; severity: string; reason?: string | null }): string {
  // JSON.stringify on the tuple escapes embedded `|`, quotes, backslashes,
  // and control characters, so two distinct (type, severity, reason)
  // tuples never collide on the joined key.
  return JSON.stringify([entry.violationType, entry.severity, entry.reason ?? '']);
}

function isViolationSetUnchanged(
  existing: ReadonlyArray<{ violationType: string; severity: string; reason?: string | null }>,
  incoming: ReadonlyArray<{ violationType: string; severity: string; reason?: string | null }>,
): boolean {
  if (existing.length !== incoming.length) {
    return false;
  }
  const existingKeys = existing.map(tripleKey).sort();
  const incomingKeys = incoming.map(tripleKey).sort();
  return existingKeys.every((key, index) => key === incomingKeys[index]);
}
