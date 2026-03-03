import { BadRequestException } from '@nestjs/common';

import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';

import { UploadService } from './upload.service';

import type { StorageService } from '@/lib/storage/storage.service';

describe('uploadService', () => {
  let service: UploadService;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    storageService = {
      generateObjectKey: jest.fn().mockReturnValue('uploads/qc_screenshot/ext_123/2026-03-03/test-file.png'),
      generatePresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://example.r2.cloudflarestorage.com/bucket/uploads/test-file.png',
        uploadMethod: 'PUT',
        uploadHeaders: {
          contentType: 'image/png',
        },
        objectKey: 'uploads/qc_screenshot/ext_123/2026-03-03/test-file.png',
        fileUrl: 'https://cdn.example.com/uploads/test-file.png',
        expiresInSeconds: 300,
      }),
    } as unknown as jest.Mocked<StorageService>;

    service = new UploadService(storageService);
  });

  it('should create a presigned upload response for valid request', async () => {
    const result = await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'screen',
      actorId: 'ext_123',
    });

    expect(storageService.generateObjectKey).toHaveBeenCalledWith(
      FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
      'ext_123',
      'screen.png',
    );
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith({
      objectKey: 'uploads/qc_screenshot/ext_123/2026-03-03/test-file.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });

    expect(result).toEqual({
      upload_url: 'https://example.r2.cloudflarestorage.com/bucket/uploads/test-file.png',
      upload_method: 'PUT',
      upload_headers: {
        content_type: 'image/png',
      },
      object_key: 'uploads/qc_screenshot/ext_123/2026-03-03/test-file.png',
      file_url: 'https://cdn.example.com/uploads/test-file.png',
      expires_in_seconds: 300,
    });
  });

  it('should throw for unsupported mime type', async () => {
    await expect(
      service.createPresignedUpload({
        use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
        mime_type: 'video/mp4',
        file_size: 1024,
        file_name: 'screen.mp4',
        actorId: 'ext_123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw for file size above use case limit', async () => {
    await expect(
      service.createPresignedUpload({
        use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
        mime_type: 'image/png',
        file_size: 20 * 1024 * 1024,
        file_name: 'screen.png',
        actorId: 'ext_123',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
