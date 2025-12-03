/**
 * @eridu/api-types
 *
 * Shared API types and schemas for eridu-services monorepo.
 *
 * This package provides:
 * - Zod schemas for runtime validation
 * - TypeScript types inferred from schemas
 * - Constants (UID prefixes, etc.)
 * - Reusable pagination schemas
 *
 * @example
 * ```ts
 * import { ShowApiResponse, showApiResponseSchema } from '@eridu/api-types/shows';
 * import { UID_PREFIXES } from '@eridu/api-types/constants';
 * import { createPaginatedResponseSchema } from '@eridu/api-types/pagination';
 * ```
 */

export * from './clients/index.js';
export * from './constants.js';
export * from './pagination/index.js';
export * from './show-standards/index.js';
export * from './show-statuses/index.js';
export * from './show-types/index.js';
export * from './shows/index.js';
export * from './studio-rooms/index.js';
