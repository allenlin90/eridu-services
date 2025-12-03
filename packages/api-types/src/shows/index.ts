/**
 * Show-related schemas and types
 *
 * This module exports Zod schemas and TypeScript types for Show entities.
 *
 * @example
 * ```ts
 * import { ShowApiResponse, showApiResponseSchema } from '@eridu/api-types/shows';
 *
 * // Validate API response
 * const show = showApiResponseSchema.parse(apiResponse);
 *
 * // Use TypeScript type
 * function handleShow(show: ShowApiResponse) {
 *   // ...
 * }
 * ```
 */

export * from './schemas.js';
export * from './types.js';
