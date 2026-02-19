import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

import { Env } from '@/config/env.schema';

/**
 * Transaction client type that omits transaction-related methods
 * to prevent nested transactions and ensure proper transaction handling.
 */
export type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Options for executing a transaction
 */
export type TransactionOptions = {
  /**
   * Maximum time (in milliseconds) to wait for a transaction slot to become available
   * @default 5000
   */
  maxWait?: number;
  /**
   * Maximum time (in milliseconds) the transaction can run before being cancelled
   * @default 10000
   */
  timeout?: number;
  /**
   * Transaction isolation level
   * @default 'ReadCommitted'
   */
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  public readonly logger = new Logger(PrismaService.name);
  private readonly isDevelopment: boolean;
  public readonly pool: Pool;

  constructor(private readonly configService: ConfigService<Env>) {
    const isDevelopment
      = configService.get('NODE_ENV', { infer: true }) === 'development';

    // Get DATABASE_URL from config
    const databaseUrl = configService.get('DATABASE_URL', { infer: true });
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // Create connection pool for the adapter
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    const errorFormat = isDevelopment
      ? ('pretty' as const)
      : ('minimal' as const);
    const prismaOptions = {
      adapter,
      log: isDevelopment
        ? [
            { level: 'query' as const, emit: 'event' as const },
            { level: 'error' as const, emit: 'stdout' as const },
            { level: 'warn' as const, emit: 'stdout' as const },
          ]
        : [
            { level: 'error' as const, emit: 'stdout' as const },
            { level: 'warn' as const, emit: 'stdout' as const },
          ],
      errorFormat,
    };

    super(prismaOptions);
    this.isDevelopment = isDevelopment;
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');

      // Set up query logging in development
      if (this.isDevelopment) {
        this.$on('query' as never, (e: Prisma.QueryEvent) => {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Params: ${e.params}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  /**
   * Health check method to verify database connectivity.
   * Useful for health check endpoints and monitoring.
   *
   * @returns Promise that resolves to true if database is healthy, false otherwise
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
