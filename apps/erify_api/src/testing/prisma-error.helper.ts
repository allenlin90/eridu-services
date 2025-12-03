import type { Prisma } from '@prisma/client';

import { PRISMA_ERROR } from '@/lib/errors/prisma-error-codes';

/**
 * Creates a mock Prisma.PrismaClientKnownRequestError for testing.
 *
 * @param code - The Prisma error code (e.g., PRISMA_ERROR.UniqueConstraint)
 * @param meta - Optional metadata for the error (e.g., { target: ['email'] })
 * @returns A mock PrismaClientKnownRequestError
 *
 * @example
 * ```typescript
 * const error = createMockPrismaError(PRISMA_ERROR.UniqueConstraint, {
 *   target: ['email'],
 *   modelName: 'User'
 * });
 * ```
 */
export function createMockPrismaError(
  code: string,
  meta?: Record<string, unknown>,
): Prisma.PrismaClientKnownRequestError {
  return Object.assign(new Error('Prisma error'), {
    code,
    clientVersion: 'test',
    meta: meta || {},
  }) as Prisma.PrismaClientKnownRequestError;
}

/**
 * Creates a mock unique constraint violation error (P2002).
 *
 * @param fields - The field(s) that caused the unique constraint violation
 * @param modelName - Optional model name
 * @returns A mock PrismaClientKnownRequestError for unique constraint violation
 *
 * @example
 * ```typescript
 * const error = createMockUniqueConstraintError(['email']);
 * const error2 = createMockUniqueConstraintError(['showId', 'mcId'], 'ShowMC');
 * ```
 */
export function createMockUniqueConstraintError(
  fields: string[],
  modelName?: string,
): Prisma.PrismaClientKnownRequestError {
  return createMockPrismaError(PRISMA_ERROR.UniqueConstraint, {
    target: fields,
    ...(modelName && { modelName }),
  });
}

/**
 * Creates a mock record not found error (P2025).
 *
 * @param modelName - The model name that was not found
 * @param cause - Optional cause description
 * @returns A mock PrismaClientKnownRequestError for record not found
 *
 * @example
 * ```typescript
 * const error = createMockRecordNotFoundError('User');
 * const error2 = createMockRecordNotFoundError('MC', 'No MC record found');
 * ```
 */
export function createMockRecordNotFoundError(
  modelName?: string,
  cause?: string,
): Prisma.PrismaClientKnownRequestError {
  return createMockPrismaError(PRISMA_ERROR.RecordNotFound, {
    ...(modelName && { modelName }),
    ...(cause && { cause }),
  });
}
