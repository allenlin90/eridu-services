// Centralized Prisma error codes, similar to Nest's HttpStatus
export const PRISMA_ERROR = {
  UniqueConstraint: 'P2002',
  RecordNotFound: 'P2025',
} as const;

export type PrismaErrorCode = (typeof PRISMA_ERROR)[keyof typeof PRISMA_ERROR];
