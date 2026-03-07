import type { StudioShiftAlignmentResponse } from '@/features/studio-shifts/api/studio-shifts.types';

export type TaskReadinessWarning = StudioShiftAlignmentResponse['task_readiness_warnings'][number];

export type ReadinessBucket = {
  key: 'no_task_plan' | 'unassigned_workload' | 'missing_required_coverage';
  title: string;
  description: string;
  count: number;
  supportingStats: string[];
  warnings: TaskReadinessWarning[];
};

export type ShowReadinessViewModel = {
  showsInScopeCount: number;
  showsNeedingAttentionCount: number;
  readyShowsCount: number;
  readyPercent: number;
  primaryAction: ReadinessBucket['key'] | null;
  supportText: string;
  buckets: ReadinessBucket[];
};

function toRoundedAverage(total: number, size: number): number {
  if (size <= 0) {
    return 0;
  }
  return Math.round((total / size) * 10) / 10;
}

export function getWarningIssueTags(warning: TaskReadinessWarning): string[] {
  const tags: string[] = [];
  if (warning.has_no_tasks) {
    tags.push('No task plan');
  }
  if (warning.unassigned_task_count > 0) {
    tags.push(
      warning.unassigned_task_count === 1
        ? '1 unassigned task'
        : `${warning.unassigned_task_count} unassigned tasks`,
    );
  }
  if (warning.missing_required_task_types.includes('SETUP')) {
    tags.push('Missing SETUP');
  }
  if (warning.missing_required_task_types.includes('CLOSURE')) {
    tags.push('Missing CLOSURE');
  }
  if (warning.missing_moderation_task) {
    tags.push('Missing moderation');
  }
  return tags;
}

export function buildShowReadinessViewModel(
  warnings: TaskReadinessWarning[],
  showsInScopeCount: number,
): ShowReadinessViewModel {
  const showsNeedingAttentionCount = warnings.length;
  const readyShowsCount = Math.max(showsInScopeCount - showsNeedingAttentionCount, 0);
  const readyPercent = showsInScopeCount > 0
    ? Math.round((readyShowsCount / showsInScopeCount) * 100)
    : 0;

  const noTaskPlanWarnings = warnings.filter((warning) => warning.has_no_tasks);
  const unassignedWorkloadWarnings = warnings.filter((warning) => warning.unassigned_task_count > 0);
  const missingCoverageWarnings = warnings.filter((warning) =>
    !warning.has_no_tasks && (warning.missing_required_task_types.length > 0 || warning.missing_moderation_task));

  const totalUnassignedTasks = warnings.reduce((total, warning) => total + warning.unassigned_task_count, 0);
  const averageUnassignedPerAffected = toRoundedAverage(totalUnassignedTasks, unassignedWorkloadWarnings.length);
  const missingSetupCount = missingCoverageWarnings.filter((warning) =>
    warning.missing_required_task_types.includes('SETUP')).length;
  const missingClosureCount = missingCoverageWarnings.filter((warning) =>
    warning.missing_required_task_types.includes('CLOSURE')).length;
  const missingModerationCount = missingCoverageWarnings.filter((warning) => warning.missing_moderation_task).length;

  const buckets: ReadinessBucket[] = [
    {
      key: 'no_task_plan',
      title: 'No task plan',
      description: 'Shows with zero tasks and no execution structure.',
      count: noTaskPlanWarnings.length,
      supportingStats: [
        `${noTaskPlanWarnings.length} affected shows`,
      ],
      warnings: noTaskPlanWarnings,
    },
    {
      key: 'unassigned_workload',
      title: 'Unassigned workload',
      description: 'Tasks exist, but assignments are incomplete.',
      count: totalUnassignedTasks,
      supportingStats: [
        `${unassignedWorkloadWarnings.length} affected shows`,
        `${averageUnassignedPerAffected.toFixed(1)} avg unassigned per affected show`,
      ],
      warnings: unassignedWorkloadWarnings,
    },
    {
      key: 'missing_required_coverage',
      title: 'Missing required coverage',
      description: 'Required task types or premium moderation are missing.',
      count: missingCoverageWarnings.length,
      supportingStats: [
        `${missingCoverageWarnings.length} affected shows`,
        `${missingSetupCount} missing SETUP`,
        `${missingClosureCount} missing CLOSURE`,
        `${missingModerationCount} missing moderation`,
      ].filter((line) => !line.startsWith('0 ')),
      warnings: missingCoverageWarnings,
    },
  ];

  let primaryAction: ShowReadinessViewModel['primaryAction'] = null;
  if (noTaskPlanWarnings.length > 0) {
    primaryAction = 'no_task_plan';
  } else if (unassignedWorkloadWarnings.length > 0) {
    primaryAction = 'unassigned_workload';
  } else if (missingCoverageWarnings.length > 0) {
    primaryAction = 'missing_required_coverage';
  }

  let supportText = 'No readiness blockers detected in this scope.';
  if (showsInScopeCount === 0) {
    supportText = 'No shows found in the selected scope.';
  } else if (primaryAction === 'no_task_plan') {
    supportText = `${noTaskPlanWarnings.length} shows have no task plan. Create baseline tasks first.`;
  } else if (primaryAction === 'unassigned_workload') {
    supportText = `${totalUnassignedTasks} tasks are still unassigned. Focus on staffing next.`;
  } else if (primaryAction === 'missing_required_coverage') {
    supportText = `${missingCoverageWarnings.length} shows are missing required task coverage.`;
  }

  return {
    showsInScopeCount,
    showsNeedingAttentionCount,
    readyShowsCount,
    readyPercent,
    primaryAction,
    supportText,
    buckets,
  };
}
