import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { BackdoorApiKeyGuard } from './backdoor-api-key.guard';

import type { Env } from '@/config/env.schema';

describe('backdoorApiKeyGuard', () => {
  let guard: BackdoorApiKeyGuard;
  let configService: jest.Mocked<ConfigService<Env>>;
  let reflector: jest.Mocked<Reflector>;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    // Mock ConfigService
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService<Env>>;

    // Mock Reflector
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<Reflector>;

    // Mock ExecutionContext
    mockRequest = {
      headers: {},
    };

    const getRequestMock = jest.fn().mockReturnValue(mockRequest);
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: getRequestMock,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    guard = new BackdoorApiKeyGuard(configService, reflector);
  });

  describe('when API key is configured', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return 'valid-backdoor-key-123';
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      });
    });

    it('should allow access with valid API key', () => {
      mockRequest.headers = { 'x-api-key': 'valid-backdoor-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toEqual({
        type: 'api-key',
        serviceName: 'backdoor',
      });
    });

    it('should allow access with valid API key (case-insensitive header)', () => {
      mockRequest.headers = { 'X-API-Key': 'valid-backdoor-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toEqual({
        type: 'api-key',
        serviceName: 'backdoor',
      });
    });

    it('should throw UnauthorizedException when API key is missing', () => {
      mockRequest.headers = {};

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'backdoor API key is required',
      );
    });

    it('should throw UnauthorizedException with invalid API key', () => {
      mockRequest.headers = { 'x-api-key': 'invalid-key' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid backdoor API key',
      );
    });
  });

  describe('when API key is not configured in development', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
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
    let productionGuard: BackdoorApiKeyGuard;

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return undefined;
        if (key === 'NODE_ENV')
          return 'production';
        return undefined;
      });
      // Create guard AFTER mock is set up so isProduction is set correctly
      productionGuard = new BackdoorApiKeyGuard(configService, reflector);
    });

    it('should throw UnauthorizedException when header is provided but env is not set', () => {
      const testRequest = {
        headers: { 'x-api-key': 'some-key' },
      };
      const getRequestMock = jest.fn().mockReturnValue(testRequest);
      const testExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: getRequestMock,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => {
        productionGuard.canActivate(testExecutionContext);
      }).toThrow('backdoor API key authentication is required in production');
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
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => {
        productionGuard.canActivate(testExecutionContext);
      }).toThrow('backdoor API key authentication is required in production');
    });
  });

  describe('validateRequest method', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'BACKDOOR_API_KEY')
          return 'valid-backdoor-key-123';
        if (key === 'NODE_ENV')
          return 'development';
        return undefined;
      });
    });

    it('should call validateRequest after API key validation', () => {
      mockRequest.headers = { 'x-api-key': 'valid-backdoor-key-123' };
      // Use 'as any' to access protected method for testing
      const validateRequestSpy = jest.spyOn(
        guard as any,
        'validateRequest',
      ) as jest.SpyInstance;

      guard.canActivate(mockExecutionContext);

      expect(validateRequestSpy).toHaveBeenCalledWith(mockRequest);
    });

    it('should return true from validateRequest by default (no IP whitelisting)', () => {
      mockRequest.headers = { 'x-api-key': 'valid-backdoor-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
