// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `ShowStandardService.UID_PREFIX`.
export const SHOW_STANDARD_UID_PREFIX = 'shsd';
