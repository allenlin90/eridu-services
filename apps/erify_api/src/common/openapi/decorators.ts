import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ZodType } from 'zod';

import { ZodOpenAPIConverter } from './zod-converter';

/**
 * Decorator to add OpenAPI documentation for Zod schemas
 */
export function ApiZodResponse(schema: ZodType, description?: string) {
  const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(schema);

  return applyDecorators(
    ApiResponse({
      status: 200,
      description: description || 'Successful response',
      schema: openApiSchema,
    }),
  );
}

/**
 * Decorator to add OpenAPI documentation for Zod request body
 */
export function ApiZodBody(schema: ZodType, description?: string) {
  const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(schema);

  return applyDecorators(
    ApiBody({
      description: description || 'Request body',
      schema: openApiSchema,
    }),
  );
}

/**
 * Decorator to add OpenAPI documentation for Zod query parameters
 */
export function ApiZodQuery(schema: ZodType, description?: string) {
  const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(schema);

  return applyDecorators(
    ApiQuery({
      description: description || 'Query parameters',
      schema: openApiSchema,
    }),
  );
}

/**
 * Decorator to add OpenAPI documentation for Zod path parameters
 */
export function ApiZodParam(
  name: string,
  schema: ZodType,
  description?: string,
) {
  const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(schema);

  return applyDecorators(
    ApiParam({
      name,
      description: description || 'Path parameter',
      schema: openApiSchema,
    }),
  );
}

/**
 * Comprehensive decorator for API endpoints with Zod schemas
 */
export function ApiZodEndpoint(options: {
  summary?: string;
  description?: string;
  tags?: string[];
  requestBody?: ZodType;
  responses?: Array<{
    status: number;
    schema: ZodType;
    description?: string;
  }>;
  params?: Array<{
    name: string;
    schema: ZodType;
    description?: string;
  }>;
  query?: ZodType;
}) {
  const decorators: Array<ReturnType<typeof applyDecorators>> = [];

  // Add operation info
  if (options.summary || options.description) {
    decorators.push(
      ApiOperation({
        summary: options.summary,
        description: options.description,
        tags: options.tags,
      }),
    );
  }

  // Add request body
  if (options.requestBody) {
    decorators.push(ApiZodBody(options.requestBody));
  }

  // Add responses
  if (options.responses) {
    options.responses.forEach((response) => {
      const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(response.schema);
      decorators.push(
        ApiResponse({
          status: response.status,
          description: response.description || 'Response',
          schema: openApiSchema,
        }),
      );
    });
  }

  // Add path parameters
  if (options.params) {
    options.params.forEach((param) => {
      const openApiSchema = ZodOpenAPIConverter.zodToOpenAPI(param.schema);
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description || 'Path parameter',
          schema: openApiSchema,
        }),
      );
    });
  }

  // Add query parameters
  if (options.query) {
    decorators.push(ApiZodQuery(options.query));
  }

  return applyDecorators(...(decorators as Parameters<typeof applyDecorators>));
}
