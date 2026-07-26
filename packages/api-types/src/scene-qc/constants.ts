import { UID_PREFIXES } from '../constants.js';
import { FILE_UPLOAD_USE_CASE, FILE_UPLOAD_USE_CASE_RULES } from '../uploads/schemas.js';

/**
 * Narrowed re-projection of the Scene QC entries from the shared
 * `UID_PREFIXES` registry, so Scene QC schemas/services do not have to import
 * (and filter) the full cross-domain registry to reference their own
 * prefixes.
 */
export const SCENE_QC_UID_PREFIXES = {
  SCENE_MATERIAL: UID_PREFIXES.SCENE_MATERIAL,
  SCENE_MATERIAL_REVISION: UID_PREFIXES.SCENE_MATERIAL_REVISION,
  SCENE_PROFILE: UID_PREFIXES.SCENE_PROFILE,
  SCENE_PROFILE_REVISION: UID_PREFIXES.SCENE_PROFILE_REVISION,
  SCENE_PROFILE_ASSIGNMENT: UID_PREFIXES.SCENE_PROFILE_ASSIGNMENT,
} as const;

/**
 * Stage 1 accepts image MIME types only for Scene Material revisions, even
 * though the broader `SCENE_REFERENCE` upload use case also allows PDF (see
 * SCENE_QC_IMPLEMENTATION_PLAN.md §5.1). Derived from the presign rules
 * rather than duplicated so the two lists cannot drift.
 */
export const SCENE_MATERIAL_ALLOWED_MIME_TYPES = FILE_UPLOAD_USE_CASE_RULES[
  FILE_UPLOAD_USE_CASE.SCENE_REFERENCE
].allowed_mime_types.filter((mimeType) => mimeType.startsWith('image/'));

/** Hard upper bound on any Scene QC list `limit` query param. */
export const SCENE_QC_LIST_MAX_LIMIT = 100;
