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

    it('should handle network connection errors', async () => {
      const networkError = new Error('fetch failed: ECONNREFUSED');
      mockJwksService.refreshJwks.mockRejectedValue(networkError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to connect to auth service at http://localhost:3001/api/auth/jwks. Please ensure the auth service is running and accessible.',
      );
    });

    it('should handle ENOTFOUND network errors', async () => {
      const networkError = new Error('fetch failed: ENOTFOUND');
      mockJwksService.refreshJwks.mockRejectedValue(networkError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to connect to auth service',
      );
    });

    it('should handle HTTP status errors', async () => {
      const httpError = new Error('HTTP 500 Internal Server Error');
      mockJwksService.refreshJwks.mockRejectedValue(httpError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to fetch JWKS from auth service: HTTP 500 Internal Server Error',
      );
    });

    it('should handle HTTP error responses', async () => {
      const httpError = new Error('HTTP 404 Not Found');
      mockJwksService.refreshJwks.mockRejectedValue(httpError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to fetch JWKS from auth service: HTTP 404 Not Found',
      );
    });

    it('should handle generic errors with 500 status', async () => {
      const genericError = new Error('Invalid JWKS format: missing keys array');
      mockJwksService.refreshJwks.mockRejectedValue(genericError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to refresh JWKS: Invalid JWKS format: missing keys array',
      );
    });

    it('should handle unknown error types', async () => {
      const unknownError = { message: 'Something went wrong' };
      mockJwksService.refreshJwks.mockRejectedValue(unknownError);

      await expect(controller.refreshJwks()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to refresh JWKS: Unknown error',
      );
    });

    it('should handle errors without message property', async () => {
      const errorWithoutMessage = {};
      mockJwksService.refreshJwks.mockRejectedValue(errorWithoutMessage);

      await expect(controller.refreshJwks()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.refreshJwks()).rejects.toThrow(
        'Failed to refresh JWKS: Unknown error',
      );
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
