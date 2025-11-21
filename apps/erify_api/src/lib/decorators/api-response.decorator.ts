import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodType } from 'zod';

import { ApiZodResponse } from '@/lib/openapi/decorators';
import { createPaginatedResponseSchema } from '@/lib/pagination/pagination.schema';

/**
 * Generic Zod-based response decorator that combines common response decorators.
 * This reduces boilerplate by combining @HttpCode, @ApiZodResponse, and @ZodSerializerDto.
 *
 * Can be used in any controller (admin, backdoor, me, etc.)
 *
 * @param schema - Zod schema for the response (optional for NO_CONTENT responses)
 * @param statusCode - HTTP status code (defaults to 200)
 * @param description - Description for OpenAPI documentation
 * @returns Combined decorators
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @ZodResponse(userDto, HttpStatus.OK, 'User details')
 * getUser(@Param('id') id: string) {
 *   return this.userService.getUserById(id);
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Delete(':id')
 * @ZodResponse(undefined, HttpStatus.NO_CONTENT)
 * deleteUser(@Param('id') id: string) {
 *   return this.userService.deleteUser(id);
 * }
 * ```
 */
export function ZodResponse(
  schema: ZodType | undefined,
  statusCode: HttpStatus = HttpStatus.OK,
  description?: string,
) {
  // For NO_CONTENT responses, only apply HttpCode
  if (statusCode === HttpStatus.NO_CONTENT || !schema) {
    return applyDecorators(HttpCode(statusCode));
  }

  return applyDecorators(
    HttpCode(statusCode),
    ApiZodResponse(schema, description),
    ZodSerializerDto(schema),
  );
}

/**
 * Decorator for paginated responses.
 * Combines @HttpCode, @ApiZodResponse, and @ZodSerializerDto for paginated endpoints.
 *
 * @param itemSchema - Zod schema for individual items in the paginated response
 * @param description - Description for OpenAPI documentation
 * @returns Combined decorators
 *
 * @example
 * ```typescript
 * @Get()
 * @ZodPaginatedResponse(userDto, 'List of users with pagination')
 * getUsers(@Query() query: PaginationQueryDto) {
 *   return this.userService.getUsers(query);
 * }
 * ```
 */
export function ZodPaginatedResponse(
  itemSchema: ZodType,
  description?: string,
) {
  const paginatedSchema = createPaginatedResponseSchema(itemSchema);

  return applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiZodResponse(paginatedSchema, description),
    ZodSerializerDto(paginatedSchema),
  );
}
