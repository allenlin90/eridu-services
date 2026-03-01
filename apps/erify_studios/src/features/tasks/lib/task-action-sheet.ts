import { TASK_ACTION, type TaskAction } from '@eridu/api-types/task-management';

const ACTIONS_REQUIRING_ACTION_SHEET = new Set<TaskAction>([
  TASK_ACTION.SUBMIT_FOR_REVIEW,
  TASK_ACTION.APPROVE_COMPLETED,
  TASK_ACTION.CONTINUE_EDITING,
  TASK_ACTION.MARK_BLOCKED,
]);

export function requiresTaskActionSheet(action: TaskAction): boolean {
  return ACTIONS_REQUIRING_ACTION_SHEET.has(action);
}
