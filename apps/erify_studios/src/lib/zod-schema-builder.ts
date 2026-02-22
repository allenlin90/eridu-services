import type { UiSchema } from '@eridu/api-types/task-management';
import { buildTaskContentSchema } from '@eridu/api-types/task-management';

/**
 * Wrapper for building Zod schemas from Task Template UI schemas.
 * Re-exports the shared validator from @eridu/api-types.
 */
export const zodSchemaBuilder = {
  buildTaskContentSchema,
};

export type { UiSchema };
