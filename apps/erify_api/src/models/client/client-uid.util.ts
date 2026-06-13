// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `ClientService.UID_PREFIX`.
export const CLIENT_UID_PREFIX = 'client';
