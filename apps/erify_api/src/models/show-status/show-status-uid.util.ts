// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `ShowStatusService.UID_PREFIX`.
export const SHOW_STATUS_UID_PREFIX = 'shst';
