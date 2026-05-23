import { Injectable } from '@nestjs/common';

import type {
  HydrationContext,
  UiSchema,
  UiSchemaV2,
} from '@eridu/api-types/task-management';
import {
  buildTaskContentSchema,
  getSchemaEngine,
  hydrateTaskFormSchema,
} from '@eridu/api-types/task-management';

import { TaskValidationError } from '@/lib/errors/task-validation.error';

@Injectable()
export class TaskValidationService {
  /**
   * Validates a task's content payload against the snapshot schema.
   *
   * When a v2 schema includes `system_fact_key` bindings, `hydrationContext`
   * MUST be supplied so per-target hydrated keys (`<fieldId>__<scope>__<uid>`)
   * are recognized by the strict content schema. Stale hydrated values
   * (targets that are no longer assigned) are tolerated as optional fields.
   *
   * Throws TaskValidationError with detailed field errors if validation fails.
   */
  validateContent(
    payload: any,
    schema: UiSchema | UiSchemaV2,
    hydrationContext?: HydrationContext,
  ): void {
    if (!payload || typeof payload !== 'object') {
      throw new TaskValidationError('Content must be a JSON object', []);
    }

    const errors: Array<{ field: string; message: string }> = [];
    const effectiveSchema = this.applyHydration(schema, hydrationContext, payload);
    const zodSchema = buildTaskContentSchema(effectiveSchema);

    const result = zodSchema.safeParse(payload);

    if (!result.success) {
      result.error.issues.forEach((err) => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
        });
      });
    }

    if (errors.length > 0) {
      throw new TaskValidationError('Task content validation failed', errors);
    }
  }

  private applyHydration(
    schema: UiSchema | UiSchemaV2,
    hydrationContext: HydrationContext | undefined,
    content: Record<string, unknown>,
  ): UiSchema | UiSchemaV2 {
    if (!hydrationContext) {
      return schema;
    }
    if (getSchemaEngine(schema) !== 'task_template_v2') {
      return schema;
    }
    const v2 = schema as UiSchemaV2;
    const hasBindings = v2.items.some((item) => Boolean(item.system_fact_key));
    if (!hasBindings) {
      return schema;
    }
    return hydrateTaskFormSchema(v2, hydrationContext, content);
  }
}
