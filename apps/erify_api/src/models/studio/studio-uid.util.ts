// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `StudioService.UID_PREFIX`.
export const STUDIO_UID_PREFIX = 'std';
