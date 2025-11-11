import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Transaction client type that omits transaction-related methods
 * to prevent nested transactions and ensure proper transaction handling.
 */
export type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Executes a transaction with a callback that receives a transaction client.
   * This method should be used by services that need to perform multiple
   * database operations atomically.
   *
   * @param callback - Function that receives a transaction client and returns a promise
   * @returns The result of the callback
   *
   * @example
   * ```typescript
   * await prismaService.executeTransaction(async (tx) => {
   *   await tx.user.create({ data: { ... } });
   *   await tx.post.create({ data: { ... } });
   *   return result;
   * });
   * ```
   */
  async executeTransaction<T>(
    callback: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(callback);
  }
}
