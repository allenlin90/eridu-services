import type { TaskWithRelationsDto } from '@eridu/api-types/task-management';

export function computeSuggestedDueDate(task: TaskWithRelationsDto | null): string | null {
  if (!task?.show)
    return null;
  if (!task.show.start_time || !task.show.end_time)
    return null;

  const start = new Date(task.show.start_time);
  const end = new Date(task.show.end_time);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return null;

  if (task.type === 'SETUP') {
    return new Date(start.getTime() - 60 * 60 * 1000).toISOString();
  }
  if (task.type === 'ACTIVE') {
    return new Date(end.getTime() + 60 * 60 * 1000).toISOString();
  }
  if (task.type === 'CLOSURE') {
    return new Date(end.getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
  return null;
}
