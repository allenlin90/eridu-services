import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { BaseApiKeyGuard } from './base-api-key.guard';

import type { Env } from '@/config/env.schema';

/**
 * Concrete implementation of BaseApiKeyGuard for testing
 */
class TestApiKeyGuard extends BaseApiKeyGuard {
  protected getApiKeyFromConfig(): string | undefined {
    return this.configService.get('TEST_API_KEY');
  }

  protected getEnvKeyName(): string {
    return 'TEST_API_KEY';
  }
}

describe('baseApiKeyGuard', () => {
  let guard: TestApiKeyGuard;
  let configService: jest.Mocked<ConfigService<Env>>;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    // Mock ConfigService
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService<Env>>;

    // Mock ExecutionContext
    mockRequest = {
      headers: {},
    };

    const getRequestMock = jest.fn().mockReturnValue(mockRequest);
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: getRequestMock,
      }),
    } as unknown as ExecutionContext;

    guard = new TestApiKeyGuard(configService, 'test-service');
  });

  describe('when API key is configured', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TEST_API_KEY')
          return 'valid-api-key-123';
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      });
    });

    it('should allow access with valid API key', () => {
      mockRequest.headers = { 'x-api-key': 'valid-api-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toEqual({
        type: 'api-key',
        serviceName: 'test-service',
      });
    });

    it('should allow access with valid API key (case-insensitive header)', () => {
      mockRequest.headers = { 'X-API-Key': 'valid-api-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toEqual({
        type: 'api-key',
        serviceName: 'test-service',
      });
    });

    it('should throw UnauthorizedException when API key is missing', () => {
      mockRequest.headers = {};

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'test-service API key is required',
      );
    });

    it('should throw UnauthorizedException with invalid API key', () => {
      mockRequest.headers = { 'x-api-key': 'invalid-key' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid test-service API key',
      );
    });

    it('should throw UnauthorizedException when API key is empty string', () => {
      mockRequest.headers = { 'x-api-key': '' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('when API key is not configured in development', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TEST_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      });
    });

    it('should bypass authentication when no header is provided', () => {
      mockRequest.headers = {};

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toBeUndefined();
    });

    it('should bypass authentication even when header is provided', () => {
      mockRequest.headers = { 'x-api-key': 'any-key' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toBeUndefined();
    });
  });

  describe('when API key is not configured in production', () => {
    let productionGuard: TestApiKeyGuard;

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TEST_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'production';
        return undefined;
      });
      // Create guard AFTER mock is set up so isProduction is set correctly
      productionGuard = new TestApiKeyGuard(configService, 'test-service');
    });

    it('should throw UnauthorizedException when header is provided but env is not set', () => {
      // Create a fresh mock request with headers
      const testRequest = {
        headers: { 'x-api-key': 'some-key' },
      };
      const getRequestMock = jest.fn().mockReturnValue(testRequest);
      const testExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: getRequestMock,
        }),
      } as unknown as ExecutionContext;

      expect(() => {
        productionGuard.canActivate(testExecutionContext);
      }).toThrow(UnauthorizedException);

      // Create fresh context for second assertion
      const testRequest2 = {
        headers: { 'x-api-key': 'some-key' },
      };
      const getRequestMock2 = jest.fn().mockReturnValue(testRequest2);
      const testExecutionContext2 = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: getRequestMock2,
        }),
      } as unknown as ExecutionContext;

      expect(() => {
        productionGuard.canActivate(testExecutionContext2);
      }).toThrow(
        'test-service API key authentication is required in production',
      );
    });

    it('should throw error when no header is provided (production requires API key)', () => {
      const testRequest = {
        headers: {},
      };
      const getRequestMock = jest.fn().mockReturnValue(testRequest);
      const testExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: getRequestMock,
        }),
      } as unknown as ExecutionContext;

      expect(() => {
        productionGuard.canActivate(testExecutionContext);
      }).toThrow(UnauthorizedException);
      expect(() => {
        productionGuard.canActivate(testExecutionContext);
      }).toThrow(
        'test-service API key authentication is required in production',
      );
    });
  });

  describe('header extraction', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TEST_API_KEY')
          return 'valid-api-key-123';
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      });
    });

    it('should extract API key from lowercase header', () => {
      mockRequest.headers = { 'x-api-key': 'valid-api-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should extract API key from uppercase header', () => {
      mockRequest.headers = { 'X-API-Key': 'valid-api-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should prefer lowercase header over uppercase', () => {
      mockRequest.headers = {
        'x-api-key': 'valid-api-key-123',
        'X-API-Key': 'wrong-key',
      };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
