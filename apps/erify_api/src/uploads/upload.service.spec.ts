import { BadRequestException } from '@nestjs/common';

import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';

import { UploadService } from './upload.service';

import type { StorageService } from '@/lib/storage/storage.service';
import type { TaskService } from '@/models/task/task.service';

describe('uploadService', () => {
  let service: UploadService;
  let storageService: jest.Mocked<StorageService>;
  let taskService: jest.Mocked<Pick<TaskService, 'findByUidWithSnapshot' | 'reserveMaterialAssetUploadVersion'>>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-03T10:00:00.000Z'));

    storageService = {
      generateObjectKey: jest.fn().mockReturnValue('qc_screenshot/ext_123/2026-03-03/test-file.png'),
      generatePresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://example.r2.cloudflarestorage.com/bucket/test-file.png',
        uploadMethod: 'PUT',
        uploadHeaders: {
          contentType: 'image/png',
        },
        objectKey: 'qc_screenshot/ext_123/2026-03-03/test-file.png',
        fileUrl: 'https://cdn.example.com/test-file.png',
        expiresInSeconds: 300,
      }),
    } as unknown as jest.Mocked<StorageService>;

    taskService = {
      findByUidWithSnapshot: jest.fn().mockResolvedValue({
        uid: 'task_123',
        type: 'SETUP',
        targets: [{
          show: {
            id: 1n,
            uid: 'show_1',
            externalId: 'SHOW-001',
            client: { name: 'Acme Client' },
            showMCs: [{ mc: { aliasName: 'MC Alpha', name: 'MC Alpha' } }],
          },
        }],
        snapshot: {
          schema: {
            items: [
              {
                id: 'item_1',
                key: 'proof_photo',
                type: 'file',
                label: 'Proof Photo',
                validation: {
                  accept: 'image/*',
                },
              },
            ],
            metadata: {
              task_type: 'OTHER',
            },
          },
        },
      } as any),
      reserveMaterialAssetUploadVersion: jest.fn().mockResolvedValue(1),
    };

    service = new UploadService(storageService, taskService as unknown as TaskService);
  });

  afterEach(() => {
    jest.useRealTimers();
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
      objectKey: 'qc_screenshot/ext_123/2026-03-03/test-file.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });

    expect(result).toEqual({
      upload_url: 'https://example.r2.cloudflarestorage.com/bucket/test-file.png',
      upload_method: 'PUT',
      upload_headers: {
        content_type: 'image/png',
      },
      object_key: 'qc_screenshot/ext_123/2026-03-03/test-file.png',
      file_url: 'https://cdn.example.com/test-file.png',
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

  it('should enforce task file-field MIME policy for MATERIAL_ASSET', async () => {
    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(taskService.findByUidWithSnapshot).toHaveBeenCalledWith('task_123');
    expect(taskService.reserveMaterialAssetUploadVersion).toHaveBeenCalledWith('task_123', 'proof_photo');
    expect(storageService.generateObjectKey).not.toHaveBeenCalled();
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'pre-production/2026-03-03/show_1-v1.png',
      }),
    );
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledTimes(1);
  });

  it('should route CLOSURE show-linked uploads to mc-review directory', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValueOnce({
      uid: 'task_123',
      type: 'CLOSURE',
      targets: [{
        show: {
          id: 1n,
          uid: 'show_1',
          externalId: 'SHOW-CLOSE',
          client: { name: 'Mega Client' },
          showMCs: [
            { mc: { aliasName: 'MC One', name: 'MC One' } },
            { mc: { aliasName: null, name: 'MC Two' } },
          ],
        },
      }],
      snapshot: {
        schema: {
          items: [
            {
              id: 'item_1',
              key: 'proof_photo',
              type: 'file',
              label: 'Proof Photo',
              validation: {
                accept: 'image/*',
              },
            },
          ],
          metadata: {
            task_type: 'OTHER',
          },
        },
      },
    } as any);

    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(storageService.generateObjectKey).not.toHaveBeenCalled();
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'mc-review/2026-03-03/show_1-v1.png',
      }),
    );
  });

  it('should route non-show material uploads to single-use directory', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValueOnce({
      uid: 'task_123',
      type: 'SETUP',
      targets: [],
      snapshot: {
        schema: {
          items: [
            {
              id: 'item_1',
              key: 'proof_photo',
              type: 'file',
              label: 'Proof Photo',
              validation: {
                accept: 'image/*',
              },
            },
          ],
          metadata: {
            task_type: 'OTHER',
          },
        },
      },
    } as any);

    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(storageService.generateObjectKey).not.toHaveBeenCalled();
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'single-use/2026-03-03/proof_photo-v1.png',
      }),
    );
  });

  it('should require task context for MATERIAL_ASSET', async () => {
    await expect(
      service.createPresignedUpload({
        use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
        mime_type: 'image/png',
        file_size: 1024,
        file_name: 'proof',
        actorId: 'ext_123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject MIME types not allowed by template accept rule', async () => {
    await expect(
      service.createPresignedUpload({
        use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
        mime_type: 'application/pdf',
        file_size: 1024,
        file_name: 'proof.pdf',
        task_id: 'task_123',
        field_key: 'proof_photo',
        actorId: 'ext_123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should use metadata upload_routing.material_asset_directory when present', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValueOnce({
      uid: 'task_123',
      type: 'SETUP',
      targets: [{
        show: {
          id: 1n,
          uid: 'show_1',
          externalId: 'SHOW-WARDROBE',
          client: { name: 'Acme' },
          showMCs: [{ mc: { aliasName: 'MC Prime', name: 'MC Prime' } }],
        },
      }],
      metadata: { upload_routing: { material_asset_directory: 'wardrobe-archive' } },
      snapshot: {
        schema: {
          items: [
            {
              id: 'item_1',
              key: 'proof_photo',
              type: 'file',
              label: 'Proof Photo',
              validation: { accept: 'image/*' },
            },
          ],
          metadata: { task_type: 'OTHER' },
        },
      },
    } as any);

    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(storageService.generateObjectKey).not.toHaveBeenCalled();
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'wardrobe-archive/2026-03-03/show_1-v1.png',
      }),
    );
  });

  it('should route ACTIVE show-linked uploads to show-general directory', async () => {
    taskService.findByUidWithSnapshot.mockResolvedValueOnce({
      uid: 'task_123',
      type: 'ACTIVE',
      targets: [{
        show: {
          id: 1n,
          uid: 'show_1',
          externalId: null,
          client: { name: 'Acme' },
          showMCs: [{ mc: { aliasName: 'MC Prime', name: 'MC Prime' } }],
        },
      }],
      snapshot: {
        schema: {
          items: [
            {
              id: 'item_1',
              key: 'proof_photo',
              type: 'file',
              label: 'Proof Photo',
              validation: { accept: 'image/*' },
            },
          ],
          metadata: { task_type: 'OTHER' },
        },
      },
    } as any);

    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(storageService.generateObjectKey).not.toHaveBeenCalled();
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'show-general/2026-03-03/show_1-v1.png',
      }),
    );
  });

  it('should include incremented upload version in MATERIAL_ASSET object key', async () => {
    taskService.reserveMaterialAssetUploadVersion.mockResolvedValueOnce(3);

    await service.createPresignedUpload({
      use_case: FILE_UPLOAD_USE_CASE.MATERIAL_ASSET,
      mime_type: 'image/png',
      file_size: 1024,
      file_name: 'proof',
      task_id: 'task_123',
      field_key: 'proof_photo',
      actorId: 'ext_123',
    });

    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: 'pre-production/2026-03-03/show_1-v3.png',
      }),
    );
  });
});
