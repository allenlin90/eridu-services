import type { z } from 'zod';

import {
  SCENE_PROFILE_ALLOWED_MIME_TYPES,
  SCENE_PROFILE_MAX_FILE_SIZE_BYTES,
  sceneProfileMimeTypeSchema,
} from '@eridu/api-types/scene-qc';
import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';
import { prepareImageForUpload } from '@eridu/browser-upload';

import { requestPresignedUpload, uploadFileToPresignedUrl } from '@/features/tasks/api/presign-upload';

export type SceneProfileMimeType = z.infer<typeof sceneProfileMimeTypeSchema>;

export type UploadedSceneReference = {
  object_key: string;
  file_url: string;
  mime_type: SceneProfileMimeType;
  file_size: number;
};

export class SceneReferenceUploadError extends Error {}

/**
 * Uploads a Scene Profile reference image: validate -> compress-if-oversized ->
 * presign -> PUT to R2. Reuses the existing SCENE_REFERENCE presign transport
 * verbatim (`requestPresignedUpload` / `uploadFileToPresignedUrl`) -- no second
 * presign client. Does NOT save a Scene Profile: the caller must still call
 * `saveSceneProfile(...)` with the returned metadata. If that second call
 * fails, no profile is saved and no version is incremented; the orphaned R2
 * object is intentionally tolerated (see plan section 5.3).
 */
export async function uploadSceneReference(file: File): Promise<UploadedSceneReference> {
  if (!(SCENE_PROFILE_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new SceneReferenceUploadError(
      `Unsupported file type "${file.type}". Allowed: ${SCENE_PROFILE_ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  const prepared = file.size > SCENE_PROFILE_MAX_FILE_SIZE_BYTES
    ? await prepareImageForUpload(file, {
      targetMaxBytes: SCENE_PROFILE_MAX_FILE_SIZE_BYTES,
      accept: 'image/*',
    })
    : { file, wasCompressed: false, usedWorker: false, metTarget: true };

  if (!prepared.metTarget) {
    throw new SceneReferenceUploadError('Reference image is too large after compression');
  }

  // Compression can, in principle, change the output container format --
  // re-validate rather than trusting the pre-compression check still holds.
  const mimeTypeCheck = sceneProfileMimeTypeSchema.safeParse(prepared.file.type);
  if (!mimeTypeCheck.success) {
    throw new SceneReferenceUploadError(
      `Compressed file type "${prepared.file.type}" is no longer a supported image type`,
    );
  }

  const presigned = await requestPresignedUpload({
    use_case: FILE_UPLOAD_USE_CASE.SCENE_REFERENCE,
    mime_type: mimeTypeCheck.data,
    file_size: prepared.file.size,
    file_name: prepared.file.name,
  });
  await uploadFileToPresignedUrl(presigned, prepared.file);

  return {
    object_key: presigned.object_key,
    file_url: presigned.file_url,
    mime_type: mimeTypeCheck.data,
    file_size: prepared.file.size,
  };
}
