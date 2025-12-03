import type { z } from 'zod';

import type { paginationMetaSchema } from './schemas.js';

/**
 * Pagination Metadata Type
 */
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
