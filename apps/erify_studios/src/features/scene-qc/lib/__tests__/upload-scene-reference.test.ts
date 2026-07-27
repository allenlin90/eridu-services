import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prepareImageForUpload } from '@eridu/browser-upload';

import { uploadSceneReference } from '../upload-scene-reference';

import { requestPresignedUpload, uploadFileToPresignedUrl } from '@/features/tasks/api/presign-upload';

vi.mock('@/features/tasks/api/presign-upload', () => ({
  requestPresignedUpload: vi.fn(),
  uploadFileToPresignedUrl: vi.fn(),
}));

vi.mock('@eridu/browser-upload', () => ({
  prepareImageForUpload: vi.fn(),
}));

function makeFile(name: string, type: string, size: number): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

/**
 * A File reporting `size` without actually allocating that many bytes.
 * `prepareImageForUpload`/`requestPresignedUpload`/`uploadFileToPresignedUrl`
 * are mocked in every test here, so nothing ever reads the real content — only
 * `.size` and `.type` matter. A real multi-MB `Uint8Array` backing (via
 * `makeFile`) reliably pushes this file's tests over vitest's default timeout
 * under full-suite worker-pool contention even though it's fast in isolation.
 */
function makeOversizedFile(name: string, type: string, size: number): File {
  const file = makeFile(name, type, 1);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const PRESIGNED = {
  upload_url: 'https://r2.example.com/put',
  upload_method: 'PUT' as const,
  upload_headers: { content_type: 'image/png' },
  object_key: 'scene_reference/x/y.png',
  file_url: 'https://cdn.example.com/scene_reference/x/y.png',
  expires_in_seconds: 300,
};

describe('uploadSceneReference', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an unsupported mime type before ever presigning', async () => {
    const file = makeFile('doc.pdf', 'application/pdf', 100);

    await expect(uploadSceneReference(file)).rejects.toThrow(/Unsupported file type/);
    expect(requestPresignedUpload).not.toHaveBeenCalled();
  });

  it('presigns and uploads a small in-limit file without compressing', async () => {
    vi.mocked(requestPresignedUpload).mockResolvedValue(PRESIGNED);
    vi.mocked(uploadFileToPresignedUrl).mockResolvedValue(undefined);

    const file = makeFile('ref.png', 'image/png', 1000);
    const result = await uploadSceneReference(file);

    expect(prepareImageForUpload).not.toHaveBeenCalled();
    expect(requestPresignedUpload).toHaveBeenCalledWith(expect.objectContaining({
      use_case: 'SCENE_REFERENCE',
      mime_type: 'image/png',
      file_size: 1000,
    }));
    expect(result).toEqual({
      object_key: 'scene_reference/x/y.png',
      file_url: 'https://cdn.example.com/scene_reference/x/y.png',
      mime_type: 'image/png',
      file_size: 1000,
    });
  });

  it('compresses an oversized file before presigning', async () => {
    const compressedFile = makeFile('ref.png', 'image/png', 500);
    vi.mocked(prepareImageForUpload).mockResolvedValue({
      file: compressedFile,
      wasCompressed: true,
      usedWorker: false,
      metTarget: true,
    });
    vi.mocked(requestPresignedUpload).mockResolvedValue(PRESIGNED);
    vi.mocked(uploadFileToPresignedUrl).mockResolvedValue(undefined);

    const oversized = makeOversizedFile('ref.png', 'image/png', 20 * 1024 * 1024);
    await uploadSceneReference(oversized);

    expect(prepareImageForUpload).toHaveBeenCalledWith(oversized, expect.objectContaining({
      targetMaxBytes: expect.any(Number),
    }));
  });

  it('throws and never presigns when compression cannot meet the target', async () => {
    vi.mocked(prepareImageForUpload).mockResolvedValue({
      file: makeOversizedFile('ref.png', 'image/png', 15 * 1024 * 1024),
      wasCompressed: true,
      usedWorker: false,
      metTarget: false,
    });

    const oversized = makeOversizedFile('ref.png', 'image/png', 20 * 1024 * 1024);
    await expect(uploadSceneReference(oversized)).rejects.toThrow(/too large after compression/);
    expect(requestPresignedUpload).not.toHaveBeenCalled();
  });

  it('propagates a failed presigned PUT without returning upload metadata', async () => {
    vi.mocked(requestPresignedUpload).mockResolvedValue(PRESIGNED);
    vi.mocked(uploadFileToPresignedUrl).mockRejectedValue(new Error('Upload failed with status 500'));

    const file = makeFile('ref.png', 'image/png', 1000);
    await expect(uploadSceneReference(file)).rejects.toThrow('Upload failed with status 500');
  });
});
