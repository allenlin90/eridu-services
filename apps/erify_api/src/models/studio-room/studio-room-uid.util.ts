// Lightweight UID-prefix constant so schemas can reference it without importing
// the full service (which would risk an import cycle). The service re-exports it
// as `StudioRoomService.UID_PREFIX`.
export const STUDIO_ROOM_UID_PREFIX = 'srm';
