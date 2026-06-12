import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BackdoorAuthController } from './backdoor-auth.controller';

import { AuthService } from '@/lib/auth/auth.service';
import { BackdoorApiKeyGuard } from '@/lib/guards/backdoor-api-key.guard';

// Mock AuthService to avoid ES module import issues
jest.mock('@/lib/auth/auth.service', () => ({
  AuthService: jest.fn(),
}));

describe('backdoorAuthController', () => {
  let controller: BackdoorAuthController;
  let mockAuthService: {
    getJwksService: jest.Mock;
  };
  let mockJwksService: {
    refreshJwks: jest.Mock;
    getKeysCount: jest.Mock;
    getLastFetchedTime: jest.Mock;
    getJwksUrl: jest.Mock;
  };

  beforeEach(async () => {
    // Create mock JWKS service
    mockJwksService = {
      refreshJwks: jest.fn(),
      getKeysCount: jest.fn(),
      getLastFetchedTime: jest.fn(),
      getJwksUrl: jest
        .fn()
        .mockReturnValue('http://localhost:3001/api/auth/jwks'),
    };

    // Create mock AuthService
    mockAuthService = {
      getJwksService: jest.fn().mockReturnValue(mockJwksService),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackdoorAuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        BackdoorApiKeyGuard,
      ],
    }).compile();

    controller = module.get<BackdoorAuthController>(BackdoorAuthController);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshJwks', () => {
    it('should refresh JWKS and return success response', async () => {
      const mockLastFetchedTime = new Date('2024-01-15T10:00:00Z');
      mockJwksService.refreshJwks.mockResolvedValue(undefined);
      mockJwksService.getKeysCount.mockReturnValue(2);
      mockJwksService.getLastFetchedTime.mockReturnValue(mockLastFetchedTime);

      const result = await controller.refreshJwks();

      expect(mockJwksService.refreshJwks).toHaveBeenCalledTimes(1);
      expect(mockJwksService.getKeysCount).toHaveBeenCalledTimes(1);
      expect(mockJwksService.getLastFetchedTime).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'JWKS refreshed successfully',
        keysCount: 2,
        lastFetchedTime: '2024-01-15T10:00:00.000Z',
      });
    });

    it('should return null for lastFetchedTime when not available', async () => {
      mockJwksService.refreshJwks.mockResolvedValue(undefined);
      mockJwksService.getKeysCount.mockReturnValue(0);
      mockJwksService.getLastFetchedTime.mockReturnValue(null);

      const result = await controller.refreshJwks();

      expect(result).toEqual({
        success: true,
        message: 'JWKS refreshed successfully',
        keysCount: 0,
        lastFetchedTime: null,
      });
    });

    function getLoggerErrorSpy() {
      return jest
        .spyOn((controller as unknown as { logger: { error: jest.Mock } }).logger, 'error')
        .mockImplementation(() => undefined);
    }

    it('redacts the auth service URL from network-error responses but logs it server-side', async () => {
      const logSpy = getLoggerErrorSpy();
      mockJwksService.refreshJwks.mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

      const error = await controller.refreshJwks().catch((e: unknown) => e as Error);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe(
        'Failed to connect to the auth service. Please ensure it is running and accessible.',
      );
      expect(error.message).not.toContain('localhost');
      // Full detail (the internal auth URL) is logged server-side, not returned to the client.
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3001/api/auth/jwks'),
      );
    });

    it('redacts upstream detail from HTTP-error responses', async () => {
      getLoggerErrorSpy();
      mockJwksService.refreshJwks.mockRejectedValue(new Error('HTTP 500 Internal Server Error'));

      const error = await controller.refreshJwks().catch((e: unknown) => e as Error);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toBe('Failed to fetch JWKS from the auth service.');
      expect(error.message).not.toContain('500');
    });

    it('redacts upstream detail from generic errors and returns 500', async () => {
      getLoggerErrorSpy();
      mockJwksService.refreshJwks.mockRejectedValue(new Error('Invalid JWKS format: missing keys array'));

      const error = await controller.refreshJwks().catch((e: unknown) => e as Error);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error.message).toBe('Failed to refresh JWKS.');
      expect(error.message).not.toContain('missing keys array');
    });

    it('returns a generic 500 for non-Error rejections', async () => {
      getLoggerErrorSpy();
      mockJwksService.refreshJwks.mockRejectedValue({ message: 'Something went wrong' });

      const error = await controller.refreshJwks().catch((e: unknown) => e as Error);

      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect(error.message).toBe('Failed to refresh JWKS.');
    });

    it('should return correct response structure', async () => {
      const mockLastFetchedTime = new Date('2024-01-15T10:00:00Z');
      mockJwksService.refreshJwks.mockResolvedValue(undefined);
      mockJwksService.getKeysCount.mockReturnValue(3);
      mockJwksService.getLastFetchedTime.mockReturnValue(mockLastFetchedTime);

      const result = await controller.refreshJwks();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('keysCount');
      expect(result).toHaveProperty('lastFetchedTime');

      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.keysCount).toBe('number');
      expect(
        result.lastFetchedTime === null
        || typeof result.lastFetchedTime === 'string',
      ).toBe(true);
    });

    it('should call getJwksService to get JWKS service instance', async () => {
      mockJwksService.refreshJwks.mockResolvedValue(undefined);
      mockJwksService.getKeysCount.mockReturnValue(1);
      mockJwksService.getLastFetchedTime.mockReturnValue(new Date());

      await controller.refreshJwks();

      expect(mockAuthService.getJwksService).toHaveBeenCalledTimes(3); // Called for refreshJwks, getKeysCount, and getLastFetchedTime
    });
  });
});
