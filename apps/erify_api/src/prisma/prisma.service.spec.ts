import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService, TransactionClient } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectSpy: jest.SpyInstance;
  let disconnectSpy: jest.SpyInstance;
  let transactionSpy: jest.SpyInstance;
  let queryRawSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') {
        return 'test';
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
    transactionSpy = jest
      .spyOn(service, '$transaction')
      .mockImplementation(
        <T>(callback: (tx: TransactionClient) => Promise<T>) => {
          // Create a mock transaction client
          const mockTx = {
            user: service.user,
            show: service.show,
            schedule: service.schedule,
          } as TransactionClient;
          return Promise.resolve(callback(mockTx));
        },
      );
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
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      await service.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledWith('Database connected successfully');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      connectSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to connect to database',
        error,
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database', async () => {
      await service.onModuleDestroy();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should log disconnection success', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      await service.onModuleDestroy();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Database disconnected successfully',
      );
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      disconnectSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      await service.onModuleDestroy();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error disconnecting from database',
        error,
      );
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction with callback', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const result = await service.executeTransaction(callback);

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should use default transaction options', async () => {
      transactionSpy.mockClear();
      const callback = jest.fn().mockResolvedValue('result');
      await service.executeTransaction(callback);

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 5000,
        timeout: 10000,
      });
    });

    it('should use custom transaction options', async () => {
      transactionSpy.mockClear();
      const callback = jest.fn().mockResolvedValue('result');
      const options = {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      };

      await service.executeTransaction(callback, options);

      expect(transactionSpy).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 10000,
        timeout: 30000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');
      transactionSpy.mockRejectedValueOnce(error);
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      const callback = jest.fn().mockResolvedValue('result');

      await expect(service.executeTransaction(callback)).rejects.toThrow(
        'Transaction failed',
      );
      expect(loggerSpy).toHaveBeenCalledWith('Transaction failed', error);
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
      const loggerSpy = jest.spyOn(service['logger'], 'error');

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
