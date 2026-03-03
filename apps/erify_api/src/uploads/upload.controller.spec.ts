import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { FILE_UPLOAD_USE_CASE } from '@eridu/api-types/uploads';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

import type { AuthenticatedUser } from '@/lib/auth/jwt-auth.guard';
import { StorageService } from '@/lib/storage/storage.service';
import { TaskService } from '@/models/task/task.service';

describe('uploadController', () => {
  let controller: UploadController;
  let storageService: jest.Mocked<StorageService>;
  let taskService: jest.Mocked<Pick<TaskService, 'findByUidWithSnapshot'>>;

  const mockUser: AuthenticatedUser = {
    id: 'ext_1',
    ext_id: 'ext_1',
    email: 'operator@eridu.local',
    name: 'Operator',
    payload: {} as any,
  };

  beforeEach(async () => {
    const mockStorageService = {
      generateObjectKey: jest.fn().mockReturnValue(
        'uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
      ),
      generatePresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl:
          'https://account-id.r2.cloudflarestorage.com/assets/uploads/qc_screenshot/ext_1/2026-03-03/test-file.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test',
        uploadMethod: 'PUT',
        uploadHeaders: {
          contentType: 'image/png',
        },
        objectKey: 'uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
        fileUrl:
          'https://cdn.example.com/uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
        expiresInSeconds: 300,
      }),
    };
    const mockTaskService = {
      findByUidWithSnapshot: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        UploadService,
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    storageService = module.get(StorageService);
    taskService = module.get(TaskService);
  });

  it('should return a presigned upload payload using service validation rules', async () => {
    const result = await controller.createPresignedUpload(mockUser, {
      use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
      mime_type: 'image/png',
      file_size: 1234,
      file_name: 'screen',
    });

    expect(storageService.generateObjectKey).toHaveBeenCalledWith(
      FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
      mockUser.ext_id,
      'screen.png',
    );
    expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith({
      objectKey: 'uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });
    expect(result).toEqual({
      upload_url:
        'https://account-id.r2.cloudflarestorage.com/assets/uploads/qc_screenshot/ext_1/2026-03-03/test-file.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test',
      upload_method: 'PUT',
      upload_headers: { content_type: 'image/png' },
      object_key: 'uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
      file_url: 'https://cdn.example.com/uploads/qc_screenshot/ext_1/2026-03-03/test-file.png',
      expires_in_seconds: 300,
    });
    expect(taskService.findByUidWithSnapshot).not.toHaveBeenCalled();
  });

  it('should surface service validation errors as bad request', async () => {
    await expect(
      controller.createPresignedUpload(mockUser, {
        use_case: FILE_UPLOAD_USE_CASE.QC_SCREENSHOT,
        mime_type: 'video/mp4',
        file_size: 1234,
        file_name: 'video.mp4',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
