import { z } from 'zod';

import { getTaskContentExtraKey, getTaskContentReasonKey } from './task-content-extras.js';
import type { UiSchema } from './template-definition.schema.js';

/**
 * Builds a dynamic Zod schema based on a TaskTemplate UiSchema definition.
 * Can be used by both backend (API validation) and frontend (form validation).
 */
export function buildTaskContentSchema(schema: UiSchema): z.ZodObject<z.ZodRawShape> {
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
          validator = z.array(z.enum(multivalues));
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

    shape[item.key] = validator;
    shape[getTaskContentReasonKey(item.key)] = z.string().optional();
    shape[getTaskContentExtraKey(item.key)] = z.record(z.string(), z.unknown()).optional();
  }

  return z.object(shape).strict();
}
