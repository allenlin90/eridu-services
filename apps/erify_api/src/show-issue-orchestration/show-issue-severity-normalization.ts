import type { ShowIssueSeverity } from '@eridu/api-types/show-issues';

/**
 * Normalizes `ShowPlatformViolation.severity` — a free-form uppercase string
 * defaulted to `'WARNING'` at the schema level — onto the closed
 * `ShowIssue` severity set. Deterministic mapping table from
 * docs/design/SHOW_ISSUE_OWNERSHIP_DESIGN.md "Automated Reconciliation".
 */
export function normalizeViolationSeverity(sourceSeverity: string): ShowIssueSeverity {
  switch (sourceSeverity) {
    case 'CRITICAL':
      return 'CRITICAL';
    case 'HIGH':
    case 'ERROR':
    case 'SEVERE':
      return 'HIGH';
    case 'WARNING':
    case 'WARN':
    case 'MEDIUM':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}
