import { Injectable } from '@nestjs/common';

import type { ShowIssueReconciliationSignal } from './show-issue-reconciliation.types';
import { normalizeViolationSeverity } from './show-issue-severity-normalization';

import { AuditService } from '@/models/audit/audit.service';
import type { ShowIssueWithRelations } from '@/models/show-issue/schemas/show-issue.schema';
import { ShowIssueService } from '@/models/show-issue/show-issue.service';

const ATTENDANCE_ISSUE_SEVERITY = 'HIGH';
const ATTENDANCE_ISSUE_TITLE = 'Creator attendance missing';
const PLATFORM_VIOLATION_ISSUE_TITLE = 'Platform violation detected';
const SOURCE_CORRECTED_RESOLUTION_NOTE = 'Automatically resolved: underlying source corrected.';

/**
 * Automated attendance / platform-violation issue reconciliation. Called
 * synchronously from `FactExtractionProcessor.applyAndAudit` inside the same
 * CLS transaction as the fact's own column write and extraction audit — see
 * docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md "Automated Reconciliation" and
 * "Module Boundary".
 *
 * Every mutation here is `origin: 'FACT_EXTRACTION'`, `createdById: null` /
 * `resolvedById: null` (system-authored). This service NEVER creates,
 * resolves, reopens, or overwrites evidence on a `MANUAL` issue, and never
 * touches an automated issue a human has already resolved with a resolution
 * code other than `SOURCE_CORRECTED` — that is a manager's deliberate
 * closure, not a stale replay.
 */
@Injectable()
export class ShowIssueReconciliationService {
  constructor(
    private readonly showIssueService: ShowIssueService,
    private readonly auditService: AuditService,
  ) {}

  async applySignals(signals: ShowIssueReconciliationSignal[], showId: bigint): Promise<void> {
    for (const signal of signals) {
      switch (signal.kind) {
        case 'attendance_missing':
          await this.handleAttendanceMissing(signal, showId);
          break;
        case 'attendance_present':
          await this.handleAttendancePresent(signal);
          break;
        case 'platform_violation_opened':
          await this.handlePlatformViolationOpened(signal, showId);
          break;
        case 'platform_violation_superseded':
          await this.handlePlatformViolationSuperseded(signal);
          break;
      }
    }
  }

  private async handleAttendanceMissing(
    signal: Extract<ShowIssueReconciliationSignal, { kind: 'attendance_missing' }>,
    showId: bigint,
  ): Promise<void> {
    const existing = await this.showIssueService.findActiveAutomatedIssueByShowCreator(
      signal.showCreatorId,
      'CREATOR_ATTENDANCE',
    );

    if (!existing) {
      const created = await this.showIssueService.createShowIssue({
        showId,
        category: 'CREATOR_ATTENDANCE',
        origin: 'FACT_EXTRACTION',
        severity: ATTENDANCE_ISSUE_SEVERITY,
        title: ATTENDANCE_ISSUE_TITLE,
        evidence: signal.evidence,
        showCreatorId: signal.showCreatorId,
      });
      await this.writeAudit(created.id, 'CREATE', 'issue_created_automated', { evidence: signal.evidence });
      return;
    }

    // Structurally shouldn't happen given the unique `(showCreatorId,
    // category, origin)` constraint, but a MANUAL issue must never be
    // touched by this service.
    if (existing.origin !== 'FACT_EXTRACTION') {
      return;
    }

    if (existing.status === 'RESOLVED') {
      if (existing.resolutionCode !== 'SOURCE_CORRECTED') {
        // A human closed this identity with a different resolution — leave
        // it alone; this is a deliberate manual closure, not a stale replay.
        return;
      }
      const reopened = await this.showIssueService.reopenShowIssue(existing, existing.version);
      await this.writeAudit(reopened.id, 'UPDATE', 'issue_reopened_automated', {});
      await this.refreshEvidenceIfChanged(reopened, signal.evidence);
      return;
    }

    await this.refreshEvidenceIfChanged(existing, signal.evidence);
  }

  private async handleAttendancePresent(
    signal: Extract<ShowIssueReconciliationSignal, { kind: 'attendance_present' }>,
  ): Promise<void> {
    const existing = await this.showIssueService.findActiveAutomatedIssueByShowCreator(
      signal.showCreatorId,
      'CREATOR_ATTENDANCE',
    );
    await this.resolveAsSourceCorrectedIfOpen(existing);
  }

  private async handlePlatformViolationOpened(
    signal: Extract<ShowIssueReconciliationSignal, { kind: 'platform_violation_opened' }>,
    showId: bigint,
  ): Promise<void> {
    const existing = await this.showIssueService.findActiveAutomatedIssueByShowPlatformViolation(
      signal.showPlatformViolationId,
    );

    if (!existing) {
      const severity = normalizeViolationSeverity(signal.severity);
      const created = await this.showIssueService.createShowIssue({
        showId,
        category: 'PLATFORM_VIOLATION',
        origin: 'FACT_EXTRACTION',
        severity,
        title: PLATFORM_VIOLATION_ISSUE_TITLE,
        evidence: signal.reason,
        showPlatformViolationId: signal.showPlatformViolationId,
      });
      await this.writeAudit(created.id, 'CREATE', 'issue_created_automated', {
        evidence: signal.reason,
        severity,
      });
      return;
    }

    if (existing.origin !== 'FACT_EXTRACTION') {
      return;
    }

    // Retry / replay against an id that already has an issue (e.g. the
    // reconciliation call was retried after an earlier partial failure).
    // The identity is 1:1 with the violation row's id, so this is never a
    // new violation — only refresh evidence if it drifted.
    await this.refreshEvidenceIfChanged(existing, signal.reason);
  }

  private async handlePlatformViolationSuperseded(
    signal: Extract<ShowIssueReconciliationSignal, { kind: 'platform_violation_superseded' }>,
  ): Promise<void> {
    const existing = await this.showIssueService.findActiveAutomatedIssueByShowPlatformViolation(
      signal.showPlatformViolationId,
    );
    await this.resolveAsSourceCorrectedIfOpen(existing);
  }

  private async resolveAsSourceCorrectedIfOpen(existing: ShowIssueWithRelations | null): Promise<void> {
    if (!existing || existing.origin !== 'FACT_EXTRACTION' || existing.status === 'RESOLVED') {
      // No linked issue, a manual issue at this identity (shouldn't be
      // structurally possible), or already resolved (by this service or a
      // human) — all no-ops.
      return;
    }

    const resolved = await this.showIssueService.resolveShowIssue(existing, existing.version, {
      resolvedById: null,
      resolutionCode: 'SOURCE_CORRECTED',
      resolutionNote: SOURCE_CORRECTED_RESOLUTION_NOTE,
    });
    await this.writeAudit(resolved.id, 'UPDATE', 'issue_resolved_automated', {
      resolution_code: 'SOURCE_CORRECTED',
    });
  }

  private async refreshEvidenceIfChanged(current: ShowIssueWithRelations, evidence: string): Promise<void> {
    if (current.evidence === evidence) {
      // Semantic state unchanged — no write, no audit (replay idempotency).
      return;
    }
    const refreshed = await this.showIssueService.updateShowIssueFields(current, current.version, { evidence });
    await this.writeAudit(refreshed.id, 'UPDATE', 'issue_evidence_refreshed_automated', { evidence });
  }

  private async writeAudit(
    issueId: bigint,
    action: 'CREATE' | 'UPDATE',
    operation: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.create({
      action,
      actorId: null,
      metadata: {
        operation,
        ...changes,
      },
      targets: [{ targetType: 'SHOW_ISSUE', targetId: issueId }],
    });
  }
}
