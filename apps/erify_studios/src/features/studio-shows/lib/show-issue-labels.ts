import type {
  ShowIssueCategory,
  ShowIssueResolutionCode,
  ShowIssueSeverity,
  ShowIssueStatus,
} from '@eridu/api-types/show-issues';

/**
 * Display labels and badge styling for show issue enums. See
 * apps/erify_api/docs/SHOW_ISSUE_OWNERSHIP.md (Domain Contract).
 */

export const SHOW_ISSUE_CATEGORY_LABELS: Record<ShowIssueCategory, string> = {
  CREATOR_ATTENDANCE: 'Creator Attendance',
  EQUIPMENT: 'Equipment',
  UTILITY: 'Utility',
  PLATFORM_VIOLATION: 'Platform Violation',
  POST_PRODUCTION_FOLLOW_UP: 'Post-Production Follow-up',
  OTHER: 'Other',
};

export const SHOW_ISSUE_SEVERITY_LABELS: Record<ShowIssueSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const SHOW_ISSUE_STATUS_LABELS: Record<ShowIssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const SHOW_ISSUE_RESOLUTION_CODE_LABELS: Record<ShowIssueResolutionCode, string> = {
  FIXED: 'Fixed',
  SOURCE_CORRECTED: 'Source Corrected',
  NO_LONGER_APPLICABLE: 'No Longer Applicable',
  DUPLICATE: 'Duplicate',
  OTHER: 'Other',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function getShowIssueStatusBadgeVariant(status: ShowIssueStatus): BadgeVariant {
  switch (status) {
    case 'OPEN':
      return 'default';
    case 'IN_PROGRESS':
      return 'secondary';
    case 'RESOLVED':
    default:
      return 'outline';
  }
}

/**
 * Severity color coding. `Badge`'s built-in variants don't have enough
 * distinct colors for 4 severities, so this pairs the neutral `outline`
 * variant with a color-coded className, matching the amber/red inline
 * pattern already used in this feature (show-creator-compensation-dialog).
 */
export function getShowIssueSeverityBadgeClassName(severity: ShowIssueSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200';
    case 'HIGH':
      return 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200';
    case 'MEDIUM':
      return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200';
    case 'LOW':
    default:
      return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
  }
}
