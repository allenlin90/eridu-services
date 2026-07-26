// Lightweight UID-prefix constants so schemas can reference them without
// importing the full services (which would risk an import cycle). Each
// service re-exports its constant as `<Service>.UID_PREFIX`. Mirrors
// `models/client/client-uid.util.ts`.
export const SCENE_MATERIAL_UID_PREFIX = 'scmat';
export const SCENE_MATERIAL_REVISION_UID_PREFIX = 'scmrev';
export const SCENE_PROFILE_UID_PREFIX = 'scprof';
export const SCENE_PROFILE_REVISION_UID_PREFIX = 'scprev';
export const SCENE_PROFILE_ASSIGNMENT_UID_PREFIX = 'scasgn';
