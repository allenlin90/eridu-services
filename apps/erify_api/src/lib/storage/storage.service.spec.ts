import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  };
});

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
    mockS3Send.mockReset();
  });

  it('should generate object key with use case and actor id', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-03T10:00:00.000Z'));

    const key = service.generateObjectKey('QC_SCREENSHOT', 'ext_123', 'My File.PNG');
    expect(key).toMatch(
      /^qc_screenshot\/ext_123\/2026-03-03\/[a-f0-9]{32}-my-file\.png$/,
    );

    jest.useRealTimers();
  });

  it('neutralizes path traversal in the use case and actor id', () => {
    const key = service.generateObjectKey('../../evil', '../secret', 'file.png');

    // No traversal sequences survive, and no extra path segments are injected:
    // the key always has exactly useCase / actorId / date / random-name.
    expect(key).not.toContain('..');
    expect(key.split('/')).toHaveLength(4);
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

  describe('sanitizeActorIdForObjectKey', () => {
    it('applies the exact same sanitization generateObjectKey embeds for the actor-id segment', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-03T10:00:00.000Z'));

      const key = service.generateObjectKey('scene_reference', '../weird actor!!', 'x.png');
      const embeddedActorSegment = key.split('/')[1];

      expect(service.sanitizeActorIdForObjectKey('../weird actor!!')).toBe(embeddedActorSegment);

      jest.useRealTimers();
    });

    it('leaves a clean actor id unchanged', () => {
      expect(service.sanitizeActorIdForObjectKey('ext_abc123')).toBe('ext_abc123');
    });
  });

  describe('headObject', () => {
    it('returns the real, R2-observed content type and length for an existing object', async () => {
      mockS3Send.mockResolvedValue({ ContentType: 'image/png', ContentLength: 12345 });

      const result = await service.headObject('scene_reference/ext_abc/2026-01-01/x.png');

      expect(result).toEqual({ contentType: 'image/png', contentLength: 12345 });
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('returns null when the object does not exist (SDK NotFound error name)', async () => {
      const notFound = Object.assign(new Error('not found'), { name: 'NotFound' });
      mockS3Send.mockRejectedValue(notFound);

      await expect(
        service.headObject('scene_reference/ext_abc/2026-01-01/missing.png'),
      ).resolves.toBeNull();
    });

    it('returns null when the error carries a 404 metadata status code', async () => {
      const notFound = Object.assign(new Error('not found'), { $metadata: { httpStatusCode: 404 } });
      mockS3Send.mockRejectedValue(notFound);

      await expect(
        service.headObject('scene_reference/ext_abc/2026-01-01/missing.png'),
      ).resolves.toBeNull();
    });

    it('rethrows a non-404 error rather than treating it as a missing object', async () => {
      const serverError = Object.assign(new Error('boom'), { $metadata: { httpStatusCode: 500 } });
      mockS3Send.mockRejectedValue(serverError);

      await expect(
        service.headObject('scene_reference/ext_abc/2026-01-01/x.png'),
      ).rejects.toThrow('boom');
    });
  });
});
