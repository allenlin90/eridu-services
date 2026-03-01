import { format } from 'date-fns';

import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

import type { StudioShowDetail } from '@/features/studio-shows/api/get-studio-show';
import type { ShowSelection } from '@/features/studio-shows/api/get-studio-shows';
import type { TaskActionDraft } from '@/features/tasks/hooks/use-studio-show-tasks-page-state';

const DEFAULT_SHOW_TASKS_SUBTITLE = 'Manage and assign specific tasks for this show.';

export type ShowMetaItem = {
  label: string;
  value: string;
};

export function buildCurrentShowSelection(
  showId: string,
  showName: string | undefined,
  tasks: TaskWithRelationsDto[],
): ShowSelection {
  const assignedCount = tasks.filter((task) => task.assignee !== null).length;
  const completedCount = tasks.filter((task) => task.status === 'COMPLETED').length;
  const totalCount = tasks.length;

  return {
    id: showId,
    name: showName ?? tasks[0]?.show?.name ?? `Show ${showId}`,
    task_summary: {
      total: totalCount,
      assigned: assignedCount,
      unassigned: Math.max(totalCount - assignedCount, 0),
      completed: completedCount,
    },
  };
}

export function buildShowSubtitle(showDetails: StudioShowDetail | undefined): string {
  if (!showDetails) {
    return DEFAULT_SHOW_TASKS_SUBTITLE;
  }

  return `${showDetails.client_name ?? 'No client'} • ${format(new Date(showDetails.start_time), 'PPP p')} - ${format(new Date(showDetails.end_time), 'p')}`;
}

export function buildShowMetaItems(showDetails: StudioShowDetail | null): ShowMetaItem[] {
  if (!showDetails) {
    return [];
  }

  return [
    { label: 'Show ID', value: showDetails.id },
    { label: 'Studio', value: showDetails.studio_name ?? '—' },
    { label: 'Room', value: showDetails.studio_room_name ?? '—' },
    { label: 'Type', value: showDetails.show_type_name ?? '—' },
    { label: 'Standard', value: showDetails.show_standard_name ?? '—' },
  ];
}

export function getTaskActionSheetKey(draft: TaskActionDraft | null): string {
  if (!draft) {
    return 'studio-task-action-sheet';
  }

  return `${draft.task.id}:${draft.task.version}:${draft.action}`;
}
