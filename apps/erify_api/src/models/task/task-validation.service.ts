import { Injectable } from '@nestjs/common';

import type { UiSchema } from '@eridu/api-types/task-management';
import { buildTaskContentSchema } from '@eridu/api-types/task-management';

import { TaskValidationError } from '@/lib/errors/task-validation.error';

@Injectable()
export class TaskValidationService {
  /**
   * Validates a task's content payload against the snapshot schema.
   * Throws TaskValidationError with detailed field errors if validation fails.
   */
  validateContent(payload: any, schema: UiSchema): void {
    if (!payload || typeof payload !== 'object') {
      throw new TaskValidationError('Content must be a JSON object', []);
    }

    const errors: Array<{ field: string; message: string }> = [];
    const zodSchema = buildTaskContentSchema(schema);

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
}
