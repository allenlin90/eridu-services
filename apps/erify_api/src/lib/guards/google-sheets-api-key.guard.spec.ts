import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { Env } from '@/config/env.schema';

import { GoogleSheetsApiKeyGuard } from './google-sheets-api-key.guard';

describe('GoogleSheetsApiKeyGuard', () => {
  let guard: GoogleSheetsApiKeyGuard;
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

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    guard = new GoogleSheetsApiKeyGuard(configService);
  });

  describe('when GOOGLE_SHEETS_API_KEY is configured', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_SHEETS_API_KEY') return 'google-sheets-key-123';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
    });

    it('should allow access with valid Google Sheets API key', () => {
      mockRequest.headers = { 'x-api-key': 'google-sheets-key-123' };

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toEqual({
        type: 'api-key',
        serviceName: 'google-sheets',
      });
    });

    it('should throw UnauthorizedException when API key is missing', () => {
      mockRequest.headers = {};

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'google-sheets API key is required',
      );
    });

    it('should throw UnauthorizedException with invalid API key', () => {
      mockRequest.headers = { 'x-api-key': 'wrong-key' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        'Invalid google-sheets API key',
      );
    });

    it('should not accept other service API keys', () => {
      mockRequest.headers = { 'x-api-key': 'other-service-key' };

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('when GOOGLE_SHEETS_API_KEY is not configured in development', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_SHEETS_API_KEY') return undefined;
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
    });

    it('should bypass authentication', () => {
      mockRequest.headers = {};

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.service).toBeUndefined();
    });
  });

  describe('when GOOGLE_SHEETS_API_KEY is not configured in production', () => {
    let productionGuard: GoogleSheetsApiKeyGuard;

    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_SHEETS_API_KEY') return undefined;
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });
      // Create guard AFTER mock is set up so isProduction is set correctly
      productionGuard = new GoogleSheetsApiKeyGuard(configService);
    });

    it('should throw error when header is provided but env is not set', () => {
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
        'google-sheets API key authentication is required in production',
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
        'google-sheets API key authentication is required in production',
      );
    });
  });

  describe('service name', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'GOOGLE_SHEETS_API_KEY') return 'google-sheets-key-123';
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });
    });

    it('should set service name to google-sheets', () => {
      mockRequest.headers = { 'x-api-key': 'google-sheets-key-123' };

      guard.canActivate(mockExecutionContext);

      expect(mockRequest.service?.serviceName).toBe('google-sheets');
    });
  });
});
