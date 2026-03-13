/**
 * UID Prefixes for various entities
 * These constants are used for validation and UID generation
 *
 * Note: These match the UID_PREFIX values defined in the backend services
 */
export const UID_PREFIXES = {
  SHOW: 'show',
  CLIENT: 'client',
  STUDIO: 'std',
  STUDIO_ROOM: 'srm',
  CREATOR: 'creator',
  PLATFORM: 'plt',
  SHOW_TYPE: 'sht',
  SHOW_STATUS: 'shst',
  SHOW_STANDARD: 'shsd',
  SCHEDULE: 'schedule',
  TASK_TEMPLATE: 'ttpl',
  TASK: 'task',
  TASK_TARGET: 'ttgt',
  STUDIO_CREATOR: 'smc',
} as const;
