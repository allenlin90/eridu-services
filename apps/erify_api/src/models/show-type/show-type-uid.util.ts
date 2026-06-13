// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `ShowTypeService.UID_PREFIX`.
export const SHOW_TYPE_UID_PREFIX = 'sht';
