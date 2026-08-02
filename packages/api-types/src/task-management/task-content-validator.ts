import { z } from 'zod';

import { shouldShowReasonField } from './require-reason.js';
import { getTaskContentExtraKey, getTaskContentReasonKey } from './task-content-extras.js';
import { getFieldContentKey, getSchemaEngine } from './task-schema-engine.js';
import type { UiSchema, UiSchemaV2 } from './template-definition.schema.js';

/**
 * Maximum number of `show_platform_violation` entries an operator may select
 * in one multiselect field submission. Enforced here (task-content
 * validation, gating the COMPLETED transition in
 * `TaskValidationService.validateContent` / `TaskService`) so an oversized
 * selection is rejected before a task can complete, not after — the fact
 * extraction pipeline's own defensive cap
 * (`ShowIssueReconciliationService`) is set to at least twice this value to
 * cover a full N-to-N violation-set replacement (N superseded + N created
 * signals in one call) without ever tripping on a submission this gate
 * already accepted.
 *
 * No production template currently configures anywhere close to this many
 * violation types (a local-DB check found none above single digits); this
 * is a generous domain estimate, not a measured ceiling. Re-verify against
 * real template configuration if a studio's violation catalog approaches it.
 */
export const MAX_PLATFORM_VIOLATIONS_PER_FIELD = 20;

/**
 * Builds a dynamic Zod schema based on a TaskTemplate UiSchema definition.
 * Can be used by both backend (API validation) and frontend (form validation).
 */
export function buildTaskContentSchema(schema: UiSchema | UiSchemaV2): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const item of schema.items) {
    let validator: z.ZodTypeAny;

    switch (item.type) {
      case 'text':
      case 'textarea':
        validator = z.string();
        if (item.validation?.min_length !== undefined) {
          validator = (validator as z.ZodString).min(item.validation.min_length);
        }
        if (item.validation?.max_length !== undefined) {
          validator = (validator as z.ZodString).max(item.validation.max_length);
        }
        if (item.validation?.pattern) {
          validator = (validator as z.ZodString).regex(
            new RegExp(item.validation.pattern),
            item.validation.custom_message,
          );
        }
        break;

      case 'number':
        validator = z.number();
        if (item.validation?.min !== undefined) {
          validator = (validator as z.ZodNumber).min(item.validation.min);
        }
        if (item.validation?.max !== undefined) {
          validator = (validator as z.ZodNumber).max(item.validation.max);
        }
        break;

      case 'checkbox':
        validator = z.boolean();
        break;

      case 'date':
        validator = z.iso.date();
        break;

      case 'datetime':
        validator = z.iso.datetime();
        break;

      case 'select':
        if (!item.options || item.options.length === 0) {
          validator = z.string(); // Fallback if schema is misconfigured
        } else {
          const values = item.options.map((o) => o.value) as [string, ...string[]];
          validator = z.enum(values);
        }
        break;

      case 'multiselect':
        if (!item.options || item.options.length === 0) {
          validator = z.array(z.string()); // Fallback
        } else {
          const multivalues = item.options.map((o) => o.value) as [string, ...string[]];
          let arrayValidator = z.array(z.enum(multivalues));
          if ('system_fact_key' in item && item.system_fact_key === 'show_platform_violation') {
            arrayValidator = arrayValidator.max(
              MAX_PLATFORM_VIOLATIONS_PER_FIELD,
              { message: `At most ${MAX_PLATFORM_VIOLATIONS_PER_FIELD} platform violations may be selected per submission.` },
            );
          }
          validator = arrayValidator;
        }
        break;

      case 'file':
      case 'url':
        validator = z.url({ message: 'Must be a valid URL' });
        break;

      default:
        validator = z.unknown();
    }

    // Handle null/empty appropriately for optional fields
    if (!item.required) {
      validator = validator.nullish().or(z.literal(''));
    } else {
      // If required, it can't be nullish or empty string
      if (validator instanceof z.ZodString) {
        validator = validator.min(1, { message: 'Required' });
      } else if (validator instanceof z.ZodArray) {
        validator = validator.min(1, { message: 'Required' });
      }
    }

    const contentKey = getFieldContentKey(schema, item);
    shape[contentKey] = validator;
    shape[getTaskContentReasonKey(contentKey)] = z.string().optional();
    shape[getTaskContentExtraKey(contentKey)] = z.record(z.string(), z.unknown()).optional();
  }

  return z.object(shape).strict().superRefine((data, ctx) => {
    if (getSchemaEngine(schema) !== 'task_template_v2') {
      return;
    }

    for (const item of schema.items) {
      const contentKey = getFieldContentKey(schema, item);
      const value = data[contentKey];
      if (!shouldShowReasonField(item, value)) {
        continue;
      }

      const reasonKey = getTaskContentReasonKey(contentKey);
      const reason = data[reasonKey];
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Explanation is required for "${item.label}"`,
          path: [reasonKey],
        });
      }
    }
  });
}
