/**
 * UID Prefixes for various entities
 * These constants are used for validation and UID generation
 *
 * Note: These match the UID_PREFIX values defined in the backend services
 */
export const UID_PREFIXES = {
  USER: 'user',
  SHOW: 'show',
  CLIENT: 'client',
  STUDIO: 'std',
  STUDIO_MEMBERSHIP: 'smb',
  STUDIO_ROOM: 'srm',
  CREATOR: 'creator',
  PLATFORM: 'plt',
  SHOW_TYPE: 'sht',
  SHOW_STATUS: 'shst',
  SHOW_STANDARD: 'shsd',
  SCHEDULE: 'schedule',
  COMPENSATION_LINE_ITEM: 'cli',
  TASK_TEMPLATE: 'ttpl',
  TASK: 'task',
  TASK_TARGET: 'ttgt',
  STUDIO_CREATOR: 'smc',
  SHOW_CREATOR: 'show_mc',
  SHOW_CANCELLATION_RESOLUTION: 'scr',
  STUDIO_SHIFT: 'ssh',
  STUDIO_SHIFT_BLOCK: 'ssb',
  AUDIT: 'aud',
  CLIENT_MECHANIC: 'cmech',
} as const;
