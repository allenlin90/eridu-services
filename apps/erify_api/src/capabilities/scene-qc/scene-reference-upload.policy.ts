/**
 * Pure Scene Profile upload validation rules. Plain functions, not an
 * injectable provider -- no runtime configuration or replaceable
 * infrastructure is involved.
 */
import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';

/**
 * Object-key namespace produced by StorageService.generateObjectKey for the
 * SCENE_REFERENCE use case: `sanitizePathComponent(useCase.toLowerCase())`
 * preserves the underscore, so keys start with `scene_reference/`.
 */
export const SCENE_REFERENCE_OBJECT_KEY_PREFIX = `${FILE_UPLOAD_USE_CASE.SCENE_REFERENCE.toLowerCase()}/`;

export type SceneReferenceUploadCheckInput = {
  objectKey: string;
  fileUrl: string;
  /** StorageService.resolvePublicFileUrl(objectKey) */
  expectedFileUrl: string;
};

export type SceneReferenceUploadViolation =
  | 'object_key_outside_scene_reference_namespace'
  | 'object_key_traversal'
  | 'file_url_does_not_match_object_key';

/**
 * Stage 1 does NOT probe R2 for object existence (no HeadObject on the write
 * path). It DOES pin the two properties that make a forged payload harmless:
 *   1. the key lives in the SCENE_REFERENCE namespace the presign flow owns; and
 *   2. the stored render URL is the deterministic public URL for that exact key,
 *      so no attacker-chosen external URL becomes a rendered <img> source or a
 *      later re-signing input.
 */
export function checkSceneReferenceUpload(
  input: SceneReferenceUploadCheckInput,
): SceneReferenceUploadViolation | null {
  if (!input.objectKey.startsWith(SCENE_REFERENCE_OBJECT_KEY_PREFIX)) {
    return 'object_key_outside_scene_reference_namespace';
  }
  if (input.objectKey.includes('..') || input.objectKey.startsWith('/')) {
    return 'object_key_traversal';
  }
  if (input.fileUrl !== input.expectedFileUrl) {
    return 'file_url_does_not_match_object_key';
  }
  return null;
}
