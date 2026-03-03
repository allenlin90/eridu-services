import type { TaskType } from '@eridu/api-types/task-management';
import { TASK_TYPE } from '@eridu/api-types/task-management';

import * as m from '@/paraglide/messages';

export function getTaskTypeLabel(taskType: TaskType): string {
  if (taskType === TASK_TYPE.SETUP) {
    return m.task_type_setup();
  }
  if (taskType === TASK_TYPE.ACTIVE) {
    return m.task_type_active();
  }
  if (taskType === TASK_TYPE.CLOSURE) {
    return m.task_type_closure();
  }
  if (taskType === TASK_TYPE.ADMIN) {
    return m.task_type_admin();
  }
  if (taskType === TASK_TYPE.ROUTINE) {
    return m.task_type_routine();
  }
  return m.task_type_other();
}

export function getTaskTypeOptions(): Array<{ value: TaskType; label: string }> {
  return (
    Object.values(TASK_TYPE) as TaskType[]
  ).map((value) => ({
    value,
    label: getTaskTypeLabel(value),
  }));
}
