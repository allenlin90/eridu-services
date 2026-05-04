export const TASK_CONTENT_REASON_SUFFIX = '__reason';
export const TASK_CONTENT_EXTRA_SUFFIX = '__extra';

export function getTaskContentReasonKey(fieldKey: string): string {
  return `${fieldKey}${TASK_CONTENT_REASON_SUFFIX}`;
}

export function getTaskContentExtraKey(fieldKey: string): string {
  return `${fieldKey}${TASK_CONTENT_EXTRA_SUFFIX}`;
}
