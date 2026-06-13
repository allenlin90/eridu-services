/**
 * Admin-named aliases for the canonical Zod response decorators.
 *
 * `AdminResponse` / `AdminPaginatedResponse` are kept as descriptive names for
 * admin controllers, but the implementation lives once in
 * `@/lib/decorators/zod-response.decorator` — this file only re-exports it so
 * the decorator logic isn't duplicated.
 */
export {
  ZodPaginatedResponse as AdminPaginatedResponse,
  ZodResponse as AdminResponse,
} from '@/lib/decorators/zod-response.decorator';
