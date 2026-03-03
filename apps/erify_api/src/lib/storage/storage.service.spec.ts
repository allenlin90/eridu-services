import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('storageService', () => {
  let service: StorageService;

  beforeEach(() => {
    const configMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
          R2_ACCESS_KEY_ID: 'test-access-key',
          R2_SECRET_ACCESS_KEY: 'test-secret-key',
          R2_BUCKET_NAME: 'assets',
          R2_PUBLIC_BASE_URL: 'https://cdn.example.com',
        };
        return map[key];
      }),
    };

    service = new StorageService(configMock as unknown as ConfigService);
  });

  it('should generate object key with use case and actor id', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-03T10:00:00.000Z'));

    const key = service.generateObjectKey('QC_SCREENSHOT', 'ext_123', 'My File.PNG');
    expect(key).toMatch(
      /^qc_screenshot\/ext_123\/2026-03-03\/[a-f0-9]{32}-my-file\.png$/,
    );

    jest.useRealTimers();
  });

  it('should generate presigned upload URL', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-03T10:00:00.000Z'));
    (getSignedUrl as jest.Mock).mockResolvedValue(
      'https://account-id.r2.cloudflarestorage.com/assets/qc_screenshot/ext_123/2026-03-03/test-file.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=test',
    );

    const result = await service.generatePresignedUploadUrl({
      objectKey: 'qc_screenshot/ext_123/2026-03-03/test-file.png',
      contentType: 'image/png',
      expiresInSeconds: 300,
    });

    expect(result.uploadMethod).toBe('PUT');
    expect(result.objectKey).toBe('qc_screenshot/ext_123/2026-03-03/test-file.png');
    expect(result.uploadHeaders.contentType).toBe('image/png');
    expect(result.expiresInSeconds).toBe(300);
    expect(result.uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(result.uploadUrl).toContain('X-Amz-Signature=');
    expect(result.fileUrl).toBe(
      'https://cdn.example.com/qc_screenshot/ext_123/2026-03-03/test-file.png',
    );

    jest.useRealTimers();
  });
});
