/**
 * Signal channel from a fact extractor into `ShowIssueReconciliationService`.
 * A small in-process discriminated union, not a published domain event and
 * not a generic event bus — see docs/SHOW_ISSUE_OWNERSHIP.md
 * "Automated Reconciliation".
 *
 * Extractors that already hold the source row (creator / violation) attach
 * the internal bigint id directly so the reconciliation service never needs
 * a redundant DB read to resolve identity.
 */
export type ShowIssueReconciliationSignal =
  | {
    kind: 'attendance_missing';
    showCreatorId: bigint;
    showCreatorUid: string;
    /** Current resolved attendance reason — copied into `ShowIssue.evidence`. */
    evidence: string;
  }
  | {
    kind: 'attendance_present';
    showCreatorId: bigint;
    showCreatorUid: string;
  }
  | {
    kind: 'platform_violation_opened';
    showPlatformViolationId: bigint;
    violationUid: string;
    showPlatformId: bigint;
    /** Free-form source severity — normalized by `normalizeViolationSeverity`. */
    severity: string;
    /** Violation reason — copied into `ShowIssue.evidence`. */
    reason: string;
  }
  | {
    kind: 'platform_violation_superseded';
    showPlatformViolationId: bigint;
    violationUid: string;
  };
