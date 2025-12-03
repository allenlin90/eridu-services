import { GoogleSheets } from '@/lib/decorators/google-sheets.decorator';
import { HttpError } from '@/lib/errors/http-error.util';
import {
  createPaginationMeta,
  PaginationQueryDto,
} from '@/lib/pagination/pagination.schema';

@GoogleSheets()
export abstract class BaseGoogleSheetsController {
  constructor() {}
  /**
   * Creates a paginated response with data and pagination metadata.
   *
   * @param data - Array of items to include in the response
   * @param total - Total count of items available
   * @param query - Pagination query parameters
   * @returns Object containing data array and pagination metadata
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    query: PaginationQueryDto,
  ) {
    // Use pure function from pagination schema
    const meta = createPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  }

  /**
   * Validates that a resource exists, throwing a NotFoundException if it doesn't.
   * Useful for ensuring resources exist before performing operations on them.
   *
   * @param resource - The resource object (can be null/undefined)
   * @param resourceName - Name of the resource type (e.g., 'User', 'Schedule')
   * @param identifier - Optional identifier to include in error message
   * @throws NotFoundException if resource is null or undefined
   *
   * @example
   * ```typescript
   * const user = await this.userService.getUserById(id);
   * this.ensureResourceExists(user, 'User', id);
   * ```
   */
  protected ensureResourceExists<T>(
    resource: T | null | undefined,
    resourceName: string,
    identifier?: string | number,
  ): asserts resource is T {
    if (!resource) {
      throw HttpError.notFound(resourceName, identifier);
    }
  }

  protected ensureFieldExists<T>(
    value: T | null | undefined,
    fieldName: string,
    resourceName: string,
  ): T {
    if (value === null || value === undefined) {
      throw HttpError.badRequest(`${resourceName} must have a ${fieldName}`);
    }
    return value;
  }

  protected async handleOperation<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}
