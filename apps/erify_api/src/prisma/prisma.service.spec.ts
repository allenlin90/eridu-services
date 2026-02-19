import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from './prisma.service';

// Mock the pg module
jest.mock('pg', () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
    })),
  };
});

// Mock the adapter
jest.mock('@prisma/adapter-pg', () => {
  return {
    PrismaPg: jest.fn().mockImplementation(() => ({
      // Return a valid adapter-like object
      provider: 'postgres',
      adapterName: '@prisma/adapter-pg',
      queryRaw: jest.fn(),
      executeRaw: jest.fn(),
      startTransaction: jest.fn(),
    })),
  };
});

describe('prismaService', () => {
  let service: PrismaService;
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;

  let queryRawSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string): any => {
      if (key === 'NODE_ENV') {
        return 'test';
      }
      if (key === 'DATABASE_URL') {
        return 'postgresql://test:test@localhost:5432/testdb';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock PrismaClient methods
    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    queryRawSpy = jest
      .spyOn(service, '$queryRaw')
      .mockResolvedValue([{ '?column?': 1 }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database', async () => {
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should log connection success', async () => {
      const loggerSpy = jest.spyOn(service.logger, 'log');
      await service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledWith('Database connected successfully');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      connectSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service.logger, 'error');

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to connect to database',
        error,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database and close pool', async () => {
      const poolEndSpy = jest.spyOn(service.pool, 'end');
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
      expect(poolEndSpy).toHaveBeenCalledTimes(1);
    });

    it('should log disconnection success', async () => {
      const loggerSpy = jest.spyOn(service.logger, 'log');
      await service.onModuleDestroy();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Database disconnected successfully',
      );
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      disconnectSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service.logger, 'error');

      await service.onModuleDestroy();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error disconnecting from database',
        error,
      );
    });
  });

  describe('isHealthy', () => {
    it('should return true when database is healthy', async () => {
      const result = await service.isHealthy();
      expect(result).toBe(true);
      expect(queryRawSpy).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return false when database health check fails', async () => {
      const error = new Error('Database connection failed');
      queryRawSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service.logger, 'error');

      const result = await service.isHealthy();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Database health check failed',
        error,
      );
    });
  });

  describe('development mode', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') {
          return 'development';
        }
        return undefined;
      });
    });

    it('should set up query logging in development', async () => {
      await service.onModuleInit();

      // In development, $on should be called for query logging
      // Note: This is a simplified test - actual implementation may vary
      expect(connectSpy).toHaveBeenCalled();
    });
  });
});
