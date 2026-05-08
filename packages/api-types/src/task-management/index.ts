/**
 * Task Management schemas and types
 *
 * This module exports Zod schemas and TypeScript types for Task Template entities.
 *
 * @example
 * ```ts
 * import { TaskTemplate, taskTemplateSchema } from '@eridu/api-types/task-management';
 *
 * // Validate API response
 * const template = taskTemplateSchema.parse(apiResponse);
 *
 * // Use TypeScript type
 * function handleTemplate(template: TaskTemplate) {
 *   console.log(template.name);
 * }
 * ```
 */

export * from './task.schema.js';
export * from './task-content-validator.js';
export * from './task-report.schema.js';
export * from './task-schema-engine.js';
export * from './task-template.schema.js';
export * from './template-definition.schema.js';
