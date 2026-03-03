import type {
  PresignUploadRequest,
  PresignUploadResponse,
} from '@eridu/api-types/uploads';

import { apiClient } from '@/lib/api/client';

export async function requestPresignedUpload(
  payload: PresignUploadRequest,
): Promise<PresignUploadResponse> {
  const response = await apiClient.post<PresignUploadResponse>(
    '/uploads/presign',
    payload,
  );
  return response.data;
}

export async function uploadFileToPresignedUrl(
  presigned: PresignUploadResponse,
  file: File,
): Promise<void> {
  const response = await fetch(presigned.upload_url, {
    method: presigned.upload_method,
    headers: {
      'Content-Type': presigned.upload_headers.content_type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}
