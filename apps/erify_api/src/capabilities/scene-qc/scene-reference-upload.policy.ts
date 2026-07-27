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
  /**
   * StorageService.sanitizeActorIdForObjectKey(context.actorExtId) -- the
   * exact key segment the presign flow would have embedded for the current
   * actor. Objects presigned by a different actor must not be adoptable.
   */
  expectedActorSegment: string;
};

export type SceneReferenceUploadViolation =
  | 'object_key_outside_scene_reference_namespace'
  | 'object_key_traversal'
  | 'object_key_actor_mismatch'
  | 'file_url_does_not_match_object_key';

/**
 * Format/ownership checks only -- shape, namespace, and which actor's
 * presign issued the key. This does NOT prove the object exists or that its
 * real content matches what the caller claims: the service layer must follow
 * a `null` result here with `StorageService.headObject` and persist the
 * R2-observed content type/size, never the caller's claimed values.
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
  // Key shape: scene_reference/{actorSegment}/{date}/{random}-{filename}.
  const actorSegment = input.objectKey.split('/')[1];
  if (actorSegment !== input.expectedActorSegment) {
    return 'object_key_actor_mismatch';
  }
  if (input.fileUrl !== input.expectedFileUrl) {
    return 'file_url_does_not_match_object_key';
  }
  return null;
}
