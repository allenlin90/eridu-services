import { z } from 'zod';

/**
 * OpenAPI Schema types
 */
interface OpenAPISchema {
  type?: string;
  format?: string;
  nullable?: boolean;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  additionalProperties?: OpenAPISchema;
}

/**
 * Utility to convert Zod schemas to OpenAPI schemas
 * This integrates with the existing Zod schemas used throughout the application
 */
export class ZodOpenAPIConverter {
  /**
   * Convert Zod schema to OpenAPI schema object
   */
  static zodToOpenAPI(schema: z.ZodTypeAny): OpenAPISchema {
    // Handle different Zod types
    if (schema instanceof z.ZodObject) {
      return this.convertZodObject(schema);
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToOpenAPI(schema.element as z.ZodTypeAny),
      };
    }

    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    }

    if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    }

    if (schema instanceof z.ZodDate) {
      return { type: 'string', format: 'date-time' };
    }

    if (schema instanceof z.ZodBigInt) {
      return { type: 'string', format: 'int64' };
    }

    if (schema instanceof z.ZodNullable) {
      return {
        ...this.zodToOpenAPI(schema.def.innerType as z.ZodTypeAny),
        nullable: true,
      };
    }

    if (schema instanceof z.ZodOptional) {
      return this.zodToOpenAPI(schema.def.innerType as z.ZodTypeAny);
    }

    if (schema instanceof z.ZodRecord) {
      return {
        type: 'object',
        additionalProperties: this.zodToOpenAPI(
          schema.def.valueType as z.ZodTypeAny,
        ),
      };
    }

    if (schema instanceof z.ZodVoid) {
      return { type: 'null' };
    }

    // Default fallback
    return { type: 'string' };
  }

  private static convertZodObject(
    schema: z.ZodObject<z.ZodRawShape>,
  ): OpenAPISchema {
    const shape = schema.shape;
    const properties: Record<string, OpenAPISchema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(
      shape as Record<string, z.ZodTypeAny>,
    )) {
      properties[key] = this.zodToOpenAPI(value);

      // Check if field is required
      if (
        !(value instanceof z.ZodOptional) &&
        !(value instanceof z.ZodNullable)
      ) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }
}
